// JepongDevxyz AI — Merriam-Webster Dictionary proxy (2026-10-03).
//   GET /api/dictionary?word=<word>  ->  { source:'mw', data:[...] }
//   GET /api/dictionary (no word)    ->  { hasKey:true|false }
//
// The MW API key lives in the Vercel environment variable MW_API_KEY
// (never exposed to the browser). A small in-memory cache stretches the
// free 1000 lookups/day quota. When no key is set, the client falls back
// to a localStorage key or the free dictionaryapi.dev.
import { webCompatible } from './_node_web_bridge.js';

const MW_KEY = process.env.MW_API_KEY || '';
const MW_ENDPOINT = 'https://www.dictionaryapi.com/api/v3/references/collegiate/json/';

// Tiny per-instance cache: word -> { data, ts }. Stretches the quota.
const cache = new Map();
const CACHE_TTL_MS = 24 * 3600 * 1000;
const CACHE_MAX = 500;

function getCached(word) {
  const hit = cache.get(word);
  if (!hit) return null;
  if (Date.now() - hit.ts > CACHE_TTL_MS) { cache.delete(word); return null; }
  return hit.data;
}
function setCached(word, data) {
  if (cache.size >= CACHE_MAX) {
    const first = cache.keys().next().value;
    if (first !== undefined) cache.delete(first);
  }
  cache.set(word, { data, ts: Date.now() });
}

async function dispatch(req) {
  const url = new URL(req.url, 'http://localhost');
  const word = String(url.searchParams.get('word') || '').trim().toLowerCase();

  // Status check (no word): does the server have a key?
  if (!word) {
    return Response.json({ hasKey: !!MW_KEY });
  }
  if (!/^[a-z'’\- ]{1,50}$/i.test(word)) {
    return Response.json({ error: 'invalid-word' }, { status: 400 });
  }
  if (!MW_KEY) {
    return Response.json({ error: 'no-key' }, { status: 501 });
  }

  const cached = getCached(word);
  if (cached) return Response.json({ source: 'mw', cached: true, data: cached });

  try {
    const r = await fetch(
      MW_ENDPOINT + encodeURIComponent(word) + '?key=' + encodeURIComponent(MW_KEY),
      { headers: { 'User-Agent': 'JepongDevxyz-AI/1.0' } }
    );
    if (!r.ok) return Response.json({ error: 'mw-http-' + r.status }, { status: 502 });
    const data = await r.json();
    setCached(word, data);
    return Response.json({ source: 'mw', data });
  } catch (e) {
    return Response.json({ error: 'mw-failed' }, { status: 502 });
  }
}

export default (req, res) => webCompatible(req, res, dispatch);
