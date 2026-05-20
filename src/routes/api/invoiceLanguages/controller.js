import { getDrizzle } from '../../../db/drizzle';
import { getShopByDomain, getInvoiceLanguageByShop, upsertInvoiceLanguage } from '../../../db/dbHelpers';

// ── GET /invoiceLanguages — Retrieve language settings for the authenticated shop ───
export const getInvoiceLanguage = async (c) => {
  const shopDomain = c.get('shopDomain');
  const db = getDrizzle(c.env);

  const shop = await getShopByDomain(db, shopDomain);
  if (!shop) {
    return c.json({ error: 'Shop not found' }, 404);
  }

  const language = await getInvoiceLanguageByShop(db, shop.id);
  if (!language) {
    return c.json({ error: 'Language settings not found' }, 404);
  }

  return c.json(language);
};

// ── PUT /invoiceLanguages — Update language settings for the authenticated shop ────────
export const updateInvoiceLanguage = async (c) => {
  const shopDomain = c.get('shopDomain');
  const db = getDrizzle(c.env);
  const payload = await c.req.json();

  try {
    const shop = await getShopByDomain(db, shopDomain);
    if (!shop) {
      return c.json({ error: 'Shop not found' }, 404);
    }

    const result = await upsertInvoiceLanguage(db, shop.id, payload);
    return c.json(result);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
};
