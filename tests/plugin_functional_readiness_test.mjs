import assert from 'node:assert/strict';
import fs from 'node:fs';
import pluginHandler,{fetchPublicGitHubContext} from '../api/plugins.js';

// The marketplace must distinguish installed UI from a ready GitHub connection.
const saved={
  id:process.env.GITHUB_OAUTH_CLIENT_ID,
  secret:process.env.GITHUB_OAUTH_CLIENT_SECRET,
  session:process.env.GITHUB_SESSION_SECRET
};
const request=()=>new Request('https://example.test/api/plugins',{method:'GET'});
try{
  delete process.env.GITHUB_OAUTH_CLIENT_ID;
  delete process.env.GITHUB_OAUTH_CLIENT_SECRET;
  delete process.env.GITHUB_SESSION_SECRET;
  let response=await pluginHandler(request());
  assert.equal(response.status,200);
  let data=await response.json();
  assert.equal(data.github.publicRepositories,true);
  assert.equal(data.github.accountConnectionConfigured,false);
  process.env.GITHUB_OAUTH_CLIENT_ID='Iv1.test';
  process.env.GITHUB_OAUTH_CLIENT_SECRET='test-secret';
  process.env.GITHUB_SESSION_SECRET='0123456789abcdefghijklmnopqrstuv';
  response=await pluginHandler(request());
  assert.equal((await response.json()).github.accountConnectionConfigured,true);
}finally{
  for(const [key,value] of Object.entries({
    GITHUB_OAUTH_CLIENT_ID:saved.id,
    GITHUB_OAUTH_CLIENT_SECRET:saved.secret,
    GITHUB_SESSION_SECRET:saved.session
  })){if(value===undefined)delete process.env[key];else process.env[key]=value;}
}

const originalFetch=globalThis.fetch;
const calls=[];
globalThis.fetch=async (url,options={})=>{
  const path=new URL(url).pathname;
  calls.push({path,auth:options.headers?.Authorization});
  if(path==='/repos/owner/project')return Response.json({
    full_name:'owner/project',private:false,default_branch:'main',description:'Project',
    html_url:'https://github.com/owner/project',pushed_at:'2026-09-20'
  });
  if(path==='/repos/owner/project/contents')return Response.json([
    {type:'file',name:'README.md',path:'README.md',size:30,sha:'readme'},
    {type:'file',name:'package.json',path:'package.json',size:48,sha:'package'},
    {type:'dir',name:'api',path:'api',size:0,sha:'api'}
  ]);
  if(path==='/repos/owner/project/contents/README.md')return Response.json({
    type:'file',path:'README.md',size:15,sha:'readme',encoding:'base64',
    content:Buffer.from('# Real project\n').toString('base64'),
    html_url:'https://github.com/owner/project/blob/main/README.md'
  });
  if(path==='/repos/owner/project/contents/package.json')return Response.json({
    type:'file',path:'package.json',size:17,sha:'package',encoding:'base64',
    content:Buffer.from('{"name":"project"}').toString('base64'),
    html_url:'https://github.com/owner/project/blob/main/package.json'
  });
  throw new Error('Unexpected GitHub call '+url);
};
try{
  const context=await fetchPublicGitHubContext({enabled:true,repo:'owner/project',path:'',ref:'main'},undefined,'','Explain this repository');
  assert.match(context,/UNTRUSTED SOURCE/);
  assert.match(context,/Root entries: README.md, package.json, api\//);
  assert.match(context,/Actually fetched file: README.md/);
  assert.match(context,/# Real project/);
  assert.match(context,/"name":"project"/);
  assert.equal(calls.length,4,'bounded repository context should fetch metadata, tree and two files');
  assert.equal(calls.some(x=>x.auth),false,'public repository browsing must not require a token');
  assert.equal(await fetchPublicGitHubContext({enabled:false,repo:'owner/project'}),'');
}finally{globalThis.fetch=originalFetch;}

const ui=fs.readFileSync('plugins.js','utf8');
assert(ui.includes('async function checkGithubReadiness()'));
assert(ui.includes('if(ready===false)'));
assert(ui.includes("if(!response.ok)throw new Error('GitHub disconnect failed. Try again.')"));
const panel=JSON.parse(ui.split('\n')[0].replace(/^const PANEL_HTML=/,'').replace(/;$/,''));
assert(panel.includes('id="jdplugConnectionReady"'));
console.log('PASS: GitHub OAuth readiness, public fallback, repository-source context and verified disconnect');
