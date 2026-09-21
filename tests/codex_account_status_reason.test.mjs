import test from 'node:test';
import assert from 'node:assert/strict';
import { accountAvailability, settings } from '../api/_codex_sandbox.js';
import accountHandler from '../api/codex-account.js';

const secret='local-test-secret-which-is-over-32-characters';
const uid='11111111-1111-4111-8111-111111111111';
const actor={id:100,login:'jd-actor',subject:uid};

test('central service configuration never requires per-user Vercel enrollment',()=>{
  const env={CODEX_MULTIUSER_SANDBOX_ENABLED:'true',CODEX_RUNNER_SHARED_SECRET:secret};
  assert.deepEqual(accountAvailability(actor,env),{available:true,reasonCode:'READY'});
  assert.deepEqual(accountAvailability({...actor,subject:'22222222-2222-4222-8222-222222222222'},env),{available:true,reasonCode:'READY'});
  assert.equal(settings(env).enabled,true);
  assert.equal('allowlist' in settings(env),false);
  assert.equal(accountAvailability(actor,{}).reasonCode,'SERVICE_NOT_CONFIGURED');
  assert.equal(accountAvailability(actor,{CODEX_MULTIUSER_SANDBOX_ENABLED:'true'}).reasonCode,'SERVICE_NOT_CONFIGURED');
  assert.equal(accountAvailability(actor,{...env,CODEX_SELF_SERVICE_ENABLED:'false'}).reasonCode,'SERVICE_PAUSED');
});

test('unauthenticated status never leaks app-account IDs',async()=>{
  const res=await accountHandler(new Request('https://test.local/api/codex-account'));
  const data=await res.json();
  assert.equal(data.requiresAccount,true);
  assert.equal(data.reasonCode,'APP_SIGN_IN_REQUIRED');
  assert.equal('accountId' in data,false);
});
