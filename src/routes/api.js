import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { getDrizzle } from '../db/drizzle';
import { getShopByDomain, getInvoicesByShop, createInvoice } from '../db/dbHelpers';
import { sessionVerifier } from '../middleware/sessionVerifier';

const api = new Hono();

// Apply session verification globally to all API sub-routes
api.use('*', sessionVerifier);

// Zod validation schema for creating invoices
const createInvoiceSchema = z.object({
  shop_id: z.union([z.number(), z.string().transform(v => parseInt(v, 10))]),
  order_id: z.union([z.number(), z.string().transform(v => parseInt(v, 10))]).optional(),
  invoice_number: z.string().min(1),
  amount: z.union([z.number(), z.string().transform(v => parseFloat(v))]).optional(),
  status: z.enum(['draft', 'sent', 'paid', 'void']).optional(),
  due_date: z.string().optional(),
  notes: z.string().optional(),
});

// ── GET /invoices — Retrieve all invoices for the authenticated shop ───
api.get('/invoices', async (c) => {
  const shopDomain = c.get('shopDomain');
  const db = getDrizzle(c.env);
  
  // Fetch shop by its domain using Drizzle ORM
  const shop = await getShopByDomain(db, shopDomain);
  if (!shop) {
    return c.json([]);
  }

  // Fetch shop's invoices using Drizzle ORM
  const invoices = await getInvoicesByShop(db, shop.id);
  return c.json(invoices);
});

// ── POST /invoices — Create/issue a new invoice ────────
api.post('/invoices', zValidator('json', createInvoiceSchema), async (c) => {
  const payload = c.req.valid('json');
  const db = getDrizzle(c.env);

  try {
    const result = await createInvoice(db, payload);
    return c.json(result);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

export default api;
