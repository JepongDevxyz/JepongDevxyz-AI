import {getGitHubSession,githubApi} from './_github_oauth.js';

const textEncoder=new TextEncoder();
const MAX_API=550000;

function problem(message,status=400){const error=new Error(message);error.status=status;throw error;}
function validSlug(value=''){return /^[a-z0-9][a-z0-9-]{1,98}$/i.test(String(value||''));}
function settings(){
  const slug=String(process.env.GITHUB_APP_SLUG||'').trim();
  const id=String(process.env.GITHUB_APP_ID||'').trim();
  const key=String(process.env.GITHUB_APP_PRIVATE_KEY||'').replace(/\\n/g,'\n').trim();
  if(!validSlug(slug)||!/^\d{1,20}$/.test(id)||!(/-----BEGIN (?:RSA )?PRIVATE KEY-----/.test(key))||!(/-----END (?:RSA )?PRIVATE KEY-----/.test(key)))
    problem('JepongDevxyz GitHub App needs GITHUB_APP_SLUG, GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY in Vercel.',503);
  return {slug,id,key};
}
export function configuredGitHubApp(){
  try{settings();return true;}catch(_){return false;}
}
export function githubAppInstallUrl(){
  const {slug}=settings();
  return 'https://github.com/apps/'+slug+'/installations/new';
}
function base64url(bytes){
  let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function derLength(n){
  if(n<128)return [n];
  const bytes=[];while(n>0){bytes.unshift(n&255);n=Math.floor(n/256);}
  return [0x80|bytes.length,...bytes];
}
function wrapRsaPkcs1(raw){
  const version=[0x02,0x01,0x00];
  const rsaAlgorithm=[0x30,0x0d,0x06,0x09,0x2a,0x86,0x48,0x86,0xf7,0x0d,0x01,0x01,0x01,0x05,0x00];
  const key=[0x04,...derLength(raw.length),...raw];
  const inner=[...version,...rsaAlgorithm,...key];
  return new Uint8Array([0x30,...derLength(inner.length),...inner]);
}
async function appJWT(){
  const {id,key}=settings();
  const pkcs1=key.includes('-----BEGIN RSA PRIVATE KEY-----');
  const pem=key.replace(/-----BEGIN (?:RSA )?PRIVATE KEY-----|-----END (?:RSA )?PRIVATE KEY-----|\s/g,'');
  let binary;try{binary=atob(pem);}catch(_){problem('GitHub App private key is not valid PEM.',503);}
  const raw=Uint8Array.from(binary,c=>c.charCodeAt(0));
  const bytes=pkcs1?wrapRsaPkcs1(raw):raw;
  let rsa;
  try{rsa=await crypto.subtle.importKey('pkcs8',bytes,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);}
  catch(_){problem('GitHub App private key could not be imported.',503);}
  const now=Math.floor(Date.now()/1000);
  const head=base64url(textEncoder.encode(JSON.stringify({alg:'RS256',typ:'JWT'})));
  const payload=base64url(textEncoder.encode(JSON.stringify({iat:now-60,exp:now+8*60,iss:id})));
  const raw=head+'.'+payload;
  const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',rsa,textEncoder.encode(raw));
  return raw+'.'+base64url(new Uint8Array(signature));
}
async function githubText(path,token,{method='GET',body,signal}={}){
  const response=await githubApi(path,token,{method,body,signal:signal||AbortSignal.timeout(12_000)});
  if(response.status===204)return {status:204,data:null};
  const stated=Number(response.headers.get('content-length')||0);
  if(stated>MAX_API)problem('GitHub response is too large.',413);
  const raw=await response.text();
  if(raw.length>MAX_API)problem('GitHub response is too large.',413);
  let data=null;try{data=JSON.parse(raw);}catch(_){}
  return {status:response.status,data};
}
async function verifiedOAuthUser(request){
  const session=await getGitHubSession(request);
  if(!session?.token)problem('Connect your GitHub account before installing the JepongDevxyz GitHub App.',401);
  const {status,data}=await githubText('/user',session.token,{signal:request.signal});
  if(status!==200||!data?.id||!data?.login)problem('Your GitHub account session expired. Reconnect GitHub.',401);
  return {id:data.id,login:String(data.login),token:session.token};
}
async function personalInstallation(user,signal){
  const token=await appJWT();
  const path='/users/'+encodeURIComponent(user.login)+'/installation';
  const {status,data}=await githubText(path,token,{signal});
  if(status===404)return null;
  if(status!==200)problem('Could not verify your GitHub App installation.',status===403?403:502);
  if(!data?.id||data.account?.type!=='User'||Number(data.account.id)!==Number(user.id)||
    String(data.account.login||'').toLowerCase()!==user.login.toLowerCase())
    problem('This GitHub App installation does not belong to your GitHub account.',403);
  if(data.suspended_at)problem('This GitHub App installation is suspended. Manage it in GitHub.',403);
  return data;
}
export async function githubAppStatus(request){
  if(!configuredGitHubApp())return {configured:false,installed:false};
  const user=await verifiedOAuthUser(request);
  const installation=await personalInstallation(user,request.signal);
  if(!installation)return {configured:true,installed:false,installUrl:githubAppInstallUrl()};
  const id=Number(installation.id);
  return {configured:true,installed:true,installationId:id,
    account:{login:user.login,type:'User'},
    repositorySelection:installation.repository_selection==='selected'?'selected':'all',
    permissions:installation.permissions||{},
    manageUrl:'https://github.com/settings/installations/'+id,
    installUrl:githubAppInstallUrl()};
}
function permissionAllowed(granted,requested){
  const rank={none:0,read:1,write:2};
  return Object.entries(requested).every(([key,value])=>(rank[granted?.[key]]||0)>=(rank[value]||99));
}
// A request can use the app ONLY for the authenticated owner account's installation.
// GitHub restricts issued tokens to the repositories chosen on its own install screen.
// Never accept installation_id/account information from an untrusted request payload.
export async function githubAppToken(request,{repository='',permissions={contents:'read'}}={}){
  if(!configuredGitHubApp())return null;
  const user=await verifiedOAuthUser(request);
  const installation=await personalInstallation(user,request.signal);
  if(!installation)return null;
  if(!permissionAllowed(installation.permissions,permissions))
    problem('This installation lacks required GitHub App permissions. Manage its permissions in GitHub.',403);
  const scopedRepo=String(repository||'').trim();
  if(scopedRepo){
    const parts=scopedRepo.split('/');
    if(parts.length!==2||parts[0].toLowerCase()!==user.login.toLowerCase()||
      !/^[A-Za-z0-9_.-]{1,100}$/.test(parts[1]))problem('This installation only supports repositories owned by the connected personal GitHub account.',403);
  }
  const body={permissions};
  if(scopedRepo)body.repositories=[scopedRepo.split('/')[1]];
  const jwt=await appJWT();
  const {status,data}=await githubText('/app/installations/'+Number(installation.id)+'/access_tokens',jwt,{
    method:'POST',body,signal:request.signal
  });
  if(status!==201||typeof data?.token!=='string'){
    if(status===403||status===404||status===422)problem('This repository is not selected for the GitHub App, or its permissions were not granted. Manage repository access in GitHub.',403);
    problem('Could not authorize your GitHub App installation.',502);
  }
  return {token:data.token,installationId:Number(installation.id),permissions:data.permissions||{},
    repositorySelection:installation.repository_selection,kind:'github-app'};
}
export async function githubAppRepositories(request){
  const access=await githubAppToken(request,{permissions:{metadata:'read'}});
  if(!access)return null;
  const {status,data}=await githubText('/installation/repositories?per_page=100',access.token,{signal:request.signal});
  if(status!==200)problem('Could not list repositories selected for the GitHub App.',status===403?403:502);
  return {access,repositories:(Array.isArray(data?.repositories)?data.repositories:[]).slice(0,100)};
}
// Uses the App's *selected-repository* boundary when installed. Legacy OAuth remains
// usable ONLY when the user has not yet installed the GitHub App.
export async function resolveGitHubAccess(request,{repository='',permissions={contents:'read'}}={}){
  // Preserve the existing OAuth-only integration without extra identity API calls
  // until this site's separate GitHub App has actually been configured.
  if(!configuredGitHubApp()){
    const session=await getGitHubSession(request);
    if(!session?.token)problem('Connect your GitHub account to use this feature.',401);
    return {token:session.token,kind:'oauth',permissions:null};
  }
  const app=await githubAppToken(request,{repository,permissions});
  if(app)return app;
  const user=await verifiedOAuthUser(request);
  return {token:user.token,kind:'oauth',permissions:null};
}
