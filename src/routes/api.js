import { Hono } from 'hono';
import { sessionVerifier } from '../middleware/sessionVerifier';

import shopRoutes from './api/shop/index';

import invoicesRoutes from './api/invoices/index';
import ordersRoutes from './api/orders/index';
import plansRoutes from './api/plans/index';
import statsRoutes from './api/stats/index';
import invoiceSettingsRoutes from './api/invoiceSettings/index';
import invoiceLanguagesRoutes from './api/invoiceLanguages/index';
import { billingCallback } from './api/plans/controller';

const api = new Hono();

// Unprotected or custom-auth routes
api.route('/shop', shopRoutes);
api.get('/plans/billing-callback', billingCallback);

// Protected routes using Shopify session verifier
const protectedApi = new Hono();
protectedApi.use('*', sessionVerifier);

protectedApi.route('/shop', shopRoutes);
protectedApi.route('/orders', ordersRoutes);
protectedApi.route('/invoices', invoicesRoutes);
protectedApi.route('/plans', plansRoutes);
protectedApi.route('/stats', statsRoutes);
protectedApi.route('/invoiceSettings', invoiceSettingsRoutes);
protectedApi.route('/invoiceLanguages', invoiceLanguagesRoutes);

// Mount the protected routes
api.route('/', protectedApi);

export default api;
