import { Hono } from 'hono';
import { getOrders } from './controller';

const ordersApi = new Hono();

// ── GET /orders — Retrieve paginated orders for the authenticated shop ───
ordersApi.post('/', getOrders);

export default ordersApi;
