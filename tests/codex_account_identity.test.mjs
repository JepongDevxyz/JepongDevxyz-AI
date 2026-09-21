import test from 'node:test';
import assert from 'node:assert/strict';
import { codexAccountActor } from '../api/_codex_identity.js';
import accountHandler from '../api/codex-account.js';
const secret='test-codex-session-secret-longer-than-32-bytes';
const userA='11111111-1111-4111-8111-111111111111';
const userB='22222222-2222-4222-8222-222222222222';
test('Cloud account required; GitHub OAuth cookie is not a ChatGPT login prerequisite',async()=>{
  const request=new Request('https://test.local/api/codex-account',{headers:{cookie:'jdgh_session=github-token'}});
  const result=await accountHandler(request),body=await result.json();
  assert.equal(result.status,200);
  assert.equal(body.requiresAccount,true);
  assert.equal(body.connected,false);
});
test('Only validated cloud account identity becomes a Codex tenant',async t=>{
  const original=globalThis.fetch;
  t.after(()=>{globalThis.fetch=original;});
  let verified=0;
  globalThis.fetch=async (url,opts)=>{
    assert.match(url,/supabase\.co\/auth\/v1\/user$/);
    assert.equal(opts.headers.Authorization,'Bearer valid-cloud-access-token-123');
    verified++;
    return new Response(JSON.stringify({id:userA}),{status:200});
  };
  const req=new Request('https://test.local/api/codex-account',
    {headers:{authorization:'Bearer valid-cloud-access-token-123'}});
  const a=await codexAccountActor(req,{CODEX_RUNNER_SHARED_SECRET:secret});
  const again=await codexAccountActor(req,{CODEX_RUNNER_SHARED_SECRET:secret});
  assert.equal(a.id,again.id);
  assert.equal(a.subject,userA);
  assert.match(a.login,/^jd-[a-f0-9]{24}$/);
  assert.equal(verified,2);
  globalThis.fetch=async()=>new Response(JSON.stringify({id:userB}),{status:200});
  const b=await codexAccountActor(req,{CODEX_RUNNER_SHARED_SECRET:secret});
  assert.notEqual(a.id,b.id);
  assert.notEqual(a.login,b.login);
});
test('Forged identifiers and expired credentials cannot create a tenant',async t=>{
  const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
  await assert.rejects(()=>codexAccountActor(new Request('https://test.local',
    {headers:{'x-user-id':userA}}),{CODEX_RUNNER_SHARED_SECRET:secret}),
    e=>e.status===401);
  globalThis.fetch=async()=>new Response('{}',{status:401});
  await assert.rejects(()=>codexAccountActor(new Request('https://test.local',
    {headers:{authorization:'Bearer valid-cloud-access-token-123'}}),
    {CODEX_RUNNER_SHARED_SECRET:secret}),e=>e.status===401);
});
