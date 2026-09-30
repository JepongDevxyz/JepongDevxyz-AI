/* ============================================================
   JepongDevxyz AI — Connectors config
   GET  /api/connectors/config
     -> { providers: { google: {configured}, spotify: {...}, meta: {...} } }
        (signed-in users only; tells the panel which OAuth apps
        the owner has set up)
   POST /api/connectors/config  { provider, client_id, client_secret }
     -> { ok: true }   (owner setup; gated by CONNECTOR_ADMIN_UID
        when that env var is set, otherwise any signed-in user)
   ============================================================ */


import { getUserId } from '../paymongo/create.js';
import { json, fail, getOAuthConfig, sbUpsert } from './_db.js';
import { PROVIDER_IDS, OAUTH_PROVIDERS } from './_providers.js';

async function handle(req) {
  if (req.method === 'GET') {
    await getUserId(req);
    const providers = {};
    for (const p of PROVIDER_IDS) {
      const cfg = await getOAuthConfig(p).catch(() => null);
      providers[p] = { configured: !!cfg, label: OAUTH_PROVIDERS[p].label };
    }
    return json(200, { providers });
  }
  if (req.method === 'POST') {
    const userId = await getUserId(req);
    const admin = process.env.CONNECTOR_ADMIN_UID;
    if (admin && userId !== admin) return json(403, { error: 'Only the owner can configure connectors.' });
    const body = await req.json().catch(() => ({}));
    const provider = String(body.provider || '');
    const clientId = String(body.client_id || '').trim();
    const clientSecret = String(body.client_secret || '').trim();
    if (!OAUTH_PROVIDERS[provider]) return json(400, { error: 'Unknown provider.' });
    if (!clientId || !clientSecret) return json(400, { error: 'Client ID and secret are required.' });
    await sbUpsert(
      'connector_config',
      { provider, client_id: clientId, client_secret: clientSecret, updated_at: new Date().toISOString() },
      'provider'
    );
    return json(200, { ok: true });
  }
  return json(405, { error: 'Method not allowed.' });
}

async function handler(req) {
  try {
    return await handle(req);
  } catch (e) {
    const status = e && typeof e.status === 'number' ? e.status : 500;
    return json(status, { error: (e && e.message) || 'Server error.' });
  }
}

export { handler };