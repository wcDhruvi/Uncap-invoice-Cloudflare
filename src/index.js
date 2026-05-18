import { Hono } from 'hono';
import { gql, GraphQLClient } from 'graphql-request';
import apiRoutes from './routes/api';
import { handleWebhook } from './webhooks/shopify';
import { getDrizzle } from './db/drizzle';
import { getShopByDomain, upsertShop } from './db/dbHelpers';
import { getShopifyClient } from './utils/shopifyClient';
import { processSyncMessage } from './utils/queueConsumer';
import { exchangeToken, shopifyAPI, registerAllWebhooks } from './utils/shopHelpers';

const app = new Hono();

// ── GRAPHQL QUERY ──────────────────────────────────────

const SHOP_QUERY = gql`
  query {
    shop {
      id
      name
      email
      primaryDomain {
        host
      }
      currencyCode
      ianaTimezone
      shopOwnerName
      plan {
        shopifyPlus
        publicDisplayName
      }
      billingAddress {
        province
        country
        city
      }
      currencyFormats {
        moneyFormat
        moneyWithCurrencyFormat
      }
      weightUnit
    }
  }
`;

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

// ── API/SHOP ROUTE — Session token exchange & registration ──
app.get('/api/shop', async (c) => {
  const authorization = c.req.header('Authorization');
  if (!authorization) {
    return c.json({ error: 'Missing Authorization header' }, 401);
  }

  console.log('API /api/shop hit');
  const shopify = getShopifyClient(c.env);
  const db = getDrizzle(c.env);

  let shopDomain = '';
  let sessionToken = '';

  // Dual Auth mode: Decodes JWT Bearer or parses URL fallback
  if (authorization.startsWith('Bearer ')) {
    sessionToken = authorization.substring(7);
    try {
      const decoded = await shopify.session.decodeSessionToken(sessionToken);
      shopDomain = decoded.dest.replace(/^https?:\/\//, '');
      console.log('Decoded shop domain from JWT:', shopDomain);
    } catch (err) {
      console.error('Failed to decode App Bridge session token:', err);
      return c.json({ error: 'Invalid Session Token' }, 401);
    }
  } else {
    try {
      const params = JSON.parse(authorization);
      shopDomain = params.shop;
      console.log('Extracted shop from URL search params:', shopDomain);
    } catch (e) {
      return c.json({ error: 'Invalid Authorization header format' }, 401);
    }
  }

  if (!shopDomain) {
    return c.json({ error: 'Missing shop domain' }, 400);
  }

  try {
    let shop = await getShopByDomain(db, shopDomain);
    const wasUninstalled = shop && shop.is_active === false;

    if (!shop || wasUninstalled || !shop.access_token) {
      if (!sessionToken) {
        return c.json({ error: 'OAuth Session Token required for fresh installation' }, 401);
      }

      console.log(`🔑 Performing official Token Exchange for: ${shopDomain}`);
      console.log('SessionToken length:', sessionToken?.length);

      // Trade App Bridge JWT for offline token using official SDK
      const response = await shopify.auth.tokenExchange({
        sessionToken,
        shop: shopDomain,
        requestedTokenType: 'urn:shopify:params:oauth:token-type:offline-access-token',
      });

      const session = response?.session;
      const token = session?.accessToken || session?.token;
      console.log('Exchanged token extracted:', token ? `YES (length: ${token.length})` : 'NO');

      console.log(`📝 Fetching shop details via graphql-request...`);
      const graphQLClient = new GraphQLClient(`https://${shopDomain}/admin/api/2025-01/graphql.json`, {
        headers: {
          'X-Shopify-Access-Token': token,
        },
      });

      const gqlResponse = await graphQLClient.request(SHOP_QUERY);
      const shopInfo = gqlResponse?.shop;

      if (!shopInfo) {
        throw new Error('GraphQL query returned empty shop profile info.');
      }

      let shopIdRaw = shopInfo.id;
      if (shopIdRaw && typeof shopIdRaw === 'string') {
        const parts = shopIdRaw.split('/');
        shopIdRaw = parts[parts.length - 1];
      }
      const id = parseInt(shopIdRaw, 10);

      // Map details to our Drizzle upsert payload
      const upsertData = {
        id,
        myshopify_domain: shopDomain,
        name: shopInfo.name,
        email: shopInfo.email,
        domain: shopInfo.primaryDomain?.host || '',
        currency: shopInfo.currencyCode,
        timezone: shopInfo.ianaTimezone,
        iana_timezone: shopInfo.ianaTimezone,
        access_token: token,
        is_active: true
      };

      await upsertShop(db, upsertData);
      console.log(`🔄 Shop ${shopDomain} successfully installed/updated in Drizzle D1`);

      // Register all real-time webhooks in the background
      c.executionCtx.waitUntil(registerAllWebhooks(shopDomain, token, c.env));

      // ✉️ Send background sync task to Cloudflare Queue
      if (c.env.SYNC_QUEUE) {
        console.log(`✉️ Sending sync message to Cloudflare Queue for: ${shopDomain}`);
        await c.env.SYNC_QUEUE.send({
          shopId: id,
          shopDomain,
          accessToken: token,
        });
      } else {
        console.log(`⚠️ SYNC_QUEUE not bound. Running async fallback with c.executionCtx.waitUntil`);
        c.executionCtx.waitUntil(
          processSyncMessage(db, { shopId: id, shopDomain, accessToken: token })
        );
      }

      shop = await getShopByDomain(db, shopDomain);
    }

    const responseData = { ...shop };
    delete responseData.access_token;

    return c.json({ shop: responseData });

  } catch (error) {
    console.error('Error getting shop details:', error);
    return c.json({ error: error.message }, 500);
  }
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
  }
};