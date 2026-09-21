import http from 'node:http';
import { CodexAccountBridge } from './account-bridge.mjs';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { spawn, fork, execFile } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, chmod, rm, readdir, stat, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, isAbsolute } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const secret = process.env.CODEX_RUNNER_SHARED_SECRET || '';
const allowedOwner = process.env.RUNNER_ALLOWED_GITHUB_LOGIN || '';
const authRoot=process.env.RUNNER_CODEX_AUTH_HOME||'';
if (!isAbsolute(authRoot)) throw new Error('RUNNER_CODEX_AUTH_HOME must be an absolute private directory per runner instance.');
await mkdir(authRoot,{recursive:true,mode:0o700});
await chmod(authRoot,0o700);
const accountBridge=new CodexAccountBridge({home:authRoot});
if (secret.length < 32 || !/^[a-z0-9_.-]{1,39}$/i.test(allowedOwner)) {
  throw new Error('Set CODEX_RUNNER_SHARED_SECRET (32+ chars) and RUNNER_ALLOWED_GITHUB_LOGIN.');
}
const jobs = new Map();
const seenNonces = new Map();
const MAX_ACTIVE = 2;
const MAX_JOBS = 25;
const TTL = 2 * 60 * 60 * 1000;

// A responsive HTTP endpoint alone does not prove the runner has its local
// dependencies. This probe is intentionally inexpensive and never makes a
// billable model request; real turn verification is a separate release gate.
let readinessPromise;
function runtimeReady() {
  if (!readinessPromise) readinessPromise = Promise.allSettled([
    import('@openai/codex-sdk'),
    execFileAsync('git', ['--version'], { timeout: 3000 }),
    execFileAsync(process.env.CODEX_BIN || join(process.cwd(),'node_modules','.bin','codex'),
      ['--version'], { timeout: 3000 })
  ]).then(results => results.every(result => result.status === 'fulfilled'));
  return readinessPromise;
}

function fail(message, status = 400) { const e = new Error(message); e.status = status; throw e; }
function reply(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(data));
}
async function readBounded(req) {
  const parts = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 20000) fail('Request too large.', 413);
    parts.push(chunk);
  }
  return Buffer.concat(parts).toString('utf8');
}
function authenticate(raw, header) {
  if (!/^[a-f0-9]{64}$/i.test(String(header || ''))) fail('Missing signature.', 401);
  const expected = createHmac('sha256', secret).update(raw).digest();
  const actual = Buffer.from(header, 'hex');
  if (actual.length !== expected.length || !timingSafeEqual(expected, actual)) fail('Invalid signature.', 401);
  let body;
  try { body = JSON.parse(raw); } catch (_) { fail('Invalid JSON.', 400); }
  if (!body || Math.abs(Date.now() - Number(body.issuedAt)) > 60000 ||
      typeof body.nonce !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.nonce)) fail('Expired request.', 401);
  if (seenNonces.has(body.nonce)) fail('Replayed request.', 409);
  seenNonces.set(body.nonce, Date.now());
  for (const [nonce, at] of seenNonces) if (Date.now() - at > 120000) seenNonces.delete(nonce);
  if (body.action === 'health') return body;
  if (!Number.isSafeInteger(body.actor?.id) ||
      String(body.actor?.login || '').toLowerCase() !== allowedOwner.toLowerCase()) fail('This runner is restricted to its owner.', 403);
  return body;
}
function publicJob(job) {
  return {
    jobId: job.id, repo: job.repo, state: job.state,
    startedAt: job.startedAt, updatedAt: job.updatedAt, 
    events: job.events.slice(-70), finalResponse: job.finalResponse,
    diff: job.diff, files: job.files, error: job.error,
    canContinue: !!job.threadId && ['done', 'failed', 'cancelled'].includes(job.state)
  };
}
function update(job, state) { job.state = state; job.updatedAt = Date.now(); }
async function provisionSkills(job) {
  // The operator may mount the OFFICIAL Superpowers 'skills' directory here.
  // Codex discovers these skills in HOME/.agents/skills; no imitation skill is generated.
  const directory = String(process.env.RUNNER_SUPERPOWERS_SKILLS_DIR || '');
  if (!directory) return;
  const destination = join(job.home, '.agents', 'skills');
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^[a-z0-9-]{2,80}$/i.test(entry.name)) continue;
    const source = join(directory, entry.name);
    try {
      if (!(await stat(join(source, 'SKILL.md'))).isFile()) continue;
      await symlink(source, join(destination, entry.name), 'dir');
    } catch (e) {
      if (e?.code !== 'EEXIST') throw e;
    }
  }
}
async function cloneRepository(job, token) {
  const controller = new AbortController();
  job.cloneController = controller;
  const cloneTimeout = setTimeout(() => controller.abort(), 60_000);
  cloneTimeout.unref();
  const script = join(job.root, 'git-askpass.sh');
  await writeFile(script, '#!/bin/sh\ncase "$1" in *Username*) printf "x-access-token" ;; *) printf "%s" "$JD_CLONE_TOKEN" ;; esac\n', { mode: 0o700 });
  await chmod(script, 0o700);
  try {
    await new Promise((resolve, reject) => {
      const git = spawn('git', ['clone', '--depth', '1', '--', 'https://github.com/' + job.repo + '.git', job.workspace], {
        env: {
          PATH: process.env.PATH || '/usr/bin:/bin',
          HOME: job.home, GIT_ASKPASS: script, GIT_TERMINAL_PROMPT: '0', JD_CLONE_TOKEN: token
        }, signal: controller.signal, stdio: ['ignore', 'ignore', 'pipe']
      });
      let stderr = '';
      git.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-1000); });
      git.on('error', reject);
      git.on('close', code => code === 0 ? resolve() : reject(new Error('Git clone failed (exit ' + code + '). Verify repository installation access.')));
    });
    const { stdout } = await execFileAsync('git', ['-C', job.workspace, 'rev-parse', 'HEAD'], { timeout: 10000 });
    job.baseSha = stdout.trim();
  } finally {
    clearTimeout(cloneTimeout);
    job.cloneController = null;
    await rm(script, { force: true });
  }
}
async function collectDiff(job) {
  try {
    await execFileAsync('git', ['-C', job.workspace, 'add', '-N', '--all'], { timeout: 10000, maxBuffer: 400000 });
    const opts = { timeout: 12000, maxBuffer: 400000 };
    const [status, diff] = await Promise.all([
      execFileAsync('git', ['-C', job.workspace, 'status', '--short'], opts),
      execFileAsync('git', ['-C', job.workspace, 'diff', '--no-ext-diff', job.baseSha, '--'], opts)
    ]);
    job.files = String(status.stdout).slice(0, 12000);
    job.diff = String(diff.stdout).slice(0, 100000);
  } catch (_) {
    job.diff = 'Diff could not be generated; inspect workspace before using changes.';
  }
}
async function runAgent(job, prompt) {
  update(job, 'running');
  job.error = null;
  job.finalResponse = '';
  job.diff = '';
  job.events.push({ type: 'status', text: 'Codex agent started.' });
  const worker = fork(new URL('./worker.mjs', import.meta.url), [], {
    cwd: job.workspace,
    env: {
      PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
      HOME: job.home, CODEX_HOME:join(authRoot,'.codex'), TMPDIR: tmpdir()
    }, stdio: ['ignore', 'ignore', 'ignore', 'ipc']
  });
  job.worker = worker;
  worker.on('message', async message => {
    if (message?.kind === 'thread' && message.threadId) job.threadId = message.threadId;
    if (message?.kind === 'event') {
      job.events.push(message.event);
      if (job.events.length > 120) job.events.shift();
    }
    if (message?.kind === 'done') {
      job.threadId = message.threadId || job.threadId;
      job.finalResponse = String(message.finalResponse || '').slice(0, 20000);
      await collectDiff(job);
      update(job, 'done');
      if (worker.connected) worker.disconnect();
    }
    if (message?.kind === 'failed') {
      job.error = String(message.error || 'Codex failed.').slice(0, 700);
      const cancelling = job.state === 'cancelling';
      await collectDiff(job);
      update(job, cancelling ? 'cancelled' : 'failed');
      if (worker.connected) worker.disconnect();
    }
  });
  worker.on('exit', async () => {
    // A completed turn can be followed immediately by another worker. The old
    // child's exit must never overwrite or cancel the new turn's state.
    if (job.worker !== worker) return;
    if (job.state === 'running' || job.state === 'cancelling') {
      const cancelling = job.state === 'cancelling';
      job.error = cancelling ? null : 'The Codex worker exited before the turn completed.';
      await collectDiff(job);
      update(job, cancelling ? 'cancelled' : 'failed');
    }
    job.worker = null;
  });
  worker.send({ action: 'run', workspace: job.workspace, home: job.home, prompt, threadId: job.threadId });
}
async function start(body) {
  if (!(await runtimeReady())) fail('Codex runner dependencies are unavailable.',503);
  if (!(await accountBridge.account()).connected) fail('Sign in with your own ChatGPT Codex account first.',401);
  const repo = String(body.repo || '');
  // Repository authorization is checked against the separate GitHub login by
  // the signed gateway; the runner owner identifies the ChatGPT app account.
  const owner = String(body.repoOwner || allowedOwner).toLowerCase();
  if (!/^[a-z0-9_.-]{1,39}\/[-a-z0-9_.]{1,100}$/i.test(repo) || repo.split('/')[0].toLowerCase() !== owner ||
      !body.cloneToken || typeof body.cloneToken !== 'string') fail('Invalid repository or missing scoped clone token.', 403);
  if (body.prompt?.length > 12000 || !body.prompt?.trim()) fail('Invalid task prompt.', 400);
  if ([...jobs.values()].filter(j => ['cloning', 'running', 'cancelling'].includes(j.state)).length >= MAX_ACTIVE) fail('Runner is busy.', 429);
  if (jobs.size >= MAX_JOBS) {
    const oldest = [...jobs.values()].find(j => !['cloning', 'running'].includes(j.state));
    if (!oldest) fail('Runner job capacity reached.', 429);
    jobs.delete(oldest.id);
    await rm(oldest.root, { recursive: true, force: true });
  }
  const root = await mkdtemp(join(tmpdir(), 'jd-codex-'));
  const job = {
    id: randomUUID(), ownerId: body.actor.id, repo, root,
    home: join(root, 'home'), workspace: join(root, 'source'),
    state: 'cloning', startedAt: Date.now(), updatedAt: Date.now(),
    threadId: null, events: [], error: null, files: '', diff: '', finalResponse: '',
    worker: null, cloneController: null, baseSha: null
  };
  await mkdir(job.home, { recursive: true });
  await provisionSkills(job);
  jobs.set(job.id, job);
  // The clone token is captured only until cloning finishes, never stored in the job.
  void (async () => {
    try {
      await cloneRepository(job, body.cloneToken);
      if (job.state === 'cancelling') { update(job, 'cancelled'); return; }
      await runAgent(job, body.prompt);
    } catch (_) {
      if (job.state === 'cancelling') { update(job, 'cancelled'); return; }
      job.error = 'Repository checkout failed or timed out. Verify GitHub App access.';
      update(job, 'failed');
    }
  })();
  return { status: 202, data: publicJob(job) };
}
async function operation(body) {
  const job = jobs.get(body.jobId);
  if (!job || job.ownerId !== body.actor.id) fail('Codex job not found.', 404);
  if (body.action === 'status') return { status: 200, data: publicJob(job) };
  if (body.action === 'cancel') {
    if (job.worker && job.state === 'running') {
      const worker = job.worker;
      update(job, 'cancelling');
      worker.send({ action: 'cancel' });
      setTimeout(() => {
        if (job.state === 'cancelling' && job.worker === worker) worker.kill('SIGKILL');
      }, 3000).unref();
    } else if (job.state === 'cloning') {
      update(job, 'cancelling');
      job.cloneController?.abort();
    }
    return { status: 200, data: publicJob(job) };
  }
  if (body.action === 'continue') {
    if (!job.threadId || !['done', 'failed', 'cancelled'].includes(job.state)) fail('This Codex thread is not ready for a follow-up.', 409);
    if (!String(body.prompt || '').trim() || String(body.prompt).length > 12000) fail('Invalid follow-up prompt.', 400);
    await runAgent(job, String(body.prompt).trim());
    return { status: 202, data: publicJob(job) };
  }
  fail('Unknown operation.', 400);
}
const server = http.createServer(async (req, res) => {
  if (req.url !== '/rpc' || req.method !== 'POST') return reply(res, 404, { error: 'Not found.' });
  try {
    const body = authenticate(await readBounded(req), req.headers['x-jd-signature']);
    const result = body.action === 'health'
      ? { status: 200, data: { ready: await runtimeReady(), mode: 'single-owner-chatgpt' } }
      : body.action === 'account-status'
        ? { status:200, data: await runtimeReady()
          ? {available:true, runnerReady:true,...await accountBridge.account()}
          : {available:false, runnerReady:false, connected:false, codexEnabled:false, authMode:null, planType:null} }
      : body.action === 'account-connect'
        ? { status:200, data:await accountBridge.connect() }
      : body.action === 'account-disconnect'
        ? { status:200, data:await accountBridge.disconnect() }
      : body.action === 'start' ? await start(body) : await operation(body);
    reply(res, result.status, result.data);
  } catch (e) {
    reply(res, e.status || 500, { error: e.status ? e.message : 'Runner request failed.' });
  }
});
server.listen(Number(process.env.PORT || 8080), process.env.RUNNER_LISTEN_HOST || '127.0.0.1');
