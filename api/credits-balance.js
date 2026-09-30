/* ============================================================
   JepongDevxyz AI — credit balance
   GET /api/credits-balance
   Auth: Authorization: Bearer <supabase access token>
   Returns: { balance, welcome_claimed }
   Guests (no token) get 401; the frontend treats that as
   "not signed in" and keeps the current free behavior.
   ============================================================ */

import { webCompatible } from './_node_web_bridge.js';
import { getUserId } from './paymongo-create.js';

const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

function sbService() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const e = new Error('Server is not configured.');
    e.status = 503;
    throw e;
  }
  const base = url.replace(/\/+$/, '');
  return {
    async rpc(fn, args) {
      const r = await fetch(base + '/rest/v1/rpc/' + fn, {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: 'Bearer ' + key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(args || {}),
        signal: AbortSignal.timeout(10000),
      });
      const text = await r.text();
      if (!r.ok) {
        const e = new Error('Database error.');
        e.status = 502;
        throw e;
      }
      try { return JSON.parse(text); } catch { return text; }
    },
    async ledgerCount(userId, reason) {
      const u = base + '/rest/v1/credit_ledger?select=id&user_id=eq.' +
        encodeURIComponent(userId) + '&reason=eq.' + encodeURIComponent(reason);
      const r = await fetch(u, {
        headers: {
          apikey: key,
          Authorization: 'Bearer ' + key,
          Prefer: 'count=exact',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) {
        const e = new Error('Database error.');
        e.status = 502;
        throw e;
      }
      const cr = r.headers.get('content-range') || '';
      const m = /\/(\d+)$/.exec(cr);
      return m ? parseInt(m[1], 10) : 0;
    },
  };
}

async function handleBalance(req) {
  if (req.method !== 'GET') return json(405, { error: 'Method not allowed.' });
  const userId = await getUserId(req);
  const sb = sbService();
  const [balance, welcomeCount] = await Promise.all([
    sb.rpc('credit_balance', { uid: userId }),
    sb.ledgerCount(userId, 'welcome'),
  ]);
  return json(200, {
    balance: typeof balance === 'number' ? balance : 0,
    welcome_claimed: welcomeCount > 0,
  });
}

async function handler(req) {
  try {
    return await handleBalance(req);
  } catch (e) {
    const status = e && typeof e.status === 'number' ? e.status : 500;
    return json(status, { error: e?.message || 'Server error.' });
  }
}

export default (req, res) => webCompatible(req, res, handler);
