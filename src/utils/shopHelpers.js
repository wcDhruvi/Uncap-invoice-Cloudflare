export async function getToken(env, shop) {
  // Retrieve the stored access token for the given shop from KV namespace `SESSIONS`
  return await env.SESSIONS.get(`token_${shop}`);
}

export async function setToken(env, shop, token) {
  // Store the access token for the given shop in KV namespace `SESSIONS`
  await env.SESSIONS.put(`token_${shop}`, token, { expirationTtl: 60 * 60 * 24 * 30 }); // 30 days
}

export async function verifyHmac(secret, body, headerSignature) {
  // Compute HMAC SHA-256 of request body using the Shopify secret
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));
  // Shopify sends base64‑encoded HMAC, compare directly
  return computed === headerSignature;
}

export async function exchangeToken(shop, code, env) {
  console.log("env in exchangeToken", env);
  const clientId = (env.SHOPIFY_API_KEY || '').trim();
  const clientSecret = (env.SHOPIFY_API_SECRET || '').trim();

  const url = `https://${shop}/admin/oauth/access_token`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return await response.json(); // { access_token: "...", scope: "..." }
}

export async function exchangeSessionToken(shop, sessionToken, env) {
  console.log("env in exchangeSessionToken", env);
  const clientId = (env.SHOPIFY_API_KEY || '').trim();
  const clientSecret = (env.SHOPIFY_API_SECRET || '').trim();
  console.log("client id : ", clientId);
  console.log("client secret : ", clientSecret);

  const url = `https://${shop}/admin/oauth/access_token`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      subject_token: sessionToken,
      subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
      requested_token_type: 'urn:shopify:params:oauth:token-type:offline-access-token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Session token exchange failed: ${error}`);
  }

  return await response.json(); // { access_token: "...", scope: "..." }
}

export async function shopifyAPI(shop, token, endpoint, method = 'GET', body) {
  const url = `https://${shop}/admin/api/2025-01/${endpoint}`;
  const res = await fetch(url, {
    method,
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Shopify API error ${res.status}: ${txt}`);
  }
  return await res.json();
}

export async function shopifyGraphQL(shop, token, query, variables) {
  const url = `https://${shop}/admin/api/2025-01/graphql.json`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Shopify GraphQL error ${res.status}: ${txt}`);
  }
  return await res.json();
}

/**
 * Automates real-time Webhook registrations for all relational tables
 * using asynchronous non-blocking GraphQL calls to Shopify.
 */
export async function registerAllWebhooks(shop, token, env) {
  const appUrl = env.APP_URL;
  if (!appUrl) {
    console.warn("⚠️ [Webhooks] APP_URL not defined in env. Skipping real-time webhooks registration.");
    return;
  }

  const callbackUrl = `${appUrl}/webhooks/shopify`;
  console.log(`📡 [Webhooks] Initiating webhook subscriptions to callback: ${callbackUrl}`);

  // Relational topics to bind
  const topics = [
    'APP_UNINSTALLED',
    'ORDERS_CREATE',
    'ORDERS_UPDATED',
    'ORDERS_DELETE',
    'PRODUCTS_CREATE',
    'PRODUCTS_UPDATE',
    'PRODUCTS_DELETE',
    'CUSTOMERS_CREATE',
    'CUSTOMERS_UPDATE',
    'CUSTOMERS_DELETE',
    'FULFILLMENTS_CREATE',
    'FULFILLMENTS_UPDATE'
  ];

  const mutation = `
    mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
      webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
        userErrors {
          field
          message
        }
        webhookSubscription {
          id
        }
      }
    }
  `;

  for (const topic of topics) {
    try {
      const response = await shopifyGraphQL(shop, token, mutation, {
        topic,
        webhookSubscription: {
          callbackUrl,
          format: 'JSON'
        }
      });

      const errors = response?.data?.webhookSubscriptionCreate?.userErrors || [];
      if (errors.length > 0) {
        console.warn(`⚠️ [Webhooks] Skip/Warning subscribing to ${topic}:`, JSON.stringify(errors));
      } else {
        const subId = response?.data?.webhookSubscriptionCreate?.webhookSubscription?.id;
        console.log(`✅ [Webhooks] Subscribed to ${topic} successfully. ID: ${subId}`);
      }
    } catch (err) {
      console.error(`❌ [Webhooks] Failed to register webhook for topic ${topic}:`, err);
    }
  }
}
