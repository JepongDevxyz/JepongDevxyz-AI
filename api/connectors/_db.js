/* ============================================================
   JepongDevxyz AI — Connectors: shared Supabase + OAuth helpers.
   Tokens live in connector_tokens (service role only); OAuth app
   credentials live in connector_config, with env vars taking
   precedence (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET,
   SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET,
   META_CLIENT_ID / META_CLIENT_SECRET).
   ============================================================ */

import { OAUTH_PROVIDERS } from './_providers.js';

export const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

export function fail(status, message) {
  const e = new Error(message);
  e.status = status;
  throw e;
}

function sbBase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) fail(503, 'Server is not configured.');
  return { base: url.replace(/\/+$/, ''), key };
}

export async function sbGet(path) {
  const { base, key } = sbBase();
  const r = await fetch(base + path, {
    headers: { apikey: key, Authorization: 'Bearer ' + key },
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) fail(502, 'Database error.');
  return r.json().catch(() => null);
}

export async function sbUpsert(table, row, onConflict) {
  const { base, key } = sbBase();
  const r = await fetch(base + '/rest/v1/' + table + '?on_conflict=' + encodeURIComponent(onConflict), {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(row),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) fail(502, 'Database error.');
}

export async function sbDelete(table, filter) {
  const { base, key } = sbBase();
  const r = await fetch(base + '/rest/v1/' + table + '?' + filter, {
    method: 'DELETE',
    headers: { apikey: key, Authorization: 'Bearer ' + key },
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) fail(502, 'Database error.');
}

/* ---------- OAuth app credentials (env wins, then table) ---------- */

const ENV_KEYS = {
  google: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  spotify: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'],
  meta: ['META_CLIENT_ID', 'META_CLIENT_SECRET'],
  microsoft: ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'],
  dropbox: ['DROPBOX_CLIENT_ID', 'DROPBOX_CLIENT_SECRET'],
  box: ['BOX_CLIENT_ID', 'BOX_CLIENT_SECRET'],
  notion: ['NOTION_CLIENT_ID', 'NOTION_CLIENT_SECRET'],
  slack: ['SLACK_CLIENT_ID', 'SLACK_CLIENT_SECRET'],
  figma: ['FIGMA_CLIENT_ID', 'FIGMA_CLIENT_SECRET'],
  zoom: ['ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET'],
  linear: ['LINEAR_CLIENT_ID', 'LINEAR_CLIENT_SECRET'],
  todoist: ['TODOIST_CLIENT_ID', 'TODOIST_CLIENT_SECRET'],
  asana: ['ASANA_CLIENT_ID', 'ASANA_CLIENT_SECRET'],
  canva: ['CANVA_CLIENT_ID', 'CANVA_CLIENT_SECRET'],
  quickbooks: ['QUICKBOOKS_CLIENT_ID', 'QUICKBOOKS_CLIENT_SECRET'],
  withings: ['WITHINGS_CLIENT_ID', 'WITHINGS_CLIENT_SECRET'],
  vercel: ['VERCEL_CLIENT_ID', 'VERCEL_CLIENT_SECRET'],
};

export async function getOAuthConfig(provider) {
  const def = OAUTH_PROVIDERS[provider];
  if (!def) return null;
  const [idKey, secretKey] = ENV_KEYS[provider] || [];
  if (idKey && process.env[idKey] && secretKey && process.env[secretKey]) {
    return { client_id: process.env[idKey], client_secret: process.env[secretKey], source: 'env' };
  }
  const rows = await sbGet(
    '/rest/v1/connector_config?select=client_id,client_secret&provider=eq.' + encodeURIComponent(provider)
  );
  if (Array.isArray(rows) && rows[0] && rows[0].client_id) {
    return { client_id: rows[0].client_id, client_secret: rows[0].client_secret, source: 'db' };
  }
  return null;
}

/* ---------- per-user tokens ---------- */

export async function getTokenRow(userId, provider) {
  const rows = await sbGet(
    '/rest/v1/connector_tokens?select=provider,access_token,refresh_token,expires_at,scope,label,updated_at' +
      '&user_id=eq.' + encodeURIComponent(userId) +
      '&provider=eq.' + encodeURIComponent(provider)
  );
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

export async function getAllTokenRows(userId) {
  const rows = await sbGet(
    '/rest/v1/connector_tokens?select=provider,label,scope,updated_at' +
      '&user_id=eq.' + encodeURIComponent(userId)
  );
  return Array.isArray(rows) ? rows : [];
}

export async function saveTokenRow(userId, provider, t) {
  await sbUpsert(
    'connector_tokens',
    {
      user_id: userId,
      provider,
      access_token: t.access_token,
      refresh_token: t.refresh_token || null,
      expires_at: t.expires_at || null,
      scope: t.scope || null,
      label: t.label || null,
      updated_at: new Date().toISOString(),
    },
    'user_id,provider'
  );
}

export async function deleteTokenRow(userId, provider) {
  await sbDelete(
    'connector_tokens',
    'user_id=eq.' + encodeURIComponent(userId) + '&provider=eq.' + encodeURIComponent(provider)
  );
}

/* Exchange an authorization code for tokens. */
export async function exchangeCode(provider, code, redirectUri) {
  const def = OAUTH_PROVIDERS[provider];
  const cfg = await getOAuthConfig(provider);
  if (!cfg) fail(503, 'OAuth is not configured for ' + def.label + '.');
  const body = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  };
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (def.tokenAuth === 'basic') {
    body.client_id = cfg.client_id;
    headers.Authorization = 'Basic ' + Buffer.from(cfg.client_id + ':' + cfg.client_secret).toString('base64');
  } else {
    body.client_id = cfg.client_id;
    body.client_secret = cfg.client_secret;
  }
  const r = await fetch(def.tokenUrl, {
    method: 'POST',
    headers,
    body: new URLSearchParams(body).toString(),
    signal: AbortSignal.timeout(15000),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok || !data || !data.access_token) {
    fail(502, 'Could not complete sign-in with ' + def.label + '.');
  }
  return data;
}

/* Refresh an access token when it is expired (or about to). */
export async function refreshIfNeeded(userId, provider, row) {
  if (!row || !row.refresh_token) return row;
  if (row.expires_at && Date.now() < new Date(row.expires_at).getTime() - 60000) return row;
  const def = OAUTH_PROVIDERS[provider];
  const cfg = await getOAuthConfig(provider);
  if (!cfg) return row;
  const body = { grant_type: 'refresh_token', refresh_token: row.refresh_token };
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (def.tokenAuth === 'basic') {
    body.client_id = cfg.client_id;
    headers.Authorization = 'Basic ' + Buffer.from(cfg.client_id + ':' + cfg.client_secret).toString('base64');
  } else {
    body.client_id = cfg.client_id;
    body.client_secret = cfg.client_secret;
  }
  const r = await fetch(def.tokenUrl, {
    method: 'POST',
    headers,
    body: new URLSearchParams(body).toString(),
    signal: AbortSignal.timeout(15000),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok || !data || !data.access_token) return row; // keep old token; the call may still work
  const updated = {
    ...row,
    access_token: data.access_token,
    refresh_token: data.refresh_token || row.refresh_token,
    expires_at: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : row.expires_at,
  };
  await saveTokenRow(userId, provider, updated).catch(() => {});
  return updated;
}

export async function providerGet(url, accessToken, extraHeaders) {
  const r = await fetch(url, {
    headers: { Authorization: 'Bearer ' + accessToken, ...(extraHeaders || {}) },
    signal: AbortSignal.timeout(15000),
  });
  const data = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, data };
}

/* ---------- per-connector metadata (github repo selection, plaid creds) ---------- */

export async function getMetaRow(userId, provider) {
  const rows = await sbGet(
    '/rest/v1/connector_meta?select=provider,data' +
      '&user_id=eq.' + encodeURIComponent(userId) +
      '&provider=eq.' + encodeURIComponent(provider)
  );
  return Array.isArray(rows) && rows[0] ? rows[0].data || {} : {};
}

export async function saveMetaRow(userId, provider, data) {
  await sbUpsert(
    'connector_meta',
    { user_id: userId, provider, data, updated_at: new Date().toISOString() },
    'user_id,provider'
  );
}

/* ---------- OAuth link nonces (popup flow user binding) ---------- */

export async function mintLinkNonce(userId, provider) {
  const nonce =
    (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())) +
    Math.random().toString(36).slice(2);
  await sbUpsert(
    'connector_oauth_state',
    { nonce, user_id: userId, provider, created_at: new Date().toISOString() },
    'nonce'
  );
  return nonce;
}

export async function redeemLinkNonce(nonce, provider) {
  const row = await peekLinkNonce(nonce, provider);
  await sbDelete('connector_oauth_state', 'nonce=eq.' + encodeURIComponent(nonce)).catch(() => {});
  return row.user_id;
}

/* Same as redeem but keeps the nonce (for multi-request setup flows). */
export async function peekLinkNonce(nonce, provider) {
  const rows = await sbGet(
    '/rest/v1/connector_oauth_state?select=nonce,user_id,provider,created_at&nonce=eq.' + encodeURIComponent(nonce)
  );
  const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
  if (!row || row.provider !== provider) fail(400, 'Invalid or expired sign-in attempt. Try again.');
  if (Date.now() - new Date(row.created_at).getTime() > 10 * 60 * 1000) {
    await sbDelete('connector_oauth_state', 'nonce=eq.' + encodeURIComponent(nonce)).catch(() => {});
    fail(400, 'Sign-in attempt expired. Try again.');
  }
  return row;
}

export async function consumeLinkNonce(nonce) {
  await sbDelete('connector_oauth_state', 'nonce=eq.' + encodeURIComponent(nonce)).catch(() => {});
}

/* ---------- aliases used by the v3 endpoints ---------- */

/** Alias: getOAuthConfig. */
export const getProviderConfig = getOAuthConfig;

/** Alias: saveTokenRow(userId, provider, t). */
export async function upsertToken(userId, t) {
  return saveTokenRow(userId, t.provider, t);
}

/** Per-connector key/value metadata (API-key credentials etc.), keyed by connector id. */
export async function setMeta(userId, connector, data) {
  return saveMetaRow(userId, connector, data);
}

/** Read connector metadata; returns {} when absent. */
export async function getMeta(userId, connector) {
  return getMetaRow(userId, connector);
}

export async function deleteMeta(userId, connector) {
  await sbDelete(
    'connector_meta',
    'user_id=eq.' + encodeURIComponent(userId) + '&provider=eq.' + encodeURIComponent(connector)
  ).catch(() => {});
}

/**
 * Credentials for one connector card: the OAuth token row for its
 * provider (if any) plus the connector_meta row for the card itself
 * (API-key fields) or its provider (e.g. quickbooks realmId).
 * Returns { token, meta } — either may be null/{}.
 */
export async function getConnectorCreds(userId, conn) {
  const provider = conn.provider || conn.id;
  const [token, metaSelf, metaProv] = await Promise.all([
    conn.provider ? getTokenRow(userId, conn.provider).catch(() => null) : Promise.resolve(null),
    getMetaRow(userId, conn.id).catch(() => ({})),
    conn.provider && conn.provider !== conn.id ? getMetaRow(userId, conn.provider).catch(() => ({})) : Promise.resolve({}),
  ]);
  return { token, meta: { ...metaProv, ...metaSelf } };
}
