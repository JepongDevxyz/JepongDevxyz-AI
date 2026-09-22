import assert from 'node:assert/strict';
import handler from '../api/plugin-execute.js';
import {sealSession} from '../api/_github_oauth.js';
import fs from 'node:fs';

process.env.GITHUB_SESSION_SECRET='plugin-execution-test-secret-0123456789abcd';
const sealed=await sealSession({token:'gho_mock_scoped_token',login:'tester',createdAt:Date.now()});
const headers={
  'Content-Type':'application/json',Origin:'https://example.test',
  Cookie:'jdgh_session='+encodeURIComponent(sealed)
};
let dispatches=0;
let returnRunId=false;
let allowPush=true;
let allowManual=true;
const requests=[];
const originalFetch=globalThis.fetch;
globalThis.fetch=async (url,options={})=>{
  const path=new URL(url).pathname;
  requests.push({path,method:options.method||'GET',authorization:options.headers?.Authorization});
  assert.equal(options.headers.Authorization,'Bearer gho_mock_scoped_token');
  if(path==='/repos/owner/project')return Response.json({
    full_name:'owner/project',default_branch:'main',permissions:{pull:true,push:allowPush}
  });
  if(path==='/repos/owner/project/actions/workflows')return Response.json({workflows:[
    {id:101,name:'Verify Project Tests',state:'active',path:'.github/workflows/verify-project.yml',html_url:'https://github.com/owner/project/actions/workflows/verify-project.yml'},
    {id:102,name:'Publish to production',state:'active',path:'.github/workflows/deploy.yml'},
    {id:103,name:'Old Tests',state:'disabled_manually',path:'.github/workflows/old-tests.yml'}
  ]});
  if(path==='/repos/owner/project/branches/main')return Response.json({name:'main',protected:true});
  if(path==='/repos/owner/project/contents/.github/workflows/verify-project.yml')return Response.json({
    type:'file',path:'.github/workflows/verify-project.yml',size:110,encoding:'base64',
    content:Buffer.from(allowManual?
      'name: Verify Project Tests\non:\n  workflow_dispatch:\njobs:\n  verify:\n    runs-on: ubuntu-latest\n':
      'name: Verify Project Tests\non:\n  push:\njobs:\n  verify:\n    runs-on: ubuntu-latest\n').toString('base64')
  });
  if(path==='/repos/owner/project/actions/workflows/101/dispatches'){
    assert.equal(options.method,'POST');
    assert.deepEqual(JSON.parse(options.body),{ref:'main'});
    dispatches++;
    return returnRunId
      ? Response.json({workflow_run_id:77,html_url:'https://github.com/owner/project/actions/runs/77'})
      : new Response(null,{status:204});
  }
  if(path==='/repos/owner/project/actions/workflows/101/runs')return Response.json({workflow_runs:[
    {id:55,name:'Verify Project Tests',status:'completed',conclusion:'success',
      head_branch:'main',created_at:'2026-09-20T01:30:00Z',updated_at:'2026-09-20T01:31:00Z',
      html_url:'https://github.com/owner/project/actions/runs/55'}
  ]});
  throw new Error('Unexpected GitHub API call '+url);
};
async function post(action,extra={},customHeaders=headers){
  const request=new Request('https://example.test/api/plugin-execute',{
    method:'POST',headers:customHeaders,
    body:JSON.stringify({action,repo:'owner/project',...extra})
  });
  const response=await handler(request);
  return {status:response.status,data:await response.json()};
}
try{
  const listing=await post('list');
  assert.equal(listing.status,200,JSON.stringify(listing.data));
  assert.equal(listing.data.workflows.length,1,'only active verification workflow can be dispatched');
  assert.equal(listing.data.workflows[0].id,101);
  allowPush=false;
  assert.equal((await post('list')).status,403,'non-write GitHub account cannot start test runs');
  allowPush=true;
  assert.equal((await post('dispatch',{workflowId:101,ref:'main'})).status,403,'model or client cannot dispatch without explicit confirmation');
  assert.equal(dispatches,0,'no test run should start before confirmation');
  assert.equal((await post('dispatch',{workflowId:102,ref:'main',confirm:true})).status,400,'deployment workflow must be rejected');
  assert.equal((await post('dispatch',{workflowId:101,ref:'../main',confirm:true})).status,400,'unsafe ref must be rejected');
  allowManual=false;
  assert.equal((await post('dispatch',{workflowId:101,ref:'main',confirm:true})).status,422,'workflow needs workflow_dispatch');
  allowManual=true;
  const executed=await post('dispatch',{workflowId:101,ref:'main',confirm:true});
  assert.equal(executed.status,200,JSON.stringify(executed.data));
  assert.equal(executed.data.accepted,true);
  assert.equal(dispatches,1);
  assert.equal(executed.data.run,null,'GitHub may acknowledge a dispatch without returning a run ID');
  returnRunId=true;
  const executedWithId=await post('dispatch',{workflowId:101,ref:'main',confirm:true});
  assert.equal(executedWithId.status,200,JSON.stringify(executedWithId.data));
  assert.equal(executedWithId.data.run.id,77);
  assert.equal(executedWithId.data.run.url,'https://github.com/owner/project/actions/runs/77');
  assert.equal(dispatches,2);
  assert.match(executed.data.message,/check Actions for actual execution/i);
  assert(!JSON.stringify(executed.data).includes('gho_mock_scoped_token'),'OAuth token must never reach client');
  const runs=await post('runs',{workflowId:101});
  assert.equal(runs.status,200);
  assert.equal(runs.data.runs[0].status,'completed');
  assert.equal(runs.data.runs[0].conclusion,'success');
  assert.equal((await post('list',{},Object.fromEntries(Object.entries(headers).filter(([key])=>key!=='Cookie')))).status,401);
  assert.equal((await post('list',{}, {...headers,Origin:'https://attacker.example'})).status,403);
  assert.equal(requests.some(r=>r.authorization!=='Bearer gho_mock_scoped_token'),false);
} finally {globalThis.fetch=originalFetch;}

const plugins=fs.readFileSync('plugins.js','utf8');
const html=JSON.parse(plugins.split('\n')[0].replace(/^const PANEL_HTML=/,'').replace(/;$/,''));
const page=fs.readFileSync('index.html','utf8');
for(const control of ['jdplugExecutionPanel','jdplugLoadWorkflows','jdplugWorkflowSelect',
  'jdplugDispatchWorkflow','jdplugExecuteConfirm','jdplugApproveExecution','jdplugCheckRuns'])
  assert(html.includes('id="'+control+'"'),'missing execution control '+control);
assert(plugins.includes('function confirmRunTests()')&&plugins.includes('async function dispatchTests()'));
assert(plugins.includes("await executeApi('dispatch',{workflowId:approved.workflowId,ref:approved.ref,confirm:true})"));
assert(page.includes("message.toLowerCase() === '/run-tests'"));
assert(page.includes('await window.JDPlugins?.ready?.()'));
assert(plugins.includes("superpowers:{enabled:installed('superpowers'),phase:state.phase}"))
assert(plugins.includes("autoUse:true"));
assert(plugins.includes("enabled:installed('github')&&state.github&&state.repoLoaded"));
console.log('PASS: OAuth-protected workflow listing, approval, execution and verified status across chat/model UI');
