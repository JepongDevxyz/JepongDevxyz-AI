import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const secret = 'ci-only-runner-hmac-secret-at-least-32-characters';
const signing = (body) => createHmac('sha256', secret).update(body).digest('hex');

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
function body(action, overrides = {}) {
  return JSON.stringify({ action, issuedAt: Date.now(), nonce: randomUUID(), ...overrides });
}
async function rpc(port, raw, signature = signing(raw)) {
  const response = await fetch('http://127.0.0.1:' + port + '/rpc', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-jd-signature': signature },
    body: raw
  });
  return { status: response.status, data: await response.json() };
}

test('signed runner rejects spoofed identities, tampering and replay', { timeout: 12000 }, async t => {
  const port = await availablePort();
  const authHome=await mkdtemp(join(tmpdir(),'jd-codex-test-auth-'));
  t.after(async()=>{await rm(authHome,{recursive:true,force:true});});
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('../', import.meta.url),
    env: { PATH: process.env.PATH, HOME: process.env.HOME, PORT: String(port),
      CODEX_RUNNER_SHARED_SECRET: secret, RUNNER_ALLOWED_GITHUB_LOGIN: 'owner',
      RUNNER_CODEX_AUTH_HOME: authHome,
      OPENAI_API_KEY: '' },
    stdio: 'ignore'
  });
  t.after(() => child.kill('SIGTERM'));
  let ready = false;
  for (let i = 0; i < 70; i++) {
    try { const probe = await rpc(port, body('health')); if (probe.status === 200) { ready = true; break; } }
    catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 60));
  }
  assert.equal(ready, true, 'runner must start locally');

  const health = await rpc(port, body('health'));
  assert.equal(health.status, 200);
  assert.equal(health.data.ready, false, 'absence of a credential must disable readiness');

  const badSignature = await rpc(port, body('health'), '0'.repeat(64));
  assert.equal(badSignature.status, 401);

  const once = body('health');
  assert.equal((await rpc(port, once)).status, 200);
  assert.equal((await rpc(port, once)).status, 409, 'nonces must prevent replay');

  const expired = body('health', { issuedAt: Date.now() - 200_000 });
  assert.equal((await rpc(port, expired)).status, 401);

  const impersonated = body('status', { actor: { id: 1, login: 'someoneelse' }, jobId: randomUUID() });
  assert.equal((await rpc(port, impersonated)).status, 403);

  const allowed = body('status', { actor: { id: 1, login: 'owner' }, jobId: randomUUID() });
  assert.equal((await rpc(port, allowed)).status, 404, 'valid actor cannot read another job');
});
