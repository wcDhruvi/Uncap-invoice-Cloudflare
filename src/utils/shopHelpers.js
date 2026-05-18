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
  const url = `https://${shop}/admin/oauth/access_token`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.SHOPIFY_API_KEY,
      client_secret: env.SHOPIFY_API_SECRET,
      code,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
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
