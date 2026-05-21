import { Hono } from 'hono';
import { getInvoiceSettings, updateInvoiceSettings, uploadLogo, deleteLogo } from './controller';

const invoiceSettingsApi = new Hono();

// ── GET /invoiceSettings — Retrieve settings for the authenticated shop ───
invoiceSettingsApi.get('/', getInvoiceSettings);

// ── PUT/POST /invoiceSettings — Update settings for the authenticated shop ────────
invoiceSettingsApi.put('/', updateInvoiceSettings);
invoiceSettingsApi.post('/', updateInvoiceSettings);

// ── POST /invoiceSettings/upload-logo — Upload logo file to Shopify ──────────
invoiceSettingsApi.post('/upload-logo', uploadLogo);

// ── POST /invoiceSettings/delete-logo — Delete logo file from Shopify ────────
invoiceSettingsApi.post('/delete-logo', deleteLogo);

export default invoiceSettingsApi;
