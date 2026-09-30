// Consolidated GitHub API — one serverless function.
//   /api/github-app-install    ->  /api/github?route=app-install
//   /api/github-app-setup      ->  /api/github?route=app-setup
//   /api/github-app-status     ->  /api/github?route=app-status
//   /api/github-oauth-start    ->  /api/github?route=oauth-start
//   /api/github-oauth-session  ->  /api/github?route=oauth-session
//   /api/github-oauth-callback ->  /api/github?route=oauth-callback
import { webCompatible } from './_node_web_bridge.js';
import { handler as appInstall } from '../lib/github/app-install.js';
import { handler as appSetup } from '../lib/github/app-setup.js';
import { handler as appStatus } from '../lib/github/app-status.js';
import { handler as oauthStart } from '../lib/github/oauth-start.js';
import { handler as oauthSession } from '../lib/github/oauth-session.js';
import { handler as oauthCallback } from '../lib/github/oauth-callback.js';

const ROUTES = {
  'app-install': appInstall,
  'app-setup': appSetup,
  'app-status': appStatus,
  'oauth-start': oauthStart,
  'oauth-session': oauthSession,
  'oauth-callback': oauthCallback,
};

async function dispatch(req) {
  let route = '';
  try { route = new URL(req.url).searchParams.get('route') || ''; } catch {}
  const fn = ROUTES[route];
  if (!fn) return Response.json({ error: 'Unknown github route.' }, { status: 404 });
  return fn(req);
}

export default (req, res) => webCompatible(req, res, dispatch);
