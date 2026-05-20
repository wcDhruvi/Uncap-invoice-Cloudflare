import { getDrizzle } from '../../../db/drizzle';
import { getShopByDomain, getInvoicesByShop, createInvoice } from '../../../db/dbHelpers';

// ── GET /invoices — Retrieve all invoices for the authenticated shop ───
export const getInvoices = async (c) => {
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
};

// ── POST /invoices — Create/issue a new invoice ────────
export const createNewInvoice = async (c) => {
  const payload = c.req.valid('json');
  const db = getDrizzle(c.env);

  try {
    const result = await createInvoice(db, payload);
    return c.json(result);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
};
