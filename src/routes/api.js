import { Hono } from 'hono';
import { sessionVerifier } from '../middleware/sessionVerifier';

import shopRoutes from './api/shop/index';
import invoicesRoutes from './api/invoices/index';
import plansRoutes from './api/plans/index';
import { billingCallback } from './api/plans/controller';

const api = new Hono();

// Unprotected or custom-auth routes
api.route('/shop', shopRoutes);
api.get('/plans/billing-callback', billingCallback);

// Protected routes using Shopify session verifier
const protectedApi = new Hono();
protectedApi.use('*', sessionVerifier);

protectedApi.route('/invoices', invoicesRoutes);
protectedApi.route('/plans', plansRoutes);

// Mount the protected routes
api.route('/', protectedApi);

export default api;
