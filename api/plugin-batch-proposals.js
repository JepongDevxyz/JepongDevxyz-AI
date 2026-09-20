import {getGitHubSession,githubApi,json} from './_github_oauth.js';
import {parseGitHubTarget} from './plugins.js';
import {resolveGitHubAccess} from './_github_app.js';
export const config={runtime:'edge'};
const encoder=new TextEncoder(),SHA=/^[0-9a-f]{40}$/i;
const BLOCKED=/(^|\/)(?:\.git|\.github|\.env(?:\..*)?|[^/]+\.(?:pem|pfx|p12|jks|keystore|key)|id_rsa|id_ed25519|\.npmrc|\.netrc)(?:\/|$)/i;
function fail(message,status=400){const e=new Error(message);e.status=status;throw e;}
function validate(files){
  if(!Array.isArray(files)||!files.length||files.length>8)fail('Provide 1 to 8 complete files.',400);
  const seen=new Set();let total=0;
  return files.map(x=>{
    const path=typeof x?.path==='string'?x.path.trim():'';
    const parts=path.split('/');
    if(!path||path.length>240||path.includes('\\')||path.includes('\0')||BLOCKED.test(path)||
      parts.some(p=>!p||p==='.'||p==='..'||!/^[a-z0-9_.@+ -]{1,100}$/i.test(p)))
      fail('Only ordinary source paths can be modified; no secrets or workflow files.',400);
    if(seen.has(path.toLowerCase()))fail('Duplicate path '+path,400);
    seen.add(path.toLowerCase());
    if(typeof x?.content!=='string'||x.content.includes('\0'))fail('Complete UTF-8 source text required.',400);
    const size=encoder.encode(x.content).length;
    if(!size||size>42000)fail('Each file must be at most 42 KB.',413);
    total+=size;if(total>125000)fail('Total source must be at most 125 KB.',413);
    return {path,content:x.content};
  });
}
async function api(path,token,{method='GET',body,signal}={}){
  const res=await githubApi(path,token,{method,body,signal});
  const data=res.status===204?null:await res.json().catch(()=>null);
  if(!res.ok){
    if(res.status===401)fail('GitHub session expired; reconnect.',401);
    if(res.status===403)fail('Insufficient GitHub repository permissions.',403);
    if(res.status===404)fail('GitHub resource not found.',404);
    if([409,422].includes(res.status))fail('Repository changed or GitHub rejected the source update. Preview again.',409);
    fail('GitHub returned HTTP '+res.status+'.',502);
  }
  return data;
}
async function baseInfo(repo,token,kind,signal){
  const meta=await api('/repos/'+repo,token,{signal});
  if(kind!=='github-app'&&meta?.permissions?.push!==true)fail('Repository write access required.',403);
  const base=String(meta.default_branch||'');
  if(!base||base.length>100||!/^[a-z0-9_./-]+$/i.test(base)||base.includes('..'))fail('Invalid default branch.',400);
  const branch=await api('/repos/'+repo+'/branches/'+base.split('/').map(encodeURIComponent).join('/'),token,{signal});
  const baseSha=String(branch.commit?.sha||'');
  if(!SHA.test(baseSha))fail('Could not verify base commit.',502);
  return {base,baseSha};
}
async function oldFile(repo,path,base,token,signal){
  const uri='/repos/'+repo+'/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref='+encodeURIComponent(base);
  const res=await githubApi(uri,token,{signal});
  if(res.status===404)return {sha:'',exists:false,content:''};
  const data=await res.json().catch(()=>null);
  if(!res.ok)fail('Unable to inspect original source.',res.status===403?403:502);
  if(data?.type!=='file'||data.encoding!=='base64'||data.size>42000)fail('Original must be a UTF-8 file at most 42 KB.',415);
  let content;
  try{
    const b=atob(String(data.content||'').replace(/\s/g,''));
    content=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(b,c=>c.charCodeAt(0)));
  }catch(_){fail('Original is not UTF-8 text.',415);}
  if(content.includes('\0')||!SHA.test(data.sha||''))fail('Unsupported original source file.',415);
  return {sha:data.sha,exists:true,content};
}
function url64(bytes){let str='';for(const b of bytes)str+=String.fromCharCode(b);return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
async function hash(text){return url64(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(text))));}
async function key(){
  const secret=String(process.env.GITHUB_SESSION_SECRET||'');
  if(secret.length<32)fail('Approval secret is not configured.',503);
  return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
async function seal(value){
  const raw=url64(encoder.encode(JSON.stringify(value)));
  const sig=url64(new Uint8Array(await crypto.subtle.sign('HMAC',await key(),encoder.encode(raw))));
  return raw+'.'+sig;
}
async function check(ticket,expected){
  const [raw,sig,...other]=String(ticket||'').split('.');
  if(!raw||!sig||other.length||raw.length>2000)return false;
  try{
    const binary=atob(raw.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-raw.length%4)%4));
    const data=JSON.parse(new TextDecoder().decode(Uint8Array.from(binary,c=>c.charCodeAt(0))));
    if(!data||data.exp<Date.now()||data.exp>Date.now()+6*60*1000)return false;
    for(const k of Object.keys(expected))if(data[k]!==expected[k])return false;
    const signature=Uint8Array.from(atob(sig.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-sig.length%4)%4)),c=>c.charCodeAt(0));
    return crypto.subtle.verify('HMAC',await key(),signature,encoder.encode(raw));
  }catch(_){return false;}
}
export default async function handler(req){
  if(req.method!=='POST')return json({error:'Method not allowed.'},405);
  try{
    const origin=req.headers.get('origin');
    if(origin&&origin!==new URL(req.url).origin||req.headers.get('sec-fetch-site')==='cross-site')fail('Cross-site requests denied.',403);
    if(!String(req.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))fail('Expected JSON.',415);
    const raw=await req.text();if(raw.length>165000)fail('Request exceeds size limit.',413);
    let body;try{body=JSON.parse(raw);}catch(_){fail('Invalid JSON.',400);}
    if(!body||typeof body!=='object'||Array.isArray(body))fail('Invalid request.',400);
    const session=await getGitHubSession(req);
    if(!session?.token)fail('Connect GitHub before proposing changes.',401);
    const repo=parseGitHubTarget(body.repo),files=validate(body.files);
    const access=await resolveGitHubAccess(req,{repository:repo,permissions:{contents:'write',pull_requests:'write'}});
    const token=access.token,signal=req.signal;
    const {base,baseSha}=await baseInfo(repo,token,access.kind,signal);
    const reviewed=await Promise.all(files.map(async f=>({...f,old:await oldFile(repo,f.path,base,token,signal)})));
    if(reviewed.every(f=>f.content===f.old.content))fail('No source changes detected.',400);
    const parts=[];
    for(const f of reviewed)parts.push({path:f.path,oldSha:f.old.sha,contentHash:await hash(f.content)});
    const proof={repo,base,baseSha,manifestHash:await hash(JSON.stringify(parts)),fingerprint:await hash(session.token)};
    if(body.action==='preview'){
      const exp=Date.now()+6*60*1000;
      return json({repo,base,baseSha,expiresAt:exp,approval:await seal({...proof,exp}),
        files:reviewed.map(f=>({path:f.path,exists:f.old.exists,originalSha:f.old.sha,
          originalLines:f.old.content.split('\n').length,proposedLines:f.content.split('\n').length,
          before:f.old.content.slice(0,4500),after:f.content.slice(0,4500),
          truncated:f.old.content.length>4500||f.content.length>4500}))});
    }
    if(body.action!=='propose')fail('Unsupported action.',400);
    if(body.confirm!==true||!await check(body.approval,proof))fail('Preview and approve the unchanged source set before creating a PR.',403);
    const commitInfo=await api('/repos/'+repo+'/git/commits/'+baseSha,token,{signal});
    if(!SHA.test(commitInfo?.tree?.sha||''))fail('GitHub base tree is unavailable.',502);
    const tree=await api('/repos/'+repo+'/git/trees',token,{method:'POST',signal,body:{
      base_tree:commitInfo.tree.sha,tree:files.map(f=>({path:f.path,mode:'100644',type:'blob',content:f.content}))}});
    if(!SHA.test(tree?.sha||''))fail('GitHub did not create a source tree.',502);
    const commit=await api('/repos/'+repo+'/git/commits',token,{method:'POST',signal,body:{
      message:'Propose reviewed multi-file coding change via JepongDevxyz AI',tree:tree.sha,parents:[baseSha]}});
    if(!SHA.test(commit?.sha||''))fail('GitHub did not create a source commit.',502);
    const branch='jdai/reviewed-'+crypto.randomUUID().replace(/-/g,'').slice(0,20);
    await api('/repos/'+repo+'/git/refs',token,{method:'POST',signal,body:{ref:'refs/heads/'+branch,sha:commit.sha}});
    let pr;
    try{pr=await api('/repos/'+repo+'/pulls',token,{method:'POST',signal,body:{
      title:'Reviewed coding change ('+files.length+' files)',head:branch,base,
      body:'User-reviewed source changes to '+files.map(f=>f.path).join(', ')+'. Review the diff and CI before merging.'}});}
    catch(_){fail('Proposal branch '+branch+' was created but PR creation failed; inspect it on GitHub.',502);}
    if(!Number.isSafeInteger(pr?.number)||pr.number<1)fail('GitHub did not return a valid PR number.',502);
    return json({created:true,repo,base,branch,changedFiles:files.map(f=>f.path),commitSha:commit.sha,
      pullRequest:{number:pr.number,title:pr.title,url:'https://github.com/'+repo+'/pull/'+pr.number},
      message:'One multi-file commit and a reviewable PR were created. CI and merging remain separate.'});
  }catch(error){return json({error:error?.status?String(error.message):'Multi-file proposal temporarily unavailable.'},error?.status||502);}
}
