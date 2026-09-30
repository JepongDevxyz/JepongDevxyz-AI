/* Tests for the PayMongo QR Ph integration (mocked, no real keys). */
import { createHmac } from 'node:crypto';
import assert from 'node:assert';

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY = 'pk_test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc_test';
process.env.PAYMONGO_SECRET_KEY = 'sk_test_EXAMPLEKEY';
process.env.PAYMONGO_WEBHOOK_SECRET = 'whsec_TEST_DUMMY_SECRET';

const calls = [];
const FAKE_QR = 'data:image/png;base64,iVBORw0KGgoFAKE';
const dbRows = { paymongo_payments: [], credit_ledger: [] };

global.fetch = async (url, opts = {}) => {
  calls.push({ url, method: opts.method || 'GET', body: opts.body });
  const u = String(url);
  // Supabase auth check
  if (u.includes('/auth/v1/user')) {
    return { ok: true, json: async () => ({ id: '11111111-2222-3333-4444-555555555555' }) };
  }
  // PostgREST
  if (u.includes('/rest/v1/paymongo_payments')) {
    if ((opts.method || 'GET') === 'POST') {
      const row = { id: 'payrow-1', ...JSON.parse(opts.body), status: 'pending' };
      dbRows.paymongo_payments.push(row);
      return { ok: true, json: async () => [row] };
    }
    if (opts.method === 'PATCH') {
      const patch = JSON.parse(opts.body);
      const row = dbRows.paymongo_payments.find((r) => u.includes(encodeURIComponent(r.intent_id)));
      Object.assign(row, patch);
      return { ok: true, json: async () => [row] };
    }
    const rows = dbRows.paymongo_payments.filter((r) => u.includes(encodeURIComponent(r.intent_id)));
    return { ok: true, json: async () => rows };
  }
  if (u.includes('/rest/v1/credit_ledger') && opts.method === 'POST') {
    const row = { id: 'ledger-1', ...JSON.parse(opts.body) };
    dbRows.credit_ledger.push(row);
    return { ok: true, json: async () => [row] };
  }
  // PayMongo: create payment intent
  if (u.endsWith('/payment_intents')) {
    const attrs = JSON.parse(opts.body).data.attributes;
    assert.deepStrictEqual(attrs.payment_method_allowed, ['qrph'], 'intent must allow qrph only');
    assert.strictEqual(attrs.currency, 'PHP');
    return { ok: true, json: async () => ({ data: { id: 'pi_test123', attributes: { client_key: 'ck_test123' } } }) };
  }
  // PayMongo: create payment method
  if (u.endsWith('/payment_methods')) {
    const attrs = JSON.parse(opts.body).data.attributes;
    assert.strictEqual(attrs.type, 'qrph');
    return { ok: true, json: async () => ({ data: { id: 'pm_test123' } }) };
  }
  // PayMongo: attach
  if (u.includes('/payment_intents/pi_test123/attach')) {
    const attrs = JSON.parse(opts.body).data.attributes;
    assert.strictEqual(attrs.payment_method, 'pm_test123');
    assert.strictEqual(attrs.client_key, 'ck_test123');
    return {
      ok: true,
      json: async () => ({ data: { id: 'pi_test123', attributes: { next_action: { code: { image_url: FAKE_QR } } } } }),
    };
  }
  throw new Error('unexpected fetch: ' + u);
};

const { default: createHandler, PLANS } = await import('../api/paymongo-create.js');
const { default: webhookHandler, verifySignature, intentIdOf } = await import('../api/paymongo-webhook.js');

let n = 0;
const req = (method, headers, body) => ({
  method,
  headers: { get: (k) => headers[k.toLowerCase()] || null },
  json: async () => JSON.parse(body || '{}'),
  text: async () => body || '',
  url: 'https://app.test/api/x?intent_id=pi_test123',
});

// --- 1. Create flow: client tries to spoof a cheaper amount ---
{
  const res = await createHandler(
    req('POST', { authorization: 'Bearer tok12345678901234567890' }, JSON.stringify({ plan_id: 'pro', amount: 100 }))
  );
  assert.strictEqual(res.status, 200);
  const j = JSON.parse(await res.text());
  assert.strictEqual(j.qr_image, FAKE_QR, 'QR image returned');
  assert.strictEqual(j.amount_centavos, PLANS.pro.amount, 'server-side price wins over client amount');
  assert.strictEqual(j.payment_intent_id, 'pi_test123');
  const inserted = dbRows.paymongo_payments[0];
  assert.strictEqual(inserted.amount_centavos, 9900);
  assert.strictEqual(inserted.status, 'pending');
  n++; console.log('ok 1 - create flow, price cannot be spoofed');
}
// --- 2. Create rejects bad plan / missing auth ---
{
  const r1 = await createHandler(req('POST', {}, JSON.stringify({ plan_id: 'nope' })));
  assert.strictEqual(r1.status, 401); n++; console.log('ok 2 - missing auth rejected');
  const r2 = await createHandler(
    req('POST', { authorization: 'Bearer tok12345678901234567890' }, JSON.stringify({ plan_id: 'nope' }))
  );
  assert.strictEqual(r2.status, 400); n++; console.log('ok 3 - invalid plan rejected');
}
// --- 3. Signature verification: known vector ---
{
  const secret = 'whsec_TEST_DUMMY_SECRET';
  const t = '1496734173';
  const raw = '{"hello":"world"}';
  const sig = createHmac('sha256', secret).update(t + '.' + raw).digest('hex');
  assert.strictEqual(verifySignature(raw, `t=${t},te=${sig},li=`, secret), true);
  assert.strictEqual(verifySignature(raw, `t=${t},te=,li=${sig}`, secret), true);
  assert.strictEqual(verifySignature(raw, `t=${t},te=deadbeef,li=`, secret), false);
  assert.strictEqual(verifySignature(raw + 'x', `t=${t},te=${sig},li=`, secret), false);
  assert.strictEqual(verifySignature(raw, null, secret), false);
  n++; console.log('ok 4 - webhook signature verification (te/li/tamper/missing)');
}
// --- 4. Webhook payment.paid grants credits exactly once ---
{
  const event = {
    data: { attributes: { type: 'payment.paid',
      data: { type: 'payment', attributes: { payment_intent_id: 'pi_test123', amount: 9900 } } } },
  };
  const raw = JSON.stringify(event);
  const t = String(Math.floor(Date.now() / 1000));
  const sig = createHmac('sha256', process.env.PAYMONGO_WEBHOOK_SECRET).update(t + '.' + raw).digest('hex');
  const h = { 'paymongo-signature': `t=${t},te=${sig},li=` };
  const r1 = await webhookHandler(req('POST', h, raw));
  assert.strictEqual(r1.status, 200);
  assert.strictEqual(dbRows.paymongo_payments[0].status, 'paid');
  assert.strictEqual(dbRows.credit_ledger.length, 1);
  assert.strictEqual(dbRows.credit_ledger[0].delta, PLANS.pro.credits);
  // retry (PayMongo retries webhooks) -> no double grant
  const r2 = await webhookHandler(req('POST', h, raw));
  assert.strictEqual(r2.status, 200);
  assert.strictEqual(dbRows.credit_ledger.length, 1, 'idempotent: no double credit');
  n++; console.log('ok 5 - payment.paid grants credits once (idempotent)');
  // bad signature rejected
  const r3 = await webhookHandler(req('POST', { 'paymongo-signature': 't=1,te=bogus,li=' }, raw));
  assert.strictEqual(r3.status, 401); n++; console.log('ok 6 - forged webhook rejected');
}
// --- 5. intentIdOf defensive extraction ---
{
  assert.strictEqual(intentIdOf({ data: { attributes: { type: 'payment.paid', data: { type: 'payment', attributes: { payment_intent_id: 'pi_1' } } } } }), 'pi_1');
  assert.strictEqual(intentIdOf({ data: { attributes: { type: 'qrph.expired', data: { type: 'payment_intent', id: 'pi_2' } } } }), 'pi_2');
  assert.strictEqual(intentIdOf({}), null);
  n++; console.log('ok 7 - intent id extraction');
}
// --- 6. Status endpoint: only own payments visible ---
{
  const { default: statusHandler } = await import('../api/paymongo-status.js');
  const r = await statusHandler(req('GET', { authorization: 'Bearer tok12345678901234567890' }, ''));
  assert.strictEqual(r.status, 200);
  const j = JSON.parse(await r.text());
  assert.strictEqual(j.status, 'paid');
  assert.strictEqual(j.amount_php, '99.00');
  n++; console.log('ok 8 - status polling returns own payment');
}

console.log(`\nALL ${n} TESTS PASSED`);
