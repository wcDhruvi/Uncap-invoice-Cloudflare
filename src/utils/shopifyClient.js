import '@shopify/shopify-api/adapters/cf-worker';
import { shopifyApi, ApiVersion } from '@shopify/shopify-api';

let shopifyInstance = null;

/**
 * Returns a cached, initialized instance of the Shopify API client,
 * dynamically binding environment variables at request runtime.
 */
export function getShopifyClient(env) {
  if (!shopifyInstance) {
    const apiKey = (env.SHOPIFY_API_KEY || '').trim();
    const apiSecretKey = (env.SHOPIFY_API_SECRET || '').trim();
    const scopes = (env.SHOPIFY_SCOPES || '').split(',');
    const appUrl = env.APP_URL || '';
    const hostName = appUrl.replace(/^https?:\/\//, '');

    console.log('Initializing official Shopify API client with host:', hostName);
    console.log('SDK Client Configuration — API Key present:', apiKey ? 'YES' : 'NO');
    console.log('SDK Client Configuration — API Secret present:', apiSecretKey ? 'YES' : 'NO');
    console.log('SDK Client Configuration — Scopes count:', scopes.length);

    shopifyInstance = shopifyApi({
      apiKey,
      apiSecretKey,
      scopes,
      hostName,
      apiVersion: ApiVersion.April25,
      isEmbeddedApp: true,
    });
  }
  return shopifyInstance;
}
