import { eq } from 'drizzle-orm';
import { getDrizzle } from '../db/drizzle';
import { 
  getShopByDomain, 
  upsertOrder, 
  upsertShop,
  upsertProduct,
  upsertProductVariant,
  upsertCustomer,
  upsertFulfillment
} from '../db/dbHelpers';
import { orders, products, customers, productVariants } from '../db/schema';

/**
 * Real-Time Shopify Webhook Handler
 * 
 * Processes incoming webhooks from Shopify and mirrors catalog, order, 
 * fulfillment, customer and uninstall mutations directly to Cloudflare D1.
 */
export const handleWebhook = async (c) => {
  const topic = c.req.header('x-shopify-topic');
  const shopDomain = c.req.header('x-shopify-shop-domain');
  const payload = await c.req.json();

  console.log(`✉️ Received real-time webhook "${topic}" for ${shopDomain}`);

  const db = getDrizzle(c.env);

  try {
    switch (topic) {
      // ─── ORDERS WEBHOOKS ───────────────────
      case 'orders/create':
      case 'orders/updated': {
        const shop = await getShopByDomain(db, shopDomain);
        console.log('📦 Shop found:', shop ? shop.id : 'null');
        console.log('📦 Order payload:', payload);
        if (shop) {
          await upsertOrder(db, {
            id: payload.id,
            shop_id: shop.id,
            customer_id: payload.customer ? payload.customer.id : null,
            email: payload.email || '',
            number: payload.number,
            order_number: payload.order_number,
            note: payload.note,
            token: payload.token,
            gateway: payload.gateway,
            test: !!payload.test,
            total_price: parseFloat(payload.total_price || '0'),
            subtotal_price: parseFloat(payload.subtotal_price || '0'),
            total_weight: payload.total_weight,
            total_tax: parseFloat(payload.total_tax || '0'),
            taxes_included: !!payload.taxes_included,
            currency: payload.currency || 'USD',
            financial_status: payload.financial_status || '',
            confirmed: !!payload.confirmed,
            total_discounts: parseFloat(payload.total_discounts || '0'),
            total_line_items_price: parseFloat(payload.total_line_items_price || '0'),
            name: payload.name,
            cancelled_at: payload.cancelled_at,
            cancel_reason: payload.cancel_reason,
            total_price_set: payload.total_price_set ? JSON.stringify(payload.total_price_set) : null,
            subtotal_price_set: payload.subtotal_price_set ? JSON.stringify(payload.subtotal_price_set) : null,
            total_tax_set: payload.total_tax_set ? JSON.stringify(payload.total_tax_set) : null,
            total_discounts_set: payload.total_discounts_set ? JSON.stringify(payload.total_discounts_set) : null,
            total_line_items_price_set: payload.total_line_items_price_set ? JSON.stringify(payload.total_line_items_price_set) : null,
            fulfillment_status: payload.fulfillment_status || '',
            customer_locale: payload.customer_locale,
            processed_at: payload.processed_at,
            status_page_url: payload.status_page_url,
            shopify_created_at: payload.created_at,
            shopify_updated_at: payload.updated_at,
            tags: payload.tags,
            created_at: payload.created_at,
          });
          console.log(`📦 Order ${payload.id} successfully synchronized via Drizzle`);
        }
        break;
      }

      case 'orders/delete': {
        await db.delete(orders).where(eq(orders.id, payload.id));
        console.log(`🗑️ Order ${payload.id} deleted from local database.`);
        break;
      }

      // ─── PRODUCTS & VARIANTS WEBHOOKS ──────
      case 'products/create':
      case 'products/update': {
        const shop = await getShopByDomain(db, shopDomain);
        if (shop) {
          // Upsert the main product
          await upsertProduct(db, {
            id: payload.id,
            shop_id: shop.id,
            title: payload.title || '',
            body_html: payload.body_html || '',
            vendor: payload.vendor || '',
            product_type: payload.product_type || '',
            handle: payload.handle || '',
            status: payload.status || '',
            published_at: payload.published_at || null,
            shopify_created_at: payload.created_at,
            shopify_updated_at: payload.updated_at,
            created_at: payload.created_at,
          });

          // Upsert nested variants list
          const variantsList = payload.variants || [];
          for (const variant of variantsList) {
            await upsertProductVariant(db, {
              id: variant.id,
              product_id: payload.id,
              shop_id: shop.id,
              title: variant.title || '',
              price: parseFloat(variant.price || '0'),
              sku: variant.sku || '',
              position: variant.position || 1,
              inventory_policy: variant.inventory_policy || '',
              compare_at_price: parseFloat(variant.compare_at_price || '0'),
              inventory_management: variant.inventory_management || '',
              taxable: !!variant.taxable,
              barcode: variant.barcode || '',
              inventory_item_id: variant.inventory_item_id || null,
              inventory_quantity: variant.inventory_quantity || 0,
              weight: parseFloat(variant.weight || '0'),
              weight_unit: variant.weight_unit || 'kg',
              shopify_created_at: variant.created_at,
              shopify_updated_at: variant.updated_at,
              created_at: variant.created_at,
            });
          }
          console.log(`🏷️ Product ${payload.id} and ${variantsList.length} variants synchronized.`);
        }
        break;
      }

      case 'products/delete': {
        // SQLite foreign key cascade emulation or manual delete of variants first
        await db.delete(productVariants).where(eq(productVariants.product_id, payload.id));
        await db.delete(products).where(eq(products.id, payload.id));
        console.log(`🗑️ Product ${payload.id} and its variants deleted from local database.`);
        break;
      }

      // ─── CUSTOMERS WEBHOOKS ────────────────
      case 'customers/create':
      case 'customers/update': {
        const shop = await getShopByDomain(db, shopDomain);
        if (shop) {
          await upsertCustomer(db, {
            id: payload.id,
            shop_id: shop.id,
            email: payload.email || '',
            first_name: payload.first_name || '',
            last_name: payload.last_name || '',
            orders_count: payload.orders_count || 0,
            state: payload.state || '',
            total_spent: payload.total_spent || '0.00',
            created_at: payload.created_at,
          });
          console.log(`👥 Customer ${payload.id} synchronized.`);
        }
        break;
      }

      case 'customers/delete': {
        await db.delete(customers).where(eq(customers.id, payload.id));
        console.log(`🗑️ Customer ${payload.id} deleted.`);
        break;
      }

      // ─── FULFILLMENTS WEBHOOKS ─────────────
      case 'fulfillments/create':
      case 'fulfillments/update': {
        const shop = await getShopByDomain(db, shopDomain);
        if (shop) {
          const trackingInfo = payload.tracking_number ? {
            company: payload.tracking_company,
            number: payload.tracking_number,
            url: payload.tracking_url
          } : {};

          await upsertFulfillment(db, {
            id: payload.id,
            shop_id: shop.id,
            order_id: payload.order_id,
            status: payload.status || '',
            tracking_company: trackingInfo.company || '',
            tracking_number: trackingInfo.number || '',
            tracking_url: trackingInfo.url || '',
            name: payload.name || '',
            shopify_created_at: payload.created_at,
            shopify_updated_at: payload.updated_at,
            created_at: payload.created_at,
          });
          console.log(`🚚 Fulfillment ${payload.id} synchronized for order ${payload.order_id}.`);
        }
        break;
      }

      // ─── APP WEBHOOKS ──────────────────────
      case 'app/uninstalled': {
        console.log(`⚠️ App uninstalled from ${shopDomain}. Marking shop as inactive...`);
        const existingShop = await getShopByDomain(db, shopDomain);
        if (existingShop) {
          await upsertShop(db, {
            ...existingShop,
            is_active: false
          });
          console.log(`🔒 Shop ${shopDomain} marked as inactive in Drizzle.`);
        }
        break;
      }

      default:
        console.log(`❓ Unhandled webhook topic: ${topic}`);
    }
  } catch (error) {
    console.error(`❌ Error executing webhook handler for topic "${topic}":`, error);
  }

  return c.json({ success: true });
};
