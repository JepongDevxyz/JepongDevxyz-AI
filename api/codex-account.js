import { json } from './_github_oauth.js';
import { actor, rpc } from './codex.js';
export const config = { runtime: 'edge' };

const empty = (extra={}) => ({ available:false, connected:false,
  codexEnabled:false, runnerReady:false, authMode:null, planType:null, ...extra });

export default async function handler(request) {
  if (!['GET','POST'].includes(request.method)) return json({error:'Method not allowed.'},405);
  if (request.headers.get('sec-fetch-site')==='cross-site') return json({error:'Cross-site request blocked.'},403);
  const origin=request.headers.get('origin');
  if(origin && origin!==new URL(request.url).origin) return json({error:'Origin not allowed.'},403);
  try {
    const user=await actor(request); // Bound to a verified GitHub OAuth account, not client-supplied ID.
    if(request.method==='GET'){
      const status=await rpc({action:'account-status',actor:user},request,8000);
      return json({
        available:status.available===true, connected:status.connected===true,
        codexEnabled:status.connected===true && status.authMode==='chatgpt',
        runnerReady:status.runnerReady===true,
        authMode:status.connected===true ? 'chatgpt':null,
        planType:status.connected===true ? String(status.planType||'').slice(0,40):null
      });
    }
    if (!String(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))
      return json({error:'Expected JSON.'},415);
    const raw=await request.text();
    if(raw.length>500) return json({error:'Request too large.'},413);
    const payload=JSON.parse(raw);
    if(!payload || Array.isArray(payload) || typeof payload!=='object')
      return json({error:'Invalid request.'},400);
    if(payload.action==='connect'){
      const result=await rpc({action:'account-connect',actor:user},request,16000);
      return json({
        connected:result.connected===true,
        verificationUrl:result.verificationUrl || null,
        userCode:result.userCode || null
      });
    }
    if(payload.action==='disconnect'){
      await rpc({action:'account-disconnect',actor:user},request,16000);
      return json(empty());
    }
    return json({error:'Unknown account action.'},400);
  }catch(error){
    const status=error?.status || 502;
    if(request.method==='GET' && status===401) return json(empty({requiresGithub:true}));
    return json({error:error?.status?error.message:'ChatGPT Codex account service is unavailable.'},status);
  }
}
