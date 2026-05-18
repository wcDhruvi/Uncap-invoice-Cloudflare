import { GraphQLClient, gql } from 'graphql-request';
import { 
  upsertOrder, 
  upsertCustomer, 
  createSync, 
  updateSyncStatus,
  upsertProduct,
  upsertProductVariant,
  upsertOrderLineItem,
  upsertFulfillment 
} from '../db/dbHelpers';

// ── GRAPHQL QUERIES ────────────────────────────────────

const PRODUCTS_SYNC_QUERY = gql`
  query getProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          bodyHtml
          vendor
          productType
          handle
          status
          publishedAt
          createdAt
          updatedAt
          variants(first: 100) {
            edges {
              node {
                id
                title
                price
                sku
                position
                inventoryPolicy
                compareAtPrice
                taxable
                barcode
                createdAt
                updatedAt
                inventoryItem {
                  id
                  tracked
                  measurement {
                    weight {
                      value
                      unit
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

const ORDERS_SYNC_QUERY = gql`
  query getOrders($first: Int!, $after: String) {
    orders(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          email
          number
          name
          customer {
            id
          }
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          subtotalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          totalWeight
          totalTaxSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          taxesIncluded
          confirmed
          totalDiscountsSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          cancelledAt
          cancelReason
          customerLocale
          processedAt
          statusPageUrl
          createdAt
          updatedAt
          paymentGatewayNames
          displayFinancialStatus
          displayFulfillmentStatus
          note
          tags
          lineItems(first: 100) {
            edges {
              node {
                id
                product {
                  id
                }
                variant {
                  id
                }
                title
                quantity
                sku
                variantTitle
                vendor
                requiresShipping
                taxable
                name
                fulfillableQuantity
                originalUnitPrice
              }
            }
          }
          fulfillments(first: 50) {
            id
            status
            trackingInfo {
              company
              number
              url
            }
            name
            createdAt
            updatedAt
          }
        }
      }
    }
  }
`;

const CUSTOMERS_SYNC_QUERY = gql`
  query getCustomers($first: Int!, $after: String) {
    customers(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          email
          firstName
          lastName
          numberOfOrders
          state
          amountSpent {
            amount
            currencyCode
          }
        }
      }
    }
  }
`;

// ── HELPER SYNC FUNCTIONS ──────────────────────────────

/**
 * Parses a Shopify GID (e.g. gid://shopify/Order/123456) to standard numeric ID.
 */
function parseGid(gid) {
  if (!gid || typeof gid !== 'string') return 0;
  const parts = gid.split('/');
  return parseInt(parts[parts.length - 1], 10) || 0;
}

/**
 * Synchronizes all products and variants via Shopify GraphQL and Drizzle ORM.
 */
export async function syncProductsGraphQL(db, shopDomain, token, shopId) {
  console.log(`🏷️ [Drizzle + GraphQL] Starting Product sync for shop ID: ${shopId} (${shopDomain})`);
  
  const client = new GraphQLClient(`https://${shopDomain}/admin/api/2025-01/graphql.json`, {
    headers: {
      'X-Shopify-Access-Token': token,
    },
  });

  let hasNextPage = true;
  let endCursor = null;
  let totalProducts = 0;
  let totalVariants = 0;

  while (hasNextPage) {
    const response = await client.request(PRODUCTS_SYNC_QUERY, {
      first: 50,
      after: endCursor,
    });

    const productsConnection = response?.products;
    const edges = productsConnection?.edges || [];
    
    console.log(`Fetched ${edges.length} products via graphql-request...`);

    for (const edge of edges) {
      const node = edge.node;
      const productNumericId = parseGid(node.id);

      await upsertProduct(db, {
        id: productNumericId,
        shop_id: parseInt(shopId, 10),
        title: node.title || '',
        body_html: node.bodyHtml || '',
        vendor: node.vendor || '',
        product_type: node.productType || '',
        handle: node.handle || '',
        status: node.status || '',
        published_at: node.publishedAt || null,
        shopify_created_at: node.createdAt,
        shopify_updated_at: node.updatedAt,
      });
      totalProducts++;

      // ─── SYNC PRODUCT VARIANTS ───
      const variantEdges = node.variants?.edges || [];
      for (const variantEdge of variantEdges) {
        const variantNode = variantEdge.node;
        const variantNumericId = parseGid(variantNode.id);
        const invItem = variantNode.inventoryItem || {};
        const weightObj = invItem.measurement?.weight || {};

        await upsertProductVariant(db, {
          id: variantNumericId,
          product_id: productNumericId,
          shop_id: parseInt(shopId, 10),
          title: variantNode.title || '',
          price: parseFloat(variantNode.price || '0'),
          sku: variantNode.sku || '',
          position: variantNode.position || 1,
          inventory_policy: variantNode.inventoryPolicy || '',
          compare_at_price: parseFloat(variantNode.compareAtPrice || '0'),
          inventory_management: invItem.tracked ? 'shopify' : '',
          taxable: !!variantNode.taxable,
          barcode: variantNode.barcode || '',
          inventory_item_id: parseGid(invItem.id),
          weight: parseFloat(weightObj.value || '0'),
          weight_unit: weightObj.unit || 'kg',
          shopify_created_at: variantNode.createdAt,
          shopify_updated_at: variantNode.updatedAt,
        });
        totalVariants++;
      }
    }

    hasNextPage = productsConnection?.pageInfo?.hasNextPage || false;
    endCursor = productsConnection?.pageInfo?.endCursor || null;
  }

  console.log(`✅ Product sync complete. Synced products: ${totalProducts}, variants: ${totalVariants}`);
  return { totalProducts, totalVariants };
}

/**
 * Synchronizes all orders, nested line items, and fulfillments via Shopify GraphQL and Drizzle.
 */
export async function syncOrdersGraphQL(db, shopDomain, token, shopId) {
  console.log(`📦 [Drizzle + GraphQL] Starting Order sync for shop ID: ${shopId} (${shopDomain})`);
  
  const client = new GraphQLClient(`https://${shopDomain}/admin/api/2025-01/graphql.json`, {
    headers: {
      'X-Shopify-Access-Token': token,
    },
  });

  let hasNextPage = true;
  let endCursor = null;
  let totalSynced = 0;

  while (hasNextPage) {
    const response = await client.request(ORDERS_SYNC_QUERY, {
      first: 50,
      after: endCursor,
    });

    const ordersConnection = response?.orders;
    const edges = ordersConnection?.edges || [];
    
    console.log(`Fetched ${edges.length} orders via graphql-request...`);

    for (const edge of edges) {
      const node = edge.node;
      const numericId = parseGid(node.id);
      
      const customerIdRaw = node.customer?.id;
      const customerId = customerIdRaw ? parseGid(customerIdRaw) : null;
      
      await upsertOrder(db, {
        id: numericId,
        shop_id: parseInt(shopId, 10),
        customer_id: customerId,
        email: node.email || '',
        number: node.number,
        order_number: node.number,
        note: node.note || '',
        token: null,
        gateway: (node.paymentGatewayNames || []).join(', '),
        test: !!node.test,
        total_price: parseFloat(node.totalPriceSet?.shopMoney?.amount || '0'),
        subtotal_price: parseFloat(node.subtotalPriceSet?.shopMoney?.amount || '0'),
        total_weight: node.totalWeight || 0,
        total_tax: parseFloat(node.totalTaxSet?.shopMoney?.amount || '0'),
        taxes_included: !!node.taxesIncluded,
        currency: node.totalPriceSet?.shopMoney?.currencyCode || 'USD',
        financial_status: node.displayFinancialStatus || '',
        confirmed: !!node.confirmed,
        total_discounts: parseFloat(node.totalDiscountsSet?.shopMoney?.amount || '0'),
        total_line_items_price: parseFloat(node.subtotalPriceSet?.shopMoney?.amount || '0'),
        cart_token: null,
        name: node.name || '',
        cancelled_at: node.cancelledAt || null,
        cancel_reason: node.cancelReason || '',
        total_price_set: node.totalPriceSet ? JSON.stringify(node.totalPriceSet) : null,
        subtotal_price_set: node.subtotalPriceSet ? JSON.stringify(node.subtotalPriceSet) : null,
        total_tax_set: node.totalTaxSet ? JSON.stringify(node.totalTaxSet) : null,
        total_discounts_set: node.totalDiscountsSet ? JSON.stringify(node.totalDiscountsSet) : null,
        total_line_items_price_set: node.subtotalPriceSet ? JSON.stringify(node.subtotalPriceSet) : null,
        fulfillment_status: node.displayFulfillmentStatus || '',
        customer_locale: node.customerLocale || '',
        processed_at: node.processedAt || node.createdAt,
        status_page_url: node.statusPageUrl || '',
        shopify_created_at: node.createdAt,
        shopify_updated_at: node.updatedAt,
        tags: (node.tags || []).join(', '),
        created_at: node.createdAt,
      });

      // ─── SYNC ORDER LINE ITEMS ───
      const lineItemEdges = node.lineItems?.edges || [];
      for (const lineEdge of lineItemEdges) {
        const lineNode = lineEdge.node;
        const lineNumericId = parseGid(lineNode.id);
        const productGid = lineNode.product?.id;
        const variantGid = lineNode.variant?.id;

        await upsertOrderLineItem(db, {
          id: lineNumericId,
          order_id: numericId,
          shop_id: parseInt(shopId, 10),
          product_id: productGid ? parseGid(productGid) : null,
          variant_id: variantGid ? parseGid(variantGid) : null,
          title: lineNode.title || '',
          quantity: lineNode.quantity || 0,
          sku: lineNode.sku || '',
          variant_title: lineNode.variantTitle || '',
          vendor: lineNode.vendor || '',
          requires_shipping: !!lineNode.requiresShipping,
          taxable: !!lineNode.taxable,
          name: lineNode.name || '',
          fulfillable_quantity: lineNode.fulfillableQuantity || 0,
          grams: 0,
          price: parseFloat(lineNode.originalUnitPrice || '0'),
          shopify_created_at: node.createdAt,
          shopify_updated_at: node.updatedAt,
        });
      }

      // ─── SYNC FULFILLMENTS ───
      const orderFulfillments = node.fulfillments || [];
      for (const fulfillment of orderFulfillments) {
        const fulfillmentNumericId = parseGid(fulfillment.id);
        const trackingInfo = fulfillment.trackingInfo?.[0] || {};

        await upsertFulfillment(db, {
          id: fulfillmentNumericId,
          shop_id: parseInt(shopId, 10),
          order_id: numericId,
          status: fulfillment.status || '',
          tracking_company: trackingInfo.company || '',
          tracking_number: trackingInfo.number || '',
          tracking_url: trackingInfo.url || '',
          name: fulfillment.name || '',
          shopify_created_at: fulfillment.createdAt,
          shopify_updated_at: fulfillment.updatedAt,
        });
      }
    }

    totalSynced += edges.length;
    hasNextPage = ordersConnection?.pageInfo?.hasNextPage || false;
    endCursor = ordersConnection?.pageInfo?.endCursor || null;
  }

  console.log(`✅ Order sync complete. Total synced orders: ${totalSynced}`);
  return totalSynced;
}

/**
 * Synchronizes all customers via Shopify GraphQL and Drizzle ORM.
 */
export async function syncCustomersGraphQL(db, shopDomain, token, shopId) {
  console.log(`👥 [Drizzle + GraphQL] Starting Customer sync for shop ID: ${shopId} (${shopDomain})`);

  const client = new GraphQLClient(`https://${shopDomain}/admin/api/2025-01/graphql.json`, {
    headers: {
      'X-Shopify-Access-Token': token,
    },
  });

  let hasNextPage = true;
  let endCursor = null;
  let totalSynced = 0;

  while (hasNextPage) {
    const response = await client.request(CUSTOMERS_SYNC_QUERY, {
      first: 50,
      after: endCursor,
    });

    const customersConnection = response?.customers;
    const edges = customersConnection?.edges || [];
    
    console.log(`Fetched ${edges.length} customers via graphql-request...`);

    for (const edge of edges) {
      const node = edge.node;
      const numericId = parseGid(node.id);

      await upsertCustomer(db, {
        id: numericId,
        shop_id: parseInt(shopId, 10),
        email: node.email || '',
        first_name: node.firstName || '',
        last_name: node.lastName || '',
        orders_count: node.numberOfOrders || 0,
        state: node.state || '',
        total_spent: node.amountSpent?.amount || '0.00',
      });
    }

    totalSynced += edges.length;
    hasNextPage = customersConnection?.pageInfo?.hasNextPage || false;
    endCursor = customersConnection?.pageInfo?.endCursor || null;
  }

  console.log(`✅ Customer sync complete. Total synced customers: ${totalSynced}`);
  return totalSynced;
}

// ── QUEUE CONSUMER ORCHESTRATOR ─────────────────────────

/**
 * Asynchronous job processor called by Cloudflare Queues batch listener.
 */
export async function processSyncMessage(db, syncMessage) {
  const { shopId, shopDomain, accessToken } = syncMessage;
  console.log(`🚀 [Queue Consumer] Syncing store data for: ${shopDomain} (ID: ${shopId})`);

  let syncRecord = null;

  try {
    // 1. Create a tracking sync log in D1 Drizzle
    syncRecord = await createSync(db, {
      shop_id: parseInt(shopId, 10),
      domain: shopDomain,
      status: 'in_progress',
      models: ['products', 'orders', 'customers'],
    });

    console.log(`Sync status recorded in D1. Tracker ID: ${syncRecord.id}`);

    // 2. Execute synchronization sequentially to avoid SQLite read/write lock limitations
    await syncProductsGraphQL(db, shopDomain, accessToken, shopId);
    await syncOrdersGraphQL(db, shopDomain, accessToken, shopId);
    await syncCustomersGraphQL(db, shopDomain, accessToken, shopId);

    // 3. Mark job as successfully completed
    if (syncRecord?.id) {
      await updateSyncStatus(db, syncRecord.id, 'completed');
    }
    console.log(`🎉 [Queue Consumer] Sync completed successfully for ${shopDomain}!`);

  } catch (error) {
    console.error(`❌ [Queue Consumer] Sync failed for ${shopDomain}:`, error);

    // Update log status to failed with error description
    if (syncRecord?.id) {
      try {
        await updateSyncStatus(db, syncRecord.id, 'failed', error.message || String(error));
      } catch (dbErr) {
        console.error('Failed to update error log status in D1:', dbErr);
      }
    }
  }
}
