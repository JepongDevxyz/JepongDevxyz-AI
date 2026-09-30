/* ============================================================
   JepongDevxyz AI — Connectors disconnect
   POST /api/connectors/disconnect  { connector: "gmail" }
   Deletes the provider token row for this user (revoking access
   on the provider side is left to the provider's own settings).
   ============================================================ */


import { getUserId } from '../paymongo/create.js';
import { json, deleteTokenRow, sbDelete } from './_db.js';
import { CONNECTORS } from './_providers.js';

async function handle(req) {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed.' });
  const userId = await getUserId(req);
  const body = await req.json().catch(() => ({}));
  const conn = CONNECTORS.find((c) => c.id === String(body.connector || ''));
  if (!conn) return json(400, { error: 'Unknown connector.' });
  await deleteTokenRow(userId, conn.provider || conn.id);
  // also clear per-connector metadata (e.g. plaid credentials, github selection)
  await sbDelete(
    'connector_meta',
    'user_id=eq.' + encodeURIComponent(userId) + '&provider=eq.' + encodeURIComponent(conn.provider || conn.id)
  ).catch(() => {});
  return json(200, { ok: true });
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