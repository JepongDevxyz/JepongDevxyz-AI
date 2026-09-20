import assert from 'node:assert/strict';
import fs from 'node:fs';
import handler from '../api/plugin-batch-proposals.js';
import {sealSession} from '../api/_github_oauth.js';

process.env.GITHUB_SESSION_SECRET='reviewed-batch-secret-0123456789abcdefghijklmnopqrstuvwxyz';
const access='gho_mock_batch_token';
const cookie='jdgh_session='+encodeURIComponent(await sealSession({token:access,login:'tester'}));
const headers={'Content-Type':'application/json',Origin:'https://example.test',Cookie:cookie};
const baseSha='a'.repeat(40),treeSha='b'.repeat(40),newTreeSha='c'.repeat(40),newCommitSha='d'.repeat(40);
const oldFiles={
  'src/app.js':{sha:'e'.repeat(40),text:'export const version = 1;\n'},
  'README.md':{sha:'f'.repeat(40),text:'# old\n'}
};
const changes=[
  {path:'src/app.js',content:'export const version = 2;\n'},
  {path:'README.md',content:'# updated\n'}
];
let currentBase=baseSha,originalSha=oldFiles['src/app.js'].sha;
let treeCount=0,commitCount=0,refCount=0,prCount=0,deny=false;
const requests=[],savedFetch=globalThis.fetch;
globalThis.fetch=async(url,options={})=>{
  const path=new URL(url).pathname,method=options.method||'GET';
  assert.equal(options.headers.Authorization,'Bearer '+access,'token must remain server-side');
  requests.push({path,method});
  if(deny)return Response.json({message:'Forbidden'},{status:403});
  if(path==='/repos/owner/project'&&method==='GET')
    return Response.json({default_branch:'main',permissions:{push:true}});
  if(path==='/repos/owner/project/branches/main'&&method==='GET')
    return Response.json({commit:{sha:currentBase}});
  if(path.startsWith('/repos/owner/project/contents/')&&method==='GET'){
    const name=path.slice('/repos/owner/project/contents/'.length);
    const old=oldFiles[name];
    if(!old)return Response.json({message:'not found'},{status:404});
    return Response.json({type:'file',size:old.text.length,sha:name==='src/app.js'?originalSha:old.sha,
      encoding:'base64',content:Buffer.from(old.text).toString('base64')});
  }
  if(path==='/repos/owner/project/git/commits/'+baseSha&&method==='GET')
    return Response.json({sha:baseSha,tree:{sha:treeSha}});
  if(path==='/repos/owner/project/git/trees'&&method==='POST'){
    treeCount++;const body=JSON.parse(options.body);
    assert.equal(body.base_tree,treeSha);
    assert.deepEqual(body.tree.map(x=>({path:x.path,content:x.content})),changes);
    assert(body.tree.every(x=>x.mode==='100644'&&x.type==='blob'));
    return Response.json({sha:newTreeSha},{status:201});
  }
  if(path==='/repos/owner/project/git/commits'&&method==='POST'){
    commitCount++;const body=JSON.parse(options.body);
    assert.deepEqual(body.parents,[baseSha]);assert.equal(body.tree,newTreeSha);
    return Response.json({sha:newCommitSha},{status:201});
  }
  if(path==='/repos/owner/project/git/refs'&&method==='POST'){
    refCount++;const body=JSON.parse(options.body);
    assert(body.ref.startsWith('refs/heads/jdai/reviewed-'));
    assert.equal(body.sha,newCommitSha);
    return Response.json({ref:body.ref},{status:201});
  }
  if(path==='/repos/owner/project/pulls'&&method==='POST'){
    prCount++;const body=JSON.parse(options.body);
    assert.equal(body.base,'main');assert(body.head.startsWith('jdai/reviewed-'));
    return Response.json({number:25,title:body.title,html_url:'https://github.com/owner/project/pull/25'},{status:201});
  }
  throw new Error('Unexpected GitHub route '+method+' '+path);
};
async function post(action,extra={},head=headers){
  const response=await handler(new Request('https://example.test/api/plugin-batch-proposals',{
    method:'POST',headers:head,body:JSON.stringify({repo:'owner/project',action,files:changes,...extra})
  }));
  return {status:response.status,data:await response.json()};
}
try{
  assert.equal((await post('propose',{confirm:true})).status,403,'approval must be required');
  assert.equal((await post('preview',{files:[{path:'.github/workflows/x.yml',content:'x'}]})).status,400);
  assert.equal((await post('preview',{files:[{path:'.env',content:'x'}]})).status,400);
  assert.equal((await post('preview',{files:[changes[0],changes[0]]})).status,400);
  assert.equal((await post('preview',{files:Array.from({length:9},(_,i)=>({path:'src/file'+i+'.js',content:'x'}))})).status,400);
  assert.equal((await post('preview',{}, {...headers,Origin:'https://other.test'})).status,403);
  assert.equal((await post('preview',{}, {...headers,Cookie:''})).status,401);
  assert.equal(treeCount,0,'preview must be read-only');
  const preview=await post('preview');
  assert.equal(preview.status,200,JSON.stringify(preview.data));
  assert.equal(preview.data.files.length,2);
  assert.equal(preview.data.files[0].before,'export const version = 1;\n');
  assert.equal(preview.data.files[0].after,'export const version = 2;\n');
  assert(preview.data.approval.length>60);
  assert.equal((await post('propose',{confirm:true,approval:preview.data.approval,
    files:[{path:'src/app.js',content:'hijacked'},changes[1]]})).status,403,
    'changing any file after preview must invalidate signed authorization');
  currentBase='0'.repeat(40);
  assert.equal((await post('propose',{confirm:true,approval:preview.data.approval})).status,403,
    'moving default branch invalidates approval');
  currentBase=baseSha;
  originalSha='1'.repeat(40);
  assert.equal((await post('propose',{confirm:true,approval:preview.data.approval})).status,403,
    'changing existing source invalidates approval');
  originalSha=oldFiles['src/app.js'].sha;
  const done=await post('propose',{confirm:true,approval:preview.data.approval});
  assert.equal(done.status,200,JSON.stringify(done.data));
  assert.equal(done.data.created,true);
  assert.equal(done.data.changedFiles.length,2);
  assert.equal(done.data.commitSha,newCommitSha);
  assert.equal(done.data.pullRequest.url,'https://github.com/owner/project/pull/25');
  assert.equal(treeCount,1);assert.equal(commitCount,1);assert.equal(refCount,1);assert.equal(prCount,1);
  assert(!JSON.stringify(done.data).includes(access),'OAuth token must not be exposed to client');
  deny=true;assert.equal((await post('preview')).status,403);
  assert(requests.every(r=>r.method!=='DELETE'),'tool must not perform destructive repository operations');
}finally{globalThis.fetch=savedFetch;}

const js=fs.readFileSync('plugins.js','utf8');
const panel=JSON.parse(js.split('\n')[0].replace(/^const PANEL_HTML=/,'').replace(/;$/,''));
for(const id of ['jdplugBatchAdd','jdplugBatchQueue','jdplugBatchPreview','jdplugBatchCreate',
  'jdplugBatchDiffs','jdplugBatchApprove','jdplugBatchConfirm'])
  assert(panel.includes('id="'+id+'"'),'missing batch approval UI '+id);
assert(js.includes("await batchApi('preview',{files})"));
assert(js.includes("await batchApi('propose',{files:approved.files,approval:approved.approval,confirm:true})"));
console.log('PASS: multi-file atomic Git commit, signed previews, stale-source protection, explicit authorization and batch UI');
