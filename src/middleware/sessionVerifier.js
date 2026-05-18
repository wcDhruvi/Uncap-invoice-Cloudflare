import { getShopifyClient } from '../utils/shopifyClient';

/**
 * Shopify Hono Session Verification Middleware
 * 
 * This middleware validates Shopify session tokens (JWT) and extracts shop information.
 * It's used to authenticate requests from the Shopify App Bridge React frontend.
 * 
 * Key Features:
 * - Validates Bearer token format in headers
 * - Decodes and verifies JWT session tokens using official Shopify Workers SDK
 * - Extracts shop domain from verified token payload
 * - Handles token expiration and signature verification errors
 * - Supports dual auth mode fallback for non-embedded local development
 * - Attaches session data (shopDomain, sessionToken) to Hono context variables
 * 
 * @param {import('hono').Context} c - Hono context
 * @param {import('hono').Next} next - Next middleware handler
 */
export async function sessionVerifier(c, next) {
  const authHeader = c.req.header('Authorization');

  try {
    // 1. Validate authorization header exists
    if (!authHeader) {
      return c.json({ error: 'Please provide authorization credentials' }, 401);
    }

    // 2. Dual Auth Mode: Extract Bearer token or fallback to stringified local params
    const bearerRegex = /^Bearer\s+(.+)$/;
    const match = authHeader.match(bearerRegex);
    
    let token = '';
    let shopDomain = '';

    if (match) {
      // Embedded App Mode: Verify JWT from Shopify
      token = match[1].trim();
      if (!token) {
        return c.json({ error: 'Please provide a valid session token' }, 401);
      }

      const shopify = getShopifyClient(c.env);
      const tokenPayload = await shopify.session.decodeSessionToken(token);

      if (!tokenPayload || !tokenPayload.dest) {
        return c.json({ error: 'Invalid session token. Please try again.' }, 401);
      }

      shopDomain = tokenPayload.dest.replace(/^https?:\/\//, '');
    } else {
      // Local/Non-Embedded Test Mode Fallback
      try {
        const parsed = JSON.parse(authHeader);
        if (parsed.shop) {
          shopDomain = parsed.shop;
          token = authHeader; // Raw payload
        }
      } catch (e) {
        return c.json({ error: 'Please provide a valid authorization token' }, 401);
      }
    }

    if (!shopDomain) {
      return c.json({ error: 'Unable to verify shop domain from token' }, 400);
    }

    // 3. Set context variables for downstream API handlers
    c.set('sessionToken', token);
    c.set('shopDomain', shopDomain);

    return await next();
  } catch (error) {
    // 4. Handle specific Shopify session errors with clear client feedback
    if (error.message.includes('JWT') || error.message.includes('signature')) {
      return c.json({ error: 'Invalid session token. Please log in again.' }, 401);
    }

    if (
      error.message.includes('expired') || 
      error.message.includes('exp') || 
      error.message.includes('timestamp check failed')
    ) {
      return c.json({ error: 'Your session has expired. Please log in again.' }, 401);
    }

    console.error('Shopify Session verification error:', error);
    return c.json({ error: 'Unable to verify session. Please try again.' }, 401);
  }
}
