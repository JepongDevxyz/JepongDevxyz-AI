import assert from 'node:assert/strict';
import {fetchGitHubRunContext,shouldReadGitHubRunStatus} from '../api/_plugin_execution_context.js';
import fs from 'node:fs';

assert.equal(shouldReadGitHubRunStatus('What is the weather today?'),false);
assert.equal(shouldReadGitHubRunStatus('Check latest CI and PRs'),true);
assert.equal(shouldReadGitHubRunStatus('Did my tests pass?'),true);
const original=globalThis.fetch;
const calls=[];
globalThis.fetch=async (url,options={})=>{
  const address=new URL(url);
  calls.push({path:address.pathname,method:options.method||'GET',auth:options.headers?.Authorization});
  if(address.pathname==='/repos/owner/project/actions/runs'){
    return Response.json({workflow_runs:[
      {id:77,name:'Verify Build',status:'completed',conclusion:'success',head_branch:'main',
       updated_at:'2026-09-20T01:30:00Z',html_url:'https://github.com/owner/project/actions/runs/77'},
      {id:78,name:'Verify Build',status:'in_progress',conclusion:null,head_branch:'feature',
       updated_at:'2026-09-20T01:31:00Z',html_url:'https://github.com/owner/project/actions/runs/78'}
    ]});
  }
  if(address.pathname==='/repos/owner/project/pulls'){
    return Response.json([{number:12,title:'Improve source',draft:false,head:{ref:'fix'},base:{ref:'main'},
      html_url:'https://github.com/owner/project/pull/12'}]);
  }
  throw new Error('Unexpected GitHub status endpoint '+url);
};
try{
  assert.equal(await fetchGitHubRunContext({enabled:false,repo:'owner/project'},'','Check CI'),'');
  assert.equal(await fetchGitHubRunContext({enabled:true,repo:'owner/project'},'','Hello'),'');
  assert.equal(calls.length,0,'unrelated chat must not trigger GitHub status requests');
  const ci=await fetchGitHubRunContext({enabled:true,repo:'owner/project'},'','Check CI');
  assert.match(ci,/Actually fetched recent GitHub Actions runs/);
  assert.match(ci,/"id":77/);
  assert.match(ci,/"conclusion":"success"/);
  assert.match(ci,/"conclusion":null/);
  assert.match(ci,/user must explicitly approve/);
  assert.equal(calls.filter(x=>x.path.includes('/pulls')).length,0,'CI-only messages should skip PR request');
  const prs=await fetchGitHubRunContext({enabled:true,repo:'owner/project'},'','Review PRs');
  assert.match(prs,/Actually fetched open pull requests/);
  assert.match(prs,/"number":12/);
  assert(calls.every(x=>x.method==='GET'),'model status lookup must remain read-only');
  assert(calls.every(x=>!x.auth),'public repo status lookup must not require a token');
}finally{globalThis.fetch=original;}

const chat=fs.readFileSync('api/chat.js','utf8');
assert(chat.includes("fetchGitHubRunContext(body.plugins.github,body._githubAccessToken||'',message)"));
assert(chat.includes("githubExecutionContext||''"),'status must reach every provider-neutral prompt');
assert(chat.includes('The user can explicitly approve a GitHub Actions test workflow with /run-tests'));
console.log('PASS: model-independent read-only GitHub CI/PR status with exact run conclusions');
