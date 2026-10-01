// Consolidated Credits API — one serverless function.
//   /api/credits-balance  ->  /api/credits?route=balance  (etc.)
//   /api/guest-credits    ->  /api/credits?route=guest
import { webCompatible } from './_node_web_bridge.js';
import { handler as balance } from '../lib/credits/balance.js';
import { handler as spend } from '../lib/credits/spend.js';
import { handler as welcome } from '../lib/credits/welcome.js';
import { handler as guest } from '../lib/credits/guest.js';

const ROUTES = { balance, spend, welcome, guest };

async function dispatch(req) {
  let route = '';
  try { route = new URL(req.url).searchParams.get('route') || ''; } catch {}
  const fn = ROUTES[route];
  if (!fn) return Response.json({ error: 'Unknown credits route.' }, { status: 404 });
  return fn(req);
}

export default (req, res) => webCompatible(req, res, dispatch);
