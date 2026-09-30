/* ============================================================
   JepongDevxyz AI — Connectors: generic OAuth callback (v3).
   GET /api/connectors/callback?code=...&state=provider:nonce
   The nonce binds the popup to the signed-in user (minted by
   auth-url.js). Exchanges the code for tokens, fetches the
   provider profile for a label, stores the token row, then tells
   the opener popup to refresh. Supports form/JSON token bodies,
   body/Basic client auth, and per-provider extra token params.
   ============================================================ */

import { webCompatible } from '../_node_web_bridge.js';
import { OAUTH_PROVIDERS } from './_providers.js';
import { getOAuthConfig, redeemLinkNonce, saveTokenRow, getMetaRow, saveMetaRow } from './_db.js';

function b64(s) { return Buffer.from(s, 'utf8').toString('base64'); }

async function fetchJson(url, opts = {}) {
  const r = await fetch(url, opts);
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { _raw: text.slice(0, 200) }; }
  return { status: r.status, ok: r.ok, data };
}

async function handle(req) {
  const q = new URL(req.url, 'http://x').searchParams;
  const code = q.get('code') || '';
  const state = q.get('state') || '';
  const errParam = q.get('error');

  const closePage = (title, msg, ok) => {
    const safeTitle = String(title).replace(/[<>&"]/g, '');
    const safeMsg = String(msg).replace(/[<>&"]/g, '').slice(0, 200);
    return new Response(
      '<!doctype html><html><body style="font-family:system-ui;background:#0b0b10;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">' +
      '<div style="text-align:center;max-width:420px;padding:24px">' +
      '<h3 style="margin:0 0 8px">' + safeTitle + '</h3>' +
      '<p style="opacity:.7;font-size:14px">' + safeMsg + '</p>' +
      (ok
        ? '<scr' + 'ipt>try{if(window.opener&&!window.opener.closed){window.opener.postMessage({type:"jd-connector-connected",provider:"' + String(ok).replace(/"/g, '') + '"},"*");}}catch(e){}setTimeout(function(){try{window.close()}catch(e){}},1200);</scr' + 'ipt>'
        : '<p style="opacity:.5;font-size:12px">You can close this tab.</p>') +
      '</div></body></html>',
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  };

  const [provider, nonce] = String(state).split(':');
  const def = OAUTH_PROVIDERS[provider];
  if (!def) return closePage('Connector', 'Unknown provider.');
  if (errParam) return closePage(def.label, 'Authorization failed: ' + (q.get('error_description') || errParam));

  // 0) bind the popup to the signed-in user
  let userId;
  try {
    userId = await redeemLinkNonce(nonce, provider);
  } catch {
    return closePage(def.label, 'Sign-in attempt expired. Please try again.');
  }

  const cfg = await getOAuthConfig(provider).catch(() => null);
  if (!cfg || !cfg.client_id) return closePage(def.label, 'Not configured. Ask the app owner to finish the setup.');
  if (!code) return closePage(def.label, 'Missing authorization code. Please try again.');

  // Rebuild the exact redirect_uri used in the authorize step.
  const proto = (req.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim();
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0].trim();
  const redirectUri = proto + '://' + host + '/api/connectors/callback';

  // 1) code -> tokens
  let tokenRes;
  try {
    const headers = { Accept: 'application/json' };
    let body;
    const base = Object.assign({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }, def.tokenExtra || {});
    if (def.tokenFormat === 'json') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(base);
    } else {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      const p = new URLSearchParams();
      for (const [k, v] of Object.entries(base)) p.set(k, String(v));
      if (def.tokenAuth !== 'basic') { p.set('client_id', cfg.client_id); p.set('client_secret', cfg.client_secret); }
      body = p.toString();
    }
    if (def.tokenAuth === 'basic') headers.Authorization = 'Basic ' + b64(cfg.client_id + ':' + cfg.client_secret);
    tokenRes = await fetchJson(def.tokenUrl, { method: 'POST', headers, body, signal: AbortSignal.timeout(20000) });
  } catch (e) {
    return closePage(def.label, 'Token exchange failed: ' + String((e && e.message) || e));
  }
  const tk = (tokenRes && tokenRes.data) || {};
  const accessToken = tk.access_token || tk.accessToken || '';
  if (!tokenRes || !tokenRes.ok || !accessToken) {
    const msg = (tk && (tk.error_description || tk.error || tk.message)) || 'HTTP ' + (tokenRes && tokenRes.status);
    return closePage(def.label, 'Token exchange failed: ' + msg);
  }

  // 2) profile label (optional)
  let label = def.label;
  try {
    if (def.userInfo) {
      const ui = def.userInfo;
      const h = { Authorization: 'Bearer ' + accessToken, Accept: 'application/json' };
      if (ui.headers) Object.assign(h, ui.headers);
      const opts = { method: ui.method || 'GET', headers: h, signal: AbortSignal.timeout(15000) };
      if (ui.body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(ui.body); }
      const me = await fetchJson(ui.url, opts);
      if (me.ok && me.data) {
        const picked = ui.pick(me.data);
        if (picked) label = picked;
      }
    }
  } catch { /* keep default label */ }

  // 3) store
  try {
    const expiresAt = tk.expires_in ? new Date(Date.now() + Number(tk.expires_in) * 1000).toISOString() : null;
    await saveTokenRow(userId, provider, {
      access_token: accessToken,
      refresh_token: tk.refresh_token || null,
      expires_at: expiresAt,
      scope: tk.scope || '',
      label: String(label).slice(0, 120),
    });
    // QuickBooks needs its realmId for API calls; keep it in meta.
    if (provider === 'quickbooks' && tk.realmId) {
      const prev = await getMetaRow(userId, provider).catch(() => ({}));
      await saveMetaRow(userId, provider, { ...prev, realmId: String(tk.realmId) }).catch(() => {});
    }
  } catch (e) {
    return closePage(def.label, 'Could not save the connection: ' + String((e && e.message) || e));
  }

  return closePage('Connected', def.label + ' is now connected. Refreshing your connectors…', provider);
}

async function handler(req) {
  try {
    return await handle(req);
  } catch (e) {
    const status = e && typeof e.status === 'number' ? e.status : 500;
    return new Response(JSON.stringify({ error: (e && e.message) || 'Server error.' }), {
      status, headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default (req, res) => webCompatible(req, res, handler);
