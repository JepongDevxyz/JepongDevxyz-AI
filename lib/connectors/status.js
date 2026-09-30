/* ============================================================
   JepongDevxyz AI — Connectors status
   GET /api/connectors/status
     -> { connectors: { gmail: {connected,label,needsSetup}, ... },
          providers: { google: {configured}, ... , github: {configured} },
          custom: [ {id,name,description,base_url,auth_type,test_path} ] }

   A card is "connected" when its provider has a token row for
   this user. meta_ads additionally requires the ads_read scope.
   ============================================================ */


import { getUserId } from '../paymongo/create.js';
import { json, getAllTokenRows, getOAuthConfig, sbGet } from './_db.js';
import { CONNECTORS, PROVIDER_IDS, OAUTH_PROVIDERS, githubOAuthConfig } from './_providers.js';

async function handle(req) {
  if (req.method !== 'GET') return json(405, { error: 'Method not allowed.' });
  const userId = await getUserId(req);
  const [rows, customs, metas, ...cfgs] = await Promise.all([
    getAllTokenRows(userId),
    sbGet(
      '/rest/v1/custom_connectors?select=id,name,description,base_url,auth_type,test_path' +
        '&user_id=eq.' + encodeURIComponent(userId) + '&order=created_at.asc'
    ).catch(() => []),
    sbGet(
      '/rest/v1/connector_meta?select=provider,data&user_id=eq.' + encodeURIComponent(userId)
    ).catch(() => []),
    ...PROVIDER_IDS.map((p) => getOAuthConfig(p).catch(() => null)),
  ]);
  const byProvider = {};
  for (const r of rows) byProvider[r.provider] = r;
  const metaByKey = {};
  for (const m of Array.isArray(metas) ? metas : []) metaByKey[m.provider] = m.data || {};
  const providers = {};
  PROVIDER_IDS.forEach((p, i) => {
    providers[p] = { configured: !!cfgs[i], label: OAUTH_PROVIDERS[p].label };
  });
  providers.github = { configured: !!githubOAuthConfig(), label: 'GitHub' };

  const connectors = {};
  for (const c of CONNECTORS) {
    const prov = c.provider || c.id;
    const row = byProvider[prov];
    let connected = !!row;
    let label = row && row.label ? row.label : '';
    if (c.kind === 'apikey') {
      const md = metaByKey[c.id];
      connected = !!(md && md.fields);
    } else if (c.kind === 'builtin') {
      connected = true; // e.g. Browser/web search is part of the app
    } else if (c.kind === 'device' || c.kind === 'customsuggest') {
      connected = false;
    }
    // meta_ads needs the ads_read scope on the shared meta token
    if (c.id === 'meta_ads' && row) {
      connected = /\bads_read\b/.test(row.scope || '');
    }
    let needsSetup = false;
    if (c.kind === 'apikey' || c.kind === 'builtin' || c.kind === 'device' || c.kind === 'customsuggest') needsSetup = false;
    else if (c.provider === 'github') needsSetup = !providers.github.configured;
    else if (c.provider) needsSetup = !providers[c.provider].configured;
    connectors[c.id] = {
      connected,
      label,
      needsSetup: !connected && needsSetup,
    };
  }
  return json(200, {
    connectors,
    providers,
    custom: Array.isArray(customs) ? customs : [],
  });
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