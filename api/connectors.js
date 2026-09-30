// Consolidated Connectors API — one serverless function (Vercel Hobby 12-function cap).
// Old URLs keep working via vercel.json rewrites, e.g.
//   /api/connectors/auth-url  ->  /api/connectors?route=auth-url
import { webCompatible } from './_node_web_bridge.js';
import { handler as authUrl } from '../lib/connectors/auth-url.js';
import { handler as callback } from '../lib/connectors/callback.js';
import { handler as config } from '../lib/connectors/config.js';
import { handler as custom } from '../lib/connectors/custom.js';
import { handler as disconnect } from '../lib/connectors/disconnect.js';
import { handler as githubAuth } from '../lib/connectors/github-auth.js';
import { handle as githubCallback } from '../lib/connectors/github-callback.js';
import { handler as githubRepos } from '../lib/connectors/github-repos.js';
import { handler as proxy } from '../lib/connectors/proxy.js';
import { handler as status } from '../lib/connectors/status.js';
import { handler as store } from '../lib/connectors/store.js';

const ROUTES = {
  'auth-url': authUrl,
  callback,
  config,
  custom,
  disconnect,
  'github-auth': githubAuth,
  'github-callback': githubCallback,
  'github-repos': githubRepos,
  proxy,
  status,
  store,
};

async function dispatch(req) {
  let route = '';
  try { route = new URL(req.url).searchParams.get('route') || ''; } catch {}
  const fn = ROUTES[route];
  if (!fn) return Response.json({ error: 'Unknown connector route.' }, { status: 404 });
  return fn(req);
}

export default (req, res) => webCompatible(req, res, dispatch);
