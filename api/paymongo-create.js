/* ============================================================
   JepongDevxyz AI — PayMongo QR Ph: create dynamic QR payment
   POST /api/paymongo-create   body: { plan_id: "starter" | "pro" | "max" }
   Auth: Authorization: Bearer <supabase access token>

   Flow: Payment Intent (qrph) -> Payment Method (qrph) -> attach
         -> returns base64 QR image for the customer to scan.
   Amounts are ALWAYS taken from PLANS below (server-side).
   The client can never set its own price.
   ============================================================ */

const PAYMONGO_API = 'https://api.paymongo.com/v1';

/* ---- PLANS: edit prices/credits here. amount = centavos (₱1 = 100) ---- */
export const PLANS = {
  starter: { name: 'Starter Pack', amount: 2900,  credits: 1000,  blurb: '₱29 — 1,000 credits' },
  pro:     { name: 'Pro Pack',     amount: 9900,  credits: 5000,  blurb: '₱99 — 5,000 credits' },
  max:     { name: 'Max Pack',     amount: 19900, credits: 12000, blurb: '₱199 — 12,000 credits' },
};
const QR_TTL_SECONDS = 1800; // 30 minutes, PayMongo default

const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

function fail(status, message) {
  const e = new Error(message);
  e.status = status;
  throw e;
}

/* Verify the Supabase session server-side; never trust a client user_id. */
export async function getUserId(req) {
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!sbUrl || !sbKey) fail(503, 'Server is not configured.');
  const m = /^Bearer ([A-Za-z0-9_.\-]{20,8192})$/.exec(req.headers.get('authorization') || '');
  if (!m) fail(401, 'Mag-sign in muna.');
  const r = await fetch(sbUrl + '/auth/v1/user', {
    headers: { Authorization: 'Bearer ' + m[1], apikey: sbKey },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) fail(401, 'Nag-expire ang session. Mag-sign in ulit.');
  const u = await r.json().catch(() => null);
  if (!u || typeof u.id !== 'string') fail(401, 'Hindi ma-verify ang account.');
  return u.id;
}

function paymongoHeaders() {
  const sk = process.env.PAYMONGO_SECRET_KEY;
  if (!sk) fail(503, 'PayMongo is not configured.');
  return {
    Authorization: 'Basic ' + Buffer.from(sk + ':').toString('base64'),
    'Content-Type': 'application/json',
  };
}

export async function pmPost(path, attributes) {
  const r = await fetch(PAYMONGO_API + path, {
    method: 'POST',
    headers: paymongoHeaders(),
    body: JSON.stringify({ data: { attributes } }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    const d = body && body.errors && body.errors[0];
    fail(502, 'PayMongo: ' + (d ? d.detail || d.code : 'error ' + r.status));
  }
  return body.data;
}

export async function sbInsert(table, row) {
  const sbUrl = process.env.SUPABASE_URL;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !svc) fail(503, 'Server is not configured.');
  const r = await fetch(sbUrl + '/rest/v1/' + table, {
    method: 'POST',
    headers: {
      apikey: svc,
      Authorization: 'Bearer ' + svc,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) fail(500, 'Database error.');
  const arr = await r.json().catch(() => []);
  return arr[0] || null;
}

export default async function handler(req) {
  try {
    if (req.method !== 'POST') return json(405, { error: 'Method not allowed.' });
    const userId = await getUserId(req);

    const body = await req.json().catch(() => ({}));
    const plan = PLANS[body && body.plan_id];
    if (!plan) return json(400, { error: 'Invalid plan.' });

    // 1. Payment Intent limited to QR Ph
    const intent = await pmPost('/payment_intents', {
      amount: plan.amount,
      currency: 'PHP',
      payment_method_allowed: ['qrph'],
      description: 'JepongDevxyz AI - ' + plan.name,
      metadata: { user_id: userId, plan_id: body.plan_id },
    });

    // 2. QR Ph payment method (no customer details needed)
    const method = await pmPost('/payment_methods', { type: 'qrph' });

    // 3. Attach -> next_action.code.image_url holds the base64 QR
    const attached = await pmPost('/payment_intents/' + intent.id + '/attach', {
      payment_method: method.id,
      client_key: intent.attributes.client_key,
    });
    const code = attached.attributes && attached.attributes.next_action && attached.attributes.next_action.code;
    const qrImage = code && code.image_url;
    if (!qrImage) fail(502, 'PayMongo did not return a QR code.');

    await sbInsert('paymongo_payments', {
      user_id: userId,
      intent_id: intent.id,
      plan_id: body.plan_id,
      amount_centavos: plan.amount,
      credits: plan.credits,
      status: 'pending',
    });

    return json(200, {
      payment_intent_id: intent.id,
      plan_id: body.plan_id,
      plan_name: plan.name,
      amount_centavos: plan.amount,
      amount_php: (plan.amount / 100).toFixed(2),
      credits: plan.credits,
      qr_image: qrImage, // data URL (base64) — diretso sa <img src="...">
      expires_in_seconds: QR_TTL_SECONDS,
    });
  } catch (e) {
    return json(e.status || 500, { error: e.message || 'Server error.' });
  }
}
