// Consolidated Codex API — one serverless function.
//   /api/codex          ->  /api/codex?route=main
//   /api/codex-account  ->  /api/codex?route=account
import { webCompatible } from './_node_web_bridge.js';
import { handler as main } from '../lib/codex/main.js';
import { handler as account } from '../lib/codex/account.js';

const ROUTES = { main, account };

async function dispatch(req) {
  let route = '';
  try { route = new URL(req.url).searchParams.get('route') || 'main'; } catch {}
  const fn = ROUTES[route] || main;
  return fn(req);
}

export default (req, res) => webCompatible(req, res, dispatch);
