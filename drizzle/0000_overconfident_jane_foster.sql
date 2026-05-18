CREATE TABLE `shopify_customers` (
	`id` integer PRIMARY KEY NOT NULL,
	`shop_id` integer NOT NULL,
	`email` text,
	`first_name` text,
	`last_name` text,
	`orders_count` integer,
	`state` text,
	`total_spent` text,
	`created_at` text,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shop_id` integer NOT NULL,
	`order_id` integer,
	`invoice_number` text NOT NULL,
	`amount` real,
	`status` text DEFAULT 'draft',
	`due_date` text,
	`notes` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_invoice_number_unique` ON `invoices` (`invoice_number`);--> statement-breakpoint
CREATE TABLE `shopify_orders` (
	`id` integer PRIMARY KEY NOT NULL,
	`shop_id` integer NOT NULL,
	`email` text,
	`order_number` integer,
	`total_price` real,
	`currency` text,
	`financial_status` text,
	`fulfillment_status` text,
	`created_at` text,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `shopify_products` (
	`id` integer PRIMARY KEY NOT NULL,
	`shop_id` integer NOT NULL,
	`title` text,
	`vendor` text,
	`product_type` text,
	`handle` text,
	`status` text,
	`created_at` text,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `shopify_shops` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`myshopify_domain` text NOT NULL,
	`name` text,
	`email` text,
	`domain` text,
	`currency` text,
	`timezone` text,
	`iana_timezone` text,
	`access_token` text,
	`installed_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`is_active` integer DEFAULT true
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shopify_shops_myshopify_domain_unique` ON `shopify_shops` (`myshopify_domain`);--> statement-breakpoint
CREATE TABLE `shopify_syncs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`shop_id` integer,
	`domain` text NOT NULL,
	`status` text,
	`models` text,
	`error` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
