/* ============================================================
   JepongDevxyz AI — PayMongo webhook (QR Ph payment confirmation)
   POST /api/paymongo-webhook

   1. Verifies Paymongo-Signature (HMAC-SHA256 of "t.rawBody")
      BEFORE parsing anything.
   2. Handles: payment.paid -> grant credits (once, idempotent)
               payment.failed / qrph.expired -> mark row
   ============================================================ */
import { createHmac, timingSafeEqual } from 'node:crypto';

const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

/* Header shape: t=<ts>,te=<hex>,li=<hex>. Accept te (test) or li (live). */
export function verifySignature(rawBody, header, secret) {
  if (!secret || !header) return false;
  const parts = {};
  for (const p of String(header).split(',')) {
    const i = p.indexOf('=');
    if (i > 0) parts[p.slice(0, i).trim()] = p.slice(i + 1).trim();
  }
  const t = parts.t;
  if (!t) return false;
  const expected = createHmac('sha256', secret).update(t + '.' + rawBody).digest('hex');
  const exp = Buffer.from(expected, 'utf8');
  for (const k of ['te', 'li']) {
    const v = parts[k];
    if (!v) continue;
    const got = Buffer.from(v, 'utf8');
    if (got.length === exp.length && timingSafeEqual(got, exp)) return true;
  }
  return false;
}

function sb(table, svc, sbUrl) {
  const base = sbUrl + '/rest/v1/' + table;
  const h = {
    apikey: svc,
    Authorization: 'Bearer ' + svc,
    'Content-Type': 'application/json',
  };
  return {
    async getOneByIntent(intentId) {
      const r = await fetch(base + '?intent_id=eq.' + encodeURIComponent(intentId) + '&select=*&limit=1', {
        headers: h,
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) return null;
      const arr = await r.json().catch(() => []);
      return arr[0] || null;
    },
    async patchByIntent(intentId, patch) {
      const r = await fetch(base + '?intent_id=eq.' + encodeURIComponent(intentId), {
        method: 'PATCH',
        headers: { ...h, Prefer: 'return=representation' },
        body: JSON.stringify(patch),
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) return null;
      const arr = await r.json().catch(() => []);
      return arr[0] || null;
    },
    async insert(row) {
      const r = await fetch(base, {
        method: 'POST',
        headers: { ...h, Prefer: 'return=representation' },
        body: JSON.stringify(row),
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) return null;
      const arr = await r.json().catch(() => []);
      return arr[0] || null;
    },
  };
}

/* Defensive extraction: event shapes differ slightly per event type. */
export function intentIdOf(event) {
  const a = (event && event.data && event.data.attributes) || {};
  const d = a.data || {};
  if (d.type === 'payment_intent' && typeof d.id === 'string') return d.id;
  if (d.attributes && typeof d.attributes.payment_intent_id === 'string') return d.attributes.payment_intent_id;
  if (typeof a.payment_intent_id === 'string') return a.payment_intent_id;
  return null;
}

export default async function handler(req) {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
  const sbUrl = process.env.SUPABASE_URL;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !sbUrl || !svc) return json(503, { error: 'Server is not configured.' });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed.' });

  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get('paymongo-signature'), secret)) {
    return json(401, { error: 'Invalid signature.' });
  }

  const event = JSON.parse(raw);
  const type = event && event.data && event.data.attributes && event.data.attributes.type;
  const intentId = intentIdOf(event);
  if (!intentId) return json(200, { received: true }); // nothing to match; stop retries

  const db = sb('paymongo_payments', svc, sbUrl);
  const row = await db.getOneByIntent(intentId);
  if (!row) return json(200, { received: true }); // not ours; stop retries
  if (row.status !== 'pending') return json(200, { received: true }); // already handled: idempotent

  if (type === 'payment.paid') {
    await db.patchByIntent(intentId, { status: 'paid', paid_at: new Date().toISOString() });
    // Grant credits exactly once — keyed to the payment row.
    await sb('credit_ledger', svc, sbUrl).insert({
      user_id: row.user_id,
      delta: row.credits,
      reason: 'qrph_topup',
      ref_payment_id: row.id,
    });
  } else if (type === 'payment.failed') {
    await db.patchByIntent(intentId, { status: 'failed' });
  } else if (type === 'qrph.expired') {
    await db.patchByIntent(intentId, { status: 'expired' });
  }
  return json(200, { received: true });
}
