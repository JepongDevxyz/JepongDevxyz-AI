/* api/helpers.js — Consolidated utility functions (Vercel Hobby 12-function cap).
   Merges: turnstile, dictionary, generate-image into one serverless function.
   Old URLs keep working via vercel.json rewrites:
     /api/turnstile       ->  /api/helpers?helper=turnstile
     /api/dictionary      ->  /api/helpers?helper=dictionary
     /api/generate-image  ->  /api/helpers?helper=generate-image
*/
export const config = { runtime: 'edge' };

const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

/* ---- Turnstile verification ---- */
async function handleTurnstile(req) {
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

/* ---- Dictionary proxy ---- */
const MW_KEY = process.env.MW_API_KEY || '';
const MW_ENDPOINT = 'https://www.dictionaryapi.com/api/v3/references/collegiate/json/';
const dictCache = new Map();
const CACHE_TTL_MS = 24 * 3600 * 1000;
const CACHE_MAX = 500;

function getCached(word) {
  const hit = dictCache.get(word);
  if (!hit) return null;
  if (Date.now() - hit.ts > CACHE_TTL_MS) { dictCache.delete(word); return null; }
  return hit.data;
}
function setCached(word, data) {
  if (dictCache.size >= CACHE_MAX) {
    const first = dictCache.keys().next().value;
    if (first !== undefined) dictCache.delete(first);
  }
  dictCache.set(word, { data, ts: Date.now() });
}

async function handleDictionary(req) {
  const url = new URL(req.url);
  const word = String(url.searchParams.get('word') || '').trim().toLowerCase();

  if (!word) {
    return json(200, { hasKey: !!MW_KEY });
  }
  if (!/^[a-z'’\- ]{1,50}$/i.test(word)) {
    return json(400, { error: 'invalid-word' });
  }
  if (!MW_KEY) {
    return json(501, { error: 'no-key' });
  }

  const cached = getCached(word);
  if (cached) return json(200, { source: 'mw', cached: true, data: cached });

  try {
    const r = await fetch(
      MW_ENDPOINT + encodeURIComponent(word) + '?key=' + encodeURIComponent(MW_KEY),
      { headers: { 'User-Agent': 'JepongDevxyz-AI/1.0' } }
    );
    if (!r.ok) return json(502, { error: 'mw-http-' + r.status });
    const data = await r.json();
    setCached(word, data);
    return json(200, { source: 'mw', data });
  } catch (e) {
    return json(502, { error: 'mw-failed' });
  }
}

/* ---- Generate image (Pollinations) ---- */
async function handleGenerateImage(req) {
  if (req.method !== 'POST') {
    return json(405, { success: false, error: 'Method Not Allowed' });
  }

  try {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }

    const promptText = (body?.prompt || '').trim();
    if (!promptText) {
      return json(400, { success: false, error: 'Prompt is required.' });
    }

    const encodedPrompt = encodeURIComponent(promptText);
    const randomSeed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${randomSeed}&width=1024&height=1024&nologo=true`;

    return json(200, {
      success: true,
      imageUrl: imageUrl
    });
  } catch (error) {
    return json(500, {
      success: false,
      error: error.message || 'Internal Server Error'
    });
  }
}

/* ---- Router ---- */
export default async function handler(req) {
  const url = new URL(req.url);
  const helper = url.searchParams.get('helper') || '';

  switch (helper) {
    case 'turnstile':
      return handleTurnstile(req);
    case 'dictionary':
      return handleDictionary(req);
    case 'generate-image':
      return handleGenerateImage(req);
    default:
      return json(404, { error: 'Unknown helper. Use ?helper=turnstile|dictionary|generate-image' });
  }
}
