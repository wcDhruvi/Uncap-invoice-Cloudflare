import { Hono } from 'hono';

import apiRoutes from './routes/api';
import { handleWebhook } from './webhooks/shopify';
import { getDrizzle } from './db/drizzle';
import { getShopByDomain, upsertShop, upsertInvoiceSettings, upsertInvoiceLanguage } from './db/dbHelpers';
import { getShopifyClient } from './utils/shopifyClient';
import { processSyncMessage } from './utils/queueConsumer';
import { exchangeToken, shopifyAPI, registerAllWebhooks } from './utils/shopHelpers';
import { shops } from './db/schema';
import { eq } from 'drizzle-orm';

const app = new Hono();


// ── LOGGING MIDDLEWARE ──────────────────────────────────
app.use('*', async (c, next) => {
  console.log(`[${c.req.method}] ${c.req.url}`);
  return await next();
});

// ── ROOT — Shopify entry route ─────────────────────────
app.get('/', (c) => {
  const shop = c.req.query('shop');
  const host = c.req.query('host');

  console.log('Root hit — shop:', shop, 'host:', host);

  if (shop) {
    return c.redirect(`/auth?shop=${shop}`);
  }

  return c.text('Uncap Invoice — Cloudflare Worker (REST + Drizzle + Queue)');
});

// ── ADMIN ROUTE — Loaded inside Shopify embedded iframe ──
app.get('/admin', async (c) => {
  const shop = c.req.query('shop');
  const host = c.req.query('host');

  console.log('Admin hit — shop:', shop, 'host:', host);

  if (!shop) {
    return c.text('Missing shop parameter', 400);
  }

  const db = getDrizzle(c.env);
  const shopRecord = await getShopByDomain(db, shop);

  // If shop isn't installed or is marked inactive, force OAuth redirect
  if (!shopRecord || shopRecord.is_active === false || !shopRecord.access_token) {
    console.log(`Shop ${shop} not fully installed. Redirecting to OAuth...`);
    return c.redirect(`/auth?shop=${shop}`);
  }

  // Serve Vite frontend single page index HTML
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Uncap Invoice</title>
        <meta name="shopify-api-key" content="${c.env.SHOPIFY_API_KEY}" />
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
        <script type="module" src="/src/main.jsx"></script>
      </head>
      <body>
        <div id="root"></div>
      </body>
    </html>
  `);
});



// ── AUTH ROUTE — Initiates first-time installation OAuth ──
app.get('/auth', async (c) => {
  const shop = c.req.query('shop');
  if (!shop) return c.text('Missing shop parameter', 400);

  console.log('Starting OAuth for:', shop);

  const state = Math.random().toString(36).substring(2, 15);
  await c.env.SESSIONS.put(`state_${shop}`, state, { expirationTtl: 300 });

  const forwardedHost = c.req.header('x-forwarded-host');
  const forwardedProto = c.req.header('x-forwarded-proto') || 'https';
  const currentHost = c.req.header('host');

  let host = currentHost;
  if (forwardedHost) {
    const tunnelHost = forwardedHost.split(',')[0].trim();
    host = tunnelHost;
  }

  let redirectUri = `${forwardedProto}://${host}/auth/callback`;
  if (c.env.APP_URL && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    redirectUri = `${c.env.APP_URL}/auth/callback`;
  }

  const authUrl =
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${c.env.SHOPIFY_API_KEY}` +
    `&scope=${c.env.SHOPIFY_SCOPES}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`;

  console.log('redirectUri:', redirectUri);
  console.log('authUrl built ✅');

  return c.redirect(authUrl);
});

// ── AUTH CALLBACK — Receives authorization code ─────────
app.get('/auth/callback', async (c) => {
  console.log('OAuth callback hit');

  const shop = c.req.query('shop');
  const code = c.req.query('code');
  const state = c.req.query('state');

  if (!shop || !code) {
    return c.text('Invalid OAuth callback — missing shop or code', 400);
  }

  if (state) {
    const savedState = await c.env.SESSIONS.get(`state_${shop}`);
    if (!savedState || state !== savedState) {
      return c.text('Invalid state', 403);
    }
    await c.env.SESSIONS.delete(`state_${shop}`);
  }

  try {
    const db = getDrizzle(c.env);

    console.log('Exchanging auth code...');
    const { access_token } = await exchangeToken(shop, code, c.env);
    if (!access_token) throw new Error('No access token from Shopify');

    await c.env.SESSIONS.put(`token_${shop}`, access_token);

    const shopData = await shopifyAPI(shop, access_token, 'shop.json');
    const { id, name, email, domain, currency, timezone, iana_timezone } = shopData.shop;

    // Save installing shop to D1 Drizzle
    await upsertShop(db, {
      id,
      myshopify_domain: shop,
      name,
      email,
      domain,
      currency,
      timezone,
      iana_timezone,
      access_token,
      is_active: true
    });

    try {
      // 1. Create or update default invoice language
      console.log(`Setting default invoice language for shop ${id}`);
      await upsertInvoiceLanguage(db, id, {});

      // 2. Create or update default invoice settings
      console.log(`Setting default invoice settings for shop ${id}`);
      const templateSettings = {
        taxes: {
          taxNumber: "VAT: 98787845",
          taxHideZero: false,
          taxIndividual: true,
          taxEachProduct: true
        },
        discount: {
          hideDiscountZero: false,
          showDiscountAfterSubtotal: true,
          hideDiscountTotalPriceZero: false,
          showDiscountAppliedOriginalPrice: true
        },
        shipping: {
          showShippingMethod: true,
          hideShippingFreeDelivery: false
        }
      };

      await upsertInvoiceSettings(db, id, {
        business_name: name,
        brand_name: name,
        sender_address: shopData.shop.customer_email || email,
        support_email: shopData.shop.customer_email || email,
        business_address: shopData.shop.address1,
        city: shopData.shop.city,
        country: shopData.shop.country_name,
        phone: shopData.shop.phone,
        zip_code: shopData.shop.zip,
        template_settings: JSON.stringify(templateSettings)
      });

      // 3. Trigger full Shopify data sync
      if (c.env.SYNC_QUEUE) {
        console.log(`Triggering Shopify sync for shop ${shop}`);
        await c.env.SYNC_QUEUE.send({
          shop_id: id,
          domain: shop,
          models: ['products', 'orders', 'customers', 'fulfillments']
        });
      } else {
        console.warn('SYNC_QUEUE is not bound, skipping full sync.');
      }
    } catch (err) {
      console.error('Error during post-install setup:', err);
    }

    // Register all real-time webhooks in the background
    c.executionCtx.waitUntil(registerAllWebhooks(shop, access_token, c.env));

    const appUrl = `https://${shop}/admin/apps/${c.env.SHOPIFY_API_KEY}`;
    return c.redirect(appUrl);

  } catch (error) {
    console.error('OAuth Callback Error:', error.message);
    return c.text(`Authentication failed: ${error.message}`, 500);
  }
});

// ── WEBHOOK ROUTE — Handles incoming Shopify webhooks ───
app.post('/webhooks/shopify', handleWebhook);

// ── API SUB-ROUTES ──────────────────────────────────────
app.route('/api', apiRoutes);

// ── ERROR HANDLERS ────────────────────────────────────
app.notFound((c) => {
  return c.text('Not Found', 404);
});

app.onError((err, c) => {
  console.error('Hono Error:', err);
  return c.text('Internal Server Error', 500);
});

// ── WORKER EXPORT WITH QUEUE CONSUMER BINDINGS ──────────
export default {
  async fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  },
  async queue(batch, env) {
    console.log(`🌀 [Queue Worker] Received sync batch of size: ${batch.messages.length}`);
    const db = getDrizzle(env);
    for (const message of batch.messages) {
      const syncMessage = message.body;
      await processSyncMessage(db, syncMessage);
    }
  },
  async scheduled(event, env, ctx) {
    console.log(`⏰ [Cron Worker] Triggered scheduled Shopify sync at ${event.cron}`);
    const db = getDrizzle(env);
    
    try {
      // Fetch all active shops
      const activeShops = await db.select().from(shops).where(eq(shops.is_active, true));
      
      for (const shop of activeShops) {
        if (env.SYNC_QUEUE) {
          console.log(`✉️ Queuing daily sync for shop ${shop.myshopify_domain}`);
          await env.SYNC_QUEUE.send({
            shopId: shop.id,
            shopDomain: shop.myshopify_domain,
            accessToken: shop.access_token,
          });
        }
      }
    } catch (err) {
      console.error('Error during scheduled sync:', err);
    }
  }
};