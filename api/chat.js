/* =========================================================
   JepongDevxyz AI — Chat API (thin Edge Function handler)
   All logic lives in ../lib/chat/* modules.
   NO imports from ./api/* (Edge Functions reject those).
   ========================================================= */
export const config = { runtime: 'edge' };

import { json, checkApiGuard, API_GUARD } from '../lib/chat/feature-settings.js';
import { processChat, mediaCapabilitySnapshot, dynamicModelCatalog, providerUsageSnapshot, normalizeModelCatalog, MAX_AUTO_CONTINUATIONS } from '../lib/chat/processor.js';
import { generateImage, generatePetImage, serverTTS, activityStreamResponse } from '../lib/chat/media.js';
import { liveAIHordePickerModels, applyChatFeatureSettings, sanitizeCustomApiProfile } from '../lib/chat/feature-settings.js';
import { cleanUpstreamError } from '../lib/chat/orchestrator.js';
import { safeJsonResponse } from '../lib/chat/research.js';
import { getGitHubSession, resolveGitHubAccess, shouldReadGitHubIssues } from '../lib/chat/shared.js';

export default async function handler(req){
  if(req.method==='HEAD')return new Response(null,{status:200});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);

  let body;
  try{
    body=await req.json();
  }catch(_){
    return json({error:'Invalid JSON request body.'},400);
  }
  if(!body||typeof body!=='object'||Array.isArray(body)){
    return json({error:'Request body must be a JSON object.'},400);
  }
  if(!body.action||body.action==='chat')body=applyChatFeatureSettings(body);
  let bodyChars=0;
  try{bodyChars=JSON.stringify(body).length;}catch(_){}
  if(bodyChars>API_GUARD.maxBodyChars)return json({error:'Request is too large.'},413);
  const apiGuard=checkApiGuard(req,body);
  if(!apiGuard.ok)return json({error:apiGuard.error,rateLimited:apiGuard.status===429},apiGuard.status,apiGuard.headers||{});

  try{
    if(body.action==='generate-image') return generateImage(body,req.signal);
    if(body.action==='generate-pet-image') return generatePetImage(body,req.signal);
    if(body.action==='tts') return serverTTS(body);
    if(body.action==='media-capability-status') return json({media:await mediaCapabilitySnapshot()});
    if(body.action==='provider-models') return json({providers:await dynamicModelCatalog()});
    if(body.action==='aihorde-live-models') return json(await liveAIHordePickerModels(body.preferredModels));
    if(body.action==='custom-api-models'){
      const p=sanitizeCustomApiProfile(body);
      if(!p)return json({error:'Valid API key and HTTPS Base URL are required.'},400);
      const root=p.baseUrl.replace(/\/chat\/completions$/i,'').replace(/\/$/,'');
      const modelsUrl=/\/(?:openapi\/)?v1$/i.test(root)?root+'/models':root+'/v1/models';
      try{
        let r=null,lastError='';for(const key of (p.apiKeys?.length?p.apiKeys:[p.apiKey])){r=await fetch(modelsUrl,{headers:{Authorization:'Bearer '+key,Accept:'application/json'},signal:AbortSignal.timeout(12000)});if(r.ok)break;lastError=cleanUpstreamError(await r.text().catch(()=>''),r.status,'custom','models');}if(!r?.ok)return json({error:lastError||'All API keys failed.',status:r?.status||502},r?.status||502);
        const models=normalizeModelCatalog(await safeJsonResponse(r));
        return json({models,status:models.length?'ready':'empty',source:modelsUrl});
      }catch(e){return json({error:e?.message||'Could not load models.'},502);}
    }
    if(body.action==='provider-status') return json({providers:await providerUsageSnapshot(),cloudflare:{freeDailyNeurons:10000,reset:'00:00 UTC'},costGuard:{rateWindowMs:API_GUARD.windowMs,maxRequests:API_GUARD.maxRequests,maxHeavyRequests:API_GUARD.maxHeavyRequests,maxFallbackProviders:API_GUARD.maxFallbackProviders,maxAutoContinuations:MAX_AUTO_CONTINUATIONS}});

    const githubSession=await getGitHubSession(req);
    body._githubAccessToken=githubSession?.token||'';
    if(githubSession?.token&&body.plugins?.github?.enabled===true&&body.plugins.github.repo){
      try{
        const access=await resolveGitHubAccess(req);
        body._githubAccessToken=access.token;
      }catch(_){
        body._githubAccessToken='';
        body._githubPermissionDenied=true;
      }
    }

    body._githubIssuesToken='';
    if(githubSession?.token&&body.plugins?.github?.enabled===true&&body.plugins.github.repo&&shouldReadGitHubIssues(body.message)){
      try{
        const issueAccess=await resolveGitHubAccess(req);
        body._githubIssuesToken=issueAccess.token;
      }catch(_){body._githubIssuesPermissionDenied=true;}
    }
    const hasMessage=typeof body.message==='string'&&body.message.trim().length>0;
    const hasFiles=Array.isArray(body.files)&&body.files.length>0;
    if(!hasMessage&&!hasFiles){
      return json({error:'Message or attachment is required.'},400);
    }

    if(body.activityStream===true) return activityStreamResponse(body,req.signal);

    const result=await processChat(body,null);
    if(result.ok)return result.response;
    return json({error:result.error||'AI provider unavailable',provider:result.provider,status:result.status,rateLimited:result.status===429},result.status||500,{'X-AI-Provider':result.provider||body.provider||'gemini'});
  }catch(e){return json({error:e?.message||String(e)},500);}
}
