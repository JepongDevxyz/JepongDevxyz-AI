/* =========================================================
   JepongDevxyz AI — share_file tool (server side)
   Uploads model-generated files to the project's own Vercel Blob
   store and returns a public download URL.

   Runs on the Edge runtime (api/chat.js). Uses the Vercel Blob
   REST API directly via native fetch — no @vercel/blob import,
   because that package cannot be bundled for the Edge runtime
   (Vercel build error: "unsupported modules").

   Never throws: every
   failure returns { ok:false } so the chat stream keeps working
   exactly as before (local download card) when Blob is missing
   or the upload fails.
   ========================================================= */

// Matches the artifact SSE payload cap in api/chat.js.
const MAX_SHARE_BYTES = 6_000_000;

// Vercel Blob REST API (same endpoint the official SDK uses).
const BLOB_API_URL = 'https://vercel.com/api/blob';
const BLOB_API_VERSION = '11';

function sanitizeFilename(name = '') {
  const base = String(name || '').split('/').pop().split('\\').pop();
  const clean = base
    .replace(/[^a-zA-Z0-9._() \-]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
  return clean || 'JepongDevxyz-output.txt';
}

function toBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (typeof input === 'string') return new TextEncoder().encode(input);
  return new Uint8Array(0);
}

/**
 * Upload a generated file and get a public URL.
 * @param {{filename:string, bytes:Uint8Array|string, mimeType:string}} args
 * @returns {Promise<{ok:boolean, url?:string, filename?:string, size?:number, reason?:string}>}
 */
export async function uploadSharedFile({ filename, bytes, mimeType = '' } = {}) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return { ok: false, reason: 'missing-token' };

    const data = toBytes(bytes);
    if (!data.length) return { ok: false, reason: 'empty' };
    if (data.length > MAX_SHARE_BYTES) return { ok: false, reason: 'too-large', size: data.length };

    const safe = sanitizeFilename(filename);
    const pathname = `jai-share/${Date.now()}-${safe}`;
    const params = new URLSearchParams({ pathname });

    // Store id is the 4th segment of the token: vercel_blob_rw_<storeId>_<secret>
    const storeId = String(token).split('_')[3] || '';
    const res = await fetch(`${BLOB_API_URL}/?${params.toString()}`, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${token}`,
        'x-api-version': BLOB_API_VERSION,
        'x-content-type': mimeType || 'application/octet-stream',
        'x-add-random-suffix': '0',
        'x-api-blob-request-id': `${storeId}:${Date.now()}:${Math.random().toString(16).slice(2)}`,
      },
      body: data,
    });

    if (!res.ok) return { ok: false, reason: `http-${res.status}`, size: data.length };
    let json = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    if (!json || !json.url) return { ok: false, reason: 'no-url' };
    return { ok: true, url: json.url, filename: safe, size: data.length };
  } catch (e) {
    return { ok: false, reason: 'upload-failed', detail: String(e?.message || e).slice(0, 160) };
  }
}

/* Tool contract for the AI models. The chat API invokes this tool
   server-side through the artifact pipeline (api/chat.js), so it
   works uniformly across every provider without per-provider
   function-calling surgery. */
export const SHARE_FILE_TOOL = {
  name: 'share_file',
  description:
    'Share a generated file with the user as a public download link. ' +
    'Use it when the user asks for something downloadable (report, document, code file, HTML page, CSV, markdown). ' +
    'Generate the complete file content; the server uploads it to the app\'s own storage and attaches a public download link below your reply. ' +
    'Never invent or print a download URL yourself — the real link is attached automatically.',
  parameters: {
    type: 'object',
    properties: {
      filename: { type: 'string', description: 'File name with extension, e.g. report.md' },
      content: { type: 'string', description: 'Complete final file content' },
      mimeType: { type: 'string', description: 'MIME type, e.g. text/markdown' },
    },
    required: ['filename', 'content'],
  },
};

export const CREATE_SESSION_TOOL = {
  name: 'create_session',
  description:
    'Create a new chat session. You MUST ask the user for permission in your reply first ' +
    '("Gagawa ako ng bagong session na <title>. Payag ka ba?") and only proceed after they agree. ' +
    'When they agree, end your reply with the marker [CREATE_SESSION: <title>] on its own line.',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Short title for the new session, max 60 chars' },
    },
    required: ['title'],
  },
};
