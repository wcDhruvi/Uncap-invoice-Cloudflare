import { Hono } from 'hono';

const app = new Hono();

// This is a basic placeholder for Shopify OAuth routing
app.get('/', (c) => {
  return c.text('Cloudflare Worker Backend is running. Please access the app via Shopify Admin.');
});

// API endpoint to fetch data from the Cloudflare D1 Database
app.get('/api/invoices', async (c) => {
  try {
    
    // c.env.DB matches the binding name we set in wrangler.jsonc
    const { results } = await c.env.DB.prepare('SELECT * FROM invoices ORDER BY id DESC').all();
    return c.json(results);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.get('/auth', (c) => {
  const shop = c.req.query('shop');
  if (!shop) {
    return c.text('Missing shop parameter', 400);
  }
  // Construct OAuth URL here
  const clientId = c.env.SHOPIFY_API_KEY || '';
  const scopes = 'read_products,write_products'; // Adjust scopes as needed
  const redirectUri = `https://${c.req.header('host')}/auth/callback`;
  
  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}`;
  
  return c.redirect(authUrl);
});

app.get('/auth/callback', (c) => {
  const shop = c.req.query('shop');
  const code = c.req.query('code');
  const host = c.req.query('host');
  
  if (!shop || !code) {
    return c.text('Invalid OAuth callback', 400);
  }

  // TODO: Validate HMAC, exchange code for access token, store it in Cloudflare KV or D1

  // After successful install, redirect back to the embedded app
  const appUrl = `https://${shop}/admin/apps/${c.env.SHOPIFY_API_KEY}`;
  return c.redirect(appUrl);
});

export default app;
