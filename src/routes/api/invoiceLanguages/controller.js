import { getDrizzle } from '../../../db/drizzle';
import { getShopByDomain, getInvoiceLanguageByShop, upsertInvoiceLanguage } from '../../../db/dbHelpers';
import { invoiceLanguages } from '../../../db/schema';

// Helper: convert database record (snake_case) to frontend representation (camelCase)
function snakeToCamel(obj) {
  if (!obj) return null;
  const res = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    res[camelKey] = obj[key];
  }
  return res;
}

// Helper: convert frontend representation (camelCase) to database fields (snake_case)
function camelToSnake(obj) {
  if (!obj) return null;
  const res = {};
  for (const key of Object.keys(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    res[snakeKey] = obj[key];
  }
  return res;
}

// ── GET /invoiceLanguages — Retrieve language settings for the authenticated shop ───
export const getInvoiceLanguage = async (c) => {
  const shopDomain = c.get('shopDomain');
  const db = getDrizzle(c.env);

  const shop = await getShopByDomain(db, shopDomain);
  if (!shop) {
    return c.json({ error: 'Shop not found' }, 404);
  }

  let language = await getInvoiceLanguageByShop(db, shop.id);
  if (!language) {
    const defaultLanguage = {
      shop_id: shop.id,
      invoice: 'Invoice',
      invoice_number: 'Invoice#',
      invoice_date: 'INVOICE DATE',
      bill_to: 'Bill To',
      ship_to: 'Ship To',
      shipping_address: 'Shipping Address',
      billing_address: 'Billing Address',
      phone: 'Phone:',
      payment_info: 'Make all Checks payable to',
      item: 'ITEM',
      description: 'Description',
      qty: 'QTY',
      unit_price: 'Unit Price',
      total: 'Total',
      subtotal: 'Subtotal',
      discount: 'Discount',
      tax: 'Tax',
      shipping: 'Shipping',
      subtotal_after_discount: 'Subtotal after discount',
      thank_you_note: 'Thank you for your purchase.',
      notes: 'Notes:',
      term_condition_title: 'Terms & conditions',
      term_condition_content: '<p><strong>Terms:</strong></p><ul><li>This is a computer generated invoice and does not require signature.</li><li>For warranty and returns related information, please contact our customer support.</li></ul>',
      sku: 'SKU:',
      barcode: 'BARCODE:',
      weight: 'Weight:',
      hs_code: 'HS Code:',
      country_of_origin: 'Country Of Origin:',
      payment_details: 'Payment Details:',
      payment_gateway: 'Gateway:',
      card_type: 'Card:',
      card_number: 'Card#:',
    };

    try {
      await db.insert(invoiceLanguages).values(defaultLanguage);
      language = await getInvoiceLanguageByShop(db, shop.id);
    } catch (insertError) {
      language = await getInvoiceLanguageByShop(db, shop.id);
      if (!language) {
        return c.json({ error: 'Failed to create default languages: ' + insertError.message }, 500);
      }
    }
  }

  return c.json(snakeToCamel(language));
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

    // Strip read-only properties
    const { id, shopId, createdAt, updatedAt, ...updatablePayload } = payload;

    const snakePayload = camelToSnake(updatablePayload);
    await upsertInvoiceLanguage(db, shop.id, snakePayload);

    const language = await getInvoiceLanguageByShop(db, shop.id);
    return c.json(snakeToCamel(language));
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
};
