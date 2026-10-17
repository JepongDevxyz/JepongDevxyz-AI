/* lib/chat/fallback.js — split from api/chat.js (mechanical move, no behavior change). */
import { runAIHorde, runAgentRouter, runAnonymousAIHordeFallback, runBailucode } from './aihorde.js';
import { API_GUARD, PROVIDERS } from './config.js';
import { configured, sanitizeCustomProviderKeys } from './keys.js';
import { runCloudflare, runCohere, runGemini, runGenericCustomApi, runOpenAICompatible, runSeekAI } from './providers.js';

function fallbackProviderCandidates(selectedProvider,{
  providers=PROVIDERS,isConfigured=configured,limit=API_GUARD.maxFallbackProviders,files=[]
}={}){
  const hasImage=Array.isArray(files)&&files.some(file=>String(file?.mimeType||'').startsWith('image/')&&file?.data);
  const hasVideo=Array.isArray(files)&&files.some(file=>String(file?.mimeType||'').startsWith('video/')&&file?.data);
  const order=['gemini','cloudflare','groq','openrouter','mistral','cohere','unorouter','nvidia','codecraft','agentrouter','hcnsec','bailucode','seekai'];
  return order
    .filter(provider=>provider!==selectedProvider&&providers[provider]&&isConfigured(provider))
    .filter(provider=>!hasVideo||provider==='gemini')
    .filter(provider=>!hasImage||provider==='gemini'||provider==='cloudflare')
    .slice(0,Math.max(0,Number(limit)||0))
    .map(provider=>({provider,model:providers[provider].defaultModel}));
}

async function runAvailableProviderFallback(selectedProvider,args,{
  body={},files=args?.files||[],providers=PROVIDERS,limit=API_GUARD.maxFallbackProviders,
  runner=runProvider,includeEmergencyFallback=false,runRegistered=runAIHorde,
  runAnonymous=runAnonymousAIHordeFallback
}={}){
  if(args?.autoFallback!==true)return {ok:false,status:403,error:'Provider fallback is disabled.'};
  const sameProviderModels=(providers[selectedProvider]?.models||[])
    .filter(model=>model&&model!==args.model)
    .slice(0,2);
  let last={ok:false,status:503,error:'No other configured model provider is available.'};
  for(const model of sameProviderModels){
    const attempt=await runner(selectedProvider,{
      ...args,
      model,
      customApiKeys:sanitizeCustomProviderKeys(body,selectedProvider),
      autoFallback:true,
      fallbackFrom:selectedProvider,
      routedReason:'credit-model-fallback'
    });
    if(attempt?.ok)return {...attempt,fallbackProvider:selectedProvider,fallbackModel:model};
    last=attempt||last;
  }
  const candidates=fallbackProviderCandidates(selectedProvider,{
    providers,limit,files,
    isConfigured:provider=>configured(provider)||sanitizeCustomProviderKeys(body,provider).length>0
  });
  for(const candidate of candidates){
    const attempt=await runner(candidate.provider,{
      ...args,
      model:candidate.model,
      customApiKeys:sanitizeCustomProviderKeys(body,candidate.provider),
      customApiProfile:null,
      autoFallback:true,
      fallbackFrom:selectedProvider,
      routedReason:'credit-exhaustion-fallback'
    });
    if(attempt?.ok)return {...attempt,fallbackProvider:candidate.provider,fallbackModel:candidate.model};
    last=attempt||last;
  }
  const hasUnsupportedMedia=Array.isArray(files)&&files.some(file=>
    file?.data&&/^(?:image|video)\//i.test(String(file?.mimeType||''))
  );
  if(includeEmergencyFallback&&!hasUnsupportedMedia){
    const emergencyArgs={
      ...args,model:'auto',fallbackFrom:selectedProvider,
      autoFallback:true,routedReason:'credit-continuation-emergency'
    };
    const registered=await runRegistered(emergencyArgs);
    if(registered?.ok)return {...registered,fallbackProvider:'aihorde',fallbackModel:'auto'};
    last=registered||last;
    const anonymous=await runAnonymous(emergencyArgs);
    if(anonymous?.ok)return {...anonymous,fallbackProvider:'aihorde-public',fallbackModel:'auto'};
    last=anonymous||last;
  }
  return last;
}

async function runProvider(provider,args){
  if(provider==='custom-api' && args?.customApiProfile){
    return runGenericCustomApi(args.customApiProfile,{
      history:args.history,
      message:args.message,
      systemInstruction:args.systemInstruction,
      emit:args.emit,
      autoFallback:args.autoFallback===true,
      responseEffort:args.responseEffort||'Instant'
    });
  }
  if(provider==='gemini')return runGemini(args);
  if(provider==='cloudflare')return runCloudflare(args);
  if(provider==='cohere')return runCohere(args);
  if(provider==='aihorde')return runAIHorde(args);
  if(provider==='bailucode')return runBailucode(args);
  if(provider==='agentrouter')return runAgentRouter(args);
  if(provider==='seekai')return runSeekAI(args);
  if(['groq','openrouter','mistral','unorouter','nvidia','codecraft','hcnsec'].includes(provider))return runOpenAICompatible(provider,args);
  return {ok:false,status:400,error:'Unknown provider'};
}

export { fallbackProviderCandidates, runAvailableProviderFallback, runProvider };
