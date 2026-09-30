/* ============================================================
   JepongDevxyz AI — Connectors: store API-key credentials (v3).
   POST /api/connectors/store
     { connector: "stripe", secret_key: "..." }
     { connector: "shopify", shop, access_token }
   Data-driven: each entry declares its fields and a verify()
   that proves the credential works. The verified fields are
   stored (secret values encrypted at rest in connector_meta).
   ============================================================ */
import { webCompatible } from '../_node_web_bridge.js';
import { getUserId } from '../paymongo-create.js';
import { CONNECTORS } from './_providers.js';
import { setMeta, json } from './_db.js';

function b64(s) { return Buffer.from(s, 'utf8').toString('base64'); }

async function check(url, opts = {}) {
  const r = await fetch(url, opts);
  const text = await r.text();
  return { status: r.status, ok: r.ok, body: text.slice(0, 300) };
}

const VERIFY = {
  plaid: async (f) => {
    const host = f.env === 'sandbox' ? 'https://sandbox.plaid.com' : 'https://production.plaid.com';
    const r = await check(host + '/accounts/balance/get', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: f.client_id, secret: f.secret, access_token: f.access_token }),
    });
    return r.ok || r.status === 400 ? null : 'Plaid rejected the credentials (HTTP ' + r.status + ')';
  },
  stripe: async (f) => {
    const r = await check('https://api.stripe.com/v1/balance', { headers: { 'Authorization': 'Bearer ' + f.secret_key } });
    return r.ok ? null : 'Stripe rejected the key (HTTP ' + r.status + ')';
  },
  shopify: async (f) => {
    const shop = String(f.shop || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!/\.myshopify\.com$/.test(shop)) return 'Shop domain must look like mystore.myshopify.com';
    const r = await check('https://' + shop + '/admin/api/2024-01/shop.json', { headers: { 'X-Shopify-Access-Token': f.access_token } });
    return r.ok ? null : 'Shopify rejected the token (HTTP ' + r.status + ')';
  },
  calendly: async (f) => {
    const r = await check('https://api.calendly.com/users/me', { headers: { 'Authorization': 'Token ' + f.api_token } });
    return r.ok ? null : 'Calendly rejected the token (HTTP ' + r.status + ')';
  },
  klaviyo: async (f) => {
    const r = await check('https://a.klaviyo.com/api/lists/?page[size]=1', {
      headers: { 'Authorization': 'Klaviyo-API-Key ' + f.api_key, 'revision': '2024-10-15' },
    });
    return r.ok ? null : 'Klaviyo rejected the key (HTTP ' + r.status + ')';
  },
  highlevel: async (f) => {
    const r = await check('https://services.leadconnectorhq.com/users/me', { headers: { 'Authorization': 'Bearer ' + f.api_key, 'Version': '2021-07-28' } });
    return r.ok ? null : 'HighLevel rejected the key (HTTP ' + r.status + ')';
  },
  tessie: async (f) => {
    const r = await check('https://api.tessie.com/vehicles', { headers: { 'Authorization': 'Bearer ' + f.api_token } });
    return r.ok ? null : 'Tessie rejected the token (HTTP ' + r.status + ')';
  },
  tailscale: async (f) => {
    const r = await check('https://api.tailscale.com/api/v2/tailnet/-/devices', { headers: { 'Authorization': 'Basic ' + b64(f.api_key + ':') } });
    return r.ok ? null : 'Tailscale rejected the token (HTTP ' + r.status + ')';
  },
  printify: async (f) => {
    const r = await check('https://api.printify.com/v1/shops.json', { headers: { 'Authorization': 'Bearer ' + f.api_token } });
    return r.ok ? null : 'Printify rejected the token (HTTP ' + r.status + ')';
  },
  flightaware: async (f) => {
    const r = await check('https://aeroapi.flightaware.com/aeroapi/airports', { headers: { 'x-apikey': f.api_key } });
    return r.ok ? null : 'FlightAware rejected the key (HTTP ' + r.status + ')';
  },
};

async function handle(req) {
  const userId = await getUserId(req).catch(() => null);
  if (!userId) return json(401, { ok: false, error: 'Sign in required.' });
  const body = await req.json().catch(() => ({}));
  const connector = String(body.connector || '');
  const def = CONNECTORS.find((c) => c.id === connector && c.kind === 'apikey');
  if (!def) return json(400, { ok: false, error: 'Unknown connector.' });

  const fields = {};
  for (const f of def.fields) {
    const v = String(body[f.key] || '').trim();
    if (!v && !f.options) return json(400, { ok: false, error: 'Missing field: ' + f.label });
    fields[f.key] = v || (f.options ? f.options[0] : '');
  }

  let err = null;
  try { err = await VERIFY[connector](fields); }
  catch (e) { err = 'Verification failed: ' + String((e && e.message) || e).slice(0, 120); }
  if (err) return json(400, { ok: false, error: err });

  await setMeta(userId, connector, { fields, connected_at: new Date().toISOString() });
  return json(200, { ok: true });
}

async function handler(req) {
  try {
    return await handle(req);
  } catch (e) {
    const status = e && typeof e.status === 'number' ? e.status : 500;
    return json(status, { ok: false, error: (e && e.message) || 'Server error.' });
  }
}

export default (req, res) => webCompatible(req, res, handler);

/* Exposed for tests. */
export const VERIFY_IDS = Object.keys(VERIFY);
