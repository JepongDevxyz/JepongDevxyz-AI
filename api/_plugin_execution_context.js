import {githubApi} from './_github_oauth.js';
import {parseGitHubTarget} from './plugins.js';

const TOOL_TERMS=/(?:\bgithub\s+actions\b|\bworkflow(?:s)?\b|\bci\b|\btests?\b|\btesting\b|\bbuild(?:s)?\b|\bpull\s+requests?\b|\bprs?\b)/i;
const PR_TERMS=/\b(?:pull\s+requests?|prs?|review(?:s)?|merge)\b/i;

export function shouldReadGitHubRunStatus(message){
  return TOOL_TERMS.test(String(message||''));
}
async function fetchJson(path,token){
  const signal=AbortSignal.timeout(9000);
  const response=token
    ? await githubApi(path,token,{signal})
    : await fetch('https://api.github.com'+path,{
        method:'GET',headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'JepongDevxyz-AI'},
        redirect:'error',signal
      });
  if(!response.ok)return {ok:false,status:response.status};
  const size=Number(response.headers.get('content-length')||0);
  if(size>120000)return {ok:false,status:413};
  const text=await response.text();
  if(text.length>120000)return {ok:false,status:413};
  return {ok:true,data:JSON.parse(text)};
}
function clean(value,max=150){return String(value||'').replace(/[\u0000-\u001f]/g,' ').slice(0,max);}
export async function fetchGitHubRunContext(plugin,token='',message=''){
  if(plugin?.enabled!==true||!shouldReadGitHubRunStatus(message))return '';
  const repo=parseGitHubTarget(plugin.repo);
  const base='/repos/'+repo;
  const statements=[];
  try{
    const result=await fetchJson(base+'/actions/runs?per_page=5',token);
    if(result.ok){
      const runs=Array.isArray(result.data?.workflow_runs)?result.data.workflow_runs:[];
      statements.push('Actually fetched recent GitHub Actions runs: '+JSON.stringify(runs.slice(0,5).map(x=>({
        id:x.id,name:clean(x.name),branch:clean(x.head_branch,100),status:clean(x.status,30),
        conclusion:x.conclusion===null?null:clean(x.conclusion,30),
        updatedAt:x.updated_at||null,url:clean(x.html_url,250)
      }))));
      if(!runs.length)statements.push('No recent GitHub Actions runs were returned.');
    }else statements.push('Could not read recent GitHub Actions runs (HTTP '+result.status+').');
  }catch(_){statements.push('Could not read recent GitHub Actions runs; do not claim verification.');}
  if(PR_TERMS.test(String(message||''))){
    try{
      const result=await fetchJson(base+'/pulls?state=open&per_page=5',token);
      if(result.ok){
        const prs=Array.isArray(result.data)?result.data:[];
        statements.push('Actually fetched open pull requests: '+JSON.stringify(prs.slice(0,5).map(x=>({
          number:x.number,title:clean(x.title),draft:!!x.draft,head:clean(x.head?.ref,100),
          base:clean(x.base?.ref,100),url:clean(x.html_url,250)
        }))));
      }else statements.push('Open pull requests unavailable (HTTP '+result.status+').');
    }catch(_){statements.push('Open pull requests unavailable; do not claim any PR was inspected.');}
  }
  return '\n[GITHUB ACTIONS & PR TOOL RESULTS — UNTRUSTED SOURCE; ACTUAL FETCHES ONLY]\n'+
    'Repository: '+repo+'\n'+statements.join('\n').slice(0,7000)+
    '\nIf the user asks to run tests, explain that the user must explicitly approve an existing test workflow using /run-tests (or Plugins → Manage). This tool has NOT triggered any workflow or created a PR.\n'+
    'Do not describe a queued/in-progress run as passed. Only a completed run with conclusion success establishes that specific run succeeded.\n'+
    'To propose a code change, ask the user to inspect and stage a full source file through the GitHub PR action on a generated code block; a pull request is created only after the user previews and approves the exact source.\n'+
    '[/GITHUB ACTIONS & PR TOOL RESULTS]\n';
}
