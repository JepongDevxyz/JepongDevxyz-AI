import { webCompatible } from './_node_web_bridge.js';
import { json } from './_github_oauth.js';
import { codexAccountActor } from './_codex_identity.js';
import { sandboxRpc, sandboxAccountStatus, settings, accountAvailability } from './_codex_sandbox.js';
export const config = { maxDuration: 60 };
const empty=(extra={})=>({available:false,connected:false,codexEnabled:false,
  runnerReady:false,authMode:null,planType:null,...extra});

async function handleWeb(request){
  if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
  if(request.headers.get('sec-fetch-site')==='cross-site')return json({error:'Cross-site request blocked.'},403);
  const origin=request.headers.get('origin');
  if(origin && origin!==new URL(request.url).origin)return json({error:'Origin not allowed.'},403);
  let actor;
  try{actor=await codexAccountActor(request);}
  catch(e){
    if(e.status===401)return json(empty({requiresAccount:true,reasonCode:'APP_SIGN_IN_REQUIRED',
      available:settings().enabled}),request.method==='GET'?200:401);
    if(e.status===503 && request.method==='GET')
      return json(empty({reasonCode:'SIGNING_SECRET_MISSING'}));
    return json(empty({reasonCode:'ACCOUNT_VERIFICATION_FAILED',
      error:'Unable to verify your app account.'}),e.status||503);
  }
  try{
    const access=accountAvailability(actor);
    if(request.method==='GET'){
      // Only return the account UUID to the user whose Supabase session was
      // verified above. Never echo a browser-supplied UID or server secret.
      if(!access.available)return json(empty({
        reasonCode:access.reasonCode,
        ...(access.reasonCode==='ACCOUNT_NOT_ENROLLED'?{accountId:actor.subject}:{})
      }));
      try{
        const status=await sandboxAccountStatus(actor);
        const verified=status.connected===true&&status.authMode==='chatgpt';
        return json({available:status.available===true,connected:verified,
          reasonCode:verified?'CONNECTED':'READY_TO_CONNECT',
          codexEnabled:verified&&status.codexEnabled===true,
          runnerReady:status.runnerReady===true,authMode:verified?'chatgpt':null,
          planType:verified?String(status.planType||'').slice(0,40):null});
      }catch(_){
        return json(empty({reasonCode:'WORKSPACE_SERVICE_UNAVAILABLE'}));
      }
    }
    if(!access.available)return json({error:'Codex is not enabled for this app account.',
      reasonCode:access.reasonCode},403);
    if(!String(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))
      return json({error:'Expected JSON.'},415);
    const raw=await request.text();
    if(raw.length>500)return json({error:'Request too large.'},413);
    const data=JSON.parse(raw);
    if(!data||Array.isArray(data)||typeof data!=='object')return json({error:'Invalid request.'},400);
    if(data.action==='connect'){
      const result=await sandboxRpc({action:'account-connect',actor},actor,30000);
      return json({connected:result.connected===true,verificationUrl:result.verificationUrl||null,
        userCode:result.userCode||null});
    }
    if(data.action==='disconnect'){
      await sandboxRpc({action:'account-disconnect',actor},actor,15000);
      return json(empty({available:true}));
    }
    return json({error:'Unknown account action.'},400);
  }catch(e){
    return json({error:e.status?e.message:'ChatGPT Codex service is unavailable.'},e.status||502);
  }
}

export default async function handler(request,response){
  return webCompatible(request,response,handleWeb);
}
