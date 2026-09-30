/* ============================================================
   JepongDevxyz AI — Connectors OAuth start
   GET /api/connectors/auth-url?provider=google|spotify|meta
     -> { url }  (open in a popup)
     -> { configured: false } when the owner hasn't set up the
        OAuth app yet (the panel then shows the setup guide)
   ============================================================ */


import { getUserId } from '../paymongo/create.js';
import { json, getOAuthConfig, mintLinkNonce, getTokenRow } from './_db.js';
import { OAUTH_PROVIDERS, CONNECTORS } from './_providers.js';

function originOf(req) {
  try {
    return new URL(req.url).origin;
  } catch {
    const h = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
    const p = req.headers.get('x-forwarded-proto') || 'https';
    return p + '://' + h;
  }
}

async function handle(req) {
  if (req.method !== 'GET') return json(405, { error: 'Method not allowed.' });
  const userId = await getUserId(req);
  const q = new URL(req.url, 'http://x').searchParams;
  const provider = q.get('provider') || '';
  const connectorId = q.get('connector') || '';
  const def = OAUTH_PROVIDERS[provider];
  if (!def) return json(400, { error: 'Unknown provider.' });
  const cfg = await getOAuthConfig(provider).catch(() => null);
  if (!cfg) return json(200, { configured: false, provider, label: def.label });
  // per-connector scope override (e.g. meta_ads needs ads_read),
  // merged with scopes already granted so re-connecting another card
  // of the same provider never drops earlier permissions.
  const conn = CONNECTORS.find((c) => c.id === connectorId && c.provider === provider);
  const scopeSet = new Set(def.scopes || []);
  if (conn && Array.isArray(conn.scopes)) conn.scopes.forEach((s) => scopeSet.add(s));
  try {
    const row = await getTokenRow(userId, provider).catch(() => null);
    if (row && row.scope) String(row.scope).split(/\s+/).forEach((s) => { if (s) scopeSet.add(s); });
  } catch { /* ignore */ }
  const scopes = [...scopeSet];
  const nonce = await mintLinkNonce(userId, provider);
  const redirectUri = originOf(req) + '/api/connectors/callback';
  const params = new URLSearchParams({
    client_id: cfg.client_id,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    state: provider + ':' + nonce,
    ...(def.authParams || {}),
  });
  return json(200, { configured: true, url: def.authUrl + '?' + params.toString() });
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