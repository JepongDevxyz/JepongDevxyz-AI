/* ============================================================
   JepongDevxyz AI — usage stats sync
   GET  /api/usage-sync -> { words, queries, tokens } for the signed-in user
   POST /api/usage-sync { words_delta, queries_delta } -> { words, queries, tokens }
   Auth: Authorization: Bearer <supabase access token>
   Guests (no token) get 401; the frontend keeps them on the
   sign-in note instead of showing stats.
   NOTE: Vercel Node runtime needs the (req,res) style below, or
   _node_web_bridge.js webCompatible(req,res,handler). Do NOT use
   Web-style `return new Response()` at the top level (504s).
   ============================================================ */


import { getUserId } from '../paymongo/create.js';

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
    async rpc(fn, args) {
      const r = await fetch(base + '/rest/v1/rpc/' + fn, {
        method: 'POST',
        headers,
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
    async getUsage(userId) {
      const u = base + '/rest/v1/usage_stats?select=words,queries&user_id=eq.' +
        encodeURIComponent(userId);
      const r = await fetch(u, {
        headers: { apikey: key, Authorization: 'Bearer ' + key },
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) {
        const e = new Error('Database error.');
        e.status = 502;
        throw e;
      }
      let rows = [];
      try { rows = await r.json(); } catch { rows = []; }
      return Array.isArray(rows) && rows[0] ? rows[0] : null;
    },
  };
}

function toPayload(row) {
  const words = Math.max(0, Math.floor(Number(row && row.words) || 0));
  const queries = Math.max(0, Math.floor(Number(row && row.queries) || 0));
  return { words, queries, tokens: Math.ceil(words * 1.35) };
}

async function handle(req) {
  const userId = await getUserId(req); // throws 401 for guests
  const sb = sbService();

  if (req.method === 'GET') {
    const row = await sb.getUsage(userId);
    return json(200, toPayload(row));
  }

  if (req.method === 'POST') {
    let body = {};
    try { body = await req.json(); } catch { body = {}; }
    const w = Math.floor(Number(body.words_delta) || 0);
    const q = Math.floor(Number(body.queries_delta) || 0);
    if (!Number.isFinite(w) || !Number.isFinite(q) || w < 0 || q < 0) {
      return json(400, { error: 'Invalid delta.' });
    }
    if (w > 1000000 || q > 1000000) {
      return json(400, { error: 'Delta too large.' });
    }
    await sb.rpc('add_usage_stats', { p_uid: userId, p_words: w, p_queries: q });
    const row = await sb.getUsage(userId);
    return json(200, toPayload(row));
  }

  return json(405, { error: 'Method not allowed.' });
}

async function handler(req) {
  try {
    return await handle(req);
  } catch (e) {
    const status = e && typeof e.status === 'number' ? e.status : 500;
    return json(status, { error: (e && e.message) || 'Server error.' });
  }
}

export { handler };