// Chat feature settings - standalone, zero imports (breaks circular dependency)
// Moved from runners.js to break circular dependency (api/chat.js imports these)
export function applyChatFeatureSettings(body={}){
  const settings=body.personalization||{};
  const plugins=body.plugins||{};
  const {superpowers,skills,autoUse}=plugins;
  return {
    ...body,
    ...(settings.librarySearch===false?{files:[]}:{}),
    ...(settings.connectorSearch===false?{plugins:{superpowers,skills,autoUse,plugins:[]}}:{})
  };
}

export function sanitizeCustomApiProfile(body){
  const p=body?.customApiProfile;if(!p||typeof p!=='object')return null;
  const rawKeys=[p.apiKey,...(Array.isArray(p.apiKeys)?p.apiKeys:String(p.apiKeys||'').split(/[\\n,]+/))];
  const apiKeys=[...new Set(rawKeys.map(x=>String(x||'').trim().slice(0,2048)).filter(x=>x.length>=8))].slice(0,API_GUARD.maxProviderCredentialsPerRequest);
  const apiKey=apiKeys[0]||'';
  let baseUrl=String(p.baseUrl||'').trim().slice(0,500);
  const name=String(p.name||'Custom API').trim().slice(0,80);
  const model=String(p.model||'auto').trim().slice(0,200)||'auto';
  if(!apiKey||!/^https:\/\//i.test(baseUrl))return null;
  baseUrl=baseUrl.replace(/\/$/,'');
  return {name,apiKey,apiKeys,baseUrl,model,autoLoadModels:p.autoLoadModels!==false};
}

export async function liveAIHordePickerModels(preferred=[]){
  const firstKey=getProviderKeys('aihorde',false).find(key=>key!==AIHORDE_ANONYMOUS_KEY)||'';
  const [keyStatus,modelsResult]=await Promise.all([
    checkAIHordeCredential(firstKey),
    getAIHordeActiveModels(AbortSignal.timeout(9000))
      .then(active=>({ok:true,active})).catch(()=>({ok:false,active:[]}))
  ]);
  const models=fourResponsiveAIHordeModels(modelsResult.active,preferred).map(item=>({
    id:item.name,name:item.name,workers:item.workers,etaSeconds:item.eta,
    queued:item.queued,online:true
  }));
  return {status:modelsResult.ok?(models.length?'ready':'no-fast-workers'):'unavailable',
    models,keyStatus,checkedAt:new Date().toISOString(),source:'AI Horde native text worker status',
    error:modelsResult.ok?'':'Could not verify live AI Horde worker availability. Please retry.'};
}
