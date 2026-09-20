import {getGitHubSession,githubApi,json} from './_github_oauth.js';
import {parseGitHubTarget} from './plugins.js';

export const config={runtime:'edge'};
const MAX_BODY=3500;
const SAFE_BRANCH=/^(?!\/)(?!.*\.\.)(?!.*\/\/)[A-Za-z0-9_./-]{1,100}$/;
const WORKFLOW_NAME=/\b(test|tests|verify|verification|check|checks|ci|quality|lint)\b/i;

function fail(message,status=400){const error=new Error(message);error.status=status;throw error;}
function requireOrigin(request){
  const origin=request.headers.get('origin');
  const site=request.headers.get('sec-fetch-site');
  if((origin&&origin!==new URL(request.url).origin)||site==='cross-site')fail('Cross-site plugin execution is not allowed.',403);
}
function requireRef(ref){
  if(typeof ref!=='string'||!SAFE_BRANCH.test(ref)||ref.startsWith('.')||ref.endsWith('/')||ref.endsWith('.lock'))fail('Select a valid GitHub branch.',400);
  return ref;
}
async function apiData(path,token,signal,{method='GET',body}={}){
  const response=await githubApi(path,token,{method,body,signal});
  if(response.status===204)return {ok:true,response,data:null};
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    if(response.status===401)fail('GitHub authorization expired. Reconnect your account.',401);
    if(response.status===403)fail('GitHub denied this action. Check repository access and OAuth permissions.',403);
    if(response.status===404)fail('GitHub repository, branch, or workflow not found.',404);
    if(response.status===422)fail('GitHub rejected the workflow/ref. Ensure workflow_dispatch exists on the default branch and select a valid branch.',422);
    fail('GitHub returned HTTP '+response.status+'.',response.status===429?429:502);
  }
  return {ok:true,response,data};
}
async function requireWritableRepo(repo,token,signal){
  const {data}=await apiData('/repos/'+repo,token,signal);
  if(data?.permissions?.push!==true)fail('You do not have write access to this repository.',403);
  return data;
}
async function availableWorkflows(repo,token,signal){
  const {data}=await apiData('/repos/'+repo+'/actions/workflows?per_page=100',token,signal);
  return (Array.isArray(data?.workflows)?data.workflows:[])
    .filter(x=>x.state==='active'&&WORKFLOW_NAME.test(String(x.name||'')+' '+String(x.path||'')))
    .map(x=>({id:x.id,name:String(x.name||'').slice(0,120),path:String(x.path||''),state:x.state,url:x.html_url}))
    .filter(x=>Number.isSafeInteger(x.id)&&x.id>0&&x.path.startsWith('.github/workflows/'));
}
function decodeContents(data){
  if(!data||data.type!=='file'||data.encoding!=='base64'||Number(data.size||0)>250000)fail('Workflow source is unavailable or too large.',415);
  const binary=atob(String(data.content||'').replace(/\s/g,''));
  return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(binary,c=>c.charCodeAt(0)));
}
function supportsManualDispatch(contents){
  // Comments do not count as a workflow_dispatch declaration.
  const clean=String(contents||'').split('\n').map(line=>line.replace(/\s+#.*$/,'')).filter(line=>!line.trim().startsWith('#')).join('\n');
  return /^\s*workflow_dispatch\s*:/m.test(clean)||/^\s*on:\s*workflow_dispatch\s*(?:#.*)?$/m.test(clean);
}
async function ensureWorkflow(repo,id,ref,token,signal){
  const workflows=await availableWorkflows(repo,token,signal);
  const workflow=workflows.find(x=>x.id===id);
  if(!workflow)fail('Select an available test/verification workflow.',400);
  const source=await apiData('/repos/'+repo+'/contents/'+workflow.path.split('/').map(encodeURIComponent).join('/')+'?ref='+encodeURIComponent(ref),token,signal);
  let contents='';
  try{contents=decodeContents(source.data);}catch(error){if(error?.status)throw error;fail('Cannot decode workflow source.',415);}
  if(!supportsManualDispatch(contents))fail('This workflow does not support manual execution (workflow_dispatch).',422);
  return workflow;
}
function runSummary(value){
  return {
    id:Number(value.id)||0,
    name:String(value.name||''),
    status:String(value.status||'unknown'),
    conclusion:value.conclusion===null?null:String(value.conclusion||'unknown'),
    createdAt:value.created_at||null,
    updatedAt:value.updated_at||null,
    branch:String(value.head_branch||''),
    url:String(value.html_url||'')
  };
}
export default async function handler(request){
  if(request.method==='HEAD')return new Response(null,{status:200});
  if(request.method!=='POST')return json({error:'Method not allowed.'},405);
  try{
    requireOrigin(request);
    if(!String(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))fail('Expected JSON request.',415);
    const raw=await request.text();
    if(raw.length>MAX_BODY)fail('Request too large.',413);
    let body;
    try{body=JSON.parse(raw);}catch(_){fail('Invalid JSON.',400);}
    if(!body||typeof body!=='object'||Array.isArray(body))fail('Invalid request.',400);
    const session=await getGitHubSession(request);
    if(!session?.token)fail('Connect GitHub before running repository workflows.',401);
    const action=String(body.action||'');
    const repo=parseGitHubTarget(body.repo);
    const token=session.token,signal=request.signal;
    if(action==='list'){
      const meta=await requireWritableRepo(repo,token,signal);
      const workflows=await availableWorkflows(repo,token,signal);
      return json({repo,defaultBranch:String(meta.default_branch||'main'),workflows,authenticated:true,canRun:true});
    }
    const id=Number(body.workflowId);
    if(!Number.isSafeInteger(id)||id<=0)fail('Choose a workflow.',400);
    if(action==='runs'){
      const workflow=(await availableWorkflows(repo,token,signal)).find(x=>x.id===id);
      if(!workflow)fail('Unknown verification workflow.',400);
      const {data}=await apiData('/repos/'+repo+'/actions/workflows/'+id+'/runs?per_page=8',token,signal);
      return json({repo,workflow:{id:workflow.id,name:workflow.name},runs:(data?.workflow_runs||[]).slice(0,8).map(runSummary)});
    }
    if(action!=='dispatch')fail('Unsupported plugin execution action.',400);
    if(body.confirm!==true)fail('Confirm the exact repository, workflow, and branch before running CI.',403);
    const ref=requireRef(body.ref);
    await requireWritableRepo(repo,token,signal);
    // Reject non-existent refs: never let a model invent a branch or inject workflow inputs.
    await apiData('/repos/'+repo+'/branches/'+ref.split('/').map(encodeURIComponent).join('/'),token,signal);
    const workflow=await ensureWorkflow(repo,id,ref,token,signal);
    await apiData('/repos/'+repo+'/actions/workflows/'+id+'/dispatches',token,signal,{
      method:'POST',body:{ref}
    });
    return json({accepted:true,repo,ref,workflow:{id:workflow.id,name:workflow.name},message:'GitHub accepted the workflow dispatch; check Actions for actual execution/results.',url:'https://github.com/'+repo+'/actions/workflows/'+encodeURIComponent(workflow.path.split('/').pop())});
  }catch(error){
    return json({error:error?.status?String(error.message):'Plugin execution is temporarily unavailable.'},error?.status||502);
  }
}
