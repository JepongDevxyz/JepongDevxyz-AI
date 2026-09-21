import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { CodexAccountBridge } from '../account-bridge.mjs';

test('official device-code protocol verifies account, never forwards auth secrets and logs out', {timeout:12000},async t=>{
  const home=await mkdtemp(join(tmpdir(),'jd-codex-auth-protocol-'));
  t.after(()=>rm(home,{recursive:true,force:true}));
  const bridge=new CodexAccountBridge({home,
    cli:process.execPath,start:(_cli,_args,opts)=>spawn(process.execPath,
      [new URL('./mock-app-server.mjs',import.meta.url).pathname],opts)});
  t.after(()=>bridge.close());
  assert.deepEqual(await bridge.account(),{
    connected:false,authMode:null,planType:null,codexEnabled:false
  });
  const login=await bridge.connect();
  assert.equal(login.connected,false);
  assert.equal(login.verificationUrl,'https://auth.openai.com/codex/device');
  assert.equal(login.userCode,'ABCD-1234');
  assert.equal(await bridge.account().then(x=>x.connected),true);
  const account=await bridge.account();
  assert.equal(account.authMode,'chatgpt');
  assert.equal(account.planType,'plus');
  assert.equal(JSON.stringify(account).includes('private@example.test'),false);
  await bridge.disconnect();
  assert.equal((await bridge.account()).connected,false);
});
