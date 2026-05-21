import { getShopifyClient } from '../../../utils/shopifyClient';
import { getDrizzle } from '../../../db/drizzle';
import { getShopByDomain, upsertShop, upsertInvoiceSettings, upsertInvoiceLanguage } from '../../../db/dbHelpers';
import { GraphQLClient } from 'graphql-request';
import { processSyncMessage } from '../../../utils/queueConsumer';
import { registerAllWebhooks } from '../../../utils/shopHelpers';
import { SHOP_QUERY } from './graphqlQuery';

export const getShopDetails = async (c) => {
  const authorization = c.req.header('Authorization');
  if (!authorization) {
    return c.json({ error: 'Missing Authorization header' }, 401);
  }

  const shopify = getShopifyClient(c.env);
  const db = getDrizzle(c.env);

  let shopDomain = '';
  let sessionToken = '';

  // Dual Auth mode: Decodes JWT Bearer or parses URL fallback
  if (authorization.startsWith('Bearer ')) {
    sessionToken = authorization.substring(7);
    try {
      const decoded = await shopify.session.decodeSessionToken(sessionToken);
      shopDomain = decoded.dest.replace(/^https?:\/\//, '');
      console.log('Decoded shop domain from JWT:', shopDomain);
    } catch (err) {
      console.error('Failed to decode App Bridge session token:', err);
      return c.json({ error: 'Invalid Session Token' }, 401);
    }
  } else {
    try {
      const params = JSON.parse(authorization);
      shopDomain = params.shop;
      console.log('Extracted shop from URL search params:', shopDomain);
    } catch (e) {
      return c.json({ error: 'Invalid Authorization header format' }, 401);
    }
  }

  if (!shopDomain) {
    return c.json({ error: 'Missing shop domain' }, 400);
  }

  try {
    let shop = await getShopByDomain(db, shopDomain);
    const wasUninstalled = shop && shop.is_active === false;

    if (!shop || wasUninstalled || !shop.access_token) {
      if (!sessionToken) {
        return c.json({ error: 'OAuth Session Token required for fresh installation' }, 401);
      }

      console.log(`🔑 Performing official Token Exchange for: ${shopDomain}`);
      console.log('SessionToken length:', sessionToken?.length);

      // Trade App Bridge JWT for offline token using official SDK
      const response = await shopify.auth.tokenExchange({
        sessionToken,
        shop: shopDomain,
        requestedTokenType: 'urn:shopify:params:oauth:token-type:offline-access-token',
      });

      const session = response?.session;
      const token = session?.accessToken || session?.token;
      console.log('Exchanged token extracted:', token ? `YES (length: ${token.length})` : 'NO');

      console.log(`📝 Fetching shop details via graphql-request...`);
      const graphQLClient = new GraphQLClient(`https://${shopDomain}/admin/api/2025-01/graphql.json`, {
        headers: {
          'X-Shopify-Access-Token': token,
        },
      });

      const gqlResponse = await graphQLClient.request(SHOP_QUERY);
      const shopInfo = gqlResponse?.shop;

      if (!shopInfo) {
        throw new Error('GraphQL query returned empty shop profile info.');
      }

      let shopIdRaw = shopInfo.id;
      if (shopIdRaw && typeof shopIdRaw === 'string') {
        const parts = shopIdRaw.split('/');
        shopIdRaw = parts[parts.length - 1];
      }
      const id = parseInt(shopIdRaw, 10);

      // Map details to our Drizzle upsert payload
      const upsertData = {
        id,
        myshopify_domain: shopDomain,
        name: shopInfo.name,
        email: shopInfo.email,
        domain: shopInfo.primaryDomain?.host || '',
        currency: shopInfo.currencyCode,
        timezone: shopInfo.ianaTimezone,
        iana_timezone: shopInfo.ianaTimezone,
        access_token: token,
        is_active: true
      };

      await upsertShop(db, upsertData);
      console.log(`🔄 Shop ${shopDomain} successfully installed/updated in Drizzle D1`);

      try {
        console.log(`Setting default invoice language for shop ${id}`);
        await upsertInvoiceLanguage(db, id, {
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
          card_number: 'Card#:'
        });
  
        console.log(`Setting default invoice settings for shop ${id}`);
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
  
        const addressStr = [shopInfo.billingAddress?.address1, shopInfo.billingAddress?.address2].filter(Boolean).join(', ') || '';

        await upsertInvoiceSettings(db, id, {
          brand_name: shopInfo.name,
          business_name: shopInfo.name,
          business_address: addressStr || null,
          street: shopInfo.billingAddress?.address1 || '',
          apartment: shopInfo.billingAddress?.address2 || '',
          state: shopInfo.billingAddress?.province || '',
          additional_info: '',
          city: shopInfo.billingAddress?.city || '',
          country: shopInfo.billingAddress?.country || '',
          zip_code: shopInfo.billingAddress?.zip || '',
          phone: shopInfo.billingAddress?.phone || '',
          company_website: shopInfo.primaryDomain?.url || shopInfo.primaryDomain?.host || '',
          support_email: shopInfo.email,
          sender_name: shopInfo.name || 'Uncap',
          sender_address: shopInfo.email || 'support@uncap.com',
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
          new_order_email_title: `Invoice {{ number }} from ${shopInfo.name || 'Uncap'}`,
          new_order_email_content: ` <p>Dear {{ client.first_name }},</p><p>Please find the attached invoice for your order {{ number }}.</p><p>Please contact us for further support.</p><p>Thank you again for your order.</p><p>We hope you enjoyed shopping with us.</p><p><br></p><p>Best regards,</p><p>${shopInfo.name || 'Uncap'}</p>`,
          edited_order_email_title: `Updated invoice {{ number }} from ${shopInfo.name || 'Uncap'}`,
          edited_order_email_content: `<p>Dear {{ client.first_name }},</p><p>Please find the updated invoice for your order {{ number }}.</p><p>Please contact us for further support.</p><p>Thank you again for your order.</p><p>We hope you enjoyed shopping with us.</p><p><br></p><p>Best regards,</p><p>${shopInfo.name || 'Uncap'}</p>`,
          cancelled_order_email_title: `Updated invoice {{ number }} from ${shopInfo.name || 'Uncap'}`,
          cancelled_order_email_content: `<p>Dear {{ client.first_name }},</p><p>Please find the updated invoice for your order {{ number }}.</p><p>Please contact us for further support.122</p><p>Thank you again for your order.</p><p>We hope you enjoyed shopping with us.</p><p><br></p><p>Best regards,</p><p>${shopInfo.name || 'Uncap'}</p>`,
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
        });
      } catch (err) {
        console.error('Error during post-install settings setup in getShopDetails:', err);
      }

      // Register all real-time webhooks in the background
      c.executionCtx.waitUntil(registerAllWebhooks(shopDomain, token, c.env));

      // ✉️ Send background sync task to Cloudflare Queue
      if (c.env.SYNC_QUEUE) {
        console.log(`✉️ Sending sync message to Cloudflare Queue for: ${shopDomain}`);
        await c.env.SYNC_QUEUE.send({
          shopId: id,
          shopDomain,
          accessToken: token,
        });
      } else {
        console.log(`⚠️ SYNC_QUEUE not bound. Running async fallback with c.executionCtx.waitUntil`);
        c.executionCtx.waitUntil(
          processSyncMessage(db, { shopId: id, shopDomain, accessToken: token })
        );
      }

      shop = await getShopByDomain(db, shopDomain);
    }

    const responseData = { ...shop };
    delete responseData.access_token;

    return c.json({ shop: responseData });

  } catch (error) {
    console.error('Error getting shop details:', error);
    return c.json({ error: error.message }, 500);
  }
};
