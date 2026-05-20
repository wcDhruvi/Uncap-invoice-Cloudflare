import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { getInvoices, createNewInvoice } from './controller';

const invoicesApi = new Hono();

// Zod validation schema for creating invoices
const createInvoiceSchema = z.object({
  shop_id: z.union([z.number(), z.string().transform(v => parseInt(v, 10))]),
  order_id: z.union([z.number(), z.string().transform(v => parseInt(v, 10))]).optional(),
  invoice_number: z.string().min(1),
  amount: z.union([z.number(), z.string().transform(v => parseFloat(v))]).optional(),
  status: z.enum(['draft', 'sent', 'paid', 'void']).optional(),
  due_date: z.string().optional(),
  notes: z.string().optional(),
});

// ── GET /invoices — Retrieve all invoices for the authenticated shop ───
invoicesApi.get('/', getInvoices);

// ── POST /invoices — Create/issue a new invoice ────────
invoicesApi.post('/', zValidator('json', createInvoiceSchema), createNewInvoice);

export default invoicesApi;
