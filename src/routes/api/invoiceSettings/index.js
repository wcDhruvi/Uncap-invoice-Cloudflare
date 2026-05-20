import { Hono } from 'hono';
import { getInvoiceSettings, updateInvoiceSettings } from './controller';

const invoiceSettingsApi = new Hono();

// ── GET /invoiceSettings — Retrieve settings for the authenticated shop ───
invoiceSettingsApi.get('/', getInvoiceSettings);

// ── PUT /invoiceSettings — Update settings for the authenticated shop ────────
invoiceSettingsApi.put('/', updateInvoiceSettings);

export default invoiceSettingsApi;
