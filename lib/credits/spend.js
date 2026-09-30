/* ============================================================
   JepongDevxyz AI — spend credits (idempotent)
   POST /api/credits-spend   body: { action, idempotency_key }
   Auth: Authorization: Bearer <supabase access token>

   Costs are ALWAYS server-side (COSTS below); the client can
   never set its own price. Deduction is atomic per user via
   the spend_credits() SQL function (advisory lock + unique
   idempotency key), so retries and double-taps charge once.

   Returns: { ok: true, balance } | 402 { error, balance }
   ============================================================ */


import { getUserId } from '../paymongo/create.js';

/* ---- ACTION COSTS: edit here. Never accept cost from client. ---- */
export const COSTS = {
  chat: 10,   // one AI chat generation
  image: 50,  // one image generation
};

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
    async spend(userId, cost, reason, idemKey) {
      const r = await fetch(base + '/rest/v1/rpc/spend_credits', {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: 'Bearer ' + key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_uid: userId, p_cost: cost, p_reason: reason, p_key: idemKey }),
        signal: AbortSignal.timeout(10000),
      });
      const text = await r.text();
      if (!r.ok) {
        const e = new Error('Database error.');
        e.status = 502;
        throw e;
      }
      const v = (() => { try { return JSON.parse(text); } catch { return null; } })();
      return typeof v === 'number' ? v : null;
    },
  };
}

async function handleSpend(req) {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed.' });
  const userId = await getUserId(req);

  let body = null;
  try { body = await req.json(); } catch { body = null; }
  const action = body && typeof body.action === 'string' ? body.action : '';
  const key = body && typeof body.idempotency_key === 'string' ? body.idempotency_key.slice(0, 128) : '';

  if (!Object.prototype.hasOwnProperty.call(COSTS, action)) {
    return json(400, { error: 'Unknown action.' });
  }
  if (!key) return json(400, { error: 'Missing idempotency key.' });

  const cost = COSTS[action];
  const sb = sbService();
  const balance = await sb.spend(userId, cost, 'spend:' + action, key);
  if (balance === null) return json(502, { error: 'Database error.' });
  if (balance < 0) {
    // spend_credits returns -1 when the balance is insufficient.
    const e = new Error('Hindi sapat ang credits. Mag-top up para magpatuloy.');
    e.status = 402;
    e.balance = 0;
    throw e;
  }
  return json(200, { ok: true, balance });
}

async function handler(req) {
  try {
    return await handleSpend(req);
  } catch (e) {
    const status = e && typeof e.status === 'number' ? e.status : 500;
    const out = { error: e?.message || 'Server error.' };
    if (typeof e?.balance === 'number') out.balance = e.balance;
    return json(status, out);
  }
}

export { handler };