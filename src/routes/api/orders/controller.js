import { getDrizzle } from '../../../db/drizzle';
import { getShopByDomain } from '../../../db/dbHelpers';
import { orders, customers } from '../../../db/schema';
import { eq, desc, asc, sql } from 'drizzle-orm';

// ── GET /orders — Retrieve paginated orders for the authenticated shop ───
export const getOrders = async (c) => {
  const shopDomain = c.get('shopDomain');
  const db = getDrizzle(c.env);

  try {
    const shop = await getShopByDomain(db, shopDomain);
    if (!shop) {
      return c.json({ error: 'Shop not found' }, 404);
    }

    let payload = {};
    try {
      // Only parse JSON if the request has a body to avoid errors on GET requests
      const contentType = c.req.header('content-type');
      if (contentType && contentType.includes('application/json')) {
        payload = await c.req.json();
      }
    } catch (err) {
      console.log('No JSON payload or error parsing:', err.message);
    }

    // Pagination parameters (fallback to payload if not in query string)
    const page = parseInt(c.req.query('page') || payload.page || '1', 10);
    const limit = parseInt(c.req.query('limit') || payload.limit || '10', 10);

    console.log('payload:', payload, 'page:', page, 'limit:', limit);
    const offset = (page - 1) * limit;

    // Sorting parameters
    const sortField = c.req.query('sortField') || payload.sortField || 'processed_at';
    const sortOrder = c.req.query('sortOrder') || payload.sortOrder || 'desc';

    // Validate sort field
    const allowedSortFields = ['id', 'processed_at', 'total_price', 'name'];
    const validSortField = allowedSortFields.includes(sortField) ? sortField : 'processed_at';
    
    const orderCol = orders[validSortField] || orders.processed_at;
    const orderDirection = sortOrder.toLowerCase() === 'asc' ? asc(orderCol) : desc(orderCol);

    // Get total count
    const [{ count }] = await db.select({ count: sql`count(*)` })
      .from(orders)
      .where(eq(orders.shop_id, shop.id));

    // Get paginated data
    const results = await db.select({
      id: orders.id,
      name: orders.name,
      email: orders.email,
      processedAt: orders.processed_at,
      totalPrice: orders.total_price,
      financialStatus: orders.financial_status,
      fulfillmentStatus: orders.fulfillment_status,
      customer: {
        firstName: customers.first_name,
        lastName: customers.last_name
      }
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customer_id, customers.id))
    .where(eq(orders.shop_id, shop.id))
    .orderBy(orderDirection)
    .limit(limit)
    .offset(offset);

    return c.json({
      data: results,
      pagination: {
        total: Number(count),
        page,
        limit,
        totalPages: Math.ceil(Number(count) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return c.json({ error: error.message }, 500);
  }
};
