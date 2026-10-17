/* lib/chat/refine.js — split from api/chat.js (mechanical move, no behavior change). */
import { runProvider } from './fallback.js';
import { isVisualWebUiRequest, readInternalProviderText } from './prompts.js';
import { activity } from './utils.js';

function responseMeta(response) {
  const num = name => {
    const raw=response.headers.get(name); if(raw==null)return null;
    const n=Number(raw); return Number.isFinite(n)?n:null;
  };
  return {
    provider:response.headers.get('x-ai-provider')||'',
    model:response.headers.get('x-ai-model')||'',
    fallbackFrom:response.headers.get('x-ai-fallback-from')||'',
    routeReason:response.headers.get('x-ai-route-reason')||'',
    keyIndex:num('x-ai-key-index'),
    keyCount:num('x-ai-key-count'),
    remainingRequests:num('x-ratelimit-remaining-requests'),
    limitRequests:num('x-ratelimit-limit-requests'),
    remainingTokens:num('x-ratelimit-remaining-tokens'),
    limitTokens:num('x-ratelimit-limit-tokens'),
    retryAfter:response.headers.get('retry-after')||''
  };
}

function shouldRunUiRefinementPass(message='',files=[]){
  return isVisualWebUiRequest(message,files);
}

function buildUiRefinementPrompt(originalRequest='',draft=''){
  const safeDraft=String(draft||'').slice(0,90000);
  return [
    'Refine the following DRAFT into the final user-facing answer.',
    'Do not discuss the refinement process. Return only the improved final answer.',
    'Preserve every functional requirement from the original request.',
    'If the draft contains HTML/CSS/JavaScript for a UI, keep the requested functionality but make the interface product-quality: complete visual hierarchy, spacing, typography, responsive mobile behavior, polished controls, accessible states, and consistent icons.',
    'For a single-file HTML app, prefer self-contained inline CSS/JS so the built-in preview renders correctly without depending on a CSS framework. If the draft uses Tailwind or another CDN without the user explicitly requesting it, replace that dependency with equivalent self-contained CSS.',
    'Do not leave default browser-looking buttons, inputs, headings, lists, or forms unstyled when the user asked for a real interface.',
    'If a screenshot/video/reference is part of the request context, preserve its layout hierarchy, proportions, density, placement, and interaction pattern as closely as possible.',
    'Do not remove requested tools/features merely to simplify the UI.',
    'Do not claim that code was executed or tested unless verified tool context says so.',
    '',
    'ORIGINAL REQUEST:',
    String(originalRequest||'').slice(0,14000),
    '',
    'DRAFT:',
    safeDraft
  ].join('\n');
}

async function maybeRefineVisualUiResponse({first,provider,model,history,files,message,systemInstruction,routedReason,emit,customApiKeys,customApiProfile,responseEffort}){
  if(!first?.ok || !shouldRunUiRefinementPass(message,files))return first;
  let draft='';
  try{
    draft=await readInternalProviderText(first.response.clone(),90000);
  }catch(_){
    return first;
  }
  if(!draft.trim())return first;

  activity(emit,'ui-polish','Polishing the requested interface, responsive layout, and visual states','running','build');
  const refineSystem=systemInstruction +
    '\n FINAL UI REFINEMENT MODE: You are performing a second quality pass on a generated interface. Output only the improved final user-facing answer. Preserve functionality and user constraints. Enforce the VISUAL UI IMPLEMENTATION CONTRACT strictly.';
  try{
    const refined=await runProvider(provider,{
      model,
      history,
      files,
      message:buildUiRefinementPrompt(message,draft),
      systemInstruction:refineSystem,
      routedReason:routedReason||'ui-refinement',
      emit:null,
      autoFallback:false,
      customApiKeys,
      customApiProfile,
      responseEffort
    });
    if(refined?.ok){
      activity(emit,'ui-polish','Interface quality pass complete','completed','build');
      return refined;
    }
    activity(emit,'ui-polish','Interface quality pass unavailable — using the original generated result','warning','build');
  }catch(_){
    activity(emit,'ui-polish','Interface quality pass unavailable — using the original generated result','warning','build');
  }
  return first;
}

function applyChatFeatureSettings(body={}){
  const settings=body.personalization||{};
  const plugins=body.plugins||{};
  const {superpowers,skills,autoUse}=plugins;
  return {
    ...body,
    ...(settings.librarySearch===false?{files:[]}:{}),
    ...(settings.connectorSearch===false?{plugins:{superpowers,skills,autoUse,plugins:[]}}:{})
  };
}

export { responseMeta, shouldRunUiRefinementPass, buildUiRefinementPrompt, maybeRefineVisualUiResponse, applyChatFeatureSettings };
