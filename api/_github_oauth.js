export const GITHUB_SESSION_COOKIE='jdgh_session';
export const GITHUB_STATE_COOKIE='jdgh_state';
export const GITHUB_RETURN_COOKIE='jdgh_return';

const encoder=new TextEncoder();
const decoder=new TextDecoder();

function base64url(bytes){
  let binary='';
  for(const b of bytes)binary+=String.fromCharCode(b);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function unbase64url(value){
  const s=String(value||'').replace(/-/g,'+').replace(/_/g,'/');
  const padded=s+'='.repeat((4-s.length%4)%4);
  const binary=atob(padded);
  return Uint8Array.from(binary,c=>c.charCodeAt(0));
}
function cookieMap(header=''){
  const out={};
  for(const part of String(header||'').split(';')){
    const i=part.indexOf('=');
    if(i<1)continue;
    const key=part.slice(0,i).trim(), value=part.slice(i+1).trim();
    try{out[key]=decodeURIComponent(value);}catch(_){out[key]=value;}
  }
  return out;
}
export function readCookie(request,name){
  return cookieMap(request?.headers?.get('cookie')||'')[name]||'';
}
export function sanitizeReturnPath(value='/'){
  const raw=String(value||'/').trim();
  if(!raw.startsWith('/')||raw.startsWith('//')||raw.includes('\0'))return '/';
  try{
    const u=new URL(raw,'https://local.invalid');
    if(u.origin!=='https://local.invalid')return '/';
    return u.pathname+u.search+u.hash;
  }catch(_){return '/';}
}
function secret(){
  const value=String(process.env.GITHUB_SESSION_SECRET||'');
  if(value.length<32)throw new Error('GITHUB_SESSION_SECRET must be at least 32 characters.');
  return value;
}
async function aesKey(){
  const digest=await crypto.subtle.digest('SHA-256',encoder.encode(secret()));
  return crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['encrypt','decrypt']);
}
export async function sealSession(data){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await aesKey();
  const clear=encoder.encode(JSON.stringify(data));
  const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,clear));
  return base64url(iv)+'.'+base64url(encrypted);
}
export async function openSession(value){
  try{
    const [a,b]=String(value||'').split('.');
    if(!a||!b)return null;
    const key=await aesKey(), iv=unbase64url(a), payload=unbase64url(b);
    const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,payload);
    const data=JSON.parse(decoder.decode(clear));
    if(!data||typeof data!=='object'||typeof data.token!=='string'||!data.token)return null;
    return data;
  }catch(_){return null;}
}
export async function getGitHubSession(request){
  const raw=readCookie(request,GITHUB_SESSION_COOKIE);
  if(!raw)return null;
  return openSession(raw);
}
export function randomState(){
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}
export function secureCookie(name,value,{maxAge=3600,httpOnly=true}={}){
  const attrs=[
    name+'='+encodeURIComponent(String(value||'')),
    'Path=/',
    'SameSite=Lax',
    'Secure'
  ];
  if(httpOnly)attrs.push('HttpOnly');
  if(Number.isFinite(maxAge))attrs.push('Max-Age='+Math.max(0,Math.floor(maxAge)));
  return attrs.join('; ');
}
export function clearCookie(name){
  return secureCookie(name,'',{maxAge:0});
}
export function oauthCallbackUrl(request){
  const configured=String(process.env.GITHUB_OAUTH_CALLBACK_URL||'').trim();
  if(configured){
    const u=new URL(configured);
    if(u.protocol!=='https:')throw new Error('GITHUB_OAUTH_CALLBACK_URL must use HTTPS.');
    return u.toString();
  }
  const origin=new URL(request.url).origin;
  if(!origin.startsWith('https://'))throw new Error('OAuth callback requires HTTPS.');
  return origin+'/api/github-oauth-callback';
}
export function githubOAuthConfig(){
  const clientId=String(process.env.GITHUB_OAUTH_CLIENT_ID||'').trim();
  const clientSecret=String(process.env.GITHUB_OAUTH_CLIENT_SECRET||'').trim();
  if(!clientId||!clientSecret)throw new Error('GitHub OAuth is not configured.');
  return {clientId,clientSecret};
}
export async function githubApi(path,token,{method='GET',body,signal}={}){
  const url=path.startsWith('https://')?path:'https://api.github.com'+path;
  const headers={
    Accept:'application/vnd.github+json',
    Authorization:'Bearer '+token,
    'X-GitHub-Api-Version':'2022-11-28',
    'User-Agent':'JepongDevxyz-AI'
  };
  if(body!==undefined)headers['Content-Type']='application/json';
  return fetch(url,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:signal||AbortSignal.timeout(12_000)});
}
export function json(data,status=200,headers={}){
  return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
}
