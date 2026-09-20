import {getGitHubSession,githubApi,json} from './_github_oauth.js';
import {resolveGitHubAccess} from './_github_app.js';
import {parseGitHubTarget} from './plugins.js';
export const config={runtime:'edge'};

const MAX_BODY=20000;
const MAX_NOTE=12000;
function fail(message,status=400){const e=new Error(message);e.status=status;throw e;}
function positiveNumber(value,label){
  const n=Number(value);
  if(!Number.isSafeInteger(n)||n<1||String(value).length>12)fail('Choose a valid '+label+'.');
  return n;
}
function limited(value,label,limit=MAX_NOTE,{required=true}={}){
  if(typeof value!=='string'||(required&&!value.trim())||value.length>limit)fail(label+' must be text up to '+limit+' characters.');
  return value.trim();
}
function sameOrigin(request){
  const origin=request.headers.get('origin');
  return (!origin||origin===new URL(request.url).origin)&&request.headers.get('sec-fetch-site')!=='cross-site';
}
function issueShape(x){return {number:x.number,title:String(x.title||'').slice(0,350),state:x.state,
  body:String(x.body||'').slice(0,18000),comments:x.comments||0,url:x.html_url,
  author:String(x.user?.login||''),isPullRequest:!!x.pull_request,updatedAt:x.updated_at};}
function prShape(x){return {number:x.number,title:String(x.title||'').slice(0,350),state:x.state,
  body:String(x.body||'').slice(0,18000),draft:!!x.draft,
  head:{ref:x.head?.ref,sha:x.head?.sha},base:{ref:x.base?.ref,sha:x.base?.sha},
  url:x.html_url,author:String(x.user?.login||''),mergeable:x.mergeable};}
async function call(path,token,{method='GET',body,signal}={}){
  const response=await githubApi(path,token,{method,body,signal});
  const data=response.status===204?null:await response.json().catch(()=>null);
  if(!response.ok){
    if(response.status===401)fail('GitHub authorization expired. Reconnect your account.',401);
    if(response.status===403)fail('GitHub denied this operation. Check repository selection and granted app permissions.',403);
    if(response.status===404)fail('Repository, issue, or pull request not found or not accessible.',404);
    if(response.status===409||response.status===422)fail('GitHub rejected this operation; check permissions, issue state, and review restrictions.',409);
    if(response.status===429)fail('GitHub rate limit reached; try again later.',429);
    fail('GitHub request failed ('+response.status+').',502);
  }
  return data;
}
export default async function handler(request){
  if(request.method==='HEAD')return new Response(null,{status:200});
  if(request.method!=='POST')return json({error:'Method not allowed.'},405);
  try{
    if(!sameOrigin(request))fail('Cross-site plugin actions are not allowed.',403);
    if(!String(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))
      fail('Expected JSON.',415);
    const raw=await request.text();
    if(raw.length>MAX_BODY)fail('Request too large.',413);
    let body;try{body=JSON.parse(raw);}catch(_){fail('Invalid JSON.');}
    if(!body||typeof body!=='object'||Array.isArray(body))fail('Invalid request.');
    const session=await getGitHubSession(request);
    if(!session?.token)fail('Connect your GitHub account to use repository tools.',401);
    const repo=parseGitHubTarget(body.repo),action=String(body.action||'');
    const base='/repos/'+repo,signal=request.signal;
    const permissions={
      issues:['listIssues','issue','createIssue','commentIssue','updateIssue'],
      pull_requests:['listPR','pr','prFiles','reviewPR']
    };
    let needed={metadata:'read'};
    if(permissions.issues.includes(action))needed={issues:['createIssue','commentIssue','updateIssue'].includes(action)?'write':'read'};
    else if(permissions.pull_requests.includes(action))needed={pull_requests:action==='reviewPR'?'write':'read'};
    else if(action==='checks')needed={checks:'read'};
    else fail('Unsupported repository tool action.');
    const access=await resolveGitHubAccess(request,{repository:repo,permissions:needed});
    const token=access.token;
    const write=['createIssue','commentIssue','updateIssue','reviewPR'].includes(action);
    if(write&&body.confirm!==true)fail('Review and confirm the requested GitHub change first.',403);
    if(action==='listIssues'){
      const items=await call(base+'/issues?state='+ (body.state==='closed'?'closed':'open')+'&per_page=30',token,{signal});
      return json({repo,issues:(Array.isArray(items)?items:[]).filter(x=>!x.pull_request).map(issueShape)});
    }
    if(action==='issue'){
      const id=positiveNumber(body.number,'issue');
      return json({repo,issue:issueShape(await call(base+'/issues/'+id,token,{signal}))});
    }
    if(action==='createIssue'){
      const title=limited(body.title,'Issue title',250);
      const description=limited(body.description||'','Issue description',10000,{required:false});
      const issue=await call(base+'/issues',token,{method:'POST',body:{title,body:description},signal});
      return json({created:true,repo,issue:issueShape(issue)},201);
    }
    if(action==='commentIssue'){
      const id=positiveNumber(body.number,'issue');
      const note=limited(body.comment,'Comment');
      const result=await call(base+'/issues/'+id+'/comments',token,{method:'POST',body:{body:note},signal});
      return json({created:true,repo,number:id,comment:{id:result.id,url:result.html_url,body:result.body}},201);
    }
    if(action==='updateIssue'){
      const id=positiveNumber(body.number,'issue');
      if(body.state!=='open'&&body.state!=='closed')fail('Choose open or closed issue state.');
      const issue=await call(base+'/issues/'+id,token,{method:'PATCH',body:{state:body.state},signal});
      return json({updated:true,repo,issue:issueShape(issue)});
    }
    if(action==='listPR'){
      const prs=await call(base+'/pulls?state='+ (body.state==='closed'?'closed':'open')+'&per_page=30',token,{signal});
      return json({repo,pullRequests:(Array.isArray(prs)?prs:[]).map(prShape)});
    }
    if(action==='pr'||action==='prFiles'){
      const id=positiveNumber(body.number,'pull request');
      const pr=prShape(await call(base+'/pulls/'+id,token,{signal}));
      if(action==='pr')return json({repo,pullRequest:pr});
      const files=await call(base+'/pulls/'+id+'/files?per_page=100',token,{signal});
      return json({repo,pullRequest:pr,files:(Array.isArray(files)?files:[]).slice(0,100).map(x=>({
        filename:x.filename,status:x.status,additions:x.additions,deletions:x.deletions,
        patch:typeof x.patch==='string'?x.patch.slice(0,5000):null,sha:x.sha
      }))});
    }
    if(action==='reviewPR'){
      const id=positiveNumber(body.number,'pull request');
      const event=String(body.event||'COMMENT');
      if(!['COMMENT','APPROVE','REQUEST_CHANGES'].includes(event))fail('Invalid review action.');
      const note=limited(body.comment,'Review comment');
      const pr=await call(base+'/pulls/'+id,token,{signal});
      if(pr.state!=='open'||pr.draft&&event==='APPROVE')fail('This pull request is not available for this review action.',409);
      const review=await call(base+'/pulls/'+id+'/reviews',token,{
        method:'POST',body:{event,body:note},signal
      });
      return json({created:true,repo,number:id,review:{id:review.id,state:review.state,
        url:review.html_url,body:review.body}},201);
    }
    if(action==='checks'){
      const sha=String(body.sha||'').trim();
      if(!/^[a-f0-9]{40}$/i.test(sha))fail('Choose a valid commit SHA.');
      const data=await call(base+'/commits/'+sha+'/check-runs?per_page=60',token,{signal});
      return json({repo,sha,checks:(data?.check_runs||[]).slice(0,60).map(x=>({
        id:x.id,name:x.name,status:x.status,conclusion:x.conclusion,
        url:x.html_url,startedAt:x.started_at,completedAt:x.completed_at
      }))});
    }
  }catch(error){return json({error:error?.status?error.message:'Repository tool temporarily unavailable.'},error?.status||502);}
}
