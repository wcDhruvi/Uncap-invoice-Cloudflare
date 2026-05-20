import { Hono } from 'hono';
import { getShopDetails } from './controller';

const shopApi = new Hono();

// ── GET /shop — Session token exchange & registration ──
shopApi.get('/', getShopDetails);

export default shopApi;
