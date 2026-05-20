import { getDrizzle } from '../../../db/drizzle';
import { getShopByDomain } from '../../../db/dbHelpers';
import { invoices } from '../../../db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

// ── GET /stats — Retrieve invoice stats for the authenticated shop ───
export const getStats = async (c) => {
  const shopDomain = c.get('shopDomain');
  const db = getDrizzle(c.env);

  const startDateParam = c.req.query('startDate');
  const endDateParam = c.req.query('endDate');

  try {
    const shop = await getShopByDomain(db, shopDomain);
    if (!shop) {
      return c.json({ error: 'Shop not found' }, 404);
    }

    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    if (isNaN(endDate.getTime())) throw new Error('Invalid end date');

    const startDate = startDateParam 
      ? new Date(startDateParam) 
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (isNaN(startDate.getTime())) throw new Error('Invalid start date');

    const startISO = startDate.toISOString().split('T')[0] + ' 00:00:00';
    const endISO = endDate.toISOString().split('T')[0] + ' 23:59:59';

    // Find invoices within date range for the current shop
    const result = await db.select({
      createdAt: invoices.created_at
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.shop_id, shop.id),
        gte(invoices.created_at, startISO),
        lte(invoices.created_at, endISO)
      )
    );

    // Group items by date
    const itemsByDate = {};
    for (const item of result) {
      if (!item.createdAt) continue;
      const dateOnly = item.createdAt.split(' ')[0]; // Gets YYYY-MM-DD from 'YYYY-MM-DD HH:MM:SS'
      
      if (!itemsByDate[dateOnly]) {
        itemsByDate[dateOnly] = 0;
      }
      itemsByDate[dateOnly]++;
    }

    // Convert to array format for charting
    const chartData = Object.entries(itemsByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return c.json(chartData);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return c.json({ error: error.message }, 500);
  }
};
