/* ============================================================
   JepongDevxyz AI — guest credits (no login required)
   POST /api/guest-credits   body: { action, kind? }
     action 'status' -> { balance, limit, day }
     action 'spend'  -> { ok, balance } | 402 { error:'insufficient' }
     action 'refund' -> { ok, balance }
   No auth. Quota is tracked server-side per SHA256(IP + day)
   per UTC day, so clearing phone data cannot reset it. Raw IPs
   are never stored. Costs are ALWAYS server-side (COSTS below);
   the client can never set its own price.
   Daily limit: 100 (chat = 10, image = 50).
   Fail-open: if the guest_credits table / RPCs are not set up
   yet, spend returns ok (current unlimited behavior) so guests
   are never bricked before the migration is run.
   ============================================================ */

import { createHash } from 'crypto';

const DAILY_LIMIT = 100;
const COSTS = { chat: 10, image: 50 };

const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

function clientIp(req) {
  const h = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
  return h.split(',')[0].trim() || 'unknown';
}
function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}
function keyFor(ip, day) {
  return createHash('sha256').update(ip + '|' + day).digest('hex');
}
function num(v, fallback) {
  return typeof v === 'number' && isFinite(v) ? v : fallback;
}

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
    async rpc(fn, args) {
      const r = await fetch(base + '/rest/v1/rpc/' + fn, {
        method: 'POST',
        headers,
        body: JSON.stringify(args || {}),
        signal: AbortSignal.timeout(10000),
      });
      const text = await r.text();
      if (!r.ok) {
        const e = new Error('DB_ERROR');
        e.status = 502;
        e.dbBody = text.slice(0, 200);
        throw e;
      }
      try { return JSON.parse(text); } catch { return text; }
    },
  };
}

async function handleGuest(req) {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed.' });

  let body = null;
  try { body = await req.json(); } catch { body = null; }
  const action = body && typeof body.action === 'string' ? body.action : '';
  if (action !== 'status' && action !== 'spend' && action !== 'refund') {
    return json(400, { error: 'Unknown action.' });
  }

  const day = todayUtc();
  const key = keyFor(clientIp(req), day);

  let sb;
  try {
    sb = sbService();
  } catch (e) {
    return json(503, { error: 'Server is not configured.' });
  }

  try {
    if (action === 'status') {
      const bal = await sb.rpc('guest_status', { p_key: key, p_day: day });
      return json(200, { balance: num(bal, DAILY_LIMIT), limit: DAILY_LIMIT, day });
    }

    const kind = body && typeof body.kind === 'string' ? body.kind : '';
    if (!Object.prototype.hasOwnProperty.call(COSTS, kind)) {
      return json(400, { error: 'Unknown kind.' });
    }
    const cost = COSTS[kind];

    if (action === 'spend') {
      const bal = await sb.rpc('guest_spend', { p_key: key, p_day: day, p_cost: cost });
      if (num(bal, 0) < 0) {
        return json(402, { error: 'insufficient', balance: 0, limit: DAILY_LIMIT });
      }
      return json(200, { ok: true, balance: num(bal, 0), limit: DAILY_LIMIT });
    }

    // refund
    const bal = await sb.rpc('guest_refund', { p_key: key, p_day: day, p_cost: cost });
    return json(200, { ok: true, balance: num(bal, DAILY_LIMIT), limit: DAILY_LIMIT });
  } catch (e) {
    // Pre-migration (table/RPC missing): fail open — guests keep the
    // current unlimited behavior instead of being blocked.
    if (e && e.message === 'DB_ERROR') {
      return json(200, { ok: true, balance: DAILY_LIMIT, limit: DAILY_LIMIT, unenforced: true });
    }
    throw e;
  }
}

async function handler(req) {
  try {
    return await handleGuest(req);
  } catch (e) {
    const status = e && typeof e.status === 'number' ? e.status : 500;
    return json(status, { error: (e && e.message) || 'Server error.' });
  }
}

export { handler };
