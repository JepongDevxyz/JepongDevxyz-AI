import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import account from '../api/codex-account.js';
import gateway from '../api/codex.js';

async function incoming(handler,path,method='GET',body=''){
  const req=Readable.from(body?[Buffer.from(body)]:[]);
  req.url=path;req.method=method;req.headers={host:'test.local',cookie:'jdgh_session=irrelevant'};
  const output={status:null,data:''};
  const res={
    writeHead(status,headers){output.status=status;output.headers=headers;},
    end(data){output.data=String(data||'');}
  };
  await handler(req,res);
  return {status:output.status,body:JSON.parse(output.data)};
}
test('Node.js IncomingMessage produces a valid ChatGPT account response instead of 500',async()=>{
  const response=await incoming(account,'/api/codex-account');
  assert.equal(response.status,200);
  assert.equal(response.body.requiresAccount,true);
  assert.equal(response.body.connected,false);
});
test('Unauthenticated POST fails closed without triggering a sandbox',async()=>{
  const response=await incoming(account,'/api/codex-account','POST','{"action":"connect"}');
  assert.equal(response.status,401);
  assert.equal(response.body.connected,false);
});
test('Node.js runtime also handles the Codex status endpoint',async()=>{
  const response=await incoming(gateway,'/api/codex');
  assert.equal(response.status,200);
  assert.equal(response.body.configured,false);
});
