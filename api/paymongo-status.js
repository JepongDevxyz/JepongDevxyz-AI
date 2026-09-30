/* ============================================================
   JepongDevxyz AI — PayMongo payment status (frontend polling)
   GET /api/paymongo-status?intent_id=pi_xxx
   Auth: Authorization: Bearer <supabase access token>
   The user can only see their OWN payments.
   ============================================================ */
import { webCompatible } from './_node_web_bridge.js';
import { getUserId } from './paymongo-create.js';

const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

async function handle(req) {
  try {
    if (req.method !== 'GET') return json(405, { error: 'Method not allowed.' });
    const userId = await getUserId(req);
    const sbUrl = process.env.SUPABASE_URL;
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!sbUrl || !svc) return json(503, { error: 'Server is not configured.' });

    const url = new URL(req.url);
    const intentId = url.searchParams.get('intent_id') || '';
    if (!/^pi_[A-Za-z0-9]+$/.test(intentId)) return json(400, { error: 'Invalid intent.' });

    const r = await fetch(
      sbUrl + '/rest/v1/paymongo_payments?intent_id=eq.' + encodeURIComponent(intentId) +
      '&user_id=eq.' + encodeURIComponent(userId) + '&select=intent_id,plan_id,status,amount_centavos,credits,paid_at&limit=1',
      {
        headers: { apikey: svc, Authorization: 'Bearer ' + svc },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!r.ok) return json(500, { error: 'Database error.' });
    const arr = await r.json().catch(() => []);
    const row = arr[0];
    if (!row) return json(404, { error: 'Not found.' });
    return json(200, {
      intent_id: row.intent_id,
      plan_id: row.plan_id,
      status: row.status, // pending | paid | failed | expired
      amount_php: (row.amount_centavos / 100).toFixed(2),
      credits: row.credits,
      paid_at: row.paid_at,
    });
  } catch (e) {
    return json(e.status || 500, { error: e.message || 'Server error.' });
  }
}

export default (req, res) => webCompatible(req, res, handle);
