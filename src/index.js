import { Hono } from 'hono';
import apiRoutes from './routes/api';
import { handleWebhook } from './webhooks/shopify';
import { ShopModel } from './db/models';
import { exchangeToken, shopifyAPI } from './utils/shopHelpers';

const app = new Hono();

// ── LOGGING ───────────────────────────────────────────
app.use('*', async (c, next) => {
  console.log(`[${c.req.method}] ${c.req.url}`);
  return await next();
});

// ── ROOT — Shopify opens this first ───────────────────
app.get('/', (c) => {
  const shop = c.req.query('shop');
  const host = c.req.query('host');

  console.log('Root hit — shop:', shop, 'host:', host);

  // ✅ If shop param exists, start OAuth
  if (shop) {
    return c.redirect(`/auth?shop=${shop}`);
  }

  return c.text('Uncap Invoice — Cloudflare Worker');
});

// ── ADMIN ROUTE — Shopify embedded app entry ──────────
// ✅ This handles: https://your-tunnel.ms/admin?shop=...
app.get('/admin', async (c) => {
  const shop = c.req.query('shop');
  const host = c.req.query('host');

  console.log('Admin hit — shop:', shop);

  if (!shop) {
    return c.text('Missing shop parameter', 400);
  }

  // Check if already installed
  const shopRecord = await ShopModel.getByDomain(c.env.DB, shop);
  if (!shopRecord || !shopRecord.access_token) {
    // Not installed — start OAuth
    console.log('Shop not installed, starting OAuth');
    return c.redirect(`/auth?shop=${shop}`);
  }

  // Already installed — serve the React app
  console.log('Shop installed, serving app');
  return c.env.ASSETS.fetch(c.req.raw);
});

// ── API ROUTES ────────────────────────────────────────
app.route('/api', apiRoutes);

// ── SHOP DETAILS ──────────────────────────────────────
app.get('/api/shop', async (c) => {
  const shop = c.req.query('shop');
  if (!shop) return c.json({ error: 'Missing shop' }, 400);
  const record = await ShopModel.getByDomain(c.env.DB, shop);
  return c.json(record || {});
});

// ── WEBHOOKS ──────────────────────────────────────────
app.post('/webhooks/shopify', handleWebhook);

// ── STEP 1: START OAUTH ───────────────────────────────
app.get('/auth', async (c) => {
  const shop = c.req.query('shop');

  // ✅ Better error message with all query params logged
  if (!shop) {
    console.error('Missing shop param — full URL:', c.req.url);
    console.error('All query params:', Object.fromEntries(
      new URL(c.req.url).searchParams
    ));
    return c.text('Missing shop parameter', 400);
  }

  console.log('Starting OAuth for:', shop);

  // Generate CSRF state
  const state = crypto.randomUUID();
  await c.env.SESSIONS.put(`state_${shop}`, state, {
    expirationTtl: 300
  });

  // ✅ Use APP_URL from env — reliable on Cloudflare
  let redirectUri = `${c.env.APP_URL}/auth/callback`;

  // Smart local override: If request is local/proxied via devtunnels, ngrok, or localhost, use the request host
  const host = c.req.header('x-forwarded-host') || c.req.header('host');
  if (host && (host.includes('localhost') || host.includes('devtunnels.ms') || host.includes('ngrok-free.app'))) {
    redirectUri = `https://${host}/auth/callback`;
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

// ── STEP 2: OAUTH CALLBACK ────────────────────────────
app.get('/auth/callback', async (c) => {
  console.log('OAuth callback hit');

  const shop = c.req.query('shop');
  const code = c.req.query('code');
  const state = c.req.query('state');

  console.log('shop:', shop);
  console.log('code:', code ? 'present' : 'MISSING');
  console.log('state:', state ? 'present' : 'missing');

  if (!shop || !code) {
    console.error('Missing params — shop:', shop, 'code:', code);
    return c.text('Invalid OAuth callback — missing shop or code', 400);
  }

  // Verify CSRF state
  if (state) {
    const savedState = await c.env.SESSIONS.get(`state_${shop}`);
    if (!savedState || state !== savedState) {
      console.error('State mismatch');
      return c.text('Invalid state', 403);
    }
    await c.env.SESSIONS.delete(`state_${shop}`);
  }

  try {
    const db = c.env.DB;

    // 1. Exchange code for token
    console.log('Exchanging token...');
    const { access_token, scope } = await exchangeToken(shop, code, c.env);
    console.log('Token received:', access_token ? 'YES ✅' : 'NO ❌');

    if (!access_token) throw new Error('No access token from Shopify');

    // 2. Save to KV
    await c.env.SESSIONS.put(`token_${shop}`, access_token);
    console.log('Saved to KV ✅');

    // 3. Get shop details
    const shopData = await shopifyAPI(shop, access_token, 'shop.json');
    const { id, name, email, domain, currency, timezone, iana_timezone } = shopData.shop;
    console.log('Shop details:', { id, name, email });

    // 4. Save to D1
    await ShopModel.upsert(db, {
      id,
      myshopify_domain: shop,
      name,
      email,
      domain,
      currency,
      timezone,
      iana_timezone,
      access_token,
      scope
    });
    console.log('Saved to D1 ✅');

    // 5. Redirect to app
    const appUrl = `https://${shop}/admin/apps/${c.env.SHOPIFY_API_KEY}`;
    console.log('Redirecting to:', appUrl);
    return c.redirect(appUrl);

  } catch (error) {
    console.error('OAuth Error:', error.message);
    return c.text(`Authentication failed: ${error.message}`, 500);
  }
});

// ── ERROR HANDLERS ────────────────────────────────────
app.notFound((c) => {
  console.log('404 — not found:', c.req.url);
  return c.text('Not Found', 404);
});

app.onError((err, c) => {
  console.error('Hono Error:', err);
  return c.text('Internal Server Error', 500);
});

export default { fetch: app.fetch };