import test from 'node:test';
import assert from 'node:assert/strict';
import { accountAvailability, settings } from '../api/_codex_sandbox.js';
import accountHandler from '../api/codex-account.js';

const secret='local-test-secret-which-is-over-32-characters';
const uid='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const actor={id:100,login:'jd-actor',subject:uid};

test('safe configuration reasons distinguish wrong environment, secret and app-account allowlist',()=>{
  assert.equal(accountAvailability(actor,{}).reasonCode,'SANDBOX_DISABLED');
  assert.equal(accountAvailability(actor,{CODEX_MULTIUSER_SANDBOX_ENABLED:'true'}).reasonCode,'SIGNING_SECRET_MISSING');
  const env={CODEX_MULTIUSER_SANDBOX_ENABLED:'true',CODEX_RUNNER_SHARED_SECRET:secret};
  assert.equal(accountAvailability(actor,{...env,CODEX_ALLOWED_GITHUB_IDS:'100'}).reasonCode,'ACCOUNT_ALLOWLIST_EMPTY');
  assert.equal(accountAvailability(actor,{...env,CODEX_ALLOWED_ACCOUNT_IDS:other}).reasonCode,'ACCOUNT_NOT_ENROLLED');
  assert.deepEqual(accountAvailability(actor,{...env,CODEX_ALLOWED_ACCOUNT_IDS:uid}),{available:true,reasonCode:'READY'});
  assert.equal(settings({...env,CODEX_ALLOWED_ACCOUNT_IDS:'"'+uid+'"'}).enabled,true);
});
test('an authenticated user sees only their own app-account ID for enrollment, without starting a sandbox',async t=>{
  const beforeFetch=globalThis.fetch;
  const keys=['CODEX_MULTIUSER_SANDBOX_ENABLED','CODEX_RUNNER_SHARED_SECRET','CODEX_ALLOWED_ACCOUNT_IDS'];
  const original=keys.map(key=>process.env[key]);
  t.after(()=>{
    globalThis.fetch=beforeFetch;
    keys.forEach((key,i)=>original[i]===undefined?delete process.env[key]:process.env[key]=original[i]);
  });
  process.env.CODEX_MULTIUSER_SANDBOX_ENABLED='true';
  process.env.CODEX_RUNNER_SHARED_SECRET=secret;
  process.env.CODEX_ALLOWED_ACCOUNT_IDS=other;
  let calls=0;
  globalThis.fetch=async(url,opts)=>{
    calls++;
    assert.match(String(url),/supabase\.co\/auth\/v1\/user$/);
    assert.equal(opts.headers.Authorization,'Bearer test-valid-cloud-session-token-1234567890');
    return new Response(JSON.stringify({id:uid}),{status:200});
  };
  const req=new Request('https://test.local/api/codex-account',{
    headers:{authorization:'Bearer test-valid-cloud-session-token-1234567890'}});
  const res=await accountHandler(req),data=await res.json();
  assert.equal(res.status,200);
  assert.equal(data.available,false);
  assert.equal(data.reasonCode,'ACCOUNT_NOT_ENROLLED');
  assert.equal(data.accountId,uid);
  assert.equal(data.connected,false);
  assert.equal(calls,1);
});
test('unauthenticated status never leaks app-account IDs',async()=>{
  const res=await accountHandler(new Request('https://test.local/api/codex-account'));
  const data=await res.json();
  assert.equal(data.requiresAccount,true);
  assert.equal(data.reasonCode,'APP_SIGN_IN_REQUIRED');
  assert.equal('accountId' in data,false);
});
