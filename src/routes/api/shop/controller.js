import { getShopifyClient } from '../../../utils/shopifyClient';
import { getDrizzle } from '../../../db/drizzle';
import { getShopByDomain, upsertShop } from '../../../db/dbHelpers';
import { GraphQLClient } from 'graphql-request';
import { processSyncMessage } from '../../../utils/queueConsumer';
import { registerAllWebhooks } from '../../../utils/shopHelpers';
import { SHOP_QUERY } from './graphqlQuery';

export const getShopDetails = async (c) => {
  const authorization = c.req.header('Authorization');
  if (!authorization) {
    return c.json({ error: 'Missing Authorization header' }, 401);
  }

  const shopify = getShopifyClient(c.env);
  const db = getDrizzle(c.env);

  let shopDomain = '';
  let sessionToken = '';

  // Dual Auth mode: Decodes JWT Bearer or parses URL fallback
  if (authorization.startsWith('Bearer ')) {
    sessionToken = authorization.substring(7);
    try {
      const decoded = await shopify.session.decodeSessionToken(sessionToken);
      shopDomain = decoded.dest.replace(/^https?:\/\//, '');
      console.log('Decoded shop domain from JWT:', shopDomain);
    } catch (err) {
      console.error('Failed to decode App Bridge session token:', err);
      return c.json({ error: 'Invalid Session Token' }, 401);
    }
  } else {
    try {
      const params = JSON.parse(authorization);
      shopDomain = params.shop;
      console.log('Extracted shop from URL search params:', shopDomain);
    } catch (e) {
      return c.json({ error: 'Invalid Authorization header format' }, 401);
    }
  }

  if (!shopDomain) {
    return c.json({ error: 'Missing shop domain' }, 400);
  }

  try {
    let shop = await getShopByDomain(db, shopDomain);
    const wasUninstalled = shop && shop.is_active === false;

    if (!shop || wasUninstalled || !shop.access_token) {
      if (!sessionToken) {
        return c.json({ error: 'OAuth Session Token required for fresh installation' }, 401);
      }

      console.log(`🔑 Performing official Token Exchange for: ${shopDomain}`);
      console.log('SessionToken length:', sessionToken?.length);

      // Trade App Bridge JWT for offline token using official SDK
      const response = await shopify.auth.tokenExchange({
        sessionToken,
        shop: shopDomain,
        requestedTokenType: 'urn:shopify:params:oauth:token-type:offline-access-token',
      });

      const session = response?.session;
      const token = session?.accessToken || session?.token;
      console.log('Exchanged token extracted:', token ? `YES (length: ${token.length})` : 'NO');

      console.log(`📝 Fetching shop details via graphql-request...`);
      const graphQLClient = new GraphQLClient(`https://${shopDomain}/admin/api/2025-01/graphql.json`, {
        headers: {
          'X-Shopify-Access-Token': token,
        },
      });

      const gqlResponse = await graphQLClient.request(SHOP_QUERY);
      const shopInfo = gqlResponse?.shop;

      if (!shopInfo) {
        throw new Error('GraphQL query returned empty shop profile info.');
      }

      let shopIdRaw = shopInfo.id;
      if (shopIdRaw && typeof shopIdRaw === 'string') {
        const parts = shopIdRaw.split('/');
        shopIdRaw = parts[parts.length - 1];
      }
      const id = parseInt(shopIdRaw, 10);

      // Map details to our Drizzle upsert payload
      const upsertData = {
        id,
        myshopify_domain: shopDomain,
        name: shopInfo.name,
        email: shopInfo.email,
        domain: shopInfo.primaryDomain?.host || '',
        currency: shopInfo.currencyCode,
        timezone: shopInfo.ianaTimezone,
        iana_timezone: shopInfo.ianaTimezone,
        access_token: token,
        is_active: true
      };

      await upsertShop(db, upsertData);
      console.log(`🔄 Shop ${shopDomain} successfully installed/updated in Drizzle D1`);

      // Register all real-time webhooks in the background
      c.executionCtx.waitUntil(registerAllWebhooks(shopDomain, token, c.env));

      // ✉️ Send background sync task to Cloudflare Queue
      if (c.env.SYNC_QUEUE) {
        console.log(`✉️ Sending sync message to Cloudflare Queue for: ${shopDomain}`);
        await c.env.SYNC_QUEUE.send({
          shopId: id,
          shopDomain,
          accessToken: token,
        });
      } else {
        console.log(`⚠️ SYNC_QUEUE not bound. Running async fallback with c.executionCtx.waitUntil`);
        c.executionCtx.waitUntil(
          processSyncMessage(db, { shopId: id, shopDomain, accessToken: token })
        );
      }

      shop = await getShopByDomain(db, shopDomain);
    }

    const responseData = { ...shop };
    delete responseData.access_token;

    return c.json({ shop: responseData });

  } catch (error) {
    console.error('Error getting shop details:', error);
    return c.json({ error: error.message }, 500);
  }
};
