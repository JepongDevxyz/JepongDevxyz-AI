/* lib/chat/models.js — split from api/chat.js (mechanical move, no behavior change). */
import { PROVIDERS } from './config.js';
import { configured, credentialCount, getBailuAnthropicKeys, getProviderKeys } from './keys.js';
import { safeJsonResponse } from './search.js';
import { isRetryableStatus } from './stream.js';
import { json } from './utils.js';

async function mediaCapabilitySnapshot(){
  const result={};
  const add=(provider,image,video,detail='')=>{result[provider]={image,video,detail};};
  add('codecraft','unsupported','unsupported','Public API documents vision input, not image/video generation.');
  add('agentrouter',configured('agentrouter')?'available':'not-configured','gated','Image generation is documented; video generation remains gated upstream.');
  for(const p of ['unorouter','hcnsec','bailucode','seekai']) add(p,'unverified','unverified','No verified media-generation contract is configured yet.');

  if(!configured('nvidia')){
    add('nvidia','not-configured','not-configured','NVIDIA_API_KEY is not configured.');
  }else{
    const key=getProviderKeys('nvidia')[0];
    try{
      const res=await fetch('https://integrate.api.nvidia.com/v1/models',{headers:{Authorization:`Bearer ${key}`,Accept:'application/json'},signal:AbortSignal.timeout(7000)});
      if(res.ok){
        const data=await safeJsonResponse(res);
        const ids=(Array.isArray(data?.data)?data.data:[]).map(x=>String(x?.id||'').toLowerCase());
        const cosmos=ids.some(x=>x.includes('cosmos3')||x.includes('cosmos-3'));
        add('nvidia',cosmos?'available':'unverified',cosmos?'available':'unverified',cosmos?'Authenticated NVIDIA account exposes a Cosmos 3 model.':'NVIDIA key works, but Cosmos 3 was not exposed by /v1/models.');
      }else if(res.status===401||res.status===403) add('nvidia','no-access','no-access',`NVIDIA credential rejected (HTTP ${res.status}).`);
      else if(res.status===429) add('nvidia','limit-reached','limit-reached','NVIDIA rate limit reached.');
      else add('nvidia','temporarily-unavailable','temporarily-unavailable',`NVIDIA model discovery returned HTTP ${res.status}.`);
    }catch(_){ add('nvidia','temporarily-unavailable','temporarily-unavailable','NVIDIA model discovery could not be reached.'); }
  }
  return result;
}

const DYNAMIC_MODEL_PROVIDERS = new Set(['unorouter','nvidia','codecraft','hcnsec','bailucode','seekai']);

function providerModelsUrl(provider){
  const envName=provider.toUpperCase()+'_BASE_URL';
  const custom=String(process.env[envName]||'').trim().replace(/\/$/,'');
  if(custom){
    if(custom.endsWith('/models'))return custom;
    if(/\/(?:openapi\/)?v1$/i.test(custom))return custom+'/models';
    return custom+'/v1/models';
  }
  return ({
    unorouter:'https://api.unorouter.com/v1/models',
    nvidia:'https://integrate.api.nvidia.com/v1/models',
    codecraft:'https://codecraftapi.com/v1/models',
    agentrouter:'https://co.agentrouter.org/v1/models',
    hcnsec:'https://api.hcnsec.cn/v1/models',
    bailucode:'https://bailucode.com/openapi/v1/models',
    seekai:'https://seekai.cc/v1/models'
  })[provider] || '';
}

function normalizeModelCatalog(data){
  const raw=Array.isArray(data)?data:(Array.isArray(data?.data)?data.data:(Array.isArray(data?.models)?data.models:[]));
  const seen=new Set(),out=[];
  for(const item of raw){
    const id=String(typeof item==='string'?item:(item?.id||item?.model||item?.name||'')).trim();
    if(!id||seen.has(id))continue;
    seen.add(id);
    out.push({
      id,
      name:String(item?.name||item?.display_name||item?.displayName||id),
      type:String(item?.type||item?.object||''),
      capabilities:Array.isArray(item?.capabilities)?item.capabilities.map(String):[],
      contextWindow:Number(item?.context_window||item?.contextWindow||0)||null,
      pricing:item?.pricing&&typeof item.pricing==='object'?{
        inputPer1k:Number(item.pricing.input_per_1k)||null,
        outputPer1k:Number(item.pricing.output_per_1k)||null
      }:null
    });
  }
  return out.slice(0,500);
}

async function discoverProviderModels(provider){
  if(!DYNAMIC_MODEL_PROVIDERS.has(provider))return {provider,models:[],status:'unsupported'};
  const keys=provider==='bailucode' ? [...new Set([...getProviderKeys(provider),...getBailuAnthropicKeys()])] : getProviderKeys(provider);
  if(!keys.length)return {provider,models:[],status:'not-configured'};
  const url=providerModelsUrl(provider);
  if(!url)return {provider,models:[],status:'endpoint-not-configured'};
  let lastStatus=502;
  for(const key of keys){
    try{
      const headers={Authorization:'Bearer '+key,Accept:'application/json'};
      if(provider==='codecraft')headers['x-api-key']=key;
      const res=await fetch(url,{headers,signal:AbortSignal.timeout(8000)});
      lastStatus=res.status;
      if(res.ok){
        const data=await safeJsonResponse(res);
        const allModels=normalizeModelCatalog(data);
        const models=provider==='seekai' ? allModels.filter(item=>PROVIDERS.seekai.models.includes(item.id)) : allModels;
        return {provider,models,status:models.length?'ready':'empty',httpStatus:res.status,source:url};
      }
      if(!isRetryableStatus(res.status))break;
    }catch(_){lastStatus=502;}
  }
  return {provider,models:[],status:lastStatus===429?'limit-reached':([401,403].includes(lastStatus)?'no-access':'temporarily-unavailable'),httpStatus:lastStatus,source:url};
}

async function dynamicModelCatalog(){
  const providers={};
  await Promise.all([...DYNAMIC_MODEL_PROVIDERS].map(async p=>{providers[p]=await discoverProviderModels(p);}));
  return providers;
}

async function providerUsageSnapshot(){
  const providers={};
  for(const p of Object.keys(PROVIDERS)) providers[p]={configured:configured(p),status:configured(p)?'ready':'not-configured',credentials:credentialCount(p)};
  providers.cloudflare.freeDailyNeurons=10000;

  const openRouterKeys=getProviderKeys('openrouter');
  if(openRouterKeys.length){
    try{
      const r=await fetch('https://openrouter.ai/api/v1/key',{headers:{Authorization:`Bearer ${openRouterKeys[0]}`},signal:AbortSignal.timeout(5000)});
      if(r.ok){
        const d=(await r.json()).data||{};
        providers.openrouter.usage={limit:d.limit,limit_remaining:d.limit_remaining,limit_reset:d.limit_reset,usage:d.usage,usage_daily:d.usage_daily,usage_weekly:d.usage_weekly,usage_monthly:d.usage_monthly,is_free_tier:d.is_free_tier};
      }
    }catch(_){}
  }
  return providers;
}

export { mediaCapabilitySnapshot, DYNAMIC_MODEL_PROVIDERS, providerModelsUrl, normalizeModelCatalog, discoverProviderModels, dynamicModelCatalog, providerUsageSnapshot };
