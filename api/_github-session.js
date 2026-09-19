// GitHub App OAuth: encrypted, host-only HttpOnly session cookies. No token is sent to the browser.
// Register a GitHub *App* with Contents: Read, Pull requests: Read, Metadata: Read.
// For private repositories the account must authorize AND install that app on the repositories.
export const SESSION_COOKIE='__Host-jdgh_session';
export const FLOW_COOKIE='__Host-jdgh_oauth';
const encoder=new TextEncoder();
const decoder=new TextDecoder();
const SESSION_AAD=encoder.encode('JepongDevxyz-AI/github-app-session/v1');
const CALLBACK_PATH='/api/github-callback';

export function cookieValue(header,name){
  const pair=String(header||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='));
  return pair?pair.slice(name.length+1):'';
}
export function cookie(name,value,seconds){
  return name+'='+value+'; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age='+Math.max(0,Math.floor(seconds));
}
export function noStore(headers={}){
  return {'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...headers};
}
export function callbackUrl(){
  const raw=String(process.env.GITHUB_APP_CALLBACK_URL||'');
  let url;
  try{url=new URL(raw);}catch(_){return '';}
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!==CALLBACK_PATH)return '';
  return url.href;
}
export function configured(){
  return Boolean(process.env.GITHUB_APP_CLIENT_ID&&process.env.GITHUB_APP_CLIENT_SECRET&&
    process.env.GITHUB_SESSION_SECRET&&String(process.env.GITHUB_SESSION_SECRET).length>=32&&callbackUrl());
}
export function requestOnCallbackOrigin(request){
  const cb=callbackUrl();
  return cb&&new URL(request.url).origin===new URL(cb).origin;
}
export function requireSameOrigin(request){
  const origin=request.headers.get('origin');
  return !(origin&&origin!==new URL(request.url).origin) &&
    request.headers.get('sec-fetch-site')!=='cross-site';
}
function encode64(bytes){
  let s='';for(const b of bytes)s+=String.fromCharCode(b);
  return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}
function decode64(value){
  if(!/^[a-zA-Z0-9_-]+$/.test(value)||value.length>6000)throw new Error('Malformed cookie');
  const raw=atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4));
  return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
function nonce(bytes=32){return encode64(crypto.getRandomValues(new Uint8Array(bytes)));}
async function key(){
  const secret=String(process.env.GITHUB_SESSION_SECRET||'');
  if(secret.length<32)throw new Error('GitHub session secret is not configured');
  const hash=await crypto.subtle.digest('SHA-256',encoder.encode(secret));
  return crypto.subtle.importKey('raw',hash,{name:'AES-GCM'},false,['encrypt','decrypt']);
}
export async function encryptSession(value){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const bytes=encoder.encode(JSON.stringify(value));
  const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:SESSION_AAD},await key(),bytes);
  return encode64(iv)+'.'+encode64(new Uint8Array(ciphertext));
}
async function decryptSession(value){
  const parts=String(value||'').split('.');
  if(parts.length!==2)return null;
  try{
    const iv=decode64(parts[0]);
    if(iv.length!==12)return null;
    const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:SESSION_AAD},await key(),decode64(parts[1]));
    return JSON.parse(decoder.decode(plain));
  }catch(_){return null;}
}
export async function githubSession(cookieHeader){
  if(!configured())return null;
  const payload=await decryptSession(cookieValue(cookieHeader,SESSION_COOKIE));
  if(!payload||payload.v!==1||typeof payload.token!=='string'||!payload.token||
    !Number.isInteger(payload.uid)||!Number.isFinite(payload.exp)||payload.exp<=Date.now()||
    typeof payload.login!=='string'||!/^[\w-]{1,100}$/.test(payload.login))return null;
  return payload;
}
export function flowCookie(state,verifier){
  return cookie(FLOW_COOKIE,encode64(encoder.encode(JSON.stringify({state,verifier,expires:Date.now()+600000}))),600);
}
export function verifyFlow(cookieHeader,receivedState){
  const value=cookieValue(cookieHeader,FLOW_COOKIE);
  if(!value||typeof receivedState!=='string'||receivedState.length>120)return null;
  try{
    const obj=JSON.parse(decoder.decode(decode64(value)));
    if(!obj||!Number.isFinite(obj.expires)||obj.expires<Date.now()||
      typeof obj.verifier!=='string'||!obj.verifier||obj.state!==receivedState)return null;
    return obj.verifier;
  }catch(_){return null;}
}
export function clearCookies(){
  return [cookie(FLOW_COOKIE,'',0),cookie(SESSION_COOKIE,'',0)];
}
export async function beginFlow(){
  const state=nonce(),verifier=nonce(48);
  const challenge=encode64(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(verifier))));
  const url=new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id',process.env.GITHUB_APP_CLIENT_ID);
  url.searchParams.set('redirect_uri',callbackUrl());
  url.searchParams.set('state',state);
  // GitHub App user-to-server OAuth uses fine-grained app permissions; no broad OAuth scopes.
  url.searchParams.set('code_challenge',challenge);
  url.searchParams.set('code_challenge_method','S256');
  return {url:url.href,setCookie:flowCookie(state,verifier)};
}
export async function exchangeCode(code,verifier){
  const res=await fetch('https://github.com/login/oauth/access_token',{
    method:'POST',redirect:'error',headers:{Accept:'application/json','Content-Type':'application/json'},
    body:JSON.stringify({
      client_id:process.env.GITHUB_APP_CLIENT_ID,
      client_secret:process.env.GITHUB_APP_CLIENT_SECRET,
      redirect_uri:callbackUrl(),code,code_verifier:verifier
    }),signal:AbortSignal.timeout(10000)
  });
  if(!res.ok)throw new Error('GitHub authorization exchange failed');
  const data=await res.json();
  if(!data||data.error||typeof data.access_token!=='string'||!data.access_token||
    // Only a GitHub App user-to-server token is accepted. Do not use classic OAuth broad repo scopes.
    !/^ghu_[a-zA-Z0-9_]+$/.test(data.access_token))throw new Error('GitHub App authorization was not completed');
  return data;
}
export async function githubUser(token){
  const res=await fetch('https://api.github.com/user',{
    headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',Authorization:'Bearer '+token},
    redirect:'error',signal:AbortSignal.timeout(10000)
  });
  if(!res.ok)throw new Error('GitHub could not verify the connected account');
  const user=await res.json();
  if(!Number.isInteger(user.id)||!/^[\w-]{1,100}$/.test(String(user.login||'')))
    throw new Error('GitHub did not return a valid user identity');
  return {id:user.id,login:user.login};
}
export function sessionSeconds(oauthResponse){
  const expires=Number(oauthResponse.expires_in);
  // Force reconnection after at most 8 hours; do not put long-lived refresh tokens in cookies.
  return Math.max(1,Math.min(Number.isFinite(expires)?expires-30:28800,28800));
}
