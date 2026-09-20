import assert from 'node:assert/strict';
import handler from '../api/plugin-workspace.js';
import {sealSession} from '../api/_github_oauth.js';
process.env.GITHUB_SESSION_SECRET='workspace-test-secret-0123456789abcdefghijklmnopqrstuvwxyz';
const token='gho_mock_workspace';
const session=await sealSession({token,login:'tester'});
const original=globalThis.fetch;
const requests=[];
let deny=false;
globalThis.fetch=async(url,options={})=>{
  const u=new URL(url);
  const p=u.pathname,method=options.method||'GET';
  assert.equal(options.headers?.Authorization,'Bearer '+token,'GitHub token must stay server-side');
  requests.push({p,method,body:options.body?JSON.parse(options.body):null});
  if(deny)return Response.json({message:'Forbidden'},{status:403});
  if(p==='/repos/owner/project/issues'&&method==='GET')return Response.json([
    {number:2,title:'Bug report',state:'open',body:'Crash',comments:1,user:{login:'tester'},html_url:'https://github.com/owner/project/issues/2'},
    {number:3,title:'PR issue',pull_request:{url:'https://api.github.com/3'}}
  ]);
  if(p==='/repos/owner/project/issues'&&method==='POST')
    return Response.json({number:4,title:options.body?JSON.parse(options.body).title:'',state:'open',body:'Fix it',html_url:'https://github.com/owner/project/issues/4'},{status:201});
  if(p==='/repos/owner/project/issues/2'&&method==='GET')
    return Response.json({number:2,title:'Bug report',state:'open',body:'Crash'});
  if(p==='/repos/owner/project/issues/2/comments'&&method==='POST')
    return Response.json({id:8,html_url:'https://github.com/owner/project/issues/2#issuecomment-8',body:JSON.parse(options.body).body},{status:201});
  if(p==='/repos/owner/project/issues/2'&&method==='PATCH')
    return Response.json({number:2,title:'Bug report',state:JSON.parse(options.body).state});
  if(p==='/repos/owner/project/pulls'&&method==='GET')return Response.json([
    {number:7,title:'Fix import',state:'open',head:{ref:'fix',sha:'a'.repeat(40)},base:{ref:'main',sha:'b'.repeat(40)},html_url:'https://github.com/owner/project/pull/7'}
  ]);
  if(p==='/repos/owner/project/pulls/7'&&method==='GET')
    return Response.json({number:7,title:'Fix import',state:'open',draft:false,head:{sha:'a'.repeat(40)},base:{sha:'b'.repeat(40)}});
  if(p==='/repos/owner/project/pulls/7/files'&&method==='GET')
    return Response.json([{filename:'src/app.js',status:'modified',additions:4,deletions:2,patch:'@@...'}]);
  if(p==='/repos/owner/project/pulls/7/reviews'&&method==='POST')
    return Response.json({id:30,body:JSON.parse(options.body).body,state:'COMMENTED',html_url:'https://github.com/owner/project/pull/7#pullrequestreview-30'},{status:201});
  if(p==='/repos/owner/project/commits/'+('a'.repeat(40))+'/check-runs'&&method==='GET')
    return Response.json({check_runs:[{id:100,name:'CI',status:'completed',conclusion:'success',html_url:'https://github.com/owner/project/actions/runs/100'}]});
  throw new Error('Unexpected GitHub endpoint '+method+' '+p);
};
const baseHeaders={'Content-Type':'application/json',Origin:'https://example.test',Cookie:'jdgh_session='+encodeURIComponent(session)};
async function post(action,extra={},headers=baseHeaders){
  const response=await handler(new Request('https://example.test/api/plugin-workspace',{
    method:'POST',headers,body:JSON.stringify({repo:'owner/project',action,...extra})
  }));
  return {status:response.status,data:await response.json()};
}
try{
  assert.equal((await post('listIssues')).data.issues.length,1,'PRs must not appear in Issues list');
  assert.equal((await post('issue',{number:2})).data.issue.title,'Bug report');
  assert.equal((await post('createIssue',{title:'Fix import',description:'Fix it'})).status,403);
  assert.equal((await post('createIssue',{title:'Fix import',description:'Fix it',confirm:true})).data.issue.number,4);
  assert.equal((await post('commentIssue',{number:2,comment:'Investigating'})).status,403);
  assert.equal((await post('commentIssue',{number:2,comment:'Investigating',confirm:true})).data.comment.id,8);
  assert.equal((await post('updateIssue',{number:2,state:'closed',confirm:true})).data.issue.state,'closed');
  assert.equal((await post('listPR')).data.pullRequests.length,1);
  assert.equal((await post('prFiles',{number:7})).data.files[0].filename,'src/app.js');
  assert.equal((await post('reviewPR',{number:7,event:'COMMENT',comment:'Check null handling'})).status,403);
  assert.equal((await post('reviewPR',{number:7,event:'COMMENT',comment:'Check null handling',confirm:true})).data.review.id,30);
  assert.equal((await post('reviewPR',{number:7,event:'MERGE',comment:'ok',confirm:true})).status,400);
  assert.equal((await post('checks',{sha:'a'.repeat(40)})).data.checks[0].conclusion,'success');
  assert.equal((await post('checks',{sha:'unsafe'})).status,400);
  assert.equal((await post('listIssues',{}, {...baseHeaders,Origin:'https://other.test'})).status,403);
  assert.equal((await post('listIssues',{}, {'Content-Type':'application/json',Origin:'https://example.test'})).status,401);
  deny=true;assert.equal((await post('listIssues')).status,403);
  assert(requests.every(x=>x.method!=='POST'||['/repos/owner/project/issues','/repos/owner/project/issues/2/comments','/repos/owner/project/pulls/7/reviews'].includes(x.p)),'all writes must target specifically approved GitHub operations');
  console.log('PASS: GitHub issues, PR reviews, checks, required confirmation, permissions and origin isolation');
}finally{globalThis.fetch=original;}
