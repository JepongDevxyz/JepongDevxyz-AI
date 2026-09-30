// Consolidated PayMongo API — one serverless function.
//   /api/paymongo-create   ->  /api/paymongo?route=create
//   /api/paymongo-status   ->  /api/paymongo?route=status
//   /api/paymongo-webhook  ->  /api/paymongo?route=webhook
// bodyParser stays off so the webhook sees the exact raw bytes for HMAC;
// the create/status routes parse JSON from the raw body themselves via req.json().
import { webCompatible } from './_node_web_bridge.js';
import { handle as create } from '../lib/paymongo/create.js';
import { handle as status } from '../lib/paymongo/status.js';
import { handle as webhook } from '../lib/paymongo/webhook.js';

export const config = { api: { bodyParser: false } };

const ROUTES = { create, status, webhook };

async function dispatch(req) {
  let route = '';
  try { route = new URL(req.url).searchParams.get('route') || ''; } catch {}
  const fn = ROUTES[route];
  if (!fn) return Response.json({ error: 'Unknown paymongo route.' }, { status: 404 });
  return fn(req);
}

export default (req, res) => webCompatible(req, res, dispatch);
