/* lib/chat/credits.js — split from api/chat.js (mechanical move, no behavior change). */
import { getUserId } from '../paymongo/create.js';
import { configured } from './keys.js';
import { json } from './utils.js';

const JD_CREDIT_COSTS = { chat: 10, image: 50 };
const JD_BG_PREFIXES = [
  'Summarize this conversation for context preservation.',
  'Create a concise 3 to 6 word chat title.',
  'Look at the attached image carefully', // vision sub-step of image gen
];
function jdBillKind(body) {
  // Mirrors credits.js classifyChatBody — keep the two in sync.
  if (!body || typeof body !== 'object') return null;
  const action = body.action;
  if (action === 'generate-image' || action === 'generate-pet-image') return 'image';
  if (action) return null;
  if (typeof body.message !== 'string') return null;
  if (body.customApiProfile) return null; // settings tester call
  for (const p of JD_BG_PREFIXES) if (body.message.indexOf(p) === 0) return null;
  return 'chat';
}
function jdIdemKey(body) {
  const k = (body && typeof body.idempotency_key === 'string') ? body.idempotency_key : '';
  if (/^[A-Za-z0-9:_\-.]{8,128}$/.test(k)) return k;
  return 'srv:' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 10);
}
function jdSb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { const e = new Error('Server is not configured.'); e.status = 503; throw e; }
  const base = url.replace(/\/+$/, '');
  const headers = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
  return {
    async rpc(fn, args) {
      const r = await fetch(base + '/rest/v1/rpc/' + fn, {
        method: 'POST', headers, body: JSON.stringify(args || {}),
        signal: AbortSignal.timeout(10000),
      });
      const text = await r.text();
      if (!r.ok) { const e = new Error('DB_ERROR'); e.status = 502; throw e; }
      try { return JSON.parse(text); } catch { return text; }
    },
  };
}
async function jdGuestKey(req) {
  const h = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
  const ip = h.split(',')[0].trim() || 'unknown';
  const day = new Date().toISOString().slice(0, 10);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + '|' + day));
  const hex = Array.from(new Uint8Array(digest)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  return { key: hex, day: day };
}
function jdNum(v) {
  const n = (typeof v === 'number') ? v : parseInt(v, 10);
  return (typeof n === 'number' && isFinite(n)) ? n : null;
}
/* Verify identity + credit coverage BEFORE generation.
   Returns { ok:true, ctx } or { ok:false, status, error }. */
async function jdVerifyCredits(req, body, kind) {
  const cost = JD_CREDIT_COSTS[kind] || JD_CREDIT_COSTS.chat;
  const idemKey = jdIdemKey(body);
  let userId = null;
  if ((req.headers.get('authorization') || '').trim()) {
    try { userId = await getUserId(req); }
    catch (e) { return { ok: false, status: (e && e.status) || 401, error: (e && e.message) || 'Sign in required.' }; }
  }
  let sb;
  try { sb = jdSb(); }
  catch (e) { return { ok: false, status: 503, error: 'Server is not configured.' }; }
  try {
    if (userId) {
      const bal = jdNum(await sb.rpc('credit_balance', { uid: userId }));
      if (bal === null || bal < cost) return { ok: false, status: 402, error: 'insufficient_credits' };
      return { ok: true, ctx: { kind: kind, cost: cost, idemKey: idemKey, userId: userId } };
    }
    const g = await jdGuestKey(req);
    let bal;
    try { bal = jdNum(await sb.rpc('guest_status', { p_key: g.key, p_day: g.day })); }
    catch (e) {
      // Pre-migration (tables/RPCs missing): fail open so guests are
      // never bricked before the owner runs the migration.
      if (e && e.message === 'DB_ERROR') return { ok: true, ctx: { kind: kind, cost: cost, idemKey: idemKey, guest: g, unenforced: true } };
      throw e;
    }
    if (bal === null || bal < cost) return { ok: false, status: 402, error: 'insufficient_credits' };
    return { ok: true, ctx: { kind: kind, cost: cost, idemKey: idemKey, guest: g } };
  } catch (e) {
    if (e && e.message === 'DB_ERROR') return { ok: true, ctx: { kind: kind, cost: cost, idemKey: idemKey, userId: userId, unenforced: true } };
    return { ok: false, status: (e && e.status) || 500, error: 'Credit check failed.' };
  }
}
/* Deduct AFTER a successful generation. Idempotent on idemKey. */
async function jdSpendCredits(ctx) {
  if (!ctx || ctx.unenforced) return;
  let sb;
  try { sb = jdSb(); } catch (_) { return; }
  try {
    if (ctx.userId) {
      await sb.rpc('spend_credits', { p_uid: ctx.userId, p_cost: ctx.cost, p_reason: 'spend:' + ctx.kind, p_key: ctx.idemKey });
    } else if (ctx.guest) {
      await sb.rpc('guest_spend', { p_key: ctx.guest.key, p_day: ctx.guest.day, p_cost: ctx.cost });
    }
  } catch (_) { /* fail-open: the generation already succeeded; never break delivery */ }
}
/* Wrap a billable generation's Response: deduct exactly once on success.
   Streaming (SSE) responses deduct when the stream completes; anything
   else deducts once the response exists and is ok. */
async function jdBill(maybeResponse, ctx) {
  const response = await maybeResponse;
  if (!ctx || !response || !response.ok) return response;
  try {
    const ct = (response.headers.get('content-type') || '').toLowerCase();
    if (response.body && ct.indexOf('text/event-stream') !== -1) {
      const parts = response.body.tee();
      parts[1].pipeTo(new WritableStream({
        close: function () { jdSpendCredits(ctx).catch(function () {}); },
        abort: function () {},
      })).catch(function () {});
      return new Response(parts[0], { status: response.status, statusText: response.statusText, headers: response.headers });
    }
  } catch (_) { /* fall through to immediate deduct */ }
  await jdSpendCredits(ctx);
  return response;
}

export { JD_CREDIT_COSTS, JD_BG_PREFIXES, jdBillKind, jdIdemKey, jdSb, jdGuestKey, jdNum, jdVerifyCredits, jdSpendCredits, jdBill };
