/* ============================================================
   JepongDevxyz AI — GitHub repository-access selection
   Used by the popup page rendered by github-callback.js.

   GET  /api/connectors/github-repos?setup_token=<nonce>
     -> { ok, repos: [{full_name}], selection: {mode, repos} }
   POST /api/connectors/github-repos
        { setup_token, mode: "all"|"selected", repos: [full_name...] }
     -> { ok: true }

   The setup_token is the single-use (10-minute) nonce minted by
   the callback; it identifies the user without exposing the
   GitHub token to the page.
   ============================================================ */

import { webCompatible } from '../_node_web_bridge.js';
import {
  json,
  peekLinkNonce,
  consumeLinkNonce,
  getTokenRow,
  getMetaRow,
  saveMetaRow,
  providerGet,
} from './_db.js';

async function listRepos(accessToken) {
  const out = [];
  let url = 'https://api.github.com/user/repos?per_page=100&sort=updated';
  for (let page = 0; page < 3 && url; page++) {
    const r = await providerGet(url, accessToken, {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'JepongDevxyz-AI-Connectors',
    });
    if (!r.ok || !Array.isArray(r.data)) break;
    for (const repo of r.data) {
      if (repo && repo.full_name) out.push({ full_name: repo.full_name });
    }
    url = null; // pagination via Link header is skipped; 300 repos is plenty
  }
  return out;
}

async function handle(req) {
  if (req.method === 'GET') {
    const setupToken = new URL(req.url, 'http://x').searchParams.get('setup_token') || '';
    const row = await peekLinkNonce(setupToken, 'github-setup');
    const tok = await getTokenRow(row.user_id, 'github');
    if (!tok) return json(404, { error: 'GitHub is not connected.' });
    const [repos, sel] = await Promise.all([
      listRepos(tok.access_token).catch(() => []),
      getMetaRow(row.user_id, 'github'),
    ]);
    return json(200, {
      ok: true,
      repos,
      selection: { mode: sel.mode === 'selected' ? 'selected' : 'all', repos: Array.isArray(sel.repos) ? sel.repos : [] },
    });
  }
  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const setupToken = String(body.setup_token || '');
    const row = await peekLinkNonce(setupToken, 'github-setup');
    const mode = body.mode === 'selected' ? 'selected' : 'all';
    const repos = Array.isArray(body.repos)
      ? body.repos.map((r) => String(r)).filter((r) => /^[^/]+\/[^/]+$/.test(r)).slice(0, 500)
      : [];
    await saveMetaRow(row.user_id, 'github', { mode, repos });
    await consumeLinkNonce(setupToken);
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

export default (req, res) => webCompatible(req, res, handler);
