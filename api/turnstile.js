/* api/turnstile.js — Cloudflare Turnstile server-side verification.
   POST /api/turnstile { token }
   Verifies token with Cloudflare, returns { ok: true/false }.
   Requires TURNSTILE_SECRET_KEY env var. */
export const config = { runtime: 'edge' };

const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

export default async function handler(req) {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed.' });

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return json(503, { error: 'Turnstile not configured.' });

  let body;
  try {
    body = await req.json();
  } catch (_) {
    return json(400, { error: 'Invalid request.' });
  }

  const token = body && body.token;
  if (!token || typeof token !== 'string') return json(400, { error: 'Missing token.' });

  try {
    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(10000),
    });
    const result = await verifyRes.json();
    if (result && result.success) {
      return json(200, { ok: true });
    }
    return json(200, { ok: false, error: 'Verification failed.' });
  } catch (e) {
    return json(500, { ok: false, error: 'Verification error.' });
  }
}
