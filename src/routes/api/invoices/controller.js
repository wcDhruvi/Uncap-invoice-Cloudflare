import { getDrizzle } from '../../../db/drizzle';
import { getShopByDomain, getInvoicesByShop, createInvoice } from '../../../db/dbHelpers';
import { eq, and } from 'drizzle-orm';
import { invoices, invoiceSettings, invoiceLanguages } from '../../../db/schema';
import { GraphQLClient } from 'graphql-request';
import { generatePDF, generatePdfFilename } from './utils/pdfUtils';
import { uploadFile } from '../../../utils/uploadFile';

const GET_ORDER_DETAILS = `
  query GetOrderDetails($id: ID!) {
    order(id: $id) {
      id
      name
      email
      phone
      subtotalPriceSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      totalPriceSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      totalDiscountsSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      totalTaxSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      createdAt
      note
      billingAddress {
        name
        firstName
        lastName
        address1
        address2
        city
        province
        zip
        country
        phone
      }
      shippingAddress {
        name
        firstName
        lastName
        address1
        address2
        city
        province
        zip
        country
        phone
      }
      shippingLines(first: 5) {
        edges {
          node {
            title
            originalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
          }
        }
      }
      transactions(first: 5) {
        amountSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        gateway
        processedAt
        paymentDetails {
          ... on CardPaymentDetails {
            bin
            company
            number
            name
            paymentMethodName
            wallet
            expirationMonth
            expirationYear
          }
          ... on LocalPaymentMethodsPaymentDetails {
            paymentMethodName
          }
          ... on ShopPayInstallmentsPaymentDetails {
            paymentMethodName
          }
        }
      }
      lineItems(first: 100) {
        edges {
          node {
            id
            name
            title
            quantity
            originalUnitPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            discountAllocations {
              allocatedAmountSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
            }
            sku
            vendor
            variant {
              id
              sku
              barcode
              image {
                url
              }
              inventoryItem {
                countryCodeOfOrigin
                harmonizedSystemCode
              }
            }
          }
        }
      }
    }
  }
`;

function snakeToCamelObject(obj) {
  if (!obj) return {};
  const res = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    res[camelKey] = obj[key];
    res[key] = obj[key];
  }
  return res;
}

export async function generateAndUploadPdfForInvoice(db, shop, invoiceRecord) {
  const orderId = invoiceRecord.order_id;
  const client = new GraphQLClient(`https://${shop.myshopify_domain}/admin/api/2025-01/graphql.json`, {
    headers: { 'X-Shopify-Access-Token': shop.access_token },
  });

  const orderIdStr = String(orderId);
  const orderGlobalId = orderIdStr.startsWith('gid://') ? orderIdStr : `gid://shopify/Order/${orderIdStr}`;

  const response = await client.request(GET_ORDER_DETAILS, { id: orderGlobalId });
  const shopifyOrder = response.order;
  if (!shopifyOrder) {
    throw new Error(`Order ${orderId} not found in Shopify`);
  }

  // Map Order Details
  const order = {
    id: shopifyOrder.id,
    name: shopifyOrder.name || String(orderId),
    email: shopifyOrder.email,
    phone: shopifyOrder.phone,
    subtotalPrice: shopifyOrder.subtotalPriceSet?.shopMoney?.amount || '0',
    totalPrice: shopifyOrder.totalPriceSet?.shopMoney?.amount || '0',
    totalTax: shopifyOrder.totalTaxSet?.shopMoney?.amount || '0',
    totalDiscounts: shopifyOrder.totalDiscountsSet?.shopMoney?.amount || '0',
    totalShipping: shopifyOrder.shippingLines?.edges?.reduce((sum, e) => sum + parseFloat(e.node.originalPriceSet?.shopMoney?.amount || '0'), 0) || 0,
    currency: shopifyOrder.totalPriceSet?.shopMoney?.currencyCode || 'USD',
    createdAt: shopifyOrder.createdAt,
    note: shopifyOrder.note,
    discountCodes: [],
    billingAddress: shopifyOrder.billingAddress || {},
    shippingAddress: shopifyOrder.shippingAddress || {},
    lineItems: {
      edges: shopifyOrder.lineItems?.edges?.map(edge => {
        const node = edge.node;
        const totalDiscount = node.discountAllocations?.reduce((sum, da) => sum + parseFloat(da.allocatedAmountSet?.shopMoney?.amount || '0'), 0) || 0;
        return {
          node: {
            id: node.id,
            name: node.name,
            title: node.title,
            quantity: node.quantity,
            price: parseFloat(node.originalUnitPriceSet?.shopMoney?.amount || '0'),
            totalDiscount: totalDiscount,
            sku: node.sku,
            vendor: node.vendor,
            variant: node.variant ? {
              id: node.variant.id,
              sku: node.variant.sku,
              barcode: node.variant.barcode,
              image: node.variant.image,
              inventoryItem: node.variant.inventoryItem ? {
                countryCodeOfOrigin: node.variant.inventoryItem.countryCodeOfOrigin,
                harmonizedSystemCode: node.variant.inventoryItem.harmonizedSystemCode
              } : null
            } : null
          }
        };
      }) || []
    },
    shippingLines: shopifyOrder.shippingLines || { edges: [] }
  };

  const transactionData = shopifyOrder.transactions?.[0] || null;

  // Fetch Settings
  const settingsResult = await db.select().from(invoiceSettings).where(eq(invoiceSettings.shop_id, shop.id)).limit(1);
  const settingsRecord = settingsResult[0] || {};

  let templateSettings = {};
  if (settingsRecord.template_settings) {
    try {
      templateSettings = JSON.parse(settingsRecord.template_settings);
    } catch (e) {
      console.error('Failed to parse template_settings:', e);
    }
  }

  const camelSettings = snakeToCamelObject(settingsRecord);
  const settings = {
    ...camelSettings,
    templateSettings
  };

  const languagesResult = await db.select().from(invoiceLanguages).where(eq(invoiceLanguages.shop_id, shop.id)).limit(1);
  const language = snakeToCamelObject(languagesResult[0] || {});

  const invoice = snakeToCamelObject(invoiceRecord);

  // Generate PDF
  console.log(`Generating PDF for order: ${order.name || order.id}`);
  const pdfBuffer = await generatePDF(invoice, order, settings, language, transactionData);

  // Upload PDF to Shopify
  const filename = generatePdfFilename(invoiceRecord.invoice_number, shop.myshopify_domain);
  const uploadResult = await uploadFile(shop.myshopify_domain, shop.access_token, {
    filename,
    mimetype: 'application/pdf',
    encoding: pdfBuffer.toString('base64'),
    resource: 'FILE'
  });

  if (!uploadResult.success) {
    throw new Error(`Failed to upload PDF: ${uploadResult.errors.join(', ')}`);
  }

  const pdfUrl = uploadResult.data?.file?.url;
  const pdfUrlId = uploadResult.data?.file?.id;

  if (!pdfUrl) {
    throw new Error('Upload succeeded but no PDF URL was returned');
  }

  // Update database record
  const updatedInvoices = await db.update(invoices)
    .set({
      pdf_url: pdfUrl,
      pdf_url_id: pdfUrlId,
      updated_at: new Date().toISOString()
    })
    .where(eq(invoices.id, invoiceRecord.id))
    .returning();

  return updatedInvoices[0];
}

// ── GET /invoices — Retrieve all invoices for the authenticated shop ───
export const getInvoices = async (c) => {
  const shopDomain = c.get('shopDomain');
  const db = getDrizzle(c.env);

  const shop = await getShopByDomain(db, shopDomain);
  if (!shop) {
    return c.json([]);
  }

  const invoicesList = await getInvoicesByShop(db, shop.id);
  return c.json(invoicesList);
};

// ── POST /invoices — Create/issue a new invoice ────────
export const createNewInvoice = async (c) => {
  const payload = await c.req.json();
  const shopDomain = c.get('shopDomain');
  const db = getDrizzle(c.env);

  try {
    const shop = await getShopByDomain(db, shopDomain);
    if (!shop) {
      return c.json({ error: 'Shop not found' }, 404);
    }

    const { orderId } = payload;
    if (!orderId) {
      return c.json({ error: 'orderId is required' }, 400);
    }

    const numericOrderId = parseInt(String(orderId).replace(/\D/g, ''), 10);

    // Check if an invoice already exists for this order
    const existingInvoices = await db.select()
      .from(invoices)
      .where(
        and(
          eq(invoices.order_id, numericOrderId),
          eq(invoices.shop_id, shop.id)
        )
      )
      .limit(1);

    if (existingInvoices.length > 0) {
      let invoiceRecord = existingInvoices[0];
      if (!invoiceRecord.pdf_url || invoiceRecord.pdf_url.includes('placeholder')) {
        try {
          invoiceRecord = await generateAndUploadPdfForInvoice(db, shop, invoiceRecord);
        } catch (pdfErr) {
          console.error(`Failed to generate/upload PDF for existing invoice during createNewInvoice:`, pdfErr);
        }
      }
      return c.json(invoiceRecord);
    }

    const invoiceNumber = `INV-${Date.now()}`;
    const newInvoiceData = {
      invoice_number: invoiceNumber,
      order_id: numericOrderId,
      shop_id: shop.id,
      status: 'draft',
      pdf_url: 'https://example.com/placeholder.pdf'
    };

    const createdInvoices = await createInvoice(db, newInvoiceData);
    let newInvoice = createdInvoices[0];
    
    try {
      newInvoice = await generateAndUploadPdfForInvoice(db, shop, newInvoice);
      console.log(`Successfully generated and uploaded PDF for invoice ${newInvoice.id}`);
    } catch (pdfErr) {
      console.error(`Failed to generate/upload PDF during invoice creation:`, pdfErr);
    }

    return c.json(newInvoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    return c.json({ error: error.message }, 500);
  }
};

// ── POST /invoices/:id/send — Send an invoice email ────────
export const sendInvoiceEmail = async (c) => {
  const invoiceId = parseInt(c.req.param('id'), 10);
  const payload = await c.req.json().catch(() => ({}));
  const invoiceFor = payload.invoiceFor || "new";
  
  const shopDomain = c.get('shopDomain');
  const db = getDrizzle(c.env);

  try {
    const shop = await getShopByDomain(db, shopDomain);
    if (!shop) {
      return c.json({ error: 'Shop not found' }, 404);
    }

    const invoiceRecords = await db.select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.shop_id, shop.id)))
      .limit(1);

    if (invoiceRecords.length === 0) {
      return c.json({ error: 'Invoice not found' }, 404);
    }
    let invoice = invoiceRecords[0];

    // Generate/Upload PDF if it doesn't exist or is a placeholder
    if (invoiceFor !== "cancel") {
      if (!invoice.pdf_url || invoice.pdf_url.includes('placeholder')) {
        invoice = await generateAndUploadPdfForInvoice(db, shop, invoice);
      }
    }

    // Update status to 'sent' and set sent_at
    if (invoiceFor !== "cancel") {
      const updated = await db.update(invoices)
        .set({ 
          status: 'sent', 
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .where(eq(invoices.id, invoice.id))
        .returning();
      invoice = updated[0];
      console.log(`Invoice ${invoice.id} marked as sent.`);
    }

    return c.json({
      success: true,
      message: `${invoiceFor} email marked as sent`,
      invoiceId: invoice.id,
      pdf_url: invoice.pdf_url
    });
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return c.json({ error: error.message }, 500);
  }
};

// ── GET /invoices/by-order — Retrieve or create an invoice for a specific order ──
export const getInvoiceByOrder = async (c) => {
  const shopDomain = c.get('shopDomain');
  const db = getDrizzle(c.env);

  try {
    const shop = await getShopByDomain(db, shopDomain);
    if (!shop) {
      return c.json({ error: 'Shop not found' }, 404);
    }

    const orderIdStr = c.req.query('orderId') || c.req.header('orderId');
    const regenerateStr = c.req.query('regenerate') || c.req.header('regenerate');

    if (!orderIdStr) {
      return c.json({ error: 'orderId is required' }, 400);
    }

    const orderId = parseInt(String(orderIdStr).replace(/\D/g, ''), 10);
    const regenerate = regenerateStr === 'true';

    // Check if an invoice already exists for this order
    const existingInvoices = await db.select()
      .from(invoices)
      .where(
        and(
          eq(invoices.order_id, orderId),
          eq(invoices.shop_id, shop.id)
        )
      )
      .limit(1);

    let invoiceRecord;

    if (existingInvoices.length > 0) {
      invoiceRecord = existingInvoices[0];
      if (regenerate || !invoiceRecord.pdf_url || invoiceRecord.pdf_url.includes('placeholder')) {
        invoiceRecord = await generateAndUploadPdfForInvoice(db, shop, invoiceRecord);
      }
    } else {
      const invoiceNumber = `INV-${Date.now()}`;
      const newInvoiceData = {
        invoice_number: invoiceNumber,
        order_id: orderId,
        shop_id: shop.id,
        status: 'draft',
        pdf_url: 'https://example.com/placeholder.pdf'
      };

      const createdInvoices = await createInvoice(db, newInvoiceData);
      invoiceRecord = createdInvoices[0];
      
      try {
        invoiceRecord = await generateAndUploadPdfForInvoice(db, shop, invoiceRecord);
      } catch (pdfErr) {
        console.error(`Failed to generate/upload PDF during creation in getInvoiceByOrder:`, pdfErr);
      }
    }

    return c.json(invoiceRecord);
  } catch (error) {
    console.error('Error in getInvoiceByOrder:', error);
    return c.json({ error: error.message }, 500);
  }
};
