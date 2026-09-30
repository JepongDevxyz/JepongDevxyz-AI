/* Mocked tests for the credits API (no network, no real Supabase).
   Run: node tests/credits_test.mjs   (from the repo root copy) */
import { strict as assert } from 'node:assert';

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_test';

const SB = 'https://test.supabase.co';

// ---- controllable mock state ----
const mock = {
  balance: 1240,
  spendResult: 90,      // what spend_credits rpc returns
  welcomeClaimed: true, // ledger count for reason=welcome
  welcomeInsertStatus: 201,
};

globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const auth = (opts.headers && (opts.headers.Authorization || opts.headers.authorization)) || '';

  if (u.includes('/auth/v1/user')) {
    if (auth === 'Bearer good-token-1234567890abcdef') {
      return new Response(JSON.stringify({ id: 'user-1' }), { status: 200 });
    }
    return new Response('unauthorized', { status: 401 });
  }
  if (u.includes('/rest/v1/rpc/credit_balance')) {
    return new Response(JSON.stringify(mock.balance), { status: 200 });
  }
  if (u.includes('/rest/v1/rpc/spend_credits')) {
    return new Response(JSON.stringify(mock.spendResult), { status: 200 });
  }
  if (u.includes('/rest/v1/credit_ledger?select=id')) {
    const n = mock.welcomeClaimed ? 1 : 0;
    return new Response('[]', {
      status: 200,
      headers: { 'content-range': `0-${Math.max(0, n - 1)}/${n}` },
    });
  }
  if (u.includes('/rest/v1/credit_ledger') && (opts.method || 'GET') === 'POST') {
    return new Response('', { status: mock.welcomeInsertStatus });
  }
  throw new Error('unexpected fetch: ' + u);
};

const balanceMod = await import('../api/credits-balance.js');
const spendMod = await import('../api/credits-spend.js');
const welcomeMod = await import('../api/credits-welcome.js');

const req = (path, { method = 'GET', token = 'good-token-1234567890abcdef', body = null } = {}) => {
  const headers = {};
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const init = { method, headers };
  if (body !== null) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  return new Request('https://app.test' + path, init);
};

let passed = 0;
async function t(name, fn) {
  await fn();
  passed++;
  console.log('  ok:', name);
}

// ---------- balance ----------
await t('balance returns balance + welcome flag', async () => {
  const res = await balanceMod.default(req('/api/credits-balance'));
  assert.equal(res.status, 200);
  const d = await res.json();
  assert.equal(d.balance, 1240);
  assert.equal(d.welcome_claimed, true);
});

await t('balance without token -> 401', async () => {
  const res = await balanceMod.default(req('/api/credits-balance', { token: null }));
  assert.equal(res.status, 401);
});

await t('balance wrong method -> 405', async () => {
  const res = await balanceMod.default(req('/api/credits-balance', { method: 'POST' }));
  assert.equal(res.status, 405);
});

// ---------- spend ----------
await t('spend chat deducts server-side cost', async () => {
  mock.spendResult = 90;
  const res = await spendMod.default(
    req('/api/credits-spend', { method: 'POST', body: { action: 'chat', idempotency_key: 'k1' } })
  );
  assert.equal(res.status, 200);
  const d = await res.json();
  assert.equal(d.ok, true);
  assert.equal(d.balance, 90);
  assert.equal(spendMod.COSTS.chat, 10);
  assert.equal(spendMod.COSTS.image, 50);
});

await t('spend insufficient -> 402 Tagalog', async () => {
  mock.spendResult = -1;
  const res = await spendMod.default(
    req('/api/credits-spend', { method: 'POST', body: { action: 'chat', idempotency_key: 'k2' } })
  );
  assert.equal(res.status, 402);
  const d = await res.json();
  assert.match(d.error, /credits/);
});

await t('spend unknown action -> 400', async () => {
  const res = await spendMod.default(
    req('/api/credits-spend', { method: 'POST', body: { action: 'hack', idempotency_key: 'k3' } })
  );
  assert.equal(res.status, 400);
});

await t('spend missing key -> 400', async () => {
  const res = await spendMod.default(
    req('/api/credits-spend', { method: 'POST', body: { action: 'chat' } })
  );
  assert.equal(res.status, 400);
});

await t('spend without token -> 401', async () => {
  const res = await spendMod.default(
    req('/api/credits-spend', { method: 'POST', token: null, body: { action: 'chat', idempotency_key: 'k4' } })
  );
  assert.equal(res.status, 401);
});

// ---------- welcome ----------
await t('welcome grants once', async () => {
  mock.welcomeInsertStatus = 201;
  mock.balance = 500;
  const res = await welcomeMod.default(req('/api/credits-welcome', { method: 'POST' }));
  assert.equal(res.status, 200);
  const d = await res.json();
  assert.equal(d.granted, true);
  assert.equal(d.balance, 500);
  assert.equal(welcomeMod.WELCOME_CREDITS, 500);
});

await t('welcome repeat -> already claimed', async () => {
  mock.welcomeInsertStatus = 409;
  const res = await welcomeMod.default(req('/api/credits-welcome', { method: 'POST' }));
  assert.equal(res.status, 200);
  const d = await res.json();
  assert.equal(d.granted, false);
});

console.log(`\n${passed}/10 credits tests passed`);
