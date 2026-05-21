import { getDrizzle } from '../../../db/drizzle';
import { getShopByDomain, getInvoiceSettingsByShop, upsertInvoiceSettings } from '../../../db/dbHelpers';
import { uploadFile } from '../../../utils/uploadFile';
import { GraphQLClient } from 'graphql-request';
import { invoiceSettings } from '../../../db/schema';

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

// ── GET /invoiceSettings — Retrieve settings for the authenticated shop ───
export const getInvoiceSettings = async (c) => {

  console.log("call getInvoiceSettings------------------------------------------");
  const shopDomain = c.get('shopDomain');
  const db = getDrizzle(c.env);

  const shop = await getShopByDomain(db, shopDomain);
  if (!shop) {
    return c.json({ error: 'Shop not found' }, 404);
  }

  let settings = await getInvoiceSettingsByShop(db, shop.id);
  if (!settings) {
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

    const addressStr = [shop.address1, shop.address2].filter(Boolean).join(', ') || '';

    const defaultSettings = {
      shop_id: shop.id,
      brand_name: shop.name || null,
      business_name: shop.name || null,
      business_address: addressStr || null,
      street: shop.address1 || '',
      apartment: shop.address2 || '',
      state: shop.province || '',
      additional_info: '',
      city: shop.city || '',
      country: shop.country_name || shop.country || '',
      zip_code: shop.zip || '',
      phone: shop.phone || '',
      company_website: shop.domain || '',
      support_email: shop.customer_email || shop.email || '',
      sender_name: shop.name || 'Uncap',
      sender_address: shop.customer_email || shop.email || 'support@uncap.com',
      invoice_template: 'Design 1',
      primary_color: '#8257d0',
      secondary_color: '#f0ecf9',
      primary_text_color: '#ffffff',
      invoice_text_color: '#000000',
      heading_font: 'Roboto',
      body_font: 'Open Sans',
      paper_size: 'A4',
      date_format: 'MM/dd/yyyy',
      default_due_date: 0,
      send_invoice: 'manuall',
      auto_invoice_send_condition: 'created',
      new_order_email_title: `Invoice {{ number }} from ${shop.name || 'Uncap'}`,
      new_order_email_content: ` <p>Dear {{ client.first_name }},</p><p>Please find the attached invoice for your order {{ number }}.</p><p>Please contact us for further support.</p><p>Thank you again for your order.</p><p>We hope you enjoyed shopping with us.</p><p><br></p><p>Best regards,</p><p>${shop.name || 'Uncap'}</p>`,
      edited_order_email_title: `Updated invoice {{ number }} from ${shop.name || 'Uncap'}`,
      edited_order_email_content: `<p>Dear {{ client.first_name }},</p><p>Please find the updated invoice for your order {{ number }}.</p><p>Please contact us for further support.</p><p>Thank you again for your order.</p><p>We hope you enjoyed shopping with us.</p><p><br></p><p>Best regards,</p><p>${shop.name || 'Uncap'}</p>`,
      cancelled_order_email_title: `Updated invoice {{ number }} from ${shop.name || 'Uncap'}`,
      cancelled_order_email_content: `<p>Dear {{ client.first_name }},</p><p>Please find the updated invoice for your order {{ number }}.</p><p>Please contact us for further support.122</p><p>Thank you again for your order.</p><p>We hope you enjoyed shopping with us.</p><p><br></p><p>Best regards,</p><p>${shop.name || 'Uncap'}</p>`,
      footer_note: '',
      show_image: false,
      show_sku: false,
      show_barcode: false,
      show_weight: false,
      show_hs_code: false,
      show_country: false,
      show_payment_gateway: false,
      show_card_type: false,
      show_card_last_digit: false,
      show_currency_code: false,
      show_item_total: false,
      show_total_quantity: false,
      show_payment_details: false,
      show_payment_link: false,
      show_order_note: false,
      not_show_zero_outstanding: true,
      template_settings: JSON.stringify(templateSettings)
    };

    try {
      await db.insert(invoiceSettings).values(defaultSettings);
      settings = await getInvoiceSettingsByShop(db, shop.id);
    } catch (insertError) {
      settings = await getInvoiceSettingsByShop(db, shop.id);
      if (!settings) {
        return c.json({ error: 'Failed to create default settings: ' + insertError.message }, 500);
      }
    }
  }

  const camelSettings = snakeToCamel(settings);
  if (camelSettings.templateSettings && typeof camelSettings.templateSettings === 'string') {
    try {
      camelSettings.templateSettings = JSON.parse(camelSettings.templateSettings);
    } catch (e) {
      camelSettings.templateSettings = {};
    }
  } else if (!camelSettings.templateSettings) {
    camelSettings.templateSettings = {};
  }

  return c.json(camelSettings);
};

// ── PUT /invoiceSettings — Update settings for the authenticated shop ────────
export const updateInvoiceSettings = async (c) => {

  console.log("call updateInvoiceSettings");
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

    // Serialize templateSettings if it's an object
    if (updatablePayload.templateSettings && typeof updatablePayload.templateSettings === 'object') {
      updatablePayload.templateSettings = JSON.stringify(updatablePayload.templateSettings);
    }

    const snakePayload = camelToSnake(updatablePayload);
    await upsertInvoiceSettings(db, shop.id, snakePayload);

    const settings = await getInvoiceSettingsByShop(db, shop.id);
    const camelSettings = snakeToCamel(settings);
    if (camelSettings.templateSettings && typeof camelSettings.templateSettings === 'string') {
      try {
        camelSettings.templateSettings = JSON.parse(camelSettings.templateSettings);
      } catch (e) {
        camelSettings.templateSettings = {};
      }
    } else if (!camelSettings.templateSettings) {
      camelSettings.templateSettings = {};
    }

    return c.json(camelSettings);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
};

// ── POST /invoiceSettings/upload-logo — Upload logo file to Shopify ──────────
export const uploadLogo = async (c) => {
  const shopDomain = c.get('shopDomain');
  const db = getDrizzle(c.env);
  const payload = await c.req.json();

  const fileParams = payload.file;
  if (!fileParams) {
    return c.json({ success: false, error: 'No file parameter provided' }, 400);
  }

  const shop = await getShopByDomain(db, shopDomain);
  if (!shop) {
    return c.json({ success: false, error: 'Shop not found' }, 404);
  }

  try {
    const result = await uploadFile(shop.myshopify_domain, shop.access_token, {
      filename: fileParams.filename,
      mimetype: fileParams.mimetype,
      encoding: fileParams.encoding,
      resource: fileParams.resource || 'IMAGE'
    });

    if (!result.success) {
      return c.json({ success: false, error: result.errors.join(', ') }, 400);
    }

    return c.json({ success: true, data: result.data });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
};

// ── POST /invoiceSettings/delete-logo — Delete logo file from Shopify ────────
export const deleteLogo = async (c) => {
  const shopDomain = c.get('shopDomain');
  const db = getDrizzle(c.env);
  const payload = await c.req.json();
  const fileId = payload.fileId || payload.fileIds?.[0];

  if (!fileId) {
    return c.json({ success: false, error: 'fileId is required' }, 400);
  }

  const shop = await getShopByDomain(db, shopDomain);
  if (!shop) {
    return c.json({ success: false, error: 'Shop not found' }, 404);
  }

  try {
    const client = new GraphQLClient(`https://${shop.myshopify_domain}/admin/api/2025-01/graphql.json`, {
      headers: { 'X-Shopify-Access-Token': shop.access_token },
    });

    const mutation = `
      mutation fileDelete($fileIds: [ID!]!) {
        fileDelete(fileIds: $fileIds) {
          deletedFileIds
          userErrors {
            field
            message
          }
        }
      }
    `;

    const res = await client.request(mutation, { fileIds: [fileId] });

    if (res.fileDelete?.userErrors?.length) {
      return c.json({ success: false, error: res.fileDelete.userErrors.map(e => e.message).join(', ') }, 400);
    }

    return c.json({ success: true, deletedFileIds: res.fileDelete.deletedFileIds });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
};
