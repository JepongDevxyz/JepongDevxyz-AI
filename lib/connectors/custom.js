/* ============================================================
   JepongDevxyz AI — Custom connectors
   GET    /api/connectors/custom           -> { connectors: [...] }
   POST   /api/connectors/custom           -> { ok, id }
   DELETE /api/connectors/custom  { id }   -> { ok: true }

   A custom connector is a user-defined HTTP API: name, base URL,
   auth style (bearer / api key header / x-api-key / query param /
   basic) and a test path. Secrets stay server-side; the proxy
   executes calls via POST /api/connectors/proxy
   { connector: "custom", custom_id, path }.
   ============================================================ */


import { getUserId } from '../paymongo/create.js';
import { json, sbGet, sbUpsert, sbDelete } from './_db.js';

const AUTH_TYPES = ['bearer', 'header', 'xapikey', 'query', 'basic', 'none'];

function cleanUrl(v) {
  const s = String(v || '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\/[^/]+/.test(s)) return null;
  return s;
}

async function handle(req) {
  const userId = await getUserId(req);

  if (req.method === 'GET') {
    const rows = await sbGet(
      '/rest/v1/custom_connectors?select=id,name,description,base_url,auth_type,test_path,created_at' +
        '&user_id=eq.' + encodeURIComponent(userId) + '&order=created_at.asc'
    );
    // strip secrets defensively even if the select list changes
    const safe = (Array.isArray(rows) ? rows : []).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      base_url: r.base_url,
      auth_type: r.auth_type,
      test_path: r.test_path,
      created_at: r.created_at,
    }));
    return json(200, { connectors: safe });
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || '').trim().slice(0, 60);
    const baseUrl = cleanUrl(body.base_url);
    const authType = AUTH_TYPES.includes(body.auth_type) ? body.auth_type : 'bearer';
    if (!name) return json(400, { error: 'A name is required.' });
    if (!baseUrl) return json(400, { error: 'A valid http(s) base URL is required.' });
    const { randomUUID } = await import('node:crypto');
    const id = randomUUID();
    await sbUpsert(
      'custom_connectors',
      {
        id,
        user_id: userId,
        name,
        description: String(body.description || '').trim().slice(0, 200),
        base_url: baseUrl,
        auth_type: authType,
        auth_value: String(body.auth_value || '').trim(),
        auth_header: String(body.auth_header || '').trim().slice(0, 60),
        test_path: String(body.test_path || '').trim().slice(0, 200),
        created_at: new Date().toISOString(),
      },
      'id'
    );
    return json(200, { ok: true, id });
  }

  if (req.method === 'DELETE') {
    const body = await req.json().catch(() => ({}));
    const id = String(body.id || '');
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json(400, { error: 'Invalid id.' });
    await sbDelete(
      'custom_connectors',
      'id=eq.' + encodeURIComponent(id) + '&user_id=eq.' + encodeURIComponent(userId)
    );
    return json(200, { ok: true });
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