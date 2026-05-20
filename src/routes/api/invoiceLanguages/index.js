import { Hono } from 'hono';
import { getInvoiceLanguage, updateInvoiceLanguage } from './controller';

const invoiceLanguagesApi = new Hono();

// ── GET /invoiceLanguages — Retrieve language settings for the authenticated shop ───
invoiceLanguagesApi.get('/', getInvoiceLanguage);

// ── PUT /invoiceLanguages — Update language settings for the authenticated shop ────────
invoiceLanguagesApi.put('/', updateInvoiceLanguage);

export default invoiceLanguagesApi;
