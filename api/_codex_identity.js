// Verify the existing JepongDevxyz cloud account server-side; browser IDs are untrusted.
import { createHmac } from 'node:crypto';
const authUrl='https://czjdygnhdojpqfdpfugo.supabase.co/auth/v1/user';
const key='sb_publishable_MJuzXQ_YRPV0yGPCTEpjMA_gPImrvin';
export async function codexAccountActor(request,env=process.env){
  const h=request.headers.get('authorization')||'';
  if(!/^Bearer [A-Za-z0-9_.-]{20,8192}$/.test(h))throw Object.assign(new Error('Sign in to your JepongDevxyz AI account first. GitHub is not required.'),{status:401});
  const response=await fetch(authUrl,{headers:{Authorization:h,apikey:key},redirect:'error',signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Object.assign(new Error('Your app session expired. Sign in again.'),{status:401});
  const account=await response.json();
  if(typeof account?.id!=='string'|| !/^[a-f0-9-]{36}$/i.test(account.id))
    throw Object.assign(new Error('Account identity could not be verified.'),{status:401});
  const secret=String(env.CODEX_RUNNER_SHARED_SECRET||'');
  if(secret.length<32)throw Object.assign(new Error('Codex service is not configured.'),{status:503});
  const digest=createHmac('sha256',secret).update('app-actor-v1:'+account.id).digest('hex');
  // Safe-integer actor ID and stable owner login are both server-derived.
  const id=parseInt(digest.slice(0,13),16);
  const login='jd-'+digest.slice(0,24);
  return {id,login,subject:account.id};
}
