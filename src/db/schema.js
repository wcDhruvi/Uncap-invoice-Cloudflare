import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const shops = sqliteTable('shopify_shops', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  myshopify_domain: text('myshopify_domain').notNull().unique(),
  name: text('name'),
  email: text('email'),
  domain: text('domain'),
  currency: text('currency'),
  timezone: text('timezone'),
  iana_timezone: text('iana_timezone'),
  access_token: text('access_token'),
  installed_at: text('installed_at').default('CURRENT_TIMESTAMP'),
  is_active: integer('is_active', { mode: 'boolean' }).default(true),
});

export const invoices = sqliteTable('invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  shop_id: integer('shop_id').notNull(),
  order_id: integer('order_id'),
  invoice_number: text('invoice_number').notNull().unique(),
  amount: real('amount'),
  status: text('status').default('draft'),
  due_date: text('due_date'),
  notes: text('notes'),
  created_at: text('created_at').default('CURRENT_TIMESTAMP'),
  updated_at: text('updated_at').default('CURRENT_TIMESTAMP'),
});

export const orders = sqliteTable('shopify_orders', {
  id: integer('id').primaryKey().notNull(),
  shop_id: integer('shop_id').notNull(),
  email: text('email'),
  order_number: integer('order_number'),
  total_price: real('total_price'),
  currency: text('currency'),
  financial_status: text('financial_status'),
  fulfillment_status: text('fulfillment_status'),
  created_at: text('created_at'),
  updated_at: text('updated_at').default('CURRENT_TIMESTAMP'),
});

export const products = sqliteTable('shopify_products', {
  id: integer('id').primaryKey().notNull(),
  shop_id: integer('shop_id').notNull(),
  title: text('title'),
  vendor: text('vendor'),
  product_type: text('product_type'),
  handle: text('handle'),
  status: text('status'),
  created_at: text('created_at'),
  updated_at: text('updated_at').default('CURRENT_TIMESTAMP'),
});

export const customers = sqliteTable('shopify_customers', {
  id: integer('id').primaryKey().notNull(),
  shop_id: integer('shop_id').notNull(),
  email: text('email'),
  first_name: text('first_name'),
  last_name: text('last_name'),
  orders_count: integer('orders_count'),
  state: text('state'),
  total_spent: text('total_spent'),
  created_at: text('created_at'),
  updated_at: text('updated_at').default('CURRENT_TIMESTAMP'),
});

export const schema = { shops, invoices, orders, products, customers };
