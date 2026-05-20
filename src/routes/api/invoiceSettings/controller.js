import { getDrizzle } from '../../../db/drizzle';
import { getShopByDomain, getInvoiceSettingsByShop, upsertInvoiceSettings } from '../../../db/dbHelpers';

// ── GET /invoiceSettings — Retrieve settings for the authenticated shop ───
export const getInvoiceSettings = async (c) => {
  const shopDomain = c.get('shopDomain');
  const db = getDrizzle(c.env);

  const shop = await getShopByDomain(db, shopDomain);
  if (!shop) {
    return c.json({ error: 'Shop not found' }, 404);
  }

  const settings = await getInvoiceSettingsByShop(db, shop.id);
  if (!settings) {
    return c.json({ error: 'Settings not found' }, 404);
  }

  return c.json(settings);
};

// ── PUT /invoiceSettings — Update settings for the authenticated shop ────────
export const updateInvoiceSettings = async (c) => {
  const shopDomain = c.get('shopDomain');
  const db = getDrizzle(c.env);
  const payload = await c.req.json();

  try {
    const shop = await getShopByDomain(db, shopDomain);
    if (!shop) {
      return c.json({ error: 'Shop not found' }, 404);
    }

    const result = await upsertInvoiceSettings(db, shop.id, payload);
    return c.json(result);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
};
