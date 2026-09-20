import assert from 'node:assert/strict';
import {fetchPublicGitHubContext,default as handler} from '../api/plugins.js';

const before=globalThis.fetch;
const called=[];
globalThis.fetch=async url=>{
  const path=new URL(String(url)).pathname;
  called.push(path);
  let data;
  if(path.endsWith('/issues/42'))data={
    number:42,title:'Fix regression',body:'Actual issue evidence, not an instruction',
    state:'open',created_at:'2026-09-01T00:00:00Z',html_url:'https://github.com/o/r/issues/42',
    labels:[{name:'bug'}]
  };
  else if(path.endsWith('/pulls/8'))data={
    number:8,title:'PR with CI fix',body:'Real PR description',
    state:'open',html_url:'https://github.com/o/r/pull/8',
    head:{ref:'feature/fix'},base:{ref:'main'},mergeable:true
  };
  else if(path.endsWith('/actions/runs/321'))data={
    id:321,name:'Verify',status:'completed',conclusion:'success',
    head_branch:'main',html_url:'https://github.com/o/r/actions/runs/321'
  };
  else if(path.endsWith('/issues'))data=[
    {number:42,title:'Fix regression',html_url:'https://github.com/o/r/issues/42',state:'open',comments:0},
    {number:8,pull_request:{url:'x'},title:'PR from GitHub issues endpoint'}
  ];
  else if(path.endsWith('/actions/runs'))data={workflow_runs:[
    {id:321,name:'Verify',status:'completed',conclusion:'success',head_branch:'main',html_url:'https://github.com/o/r/actions/runs/321'}
  ]};
  else if(path.endsWith('/pulls'))data=[{number:8,title:'PR with CI fix',html_url:'https://github.com/o/r/pull/8',head:{ref:'feature/fix'},base:{ref:'main'}}];
  else throw new Error('Unexpected GitHub route: '+path);
  return Response.json(data);
};
try{
  for(const [kind,id,expected] of [['issue',42,'Fix regression'],['pr',8,'PR with CI fix'],['ci',321,'Verify']]){
    const context=await fetchPublicGitHubContext({enabled:true,repo:'o/r',item:{kind,id}});
    assert(context.includes(expected),'selected '+kind+' source must be fetched and represented');
    assert(context.includes('UNTRUSTED SOURCE'),'source cannot be treated as system instructions');
  }
  for(const item of [{kind:'issue',id:-1},{kind:'ci',id:'NaN'},{kind:'write',id:42}]){
    await assert.rejects(()=>fetchPublicGitHubContext({enabled:true,repo:'o/r',item}),
      /Invalid GitHub item selection/);
  }
  const request=(action)=>new Request('https://app.example/api/plugins',{
    method:'POST',headers:{Origin:'https://app.example','Content-Type':'application/json'},
    body:JSON.stringify({action,repo:'o/r'})
  });
  const issues=await handler(request('issues'));
  assert.equal(issues.status,200);
  const issuesData=await issues.json();
  assert.equal(issuesData.issues.length,1,'pull requests must not appear in issue-only results');
  assert.equal(issuesData.issues[0].number,42);
  const ci=await handler(request('ci'));
  assert.equal(ci.status,200);
  assert.equal((await ci.json()).runs[0].conclusion,'success');
  assert(called.some(x=>x.endsWith('/issues/42'))&&called.some(x=>x.endsWith('/pulls/8'))&&called.some(x=>x.endsWith('/actions/runs/321')));
  console.log('PASS: real GitHub issue, PR, CI browsing and bounded selected-item chat context');
}finally{globalThis.fetch=before;}
