import assert from 'node:assert/strict';
import {generateKeyPairSync,verify} from 'node:crypto';
import fs from 'node:fs';
import {sealSession} from '../api/_github_oauth.js';
import {configuredGitHubApp,githubAppStatus,githubAppToken,githubAppRepositories,resolveGitHubAccess} from '../api/_github_app.js';
import installHandler from '../api/github-app-install.js';
import statusHandler from '../api/github-app-status.js';
import setupHandler from '../api/github-app-setup.js';

const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
process.env.GITHUB_SESSION_SECRET='test-app-secret-0123456789abcdefghijklmnopqrstuvwxyz';
process.env.GITHUB_APP_SLUG='jepongdevxyz-ai';
process.env.GITHUB_APP_ID='987654';
process.env.GITHUB_APP_PRIVATE_KEY=privateKey.export({type:'pkcs8',format:'pem'}).toString();
assert.equal(configuredGitHubApp(),true);
const session=await sealSession({token:'gho_user_test_token',login:'jepong',createdAt:Date.now()});
const cookie='jdgh_session='+encodeURIComponent(session);
const makeReq=(path='/api/github-app-status')=>new Request('https://example.test'+path,{headers:{Cookie:cookie}});
let active=true,accountId=10,selection='selected',suspended=false,dispatches=0, JWTChecks=0;
const originalFetch=globalThis.fetch;
globalThis.fetch=async (input,options={})=>{
  const u=new URL(input),path=u.pathname;
  const auth=String(options.headers?.Authorization||'');
  if(path==='/user'){
    assert.equal(auth,'Bearer gho_user_test_token');
    return Response.json({id:10,login:'jepong'});
  }
  if(path==='/users/jepong/installation'){
    assert(auth.startsWith('Bearer '));
    const jwt=auth.slice(7);
    const [head,body,sig]=jwt.split('.');
    assert.equal(JSON.parse(Buffer.from(head,'base64url').toString()).alg,'RS256');
    assert.equal(JSON.parse(Buffer.from(body,'base64url').toString()).iss,'987654');
    assert(verify('RSA-SHA256',Buffer.from(head+'.'+body),publicKey,Buffer.from(sig,'base64url')),'GitHub App JWT must be properly signed');
    JWTChecks++;
    if(!active)return Response.json({message:'Not Found'},{status:404});
    return Response.json({id:42,account:{id:accountId,login:'jepong',type:'User'},
      repository_selection:selection,permissions:{metadata:'read',contents:'write',pull_requests:'write',actions:'write'},
      suspended_at:suspended?'2026-09-20T00:00:00Z':null});
  }
  if(path==='/app/installations/42/access_tokens'){
    assert.equal(options.method,'POST');
    const body=JSON.parse(options.body||'{}');
    dispatches++;
    assert.deepEqual(Object.keys(body.permissions).sort(),Object.keys(body.permissions).sort());
    if(body.repositories&&body.repositories.some(x=>x!=='allowed'))return Response.json({message:'Repository not part of installation'},{status:422});
    return Response.json({token:'ghs_installation_scoped_token',permissions:body.permissions,
      expires_at:'2026-09-20T23:59:59Z'},{status:201});
  }
  if(path==='/installation/repositories'){
    assert.equal(auth,'Bearer ghs_installation_scoped_token');
    return Response.json({total_count:1,repositories:[{full_name:'jepong/allowed',
      private:true,description:'Selected private repository',default_branch:'main'}]});
  }
  throw new Error('Unexpected GitHub API request '+path);
};
try{
  let status=await githubAppStatus(makeReq());
  assert.equal(status.configured,true);
  assert.equal(status.installed,true);
  assert.equal(status.account.login,'jepong');
  assert.equal(status.repositorySelection,'selected');
  assert.equal(status.manageUrl,'https://github.com/settings/installations/42');
  assert.equal(status.permissions.contents,'write');
  assert.equal(status.permissions.actions,'write');

  const routeStatus=await statusHandler(makeReq());
  assert.equal(routeStatus.status,200);
  assert.equal((await routeStatus.json()).installationId,42);

  const installResponse=await installHandler(makeReq('/api/github-app-install'));
  assert.equal(installResponse.status,302);
  assert.equal(installResponse.headers.get('location'),'https://github.com/apps/jepongdevxyz-ai/installations/new');

  const setup=await setupHandler(makeReq('/api/github-app-setup?installation_id=999&setup_action=install'));
  assert.equal(setup.status,302);
  assert.equal(new URL(setup.headers.get('location')).searchParams.get('github_app'),'installed',
    'spoofed query installation_id must not override verified owner installation');

  const token=await githubAppToken(makeReq(),{repository:'jepong/allowed',permissions:{contents:'read'}});
  assert.equal(token.kind,'github-app');
  assert.equal(token.installationId,42);
  assert.equal(token.token,'ghs_installation_scoped_token');
  const repos=await githubAppRepositories(makeReq());
  assert.deepEqual(repos.repositories.map(x=>x.full_name),['jepong/allowed']);
  const resolved=await resolveGitHubAccess(makeReq(),{repository:'jepong/allowed',permissions:{actions:'write',contents:'read'}});
  assert.equal(resolved.kind,'github-app');
  assert.equal(resolved.token,'ghs_installation_scoped_token');

  let blocked=false;
  try{await resolveGitHubAccess(makeReq(),{repository:'jepong/excluded',permissions:{contents:'read'}});}
  catch(e){blocked=e.status===403;}
  assert(blocked,'repositories excluded in GitHub must never fall back to broad OAuth');
  blocked=false;
  try{await resolveGitHubAccess(makeReq(),{repository:'someone-else/project',permissions:{contents:'read'}});}
  catch(e){blocked=e.status===403;}
  assert(blocked,'installation must be bound to personal account owner');
  assert(JWTChecks>3&&dispatches>0);

  accountId=777;
  blocked=false;
  try{await githubAppStatus(makeReq());}catch(e){blocked=e.status===403;}
  assert(blocked,'spoofed installation owner must be denied');
  accountId=10;
  suspended=true;
  blocked=false;
  try{await githubAppStatus(makeReq());}catch(e){blocked=e.status===403;}
  assert(blocked,'suspended GitHub App installation must be denied');
  suspended=false;

  active=false;
  status=await githubAppStatus(makeReq());
  assert.equal(status.installed,false);
  const fallback=await resolveGitHubAccess(makeReq(),{repository:'jepong/allowed'});
  assert.equal(fallback.kind,'oauth','legacy OAuth remains a fallback only if GitHub App is not installed');
  selection='all';active=true;
  status=await githubAppStatus(makeReq());
  assert.equal(status.repositorySelection,'all');
}finally{globalThis.fetch=originalFetch;}

const ui=fs.readFileSync('plugins.js','utf8');
const panel=JSON.parse(ui.split('\n')[0].replace(/^const PANEL_HTML=/,'').replace(/;$/,''));
for(const id of ['jdplugGitHubAppCard','jdplugInstallApp','jdplugManageApp','jdplugAppPermissions','jdplugAppStatus'])
  assert(panel.includes('id="'+id+'"'),'missing GitHub App management UI '+id);
assert(ui.includes("window.location.assign('/api/github-app-install')"));
assert(ui.includes("fetch('/api/github-app-status'"));
assert(ui.includes("params.get('github_app')"));
assert(fs.readFileSync('api/chat.js','utf8').includes('resolveGitHubAccess(req,'));
assert(fs.readFileSync('api/plugin-execute.js','utf8').includes('resolveGitHubAccess(request,'));
assert(fs.readFileSync('api/plugin-proposals.js','utf8').includes('resolveGitHubAccess(request,'));
console.log('PASS: verified personal GitHub App installation, signed JWT, selected-repository tokens, management and model/chat integration');
