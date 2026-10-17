/* Contract test: /api/chat server-side credit coupling (P0/A2).
   - Billable generations (chat=10, image=50) verify identity + credit
     coverage BEFORE generation; deduct idempotently AFTER success.
   - Classification mirrors credits.js classifyChatBody.
   - Nothing is deducted when generation fails.
   Runs with stubbed fetch; needs no real Supabase or provider keys. */
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://dummy.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY = 'dummy-pk';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy-service-key';

const calls = { spend_credits: [], guest_spend: [] };
let guestStatusValue = 100;
let creditBalanceValue = 1000;

const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  const u = String(url);
  const body = (() => { try { return JSON.parse((opts && opts.body) || '{}'); } catch { return {}; } })();
  if (u.includes('/auth/v1/user')) {
    const h = (opts && opts.headers) || {};
    const auth = h.Authorization || h.authorization || '';
    if (auth === 'Bearer VALIDTOKEN1234567890abcdef') {
      return { ok: true, json: async () => ({ id: 'user-123' }), text: async () => '{}' };
    }
    return { ok: false, status: 401, text: async () => 'bad' };
  }
  if (u.includes('/rest/v1/rpc/credit_balance')) {
    return { ok: true, json: async () => creditBalanceValue, text: async () => String(creditBalanceValue) };
  }
  if (u.includes('/rest/v1/rpc/spend_credits')) {
    calls.spend_credits.push(body);
    return { ok: true, json: async () => 990, text: async () => '990' };
  }
  if (u.includes('/rest/v1/rpc/guest_status')) {
    return { ok: true, json: async () => guestStatusValue, text: async () => String(guestStatusValue) };
  }
  if (u.includes('/rest/v1/rpc/guest_spend')) {
    calls.guest_spend.push(body);
    return { ok: true, json: async () => 90, text: async () => '90' };
  }
  return { ok: false, status: 500, text: async () => 'no-provider', json: async () => ({}) };
};

const mod = await import('../api/chat.js');
const handler = mod.default;
const { jdBillKind, jdSpendCredits } = mod;

async function post(body, token) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = 'Bearer ' + token;
  const req = new Request('https://app.example/api/chat',
    { method: 'POST', headers, body: JSON.stringify(body) });
  const res = await handler(req);
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

test('classification mirrors credits.js classifyChatBody', () => {
  assert.equal(jdBillKind({ action: 'generate-image' }), 'image');
  assert.equal(jdBillKind({ action: 'generate-pet-image' }), 'image');
  assert.equal(jdBillKind({ action: 'tts' }), null);
  assert.equal(jdBillKind({ action: 'provider-status' }), null);
  assert.equal(jdBillKind({ action: 'chat', message: 'hi' }), null);
  assert.equal(jdBillKind({ message: 'hello' }), 'chat');
  assert.equal(jdBillKind({ message: 'Summarize this conversation for context preservation. x' }), null);
  assert.equal(jdBillKind({ message: 'Create a concise 3 to 6 word chat title. x' }), null);
  assert.equal(jdBillKind({ message: 'Look at the attached image carefully and describe' }), null);
  assert.equal(jdBillKind({ message: 'hi', customApiProfile: {} }), null);
  assert.equal(jdBillKind({}), null);
  assert.equal(jdBillKind(null), null);
});

test('guest with insufficient balance gets 402, no provider call charged', async () => {
  guestStatusValue = 5;
  const r = await post({ message: 'hello' });
  assert.equal(r.status, 402);
  assert.equal(r.data.error, 'insufficient_credits');
});

test('guest with balance proceeds; failed generation deducts nothing', async () => {
  guestStatusValue = 100;
  calls.guest_spend.length = 0;
  const r = await post({ message: 'hello' });
  assert.notEqual(r.status, 402);
  assert.equal(calls.guest_spend.length, 0);
});

test('signed-in user with insufficient balance gets 402', async () => {
  creditBalanceValue = 5;
  const r = await post({ message: 'hello' }, 'VALIDTOKEN1234567890abcdef');
  assert.equal(r.status, 402);
  assert.equal(r.data.error, 'insufficient_credits');
});

test('signed-in user with balance proceeds; failed generation deducts nothing', async () => {
  creditBalanceValue = 1000;
  calls.spend_credits.length = 0;
  const r = await post({ message: 'hello' }, 'VALIDTOKEN1234567890abcdef');
  assert.notEqual(r.status, 402);
  assert.equal(calls.spend_credits.length, 0);
});

test('malformed Bearer token gets 401', async () => {
  const r = await post({ message: 'hello' }, 'BAD');
  assert.equal(r.status, 401);
});

test('non-billable actions bypass the credit gate', async () => {
  const r = await post({ action: 'provider-status' });
  assert.notEqual(r.status, 401);
  assert.notEqual(r.status, 402);
});

test('jdSpendCredits deducts signed-in users idempotently by key', async () => {
  calls.spend_credits.length = 0;
  await jdSpendCredits({ kind: 'chat', cost: 10, idemKey: 'k1', userId: 'user-123' });
  assert.equal(calls.spend_credits.length, 1);
  assert.deepEqual(calls.spend_credits[0],
    { p_uid: 'user-123', p_cost: 10, p_reason: 'spend:chat', p_key: 'k1' });
});

test('jdSpendCredits deducts guests via guest_spend', async () => {
  calls.guest_spend.length = 0;
  await jdSpendCredits({ kind: 'chat', cost: 10, idemKey: 'k2', guest: { key: 'gk', day: '2026-10-18' } });
  assert.equal(calls.guest_spend.length, 1);
  assert.deepEqual(calls.guest_spend[0], { p_key: 'gk', p_day: '2026-10-18', p_cost: 10 });
});

test('jdSpendCredits is a no-op when unenforced', async () => {
  calls.spend_credits.length = 0;
  await jdSpendCredits({ kind: 'chat', cost: 10, idemKey: 'k3', userId: 'user-123', unenforced: true });
  assert.equal(calls.spend_credits.length, 0);
});
/* NOTE: globalThis.fetch stays stubbed for the life of this test process —
   restoring it at module top-level would run before the test callbacks. */
