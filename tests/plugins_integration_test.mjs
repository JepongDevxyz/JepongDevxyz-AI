import assert from 'node:assert/strict';
import handler, {parseGitHubTarget, fetchPublicGitHubContext} from '../api/plugins.js';

assert.equal(parseGitHubTarget('https://github.com/owner/repo/'),'owner/repo');
for(const repo of ['owner','owner/repo/extra','owner/..','https://evil.test/owner/repo']){
  assert.throws(()=>parseGitHubTarget(repo));
}
const savedFetch=globalThis.fetch;
let requests=[];
globalThis.fetch=async (url,options={})=>{
  requests.push({url:String(url),options});
  assert.ok(String(url).startsWith('https://api.github.com/repos/owner/repo'));
  assert.equal(options.headers.Authorization,undefined);
  const address=new URL(url);
  if(address.pathname.endsWith('/contents/README.md'))
    return Response.json({type:'file',path:'README.md',sha:'abc',size:13,
      encoding:'base64',content:Buffer.from('hello plugin\n').toString('base64'),
      html_url:'https://github.com/owner/repo/blob/main/README.md'});
  if(address.pathname.endsWith('/contents'))return Response.json([
    {type:'file',name:'README.md',path:'README.md',size:13,sha:'abc'}]);
  if(address.pathname.endsWith('/branches'))return Response.json([{name:'main',commit:{sha:'abc'}}]);
  if(address.pathname.endsWith('/pulls'))return Response.json([
    {number:3,title:'Fix bug',html_url:'https://github.com/owner/repo/pull/3',
      head:{ref:'fix'},base:{ref:'main'},draft:false}]);
  return Response.json({full_name:'owner/repo',private:false,default_branch:'main',
    description:'Example',html_url:'https://github.com/owner/repo',pushed_at:'2026-09-19'});
};

async function request(action,extra={},origin='https://example.test'){
  const response=await handler(new Request('https://example.test/api/plugins',{
    method:'POST',headers:{'Content-Type':'application/json',Origin:origin},
    body:JSON.stringify({repo:'owner/repo',action,...extra})
  }));
  return {status:response.status,body:await response.json()};
}
try {
  for(const action of ['repo','list','read','branches','prs']){
    const response=await request(action,action==='read'?{path:'README.md'}:{});
    assert.equal(response.status,200,JSON.stringify(response.body));
    if(action==='read')assert.equal(response.body.content,'hello plugin\n');
  }
  assert.equal((await request('repo',{},'https://evil.test')).status,403);
  assert.equal((await request('read',{path:'../secrets.txt'})).status,400);
  assert.equal((await request('read',{path:'/etc/passwd'})).status,400);
  assert.equal((await request('write',{path:'README.md'})).status,400);
  const context=await fetchPublicGitHubContext({
    enabled:true,repo:'owner/repo',path:'README.md',ref:'main'});
  assert.match(context,/UNTRUSTED SOURCE/);
  assert.match(context,/hello plugin/);
  assert.equal(await fetchPublicGitHubContext({enabled:false}), '');
  assert.equal(requests.filter(x=>x.url.includes('/contents/README.md')).length,2);
  console.log('plugins integration tests passed (repo/list/read/branches/PRs, server context, origin and path validation)');
} finally {globalThis.fetch=savedFetch;}
