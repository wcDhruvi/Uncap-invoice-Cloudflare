PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_shopify_products` (
	`id` integer PRIMARY KEY NOT NULL,
	`shop_id` integer NOT NULL,
	`title` text NOT NULL,
	`body_html` text,
	`vendor` text,
	`product_type` text,
	`handle` text,
	`status` text,
	`published_at` text,
	`shopify_created_at` text,
	`shopify_updated_at` text,
	`created_at` text,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
INSERT INTO `__new_shopify_products`("id", "shop_id", "title", "body_html", "vendor", "product_type", "handle", "status", "published_at", "shopify_created_at", "shopify_updated_at", "created_at", "updated_at") SELECT "id", "shop_id", "title", "body_html", "vendor", "product_type", "handle", "status", "published_at", "shopify_created_at", "shopify_updated_at", "created_at", "updated_at" FROM `shopify_products`;--> statement-breakpoint
DROP TABLE `shopify_products`;--> statement-breakpoint
ALTER TABLE `__new_shopify_products` RENAME TO `shopify_products`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `shopify_fulfillments` ADD `shopify_created_at` text;--> statement-breakpoint
ALTER TABLE `shopify_fulfillments` ADD `shopify_updated_at` text;--> statement-breakpoint
ALTER TABLE `shopify_order_line_items` ADD `shopify_created_at` text;--> statement-breakpoint
ALTER TABLE `shopify_order_line_items` ADD `shopify_updated_at` text;--> statement-breakpoint
ALTER TABLE `shopify_orders` ADD `number` integer;--> statement-breakpoint
ALTER TABLE `shopify_orders` ADD `note` text;--> statement-breakpoint
ALTER TABLE `shopify_orders` ADD `token` text;--> statement-breakpoint
ALTER TABLE `shopify_orders` ADD `gateway` text;--> statement-breakpoint
ALTER TABLE `shopify_orders` ADD `test` integer;--> statement-breakpoint
ALTER TABLE `shopify_orders` ADD `subtotal_price` real;--> statement-breakpoint
ALTER TABLE `shopify_orders` ADD `total_weight` integer;--> statement-breakpoint
ALTER TABLE `shopify_orders` ADD `total_tax` real;--> statement-breakpoint
ALTER TABLE `shopify_orders` ADD `taxes_included` integer;--> statement-breakpoint
ALTER TABLE `shopify_orders` ADD `confirmed` integer;--> statement-breakpoint
ALTER TABLE `shopify_orders` ADD `total_discounts` real;--> statement-breakpoint
ALTER TABLE `shopify_orders` ADD `total_line_items_price` real;--> statement-breakpoint
ALTER TABLE `shopify_orders` ADD `name` text;--> statement-breakpoint
ALTER TABLE `shopify_orders` ADD `cancelled_at` text;--> statement-breakpoint
ALTER TABLE `shopify_orders` ADD `cancel_reason` text;--> statement-breakpoint
ALTER TABLE `shopify_orders` ADD `total_price_set` text;--> statement-breakpoint
ALTER TABLE `shopify_orders` ADD `subtotal_price_set` text;--> statement-breakpoint
ALTER TABLE `shopify_orders` ADD `total_tax_set` text;--> statement-breakpoint
ALTER TABLE `shopify_orders` ADD `total_discounts_set` text;--> statement-breakpoint
ALTER TABLE `shopify_orders` ADD `total_line_items_price_set` text;--> statement-breakpoint
ALTER TABLE `shopify_orders` ADD `customer_locale` text;--> statement-breakpoint
ALTER TABLE `shopify_orders` ADD `processed_at` text;--> statement-breakpoint
ALTER TABLE `shopify_orders` ADD `status_page_url` text;--> statement-breakpoint
ALTER TABLE `shopify_orders` ADD `shopify_created_at` text;--> statement-breakpoint
ALTER TABLE `shopify_orders` ADD `shopify_updated_at` text;--> statement-breakpoint
ALTER TABLE `shopify_orders` ADD `tags` text;--> statement-breakpoint
ALTER TABLE `shopify_product_variants` ADD `shopify_created_at` text;--> statement-breakpoint
ALTER TABLE `shopify_product_variants` ADD `shopify_updated_at` text;