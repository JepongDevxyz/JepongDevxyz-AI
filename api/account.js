// Consolidated Account API — one serverless function.
//   /api/delete-account  ->  /api/account?route=delete
//   /api/usage-sync      ->  /api/account?route=usage
//   /api/ping            ->  /api/account?route=ping
import { webCompatible } from './_node_web_bridge.js';
import { handler as deleteAccount } from '../lib/account/delete.js';
import { handler as usage } from '../lib/account/usage.js';
import { handler as ping } from '../lib/account/ping.js';

const ROUTES = { delete: deleteAccount, usage, ping };

async function dispatch(req) {
  let route = '';
  try { route = new URL(req.url).searchParams.get('route') || ''; } catch {}
  const fn = ROUTES[route];
  if (!fn) return Response.json({ error: 'Unknown account route.' }, { status: 404 });
  return fn(req);
}

export default (req, res) => webCompatible(req, res, dispatch);
