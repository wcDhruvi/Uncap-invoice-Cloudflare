import { Hono } from 'hono';
import { getStats } from './controller';

const statsApi = new Hono();

// ── GET /stats — Retrieve invoice stats for the authenticated shop ───
statsApi.get('/', getStats);

export default statsApi;
