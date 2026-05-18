// src/db/models.js – Drizzle ORM based data access
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

/** Helper to obtain a Drizzle instance from the Cloudflare D1 binding */
export const getDb = (env) => drizzle(env.DB, { schema });

/** Shop model */
export const ShopModel = {
  /**
   * Get a shop by its myshopify domain
   */
  async getByDomain(db, domain) {
    return await db
      .prepare("SELECT * FROM shopify_shops WHERE myshopify_domain = ?")
      .bind(domain)
      .first();
  },

  /**
   * Insert or update a shop record.
   * @param {any} db - Drizzle D1 instance
   * @param {object} shop - shop fields
   */
  async upsert(db, shop) {
    const {
      id,
      myshopify_domain,
      name,
      email,
      domain,
      currency,
      timezone,
      iana_timezone,
      access_token,  
      scope 
    } = shop;
    await db
      .prepare(`
        INSERT INTO shopify_shops (id, myshopify_domain, name, email, domain, currency, timezone, iana_timezone, updated_at, access_token, scope)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          email = excluded.email,
          domain = excluded.domain,
          currency = excluded.currency,
          timezone = excluded.timezone,
          iana_timezone = excluded.iana_timezone,
          updated_at = CURRENT_TIMESTAMP,
          access_token = excluded.access_token,
          scope = excluded.scope
      `)
      .bind(
        id,
        myshopify_domain,
        name,
        email,
        domain,
        currency,
        timezone,
        iana_timezone,
        access_token,  
        scope 
      )
      .run();
  },
};

/** Session model */
export const SessionModel = {
  async get(db, id) {
    return await db
      .prepare("SELECT * FROM shopify_sessions WHERE id = ?")
      .bind(id)
      .first();
  },

  async upsert(db, session) {
    const {
      id,
      shop,
      state,
      isOnline,
      scope,
      expires,
      accessToken,
      userId,
    } = session;
    await db
      .prepare(`
        INSERT INTO shopify_sessions (id, shop, state, is_online, scope, expires, access_token, user_id, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          shop = excluded.shop,
          state = excluded.state,
          is_online = excluded.is_online,
          scope = excluded.scope,
          expires = excluded.expires,
          access_token = excluded.access_token,
          user_id = excluded.user_id,
          updated_at = CURRENT_TIMESTAMP
      `)
      .bind(
        id,
        shop,
        state,
        isOnline ? 1 : 0,
        scope,
        expires,
        accessToken,
        userId
      )
      .run();
  },

  async delete(db, id) {
    await db.prepare("DELETE FROM shopify_sessions WHERE id = ?").bind(id).run();
  },
};

/** Invoice model */
export const InvoiceModel = {
  async getAllByShop(db, shopId) {
    const { results } = await db
      .prepare(
        "SELECT * FROM invoices WHERE shop_id = ? ORDER BY created_at DESC"
      )
      .bind(shopId)
      .all();
    return results;
  },

  async getById(db, id) {
    return await db.prepare("SELECT * FROM invoices WHERE id = ?").bind(id).first();
  },

  async create(db, invoiceData) {
    const { shop_id, order_id, invoice_number, status } = invoiceData;
    return await db
      .prepare(`
        INSERT INTO invoices (shop_id, order_id, invoice_number, status)
        VALUES (?, ?, ?, ?)
      `)
      .bind(shop_id, order_id, invoice_number, status || "draft")
      .run();
  },
};

/** Order model */
export const OrderModel = {
  async upsert(db, order) {
    const {
      id,
      shop_id,
      email,
      number,
      order_number,
      total_price,
      currency,
      financial_status,
      fulfillment_status,
    } = order;
    await db
      .prepare(`
        INSERT INTO shopify_orders (id, shop_id, email, number, order_number, total_price, currency, financial_status, fulfillment_status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          email = excluded.email,
          total_price = excluded.total_price,
          financial_status = excluded.financial_status,
          fulfillment_status = excluded.fulfillment_status,
          updated_at = CURRENT_TIMESTAMP
      `)
      .bind(
        id,
        shop_id,
        email,
        number,
        order_number,
        total_price,
        currency,
        financial_status,
        fulfillment_status
      )
      .run();
  },
};


