import { json } from './_github_oauth.js';
import { codexAccountActor } from './_codex_identity.js';
import { sandboxRpc, sandboxAccountStatus, settings } from './_codex_sandbox.js';
export const config = { maxDuration: 60 };
const empty=(extra={})=>({available:false,connected:false,codexEnabled:false,
  runnerReady:false,authMode:null,planType:null,...extra});

export default async function handler(request){
  if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
  if(request.headers.get('sec-fetch-site')==='cross-site')return json({error:'Cross-site request blocked.'},403);
  const origin=request.headers.get('origin');
  if(origin && origin!==new URL(request.url).origin)return json({error:'Origin not allowed.'},403);
  let actor;
  try{actor=await codexAccountActor(request);}
  catch(e){
    if(e.status===401)return json(empty({requiresAccount:true,available:settings().enabled}),request.method==='GET'?200:401);
    return json(empty({error:'Codex account service is unavailable.'}),e.status||503);
  }
  try{
    if(request.method==='GET'){
      const status=await sandboxAccountStatus(actor);
      const verified=status.connected===true&&status.authMode==='chatgpt';
      return json({available:status.available===true,connected:verified,
        codexEnabled:verified&&status.codexEnabled===true,
        runnerReady:status.runnerReady===true,authMode:verified?'chatgpt':null,
        planType:verified?String(status.planType||'').slice(0,40):null});
    }
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
