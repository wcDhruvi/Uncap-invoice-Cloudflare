-- System Tables
DROP TABLE IF EXISTS plans;
CREATE TABLE plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  monthly_price REAL DEFAULT 0,
  trial_days INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'CAD',
  features TEXT, -- JSON string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS shopify_sessions;
CREATE TABLE shopify_sessions (
  id TEXT PRIMARY KEY, -- sessionId from Shopify
  shop TEXT NOT NULL,
  state TEXT NOT NULL,
  is_online BOOLEAN NOT NULL,
  scope TEXT,
  expires DATETIME,
  access_token TEXT,
  user_id BIGINT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Shopify Core Tables
DROP TABLE IF EXISTS shopify_shops;
CREATE TABLE shopify_shops (
  id BIGINT PRIMARY KEY, -- Shopify ID
  myshopify_domain TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  domain TEXT,
  currency TEXT,
  timezone TEXT,
  iana_timezone TEXT,
  shop_owner TEXT,
  plan_name TEXT,
  plan_display_name TEXT,
  latitude REAL,
  longitude REAL,
  address1 TEXT,
  address2 TEXT,
  city TEXT,
  zip TEXT,
  province TEXT,
  country TEXT,
  country_code TEXT,
  country_name TEXT,
  phone TEXT,
  customer_email TEXT,
  money_format TEXT,
  money_with_currency_format TEXT,
  weight_unit TEXT,
  province_code TEXT,
  setup_required BOOLEAN,
  force_ssl BOOLEAN,
  primary_locale TEXT,
  primary_location_id BIGINT,
  active_recurring_subscription_id TEXT,
  plan_id INTEGER REFERENCES plans(id),
  used_trial_minutes INTEGER DEFAULT 0,
  used_trial_minutes_updated_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  shopify_created_at DATETIME,
  shopify_updated_at DATETIME,
  access_token     TEXT    NOT NULL,
  scope            TEXT,
  is_active        INTEGER DEFAULT 1,
  installed_at     TEXT    DEFAULT (datetime('now'))
);

DROP TABLE IF EXISTS shopify_products;
CREATE TABLE shopify_products (
  id BIGINT PRIMARY KEY,
  shop_id BIGINT REFERENCES shopify_shops(id),
  title TEXT NOT NULL,
  body_html TEXT,
  vendor TEXT,
  product_type TEXT,
  handle TEXT,
  status TEXT,
  published_at DATETIME,
  shopify_created_at DATETIME,
  shopify_updated_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS shopify_product_variants;
CREATE TABLE shopify_product_variants (
  id BIGINT PRIMARY KEY,
  product_id BIGINT REFERENCES shopify_products(id),
  shop_id BIGINT REFERENCES shopify_shops(id),
  title TEXT,
  price REAL,
  sku TEXT,
  position INTEGER,
  inventory_policy TEXT,
  compare_at_price REAL,
  fulfillment_service TEXT,
  inventory_management TEXT,
  option1 TEXT,
  option2 TEXT,
  option3 TEXT,
  taxable BOOLEAN,
  barcode TEXT,
  grams INTEGER,
  inventory_item_id BIGINT,
  inventory_quantity INTEGER,
  weight REAL,
  weight_unit TEXT,
  shopify_created_at DATETIME,
  shopify_updated_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS shopify_orders;
CREATE TABLE shopify_orders (
  id BIGINT PRIMARY KEY,
  shop_id BIGINT REFERENCES shopify_shops(id),
  customer_id BIGINT,
  email TEXT,
  number INTEGER,
  order_number INTEGER,
  note TEXT,
  token TEXT,
  gateway TEXT,
  test BOOLEAN,
  total_price REAL,
  subtotal_price REAL,
  total_weight INTEGER,
  total_tax REAL,
  taxes_included BOOLEAN,
  currency TEXT,
  financial_status TEXT,
  confirmed BOOLEAN,
  total_discounts REAL,
  total_line_items_price REAL,
  cart_token TEXT,
  name TEXT,
  cancelled_at DATETIME,
  cancel_reason TEXT,
  total_price_set TEXT, -- JSON
  subtotal_price_set TEXT, -- JSON
  total_tax_set TEXT, -- JSON
  total_discounts_set TEXT, -- JSON
  total_line_items_price_set TEXT, -- JSON
  fulfillment_status TEXT,
  customer_locale TEXT,
  processed_at DATETIME,
  status_page_url TEXT,
  shopify_created_at DATETIME,
  shopify_updated_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS shopify_order_line_items;
CREATE TABLE shopify_order_line_items (
  id BIGINT PRIMARY KEY,
  order_id BIGINT REFERENCES shopify_orders(id),
  shop_id BIGINT REFERENCES shopify_shops(id),
  product_id BIGINT,
  variant_id BIGINT,
  title TEXT,
  quantity INTEGER,
  sku TEXT,
  variant_title TEXT,
  vendor TEXT,
  fulfillment_service TEXT,
  requires_shipping BOOLEAN,
  taxable BOOLEAN,
  gift_card BOOLEAN,
  name TEXT,
  variant_inventory_management TEXT,
  properties TEXT, -- JSON
  product_exists BOOLEAN,
  fulfillable_quantity INTEGER,
  grams INTEGER,
  price REAL,
  total_discount REAL,
  fulfillment_status TEXT,
  price_set TEXT, -- JSON
  total_discount_set TEXT, -- JSON
  shopify_created_at DATETIME,
  shopify_updated_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- App Specific Tables
DROP TABLE IF EXISTS invoices;
CREATE TABLE invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id BIGINT REFERENCES shopify_shops(id),
  order_id BIGINT REFERENCES shopify_orders(id),
  invoice_number TEXT UNIQUE NOT NULL,
  status TEXT CHECK( status IN ('draft', 'sent', 'paid', 'void') ) DEFAULT 'draft',
  pdf_url TEXT,
  pdf_url_id TEXT,
  digital_ocean_url TEXT,
  sent_at DATETIME,
  paid_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS invoice_settings;
CREATE TABLE invoice_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id BIGINT REFERENCES shopify_shops(id),
  brand_name TEXT,
  business_name TEXT,
  business_address TEXT,
  city TEXT,
  country TEXT,
  zip_code TEXT,
  phone TEXT,
  company_website TEXT,
  support_email TEXT,
  sender_name TEXT DEFAULT 'Uncap',
  sender_address TEXT DEFAULT 'support@uncap.com',
  logo_url TEXT,
  logo_url_id TEXT,
  invoice_template TEXT DEFAULT 'Design 1',
  primary_color TEXT DEFAULT '#8257d0',
  secondary_color TEXT DEFAULT '#f0ecf9',
  primary_text_color TEXT DEFAULT '#ffffff',
  invoice_text_color TEXT DEFAULT '#000',
  heading_font TEXT DEFAULT 'Roboto',
  body_font TEXT DEFAULT 'Open Sans',
  paper_size TEXT DEFAULT 'A4',
  date_format TEXT DEFAULT 'MM/dd/yyyy',
  default_due_date INTEGER DEFAULT 0,
  send_invoice TEXT DEFAULT 'manuall',
  auto_invoice_send_condition TEXT DEFAULT 'created',
  new_order_email_title TEXT,
  new_order_email_content TEXT,
  edited_order_email_title TEXT,
  edited_order_email_content TEXT,
  cancelled_order_email_title TEXT,
  cancelled_order_email_content TEXT,
  footer_note TEXT,
  show_image BOOLEAN DEFAULT 0,
  show_sku BOOLEAN DEFAULT 0,
  show_barcode BOOLEAN DEFAULT 0,
  show_weight BOOLEAN DEFAULT 0,
  show_hs_code BOOLEAN DEFAULT 0,
  show_country BOOLEAN DEFAULT 0,
  show_payment_gateway BOOLEAN DEFAULT 0,
  show_card_type BOOLEAN DEFAULT 0,
  show_card_last_digit BOOLEAN DEFAULT 0,
  show_currency_code BOOLEAN DEFAULT 0,
  show_item_total BOOLEAN DEFAULT 0,
  show_total_quantity BOOLEAN DEFAULT 0,
  show_payment_details BOOLEAN DEFAULT 0,
  show_payment_link BOOLEAN DEFAULT 0,
  show_order_note BOOLEAN DEFAULT 0,
  not_show_zero_outstanding BOOLEAN DEFAULT 1,
  template_settings TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS invoice_languages;
CREATE TABLE invoice_languages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id BIGINT REFERENCES shopify_shops(id),
  invoice TEXT DEFAULT 'Invoice',
  invoice_number TEXT DEFAULT 'Invoice#',
  invoice_date TEXT DEFAULT 'INVOICE DATE',
  bill_to TEXT DEFAULT 'Bill To',
  ship_to TEXT DEFAULT 'Ship To',
  item TEXT DEFAULT 'ITEM',
  description TEXT DEFAULT 'Description',
  qty TEXT DEFAULT 'QTY',
  unit_price TEXT DEFAULT 'Unit Price',
  total TEXT DEFAULT 'Total',
  subtotal TEXT DEFAULT 'Subtotal',
  discount TEXT DEFAULT 'Discount',
  tax TEXT DEFAULT 'Tax',
  shipping TEXT DEFAULT 'Shipping',
  subtotal_after_discount TEXT DEFAULT 'Subtotal after discount',
  thank_you_note TEXT DEFAULT 'Thank you for your purchase.',
  notes TEXT DEFAULT 'Notes:',
  term_condition_title TEXT DEFAULT 'Terms & conditions',
  term_condition_content TEXT,
  sku TEXT DEFAULT 'SKU:',
  barcode TEXT DEFAULT 'BARCODE:',
  weight TEXT DEFAULT 'Weight:',
  hs_code TEXT DEFAULT 'HS Code:',
  country_of_origin TEXT DEFAULT 'Country Of Origin:',
  payment_details TEXT DEFAULT 'Payment Details:',
  payment_gateway TEXT DEFAULT 'Gateway:',
  card_type TEXT DEFAULT 'Card:',
  card_number TEXT DEFAULT 'Card#:',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Additional Shopify Tables
DROP TABLE IF EXISTS shopify_customers;
CREATE TABLE shopify_customers (
  id BIGINT PRIMARY KEY,
  shop_id BIGINT REFERENCES shopify_shops(id),
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  orders_count INTEGER,
  state TEXT,
  total_spent TEXT,
  last_order_id BIGINT,
  note TEXT,
  verified_email BOOLEAN,
  multipass_identifier TEXT,
  tax_exempt BOOLEAN,
  phone TEXT,
  tags TEXT,
  last_order_name TEXT,
  currency TEXT,
  shopify_created_at DATETIME,
  shopify_updated_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS shopify_locations;
CREATE TABLE shopify_locations (
  id BIGINT PRIMARY KEY,
  shop_id BIGINT REFERENCES shopify_shops(id),
  name TEXT,
  address1 TEXT,
  address2 TEXT,
  city TEXT,
  zip TEXT,
  province TEXT,
  country TEXT,
  phone TEXT,
  country_code TEXT,
  province_code TEXT,
  legacy BOOLEAN,
  active BOOLEAN,
  localized_country_name TEXT,
  localized_province_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS shopify_inventory_items;
CREATE TABLE shopify_inventory_items (
  id BIGINT PRIMARY KEY,
  shop_id BIGINT REFERENCES shopify_shops(id),
  sku TEXT,
  tracked BOOLEAN,
  cost REAL,
  country_code_of_origin TEXT,
  province_code_of_origin TEXT,
  harmonized_system_code TEXT,
  requires_shipping BOOLEAN,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS shopify_inventory_levels;
CREATE TABLE shopify_inventory_levels (
  id TEXT PRIMARY KEY, -- Composite key id usually
  shop_id BIGINT REFERENCES shopify_shops(id),
  inventory_item_id BIGINT REFERENCES shopify_inventory_items(id),
  location_id BIGINT REFERENCES shopify_locations(id),
  available INTEGER,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS shopify_fulfillments;
CREATE TABLE shopify_fulfillments (
  id BIGINT PRIMARY KEY,
  shop_id BIGINT REFERENCES shopify_shops(id),
  order_id BIGINT REFERENCES shopify_orders(id),
  status TEXT,
  tracking_company TEXT,
  tracking_number TEXT,
  tracking_numbers TEXT,
  tracking_url TEXT,
  tracking_urls TEXT,
  receipt TEXT,
  name TEXT,
  shopify_created_at DATETIME,
  shopify_updated_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS shopify_refunds;
CREATE TABLE shopify_refunds (
  id BIGINT PRIMARY KEY,
  shop_id BIGINT REFERENCES shopify_shops(id),
  order_id BIGINT REFERENCES shopify_orders(id),
  note TEXT,
  user_id BIGINT,
  processed_at DATETIME,
  shopify_created_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS shopify_syncs;
CREATE TABLE shopify_syncs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id BIGINT REFERENCES shopify_shops(id),
  domain TEXT NOT NULL,
  status TEXT,
  models TEXT, -- JSON
  error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
