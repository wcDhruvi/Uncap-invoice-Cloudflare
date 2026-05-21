import { Hono } from 'hono';
import { getInvoiceLanguage, updateInvoiceLanguage } from './controller';

const invoiceLanguagesApi = new Hono();

// ── GET /invoiceLanguages — Retrieve language settings for the authenticated shop ───
invoiceLanguagesApi.get('/', getInvoiceLanguage);

// ── PUT/POST /invoiceLanguages — Update language settings for the authenticated shop ────────
invoiceLanguagesApi.put('/', updateInvoiceLanguage);
invoiceLanguagesApi.post('/', updateInvoiceLanguage);

export default invoiceLanguagesApi;
