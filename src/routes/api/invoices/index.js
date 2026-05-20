import { Hono } from 'hono';
import { getInvoices, createNewInvoice, sendInvoiceEmail, getInvoiceByOrder } from './controller';

const invoicesApi = new Hono();

invoicesApi.get('/', getInvoices);
invoicesApi.get('/by-order', getInvoiceByOrder);
invoicesApi.post('/', createNewInvoice);
invoicesApi.post('/:id/send', sendInvoiceEmail);

export default invoicesApi;
