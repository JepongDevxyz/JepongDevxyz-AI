/* ============================================================
   JepongDevxyz AI — one-time welcome credits
   POST /api/credits-welcome   (no body)
   Auth: Authorization: Bearer <supabase access token>

   Grants WELCOME_CREDITS once per user. Idempotent: the
   unique (user_id, idempotency_key='welcome') index makes
   concurrent or repeated calls grant only once.
   Returns: { ok: true, granted, balance }
   ============================================================ */


import { getUserId } from '../paymongo/create.js';

/* ---- Free starting credits for new users. Edit here. ---- */
export const WELCOME_CREDITS = 500;

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
  const headers = {
    apikey: key,
    Authorization: 'Bearer ' + key,
    'Content-Type': 'application/json',
  };
  return {
    async grantWelcome(userId) {
      const r = await fetch(base + '/rest/v1/credit_ledger', {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=ignore-duplicates' },
        body: JSON.stringify({
          user_id: userId,
          delta: WELCOME_CREDITS,
          reason: 'welcome',
          idempotency_key: 'welcome',
        }),
        signal: AbortSignal.timeout(10000),
      });
      // 409/unique-violation with ignore-duplicates => already claimed.
      if (!r.ok && r.status !== 409) {
        const e = new Error('Database error.');
        e.status = 502;
        throw e;
      }
      return r.status !== 409;
    },
    async balance(userId) {
      const r = await fetch(base + '/rest/v1/rpc/credit_balance', {
        method: 'POST',
        headers,
        body: JSON.stringify({ uid: userId }),
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) {
        const e = new Error('Database error.');
        e.status = 502;
        throw e;
      }
      const v = await r.json().catch(() => 0);
      return typeof v === 'number' ? v : 0;
    },
  };
}

async function handleWelcome(req) {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed.' });
  const userId = await getUserId(req);
  const sb = sbService();
  const granted = await sb.grantWelcome(userId);
  const balance = await sb.balance(userId);
  return json(200, { ok: true, granted, balance });
}

async function handler(req) {
  try {
    return await handleWelcome(req);
  } catch (e) {
    const status = e && typeof e.status === 'number' ? e.status : 500;
    return json(status, { error: e?.message || 'Server error.' });
  }
}

export { handler };