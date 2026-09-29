import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const chat=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
const section=(start,end)=>{
  const a=chat.indexOf(start),b=chat.indexOf(end,a+start.length);
  assert(a>=0&&b>a,`Missing source section: ${start}`);
  return chat.slice(a,b);
};

const candidateSource=section('function fallbackProviderCandidates(', '\nasync function runAvailableProviderFallback(');
const candidates=new Function('PROVIDERS','configured','API_GUARD',candidateSource+'\nreturn fallbackProviderCandidates;')(
  {gemini:{defaultModel:'gemini-fast',models:['gemini-fast']},groq:{defaultModel:'groq-main',models:['groq-main']},mistral:{defaultModel:'mistral-main',models:['mistral-main']},aihorde:{defaultModel:'auto',models:['auto']}},
  provider=>['gemini','groq','mistral'].includes(provider),
  {maxFallbackProviders:2}
);
assert.deepEqual(candidates('groq').map(x=>x.provider),['gemini','mistral'],
  'An enabled fallback should try available providers other than the exhausted selection');
assert.deepEqual(candidates('gemini').map(x=>x.provider),['groq','mistral'],
  'Fallback targets should be bounded and should not include the selected provider or AI Horde');
assert.deepEqual(candidates('groq',{providers:{gemini:{defaultModel:'gemini-fast'},groq:{defaultModel:'groq-main'},mistral:{defaultModel:'mistral-main'}},isConfigured:()=>true,limit:5,files:[{mimeType:'image/png',data:'image'}]}).map(x=>x.provider),['gemini'],
  'Image continuation may only move to a provider with a supported vision route');
assert.deepEqual(candidates('gemini',{providers:{gemini:{defaultModel:'gemini-fast'},groq:{defaultModel:'groq-main'},mistral:{defaultModel:'mistral-main'}},isConfigured:()=>true,limit:5,files:[{mimeType:'video/mp4',data:'video'}]}).map(x=>x.provider),[],
  'Video continuation must not silently switch to a provider without verified video input support');

const runnerSource=section('async function runAvailableProviderFallback(', '\nasync function runProvider(');
assert(runnerSource.includes('includeEmergencyFallback')&&runnerSource.includes('runRegistered'),
  'Enabled response continuation must reach registered/anonymous emergency models after configured providers fail');
const mockRunner=async (provider,args)=>{
  assert.equal(args.autoFallback,true,'Fallback attempts require the explicit user opt-in');
  assert.equal(args.history.at(-1)?.text,'already streamed',
    'Fallback continuation must receive the already-streamed assistant text as context');
  assert.equal(args.files[0]?.data,'image-bytes',
    'Fallback continuation must retain the original attachment data');
  if(provider==='gemini'){
    assert.deepEqual(args.customApiKeys,['gemini-user-key-1','gemini-user-key-2'],
      'Fallback must retain that provider’s configured rotational keys');
    assert.equal(args.customApiProfile,null,'Do not leak a selected custom endpoint into fallback providers');
    return {ok:true,response:'continued'};
  }
  return {ok:false,status:429,error:'quota exhausted'};
};
const fallback=new Function('fallbackProviderCandidates','configured','sanitizeCustomProviderKeys','runProvider','isFallbackableProviderFailure','runAIHorde','runAnonymousAIHordeFallback',runnerSource+'\nreturn runAvailableProviderFallback;')(
  (selected,{providers,isConfigured,limit})=>Object.keys(providers).filter(p=>p!==selected&&p!=='aihorde'&&isConfigured(p)).slice(0,limit).map(p=>({provider:p,model:providers[p].defaultModel})),
  ()=>false,
  (_body,p)=>p==='gemini'?['gemini-user-key-1','gemini-user-key-2']:[],
  mockRunner,
  (status,error)=>status===429||/credit|quota/i.test(error),
  async()=>({ok:false,status:429,error:'registered Horde credits exhausted'}),
  async()=>({ok:false,status:503,error:'no anonymous workers available'})
);
const recovered=await fallback('groq',{model:'groq-main',history:[{role:'model',text:'already streamed'}],files:[{mimeType:'image/png',data:'image-bytes'}],message:'continue',autoFallback:true}, {
  body:{customApiKeys:{}},providers:{groq:{defaultModel:'groq-main'},gemini:{defaultModel:'gemini-fast'},mistral:{defaultModel:'mistral-main'}},limit:2,runner:mockRunner
});
assert.equal(recovered.ok,true,'Fallback should return the first available provider that completes the continuation');
assert.equal(recovered.fallbackProvider,'gemini');

const failed=await fallback('groq',{model:'groq-main',autoFallback:true}, {
  body:{},providers:{groq:{defaultModel:'groq-main'},gemini:{defaultModel:'gemini-fast'},mistral:{defaultModel:'mistral-main'}},limit:2,
  runner:async()=>({ok:false,status:429,error:'quota exhausted'}),includeEmergencyFallback:true
});
assert.equal(failed.ok,false,'When all fallback providers are exhausted, continuation must fail');

const hordeContinuation=await fallback('groq',{model:'groq-main',autoFallback:true}, {
  body:{},providers:{groq:{defaultModel:'groq-main'}},limit:2,runner:async()=>({ok:false,status:429,error:'quota exhausted'}),
  includeEmergencyFallback:true,runRegistered:async args=>({ok:true,response:'horde continuation',fallbackModel:args.model})
});
assert.equal(hordeContinuation.ok,true,'Enabled fallback should continue through registered emergency models before declaring failure');
assert.equal(hordeContinuation.fallbackProvider,'aihorde');

const hordeMediaSkipped=await fallback('groq',{model:'groq-main',autoFallback:true,files:[{mimeType:'image/png',data:'image-bytes'}]}, {
  body:{},files:[{mimeType:'image/png',data:'image-bytes'}],providers:{groq:{defaultModel:'groq-main'}},limit:2,
  runner:async()=>({ok:false,status:429,error:'quota exhausted'}),includeEmergencyFallback:true,
  runRegistered:async()=>{throw new Error('Text-only emergency provider must not receive images');}
});
assert.equal(hordeMediaSkipped.ok,false,'Unsupported-media fallbacks must fail rather than silently switch to text-only AI Horde');

const sameProviderCalls=[];
const sameProviderFallback=await fallback('gemini',{model:'gemini-fast',autoFallback:true}, {
  body:{},providers:{gemini:{defaultModel:'gemini-fast',models:['gemini-fast','gemini-alt']},groq:{defaultModel:'groq-main',models:['groq-main']}},limit:1,
  runner:async(provider,args)=>{
    sameProviderCalls.push({provider,model:args.model});
    return args.model==='gemini-alt'?{ok:true,response:'same-provider continuation'}:{ok:false,status:429,error:'credits exhausted'};
  }
});
assert.deepEqual(sameProviderCalls,[{provider:'gemini',model:'gemini-alt'}],
  'Fallback should continue on another supported model within the selected provider before cross-provider routing');
assert.equal(sameProviderFallback.ok,true);

assert(chat.includes("autoFallback:body.autoFallback===true")||chat.includes("autoFallback:body.autoFallback === true"),
  'Automatic continuation must honor the user’s fallback toggle');
assert(chat.includes('customApiKeys:sanitizeCustomProviderKeys(body,resolvedProvider)'),
  'Automatic continuation must retry using the selected provider’s rotational keys');
assert(chat.includes("send('error',{\n                message:`The response could not continue"),
  'Exhausted continuation must report generation failure instead of silently completing a cut-off answer');
console.log('PASS: credit-exhausted streaming continues with rotational keys, uses opted-in provider fallback, and fails when all routes are exhausted.');
