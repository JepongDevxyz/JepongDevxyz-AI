import {getGitHubSession,githubApi,json} from './_github_oauth.js';
import {parseGitHubTarget} from './plugins.js';
import {resolveGitHubAccess} from './_github_app.js';

export const config={runtime:'edge'};
const enc=new TextEncoder();
const MAX_CONTENT=80000;
const MAX_BODY=110000;
const FORBIDDEN=/(^|\/)(?:\.env(?:\..+)?|\.github|\.git|[^/]+\.(?:pem|p12|pfx|jks|keystore|key)|id_rsa|id_ed25519)(?:\/|$)/i;
function fail(message,status=400){const e=new Error(message);e.status=status;throw e;}
function originOkay(request){
  const origin=request.headers.get('origin');
  if((origin&&origin!==new URL(request.url).origin)||request.headers.get('sec-fetch-site')==='cross-site')
    fail('Cross-site changes are blocked.',403);
}
function filePath(raw){
  const path=String(raw||'').trim();
  if(!path||path.length>240||path.startsWith('/')||path.includes('\\')||path.includes('\0')||FORBIDDEN.test(path))fail('Choose a regular source file; secrets and workflow files cannot be modified here.',400);
  const parts=path.split('/');
  if(parts.some(p=>!p||p==='.'||p==='..'||!/^[A-Za-z0-9_.@+ -]{1,100}$/.test(p)))fail('Invalid repository file path.',400);
  return parts.join('/');
}
async function github(path,token,{method='GET',body,signal}={}){
  const response=await githubApi(path,token,{method,body,signal});
  const data=response.status===204?{}:await response.json().catch(()=>({}));
  if(!response.ok){
    if(response.status===401)fail('GitHub authorization expired. Reconnect your account.',401);
    if(response.status===403)fail('GitHub denied this operation. Check OAuth scopes and repository permissions.',403);
    if(response.status===409||response.status===422)fail('Repository changed or GitHub rejected the update. Preview again.',409);
    if(response.status===404)fail('GitHub repository or branch not found.',404);
    fail('GitHub returned HTTP '+response.status+'.',502);
  }
  return data;
}
async function baseInfo(repo,token,signal,kind='oauth'){
  const metadata=await github('/repos/'+repo,token,{signal});
  if(kind!=='github-app'&&metadata?.permissions?.push!==true)fail('You need push permission to propose changes to this repository.',403);
  const base=String(metadata.default_branch||'');
  if(!base||base.length>100||!(/^[A-Za-z0-9_./-]+$/).test(base))fail('Repository has no valid default branch.',400);
  const branch=await github('/repos/'+repo+'/branches/'+encodeURIComponent(base),token,{signal});
  const baseSha=String(branch.commit?.sha||'');
  if(!/^[a-f0-9]{40}$/i.test(baseSha))fail('Could not verify default branch commit.',502);
  return {base,baseSha};
}
function b64(bytes){
  let binary='';
  for(const byte of bytes)binary+=String.fromCharCode(byte);
  return btoa(binary);
}
function bytesB64(str){return b64(enc.encode(str));}
function unbase64(value){
  const raw=atob(String(value||'').replace(/\s/g,''));
  if(raw.length>MAX_CONTENT)fail('Original file is too large.',413);
  return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(raw,c=>c.charCodeAt(0)));
}
async function originalFile(repo,path,base,token,signal){
  const address='/repos/'+repo+'/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref='+encodeURIComponent(base);
  const response=await githubApi(address,token,{signal});
  if(response.status===404)return {sha:null,content:'',exists:false};
  const data=await response.json().catch(()=>({}));
  if(!response.ok)fail('Cannot inspect the original source file.',response.status===403?403:502);
  if(data.type!=='file'||Number(data.size||0)>MAX_CONTENT||data.encoding!=='base64')fail('Only UTF-8 text source files up to 80 KB can be proposed.',415);
  let content;
  try{content=unbase64(data.content||'');}catch(e){if(e.status)throw e;fail('Original file is not valid UTF-8.',415);}
  if(content.includes('\0'))fail('Binary files cannot be changed here.',415);
  return {sha:data.sha,content,exists:true};
}
async function digest(value){
  const bytes=await crypto.subtle.digest('SHA-256',enc.encode(value));
  return b64(new Uint8Array(bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function base64urlString(value){
  return bytesB64(value).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function unbase64urlString(value){
  const raw=atob(String(value||'').replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-String(value||'').length%4)%4));
  return new TextDecoder().decode(Uint8Array.from(raw,c=>c.charCodeAt(0)));
}
async function hmacKey(){
  const secret=String(process.env.GITHUB_SESSION_SECRET||'');
  if(secret.length<32)fail('Plugin signing is not configured.',503);
  return crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
async function makeApproval(payload){
  const body=base64urlString(JSON.stringify(payload));
  const sig=new Uint8Array(await crypto.subtle.sign('HMAC',await hmacKey(),enc.encode(body)));
  return body+'.'+b64(sig).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
async function verifyApproval(value,expected){
  try{
    const [raw,sig]=String(value||'').split('.');
    if(!raw||!sig||raw.length>1200)return false;
    const payload=JSON.parse(unbase64urlString(raw));
    if(!payload||payload.expiresAt<Date.now()||payload.expiresAt>Date.now()+10*60*1000)return false;
    for(const [key,part] of Object.entries(expected))if(payload[key]!==part)return false;
    const binary=atob(sig.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-sig.length%4)%4));
    return crypto.subtle.verify('HMAC',await hmacKey(),Uint8Array.from(binary,c=>c.charCodeAt(0)),enc.encode(raw));
  }catch(_){return false;}
}
function summarize(original,next){
  const before=original.split('\n'),after=next.split('\n');
  const first=before.findIndex((line,i)=>line!==after[i]);
  return {originalLines:before.length,proposedLines:after.length,originalBytes:enc.encode(original).length,proposedBytes:enc.encode(next).length,firstChangedLine:first<0?Math.min(before.length,after.length):first+1};
}
export default async function handler(request){
  if(request.method!=='POST')return json({error:'Method not allowed.'},405);
  try{
    originOkay(request);
    if(!String(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))fail('Expected JSON.',415);
    const raw=await request.text();
    if(raw.length>MAX_BODY)fail('Proposal is too large.',413);
    let body;
    try{body=JSON.parse(raw);}catch(_){fail('Invalid JSON.',400);}
    if(!body||typeof body!=='object'||Array.isArray(body))fail('Invalid request.',400);
    const session=await getGitHubSession(request);
    if(!session?.token)fail('Connect your GitHub account to propose changes.',401);
    const action=String(body.action||''),repo=parseGitHubTarget(body.repo),path=filePath(body.path);
    const content=body.content;
    if(typeof content!=='string'||!content.trim()||enc.encode(content).length>MAX_CONTENT||content.includes('\0'))fail('Provide UTF-8 source text up to 80 KB.',413);
    const access=await resolveGitHubAccess(request,{repository:repo,permissions:{contents:'write',pull_requests:'write'}});
    const token=access.token,signal=request.signal;
    const {base,baseSha}=await baseInfo(repo,token,signal,access.kind);
    const original=await originalFile(repo,path,base,token,signal);
    if(original.content===content)fail('No source changes to propose.',400);
    const fingerprint=await digest(session.token);
    const contentHash=await digest(content);
    const proof={repo,path,base,baseSha,originalSha:original.sha||'',contentHash,fingerprint};
    if(action==='preview'){
      const expiresAt=Date.now()+8*60*1000;
      const approval=await makeApproval({...proof,expiresAt});
      return json({repo,path,base,baseSha,originalSha:original.sha||'',exists:original.exists,preview:{...summarize(original.content,content),
        before:original.content.slice(0,14000),after:content.slice(0,14000),truncated:content.length>14000||original.content.length>14000
      },approval,expiresAt});
    }
    if(action!=='propose')fail('Unsupported source proposal action.',400);
    if(body.confirm!==true||!await verifyApproval(body.approval,proof))fail('Preview this exact change and approve it again before creating a pull request.',403);
    const branch='jdai/proposed-'+crypto.randomUUID().replace(/-/g,'').slice(0,16);
    await github('/repos/'+repo+'/git/refs',token,{method:'POST',body:{ref:'refs/heads/'+branch,sha:baseSha},signal});
    try{
      const update={message:'Propose '+path+' via JepongDevxyz AI',content:bytesB64(content),branch};
      if(original.sha)update.sha=original.sha;
      await github('/repos/'+repo+'/contents/'+path.split('/').map(encodeURIComponent).join('/'),token,{method:'PUT',body:update,signal});
    }catch(error){
      fail('A proposal branch was created but the file update failed. Check the branch '+branch+'.',502);
    }
    let pull;
    try{
      pull=await github('/repos/'+repo+'/pulls',token,{method:'POST',
        body:{title:'Proposed update: '+path,head:branch,base,body:'User-reviewed source change proposed in JepongDevxyz AI. Review the diff and CI before merging.'},signal});
    }catch(error){
      fail('The change was committed on '+branch+', but GitHub could not open its pull request. Check the branch manually.',502);
    }
    return json({created:true,repo,path,base,branch,pullRequest:{number:pull.number,url:pull.html_url,title:pull.title},
      message:'A pull request was created; the change is not merged or verified until you review it and check CI.'});
  }catch(error){return json({error:error?.status?String(error.message):'Proposal execution is temporarily unavailable.'},error?.status||502);}
}
