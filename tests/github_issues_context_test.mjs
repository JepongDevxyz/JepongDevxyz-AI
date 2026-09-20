import assert from 'node:assert/strict';
import {fetchGitHubIssuesContext,shouldReadGitHubIssues} from '../api/_plugin_issues_context.js';
import fs from 'node:fs';
assert.equal(shouldReadGitHubIssues('How is the weather?'),false);
assert.equal(shouldReadGitHubIssues('Show current issues'),true);
const original=globalThis.fetch,calls=[];
globalThis.fetch=async(url,options={})=>{
  const path=new URL(url).pathname;
  calls.push({path,method:options.method||'GET',authorization:options.headers?.Authorization});
  if(path==='/repos/owner/project/issues'){
    return Response.json([{number:9,title:'Fix import crash',state:'open',body:'App crashes on import',updated_at:'2026-09-20T03:00:00Z',html_url:'https://github.com/owner/project/issues/9'},
      {number:10,title:'PR issue',pull_request:{url:'https://api.github.com/pr/10'}}]);
  }
  throw new Error('Unexpected call '+url);
};
try{
  assert.equal(await fetchGitHubIssuesContext({enabled:false,repo:'owner/project'},'token','Show issues'),'');
  assert.equal(await fetchGitHubIssuesContext({enabled:true,repo:'owner/project'},'','Show issues'),'');
  assert.equal(calls.length,0);
  const ctx=await fetchGitHubIssuesContext({enabled:true,repo:'owner/project'},'ghs_scoped','Show issues');
  assert.match(ctx,/Actually/iu);
  assert.match(ctx,/Fix import crash/);
  assert.doesNotMatch(ctx,/PR issue/);
  assert.match(ctx,/read-only/);
  assert.equal(calls.length,1);
  assert.equal(calls[0].authorization,'Bearer ghs_scoped');
  assert.equal(calls[0].method,'GET');
}finally{globalThis.fetch=original;}
const api=fs.readFileSync('api/chat.js','utf8');
assert(api.includes("resolveGitHubAccess(req,{repository:body.plugins.github.repo,permissions:{issues:'read'}})"));
assert(api.includes("githubIssuesContext||''"));
assert(api.includes('fetchGitHubIssuesContext(body.plugins.github'));
console.log('PASS: automatic verified GitHub issues context across model-neutral chat pipeline');
