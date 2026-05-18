import { Hono } from 'hono';
import { InvoiceModel, ShopModel } from '../db/models';

const api = new Hono();

// Get all invoices for a shop
api.get('/invoices', async (c) => {
  const shopDomain = c.req.query('shop');
  if (!shopDomain) return c.json({ error: 'Missing shop' }, 400);

  const db = c.env.DB;
  
  // In a real app, we would get the shopId from the authenticated session
  const shop = await ShopModel.getByDomain(db, shopDomain);
  
  if (!shop) return c.json([]);

  const invoices = await InvoiceModel.getAllByShop(db, shop.id);
  return c.json(invoices);
});

// Create a new invoice
api.post('/invoices', async (c) => {
  const payload = await c.req.json();
  const db = c.env.DB;

  try {
    const result = await InvoiceModel.create(db, payload);
    return c.json(result);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

export default api;
