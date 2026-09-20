import assert from 'node:assert/strict';
import fs from 'node:fs';
import proposalHandler from '../api/plugin-proposals.js';
import {sealSession} from '../api/_github_oauth.js';

process.env.GITHUB_SESSION_SECRET='proposal-test-0123456789abcdefghijklmnopqrstuvwxyz';
const session=await sealSession({token:'gho_proposal_test_token',login:'tester',createdAt:Date.now()});
const baseSha='0123456789abcdef0123456789abcdef01234567';
const initialSha='abcdef0123456789abcdef0123456789abcdef01';
const requests=[];
let fileSha=initialSha,allowPush=true,pullCount=0,branchCount=0,putCount=0;
const realFetch=globalThis.fetch;
globalThis.fetch=async(url,options={})=>{
  const address=new URL(url);
  const path=address.pathname;
  const method=options.method||'GET';
  assert.equal(options.headers.Authorization,'Bearer gho_proposal_test_token');
  requests.push({path,method});
  if(path==='/repos/owner/project'&&method==='GET')
    return Response.json({default_branch:'main',permissions:{push:allowPush}});
  if(path==='/repos/owner/project/branches/main')
    return Response.json({name:'main',commit:{sha:baseSha}});
  if(path==='/repos/owner/project/contents/src/app.js'&&method==='GET')
    return Response.json({type:'file',path:'src/app.js',sha:fileSha,size:21,encoding:'base64',
      content:Buffer.from('export const v=1;\n').toString('base64')});
  if(path==='/repos/owner/project/git/refs'&&method==='POST'){
    branchCount++;const body=JSON.parse(options.body);
    assert(body.ref.startsWith('refs/heads/jdai/proposed-'));
    assert.equal(body.sha,baseSha);
    return Response.json({ref:body.ref,object:{sha:baseSha}},{status:201});
  }
  if(path==='/repos/owner/project/contents/src/app.js'&&method==='PUT'){
    putCount++;const body=JSON.parse(options.body);
    assert.equal(body.sha,initialSha);
    assert(body.branch.startsWith('jdai/proposed-'));
    assert.equal(Buffer.from(body.content,'base64').toString('utf8'),'export const v=2;\n');
    return Response.json({content:{path:'src/app.js'}},{status:201});
  }
  if(path==='/repos/owner/project/pulls'&&method==='POST'){
    pullCount++;const body=JSON.parse(options.body);
    assert.equal(body.base,'main');
    assert(body.head.startsWith('jdai/proposed-'));
    return Response.json({number:42,title:body.title,html_url:'https://github.com/owner/project/pull/42'},{status:201});
  }
  throw new Error('Unexpected GitHub call: '+method+' '+path);
};
const validHeaders={'Content-Type':'application/json',Origin:'https://example.test',Cookie:'jdgh_session='+encodeURIComponent(session)};
async function request(action,extra={},headers=validHeaders){
  const response=await proposalHandler(new Request('https://example.test/api/plugin-proposals',{
    method:'POST',headers,body:JSON.stringify({action,repo:'owner/project',path:'src/app.js',
      content:'export const v=2;\n',...extra})
  }));
  return {status:response.status,data:await response.json()};
}
try{
  assert.equal((await request('propose',{confirm:true})).status,403,'cannot write without preview proof');
  assert.equal(branchCount,0);
  assert.equal((await request('preview',{path:'.github/workflows/deploy.yml'})).status,400);
  assert.equal((await request('preview',{path:'.env'})).status,400);
  assert.equal((await request('preview',{content:'export const v=1;\n'})).status,400,'unchanged source cannot create PR');
  assert.equal((await request('preview',{}, {...validHeaders,Origin:'https://attacker.test'})).status,403);
  assert.equal((await request('preview',{}, {...validHeaders,Cookie:''})).status,401);
  allowPush=false;
  assert.equal((await request('preview')).status,403);
  allowPush=true;
  const preview=await request('preview');
  assert.equal(preview.status,200,JSON.stringify(preview.data));
  assert.equal(preview.data.originalSha,initialSha);
  assert.equal(preview.data.baseSha,baseSha);
  assert.equal(preview.data.preview.before,'export const v=1;\n');
  assert.equal(preview.data.preview.after,'export const v=2;\n');
  assert(preview.data.approval.length>50);
  assert(!JSON.stringify(preview.data).includes('gho_proposal_test_token'));
  assert.equal((await request('propose',{confirm:true,approval:preview.data.approval,content:'export const v=3;\n'})).status,403,
    'previewed code cannot be replaced before commit');
  assert.equal(branchCount,0);
  fileSha='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  assert.equal((await request('propose',{confirm:true,approval:preview.data.approval})).status,403,
    'stale source cannot be committed after original changed');
  fileSha=initialSha;
  const result=await request('propose',{confirm:true,approval:preview.data.approval});
  assert.equal(result.status,200,JSON.stringify(result.data));
  assert.equal(result.data.created,true);
  assert.equal(result.data.pullRequest.number,42);
  assert.equal(result.data.pullRequest.url,'https://github.com/owner/project/pull/42');
  assert.equal(branchCount,1);assert.equal(putCount,1);assert.equal(pullCount,1);
  assert.equal(requests.some(x=>x.path==='/repos/owner/project/contents/src/app.js'&&x.method==='PUT'),true);
  assert(!JSON.stringify(result.data).includes('gho_proposal_test_token'));
}finally{globalThis.fetch=realFetch;}

const ui=fs.readFileSync('plugins.js','utf8'),index=fs.readFileSync('index.html','utf8');
const panel=JSON.parse(ui.split('\n')[0].replace(/^const PANEL_HTML=/,'').replace(/;$/,''));
for(const id of ['jdplugProposalPanel','jdplugChangePath','jdplugChangeSource','jdplugPreviewChange',
  'jdplugBeforeSource','jdplugAfterSource','jdplugSubmitChange','jdplugProposalConfirm','jdplugApproveProposal'])
  assert(panel.includes('id="'+id+'"'),'missing real proposal UI '+id);
assert(ui.includes('stageChange(code)'));
assert(ui.includes("await proposalApi('preview',{path,content})"));
assert(ui.includes("await proposalApi('propose',{path:approved.path,content:approved.content,approval:approved.approval,confirm:true})"));
assert(index.includes('onclick="stageCodeSnippetFromButton(this)"'));
assert(index.includes('window.JDPlugins.stageChange(item.code)'));
console.log('PASS: signed source preview, explicit user approval, isolated branch, PR, and cross-model code staging');
