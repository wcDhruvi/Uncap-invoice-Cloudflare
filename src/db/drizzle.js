import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

/**
 * Returns a Drizzle ORM instance bound to the D1 database.
 * Pass the Cloudflare Worker env (which contains `DB` binding).
 */
export function getDrizzle(env) {
  return drizzle(env.DB, { schema });
}
