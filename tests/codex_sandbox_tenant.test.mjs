import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { tenantIdentity, settings, sandboxLifecycle } from '../api/_codex_sandbox.js';
const master='test-only-32-plus-character-secret-for-tenant-isolation';
test('feature is disabled unless explicitly enabled and secret is present',()=>{
 assert.equal(settings({}).enabled,false);
 assert.equal(settings({CODEX_MULTIUSER_SANDBOX_ENABLED:'true',CODEX_RUNNER_SHARED_SECRET:'short'}).enabled,false);
 assert.equal(settings({CODEX_MULTIUSER_SANDBOX_ENABLED:'true',CODEX_RUNNER_SHARED_SECRET:master}).enabled,false);
 assert.equal(settings({CODEX_MULTIUSER_SANDBOX_ENABLED:'true',CODEX_RUNNER_SHARED_SECRET:master,
 CODEX_ALLOWED_GITHUB_IDS:'100,101'}).enabled,true);
});
test('distinct immutable account ids receive separate private VM names and per-tenant signing keys',()=>{
 const a=tenantIdentity({id:100,login:'alice'},master);
 const aAgain=tenantIdentity({id:100,login:'alice'},master);
 const b=tenantIdentity({id:101,login:'bob'},master);
 assert.equal(a.name,aAgain.name);
 assert.equal(a.secret,aAgain.secret);
 assert.notEqual(a.name,b.name);
 assert.notEqual(a.secret,b.secret);
 assert.match(a.name,/^jd-codex-[a-f0-9]{32}$/);
 assert.equal(a.name.includes('alice'),false);
 assert.notEqual(a.secret,master);
});
test('browser-controlled or missing user identifiers are never accepted',()=>{
 for(const actor of [null,{}, {id:'100',login:'alice'},{id:100,login:'a/b'}, {id:0,login:'alice'}])
  assert.throws(()=>tenantIdentity(actor,master));
});

test('first creation installs and launches the runner; resume only relaunches',async()=>{
 const calls=[],tenant={name:'test-tenant',secret:'private'};
 const hooks=sandboxLifecycle(tenant,
   async sbx=>{assert.equal(sbx.id,'sandbox');calls.push('install');},
   async (sbx,t)=>{assert.equal(sbx.id,'sandbox');assert.equal(t,tenant);calls.push('launch');}
 );
 await hooks.onCreate({id:'sandbox'});
 assert.deepEqual(calls,['install','launch']);
 await hooks.onResume({id:'sandbox'});
 assert.deepEqual(calls,['install','launch','launch']);
});
