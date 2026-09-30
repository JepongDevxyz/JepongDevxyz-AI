/* ============================================================
   JepongDevxyz AI — GitHub connector OAuth start
   GET /api/connectors/github-auth
     -> { url }  (open in a popup; GitHub authorize page)
     -> { configured: false } when GITHUB_OAUTH_CLIENT_ID /
        GITHUB_OAUTH_CLIENT_SECRET are not set on Vercel
   ============================================================ */

import { webCompatible } from '../_node_web_bridge.js';
import { getUserId } from '../paymongo-create.js';
import { json, mintLinkNonce } from './_db.js';
import { GITHUB_OAUTH, githubOAuthConfig } from './_providers.js';

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
  const cfg = githubOAuthConfig();
  if (!cfg) return json(200, { configured: false });
  const nonce = await mintLinkNonce(userId, 'github');
  const redirectUri = originOf(req) + '/api/connectors/github-callback';
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri,
    scope: GITHUB_OAUTH.scopes.join(' '),
    state: nonce,
    allow_signup: 'true',
  });
  return json(200, { configured: true, url: GITHUB_OAUTH.authUrl + '?' + params.toString() });
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
