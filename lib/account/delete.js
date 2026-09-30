/* ============================================================
   JepongDevxyz AI — delete account
   POST /api/delete-account  { confirm: "DELETE" }
   Auth: Authorization: Bearer <supabase access token>

   Permanently removes the signed-in user's data and the auth user:
     1. files in the user-library storage bucket (prefix <user_id>/)
     2. user_settings row (best-effort; table may not exist)
     3. the auth user via the admin API — cascades to credit_ledger,
        paymongo_payments, usage_stats, library_items, memories
        (all declared `references auth.users(id) on delete cascade`)
   Guests (no token) get 401. Missing/wrong confirm gets 400.
   NOTE: Vercel Node runtime needs the (req,res) style below, or
   _node_web_bridge.js webCompatible(req,res,handler). Do NOT use
   Web-style `return new Response()` at the top level (504s).
   ============================================================ */


import { getUserId } from '../paymongo/create.js';

const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

function sbAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const e = new Error('Server is not configured.');
    e.status = 503;
    throw e;
  }
  const base = url.replace(/\/+$/, '');
  const headers = { apikey: key, Authorization: 'Bearer ' + key };
  return {
    // Remove every file the user stored in the user-library bucket.
    async deleteLibraryFiles(userId) {
      const r = await fetch(base + '/storage/v1/object/user-library', {
        method: 'DELETE',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes: [userId + '/'] }),
        signal: AbortSignal.timeout(15000),
      });
      // 404 = nothing stored (or bucket missing); not a failure.
      if (!r.ok && r.status !== 404) {
        const e = new Error('Could not remove stored files.');
        e.status = 502;
        throw e;
      }
    },
    // Best-effort: the table is referenced by the client but may not exist.
    async deleteUserSettings(userId) {
      try {
        await fetch(
          base + '/rest/v1/user_settings?user_id=eq.' + encodeURIComponent(userId),
          { method: 'DELETE', headers, signal: AbortSignal.timeout(10000) }
        );
      } catch (_) { /* never block account deletion */ }
    },
    // Deletes the auth user; FK cascades wipe the data tables.
    async deleteAuthUser(userId) {
      const r = await fetch(
        base + '/auth/v1/admin/users/' + encodeURIComponent(userId),
        { method: 'DELETE', headers, signal: AbortSignal.timeout(15000) }
      );
      if (!r.ok) {
        const e = new Error('Could not delete the account.');
        e.status = 502;
        throw e;
      }
    },
  };
}

async function handleDelete(req) {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed.' });
  const userId = await getUserId(req); // 401 for guests / expired sessions
  let body = {};
  try { body = await req.json(); } catch { body = {}; }
  if (!body || body.confirm !== 'DELETE') {
    return json(400, { error: 'Confirmation required.' });
  }
  const sb = sbAdmin();
  await sb.deleteLibraryFiles(userId);
  await sb.deleteUserSettings(userId);
  await sb.deleteAuthUser(userId);
  return json(200, { ok: true });
}

async function handler(req) {
  try {
    return await handleDelete(req);
  } catch (e) {
    const status = e && typeof e.status === 'number' ? e.status : 500;
    return json(status, { error: (e && e.message) || 'Server error.' });
  }
}

export { handler };