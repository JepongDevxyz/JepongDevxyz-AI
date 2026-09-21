import { getGitHubSession, githubApi, json } from './_github_oauth.js';
import { resolveGitHubAccess } from './_github_app.js';
import { parseGitHubTarget } from './plugins.js';

export const config = { runtime: 'edge' };

const encoder = new TextEncoder();
const uid = /^[a-f0-9-]{36}$/i;

function error(message, status = 400) {
  const e = new Error(message);
  e.status = status;
  throw e;
}
function runnerSettings() {
  const url = String(process.env.CODEX_RUNNER_URL || '').replace(/\/$/, '');
  const secret = String(process.env.CODEX_RUNNER_SHARED_SECRET || '');
  if (!url || secret.length < 32) error('Codex runner is not configured.', 503);
  let parsed;
  try { parsed = new URL(url); } catch (_) { error('Invalid Codex runner URL.', 503); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) {
    error('Codex runner requires a secure HTTPS URL.', 503);
  }
  return { url: parsed.href.replace(/\/$/, ''), secret };
}
async function signature(secret, body) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(body)));
  return [...mac].map(n => n.toString(16).padStart(2, '0')).join('');
}
async function actor(request) {
  const session = await getGitHubSession(request);
  if (!session?.token) error('Connect GitHub first.', 401);
  const response = await githubApi('/user', session.token, { signal: request.signal });
  if (!response.ok) error('Your GitHub session expired. Reconnect GitHub.', 401);
  const user = await response.json();
  if (!Number.isSafeInteger(user.id) || !user.login) error('GitHub identity could not be verified.', 401);
  return { id: user.id, login: String(user.login) };
}
async function rpc(payload, request) {
  const { url, secret } = runnerSettings();
  const body = JSON.stringify({ ...payload, issuedAt: Date.now(), nonce: crypto.randomUUID() });
  const response = await fetch(url + '/rpc', {
    method: 'POST', redirect: 'error',
    headers: { 'Content-Type': 'application/json', 'X-JD-Signature': await signature(secret, body) },
    body, signal: AbortSignal.timeout(20_000)
  });
  const raw = await response.text();
  if (raw.length > 240_000) error('Runner response exceeded size limit.', 502);
  let data;
  try { data = JSON.parse(raw); } catch (_) { error('Runner returned invalid JSON.', 502); }
  if (!response.ok) error(data?.error || 'Codex runner request failed.', response.status >= 400 && response.status < 500 ? response.status : 502);
  return data;
}
export default async function handler(request) {
  if (request.method === 'GET') {
    try { runnerSettings(); return json({ configured: true, service: 'codex-runner' }); }
    catch (_) { return json({ configured: false, service: 'codex-runner' }); }
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'Origin not allowed.' }, 403);
  if (request.headers.get('sec-fetch-site') === 'cross-site') return json({ error: 'Cross-site request blocked.' }, 403);
  if (!String(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) return json({ error: 'Expected JSON.' }, 415);
  try {
    const raw = await request.text();
    if (raw.length > 14_000) error('Request too large.', 413);
    const body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) error('Invalid request.', 400);
    const user = await actor(request);
    const action = String(body.action || '');
    if (action === 'start') {
      const repo = parseGitHubTarget(body.repo);
      if (repo.split('/')[0].toLowerCase() !== user.login.toLowerCase()) {
        error('The first Codex runner supports repositories owned by the connected GitHub user.', 403);
      }
      const prompt = String(body.prompt || '').trim();
      if (!prompt || prompt.length > 12_000) error('Prompt must contain 1–12,000 characters.', 400);
      // Never forward the broad OAuth token. GitHub App issues a read-only,
      // repository-scoped installation token for the initial clone.
      const access = await resolveGitHubAccess(request, { repository: repo, permissions: { contents: 'read' } });
      if (access.kind !== 'github-app') error('Install the JepongDevxyz GitHub App for this repository first.', 403);
      return json(await rpc({ action, actor: user, repo, prompt, cloneToken: access.token }, request), 202);
    }
    if (!['status', 'continue', 'cancel'].includes(action) || !uid.test(String(body.jobId || ''))) {
      error('Unknown Codex operation or invalid job ID.', 400);
    }
    const payload = { action, actor: user, jobId: String(body.jobId) };
    if (action === 'continue') {
      payload.prompt = String(body.prompt || '').trim();
      if (!payload.prompt || payload.prompt.length > 12_000) error('A follow-up prompt is required.', 400);
    }
    return json(await rpc(payload, request));
  } catch (e) {
    if (e instanceof SyntaxError) return json({ error: 'Invalid JSON.' }, 400);
    return json({ error: e.status ? e.message : 'Codex is temporarily unavailable.' }, e.status || 502);
  }
}
