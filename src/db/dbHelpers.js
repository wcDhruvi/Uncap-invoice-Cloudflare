import { eq, and, getTableColumns } from 'drizzle-orm';
import { shops, orders, customers, syncs, invoices, products, productVariants, orderLineItems, fulfillments, invoiceSettings, invoiceLanguages } from './schema';

/**
 * Filters input data to only include keys that match columns defined in the Drizzle table schema.
 */
function filterTableFields(table, data) {
  if (!data) return {};
  const columns = getTableColumns(table);
  const filtered = {};
  for (const key of Object.keys(data)) {
    if (key in columns) {
      filtered[key] = data[key];
    }
  }
  return filtered;
}

/**
 * Retrieves a shop record by its Shopify domain.
 */
export async function getShopByDomain(db, domain) {
  const results = await db
    .select()
    .from(shops)
    .where(eq(shops.myshopify_domain, domain))
    .limit(1);
  return results[0] || null;
}

/**
 * Strongly typed Drizzle ORM upsert for shopify_shops.
 */
export async function upsertShop(db, shopData) {
  return await db
    .insert(shops)
    .values(shopData)
    .onConflictDoUpdate({
      target: shops.myshopify_domain,
      set: {
        id: shopData.id,
        name: shopData.name,
        email: shopData.email,
        domain: shopData.domain,
        currency: shopData.currency,
        timezone: shopData.timezone,
        iana_timezone: shopData.iana_timezone,
        shop_owner: shopData.shop_owner,
        plan_name: shopData.plan_name,
        plan_display_name: shopData.plan_display_name,
        latitude: shopData.latitude,
        longitude: shopData.longitude,
        address1: shopData.address1,
        address2: shopData.address2,
        city: shopData.city,
        zip: shopData.zip,
        province: shopData.province,
        country: shopData.country,
        country_code: shopData.country_code,
        country_name: shopData.country_name,
        phone: shopData.phone,
        customer_email: shopData.customer_email,
        money_format: shopData.money_format,
        money_with_currency_format: shopData.money_with_currency_format,
        weight_unit: shopData.weight_unit,
        province_code: shopData.province_code,
        setup_required: shopData.setup_required,
        force_ssl: shopData.force_ssl,
        primary_locale: shopData.primary_locale,
        primary_location_id: shopData.primary_location_id,
        active_recurring_subscription_id: shopData.active_recurring_subscription_id,
        plan_id: shopData.plan_id,
        used_trial_minutes: shopData.used_trial_minutes,
        used_trial_minutes_updated_at: shopData.used_trial_minutes_updated_at,
        shopify_created_at: shopData.shopify_created_at,
        shopify_updated_at: shopData.shopify_updated_at,
        access_token: shopData.access_token,
        scope: shopData.scope,
        is_active: shopData.is_active,
        installed_at: shopData.installed_at || undefined,
        updated_at: new Date().toISOString(),
      },
    })
    .returning();
}

/**
 * Strongly typed Drizzle ORM upsert for shopify_orders.
 */
export async function upsertOrder(db, orderData) {
  return await db
    .insert(orders)
    .values(orderData)
    .onConflictDoUpdate({
      target: orders.id,
      set: {
        customer_id: orderData.customer_id,
        email: orderData.email,
        number: orderData.number,
        order_number: orderData.order_number,
        note: orderData.note,
        token: orderData.token,
        gateway: orderData.gateway,
        test: orderData.test,
        total_price: orderData.total_price,
        subtotal_price: orderData.subtotal_price,
        total_weight: orderData.total_weight,
        total_tax: orderData.total_tax,
        taxes_included: orderData.taxes_included,
        currency: orderData.currency,
        financial_status: orderData.financial_status,
        confirmed: orderData.confirmed,
        total_discounts: orderData.total_discounts,
        total_line_items_price: orderData.total_line_items_price,
        name: orderData.name,
        cancelled_at: orderData.cancelled_at,
        cancel_reason: orderData.cancel_reason,
        total_price_set: orderData.total_price_set,
        subtotal_price_set: orderData.subtotal_price_set,
        total_tax_set: orderData.total_tax_set,
        total_discounts_set: orderData.total_discounts_set,
        total_line_items_price_set: orderData.total_line_items_price_set,
        fulfillment_status: orderData.fulfillment_status,
        customer_locale: orderData.customer_locale,
        processed_at: orderData.processed_at,
        status_page_url: orderData.status_page_url,
        shopify_created_at: orderData.shopify_created_at,
        shopify_updated_at: orderData.shopify_updated_at,
        tags: orderData.tags,
        updated_at: new Date().toISOString(),
      },
    });
}

/**
 * Strongly typed Drizzle ORM upsert for shopify_customers.
 */
export async function upsertCustomer(db, customerData) {
  return await db
    .insert(customers)
    .values(customerData)
    .onConflictDoUpdate({
      target: customers.id,
      set: {
        email: customerData.email,
        first_name: customerData.first_name,
        last_name: customerData.last_name,
        orders_count: customerData.orders_count,
        state: customerData.state,
        total_spent: customerData.total_spent,
        updated_at: new Date().toISOString(),
      },
    });
}

/**
 * Logs a new sync initialization task in D1 shopify_syncs.
 */
export async function createSync(db, syncData) {
  const result = await db
    .insert(syncs)
    .values({
      shop_id: syncData.shop_id,
      domain: syncData.domain,
      status: syncData.status || 'in_progress',
      models: JSON.stringify(syncData.models || []),
    })
    .returning();
  return result[0] || null;
}

/**
 * Updates an active background sync status.
 */
export async function updateSyncStatus(db, syncId, status, error = null) {
  return await db
    .update(syncs)
    .set({
      status,
      error,
      updated_at: new Date().toISOString(),
    })
    .where(eq(syncs.id, syncId));
}

/**
 * Drizzle ORM insertion for standard generated invoices.
 */
export async function createInvoice(db, invoiceData) {
  return await db
    .insert(invoices)
    .values({
      shop_id: invoiceData.shop_id,
      order_id: invoiceData.order_id,
      invoice_number: invoiceData.invoice_number,
      status: invoiceData.status || 'draft',
      pdf_url: invoiceData.pdf_url,
      pdf_url_id: invoiceData.pdf_url_id,
      sent_at: invoiceData.sent_at,
      paid_at: invoiceData.paid_at,
    })
    .returning();
}

/**
 * Fetches all invoices by shop ID.
 */
export async function getInvoicesByShop(db, shopId) {
  return await db
    .select()
    .from(invoices)
    .where(eq(invoices.shop_id, shopId));
}

/**
 * Strongly typed Drizzle ORM upsert for shopify_products.
 */
export async function upsertProduct(db, productData) {
  return await db
    .insert(products)
    .values(productData)
    .onConflictDoUpdate({
      target: products.id,
      set: {
        title: productData.title,
        body_html: productData.body_html,
        vendor: productData.vendor,
        product_type: productData.product_type,
        handle: productData.handle,
        status: productData.status,
        published_at: productData.published_at,
        shopify_created_at: productData.shopify_created_at,
        shopify_updated_at: productData.shopify_updated_at,
        updated_at: new Date().toISOString(),
      },
    });
}

/**
 * Strongly typed Drizzle ORM upsert for shopify_product_variants.
 */
export async function upsertProductVariant(db, variantData) {
  return await db
    .insert(productVariants)
    .values(variantData)
    .onConflictDoUpdate({
      target: productVariants.id,
      set: {
        title: variantData.title,
        price: variantData.price,
        sku: variantData.sku,
        position: variantData.position,
        inventory_policy: variantData.inventory_policy,
        compare_at_price: variantData.compare_at_price,
        fulfillment_service: variantData.fulfillment_service,
        inventory_management: variantData.inventory_management,
        option1: variantData.option1,
        option2: variantData.option2,
        option3: variantData.option3,
        taxable: variantData.taxable,
        barcode: variantData.barcode,
        grams: variantData.grams,
        inventory_item_id: variantData.inventory_item_id,
        inventory_quantity: variantData.inventory_quantity,
        weight: variantData.weight,
        weight_unit: variantData.weight_unit,
        shopify_created_at: variantData.shopify_created_at,
        shopify_updated_at: variantData.shopify_updated_at,
        updated_at: new Date().toISOString(),
      },
    });
}

/**
 * Strongly typed Drizzle ORM upsert for shopify_order_line_items.
 */
export async function upsertOrderLineItem(db, lineItemData) {
  return await db
    .insert(orderLineItems)
    .values(lineItemData)
    .onConflictDoUpdate({
      target: orderLineItems.id,
      set: {
        product_id: lineItemData.product_id,
        variant_id: lineItemData.variant_id,
        title: lineItemData.title,
        quantity: lineItemData.quantity,
        sku: lineItemData.sku,
        variant_title: lineItemData.variant_title,
        vendor: lineItemData.vendor,
        fulfillment_service: lineItemData.fulfillment_service,
        requires_shipping: lineItemData.requires_shipping,
        taxable: lineItemData.taxable,
        gift_card: lineItemData.gift_card,
        name: lineItemData.name,
        variant_inventory_management: lineItemData.variant_inventory_management,
        properties: lineItemData.properties,
        product_exists: lineItemData.product_exists,
        fulfillable_quantity: lineItemData.fulfillable_quantity,
        grams: lineItemData.grams,
        price: lineItemData.price,
        total_discount: lineItemData.total_discount,
        fulfillment_status: lineItemData.fulfillment_status,
        price_set: lineItemData.price_set,
        total_discount_set: lineItemData.total_discount_set,
        shopify_created_at: lineItemData.shopify_created_at,
        shopify_updated_at: lineItemData.shopify_updated_at,
        updated_at: new Date().toISOString(),
      },
    });
}

/**
 * Strongly typed Drizzle ORM upsert for shopify_fulfillments.
 */
export async function upsertFulfillment(db, fulfillmentData) {
  return await db
    .insert(fulfillments)
    .values(fulfillmentData)
    .onConflictDoUpdate({
      target: fulfillments.id,
      set: {
        status: fulfillmentData.status,
        tracking_company: fulfillmentData.tracking_company,
        tracking_number: fulfillmentData.tracking_number,
        tracking_numbers: fulfillmentData.tracking_numbers,
        tracking_url: fulfillmentData.tracking_url,
        tracking_urls: fulfillmentData.tracking_urls,
        receipt: fulfillmentData.receipt,
        name: fulfillmentData.name,
        shopify_created_at: fulfillmentData.shopify_created_at,
        shopify_updated_at: fulfillmentData.shopify_updated_at,
        updated_at: new Date().toISOString(),
      },
    });
}

/**
 * Gets invoice settings for a shop
 */
export async function getInvoiceSettingsByShop(db, shopId) {
  const result = await db
    .select()
    .from(invoiceSettings)
    .where(eq(invoiceSettings.shop_id, shopId))
    .limit(1);
  return result[0] || null;
}

/**
 * Gets invoice language for a shop
 */
export async function getInvoiceLanguageByShop(db, shopId) {
  const result = await db
    .select()
    .from(invoiceLanguages)
    .where(eq(invoiceLanguages.shop_id, shopId))
    .limit(1);
  return result[0] || null;
}

/**
 * Upserts default invoice settings for a shop
 */
export async function upsertInvoiceSettings(db, shopId, data) {
  const filteredData = filterTableFields(invoiceSettings, data);
  const existing = await db
    .select()
    .from(invoiceSettings)
    .where(eq(invoiceSettings.shop_id, shopId))
    .limit(1);

  if (existing.length > 0) {
    return await db
      .update(invoiceSettings)
      .set({ ...filteredData, updated_at: new Date().toISOString() })
      .where(eq(invoiceSettings.shop_id, shopId));
  } else {
    return await db
      .insert(invoiceSettings)
      .values({ shop_id: shopId, ...filteredData });
  }
}

/**
 * Upserts default invoice language for a shop
 */
export async function upsertInvoiceLanguage(db, shopId, data) {
  const filteredData = filterTableFields(invoiceLanguages, data);
  const existing = await db
    .select()
    .from(invoiceLanguages)
    .where(eq(invoiceLanguages.shop_id, shopId))
    .limit(1);

  if (existing.length > 0) {
    return await db
      .update(invoiceLanguages)
      .set({ ...filteredData, updated_at: new Date().toISOString() })
      .where(eq(invoiceLanguages.shop_id, shopId));
  } else {
    return await db
      .insert(invoiceLanguages)
      .values({ shop_id: shopId, ...filteredData });
  }
}
