import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import core from '../lib/personalization-core.js';

const api=readFileSync('api/chat.js','utf8');
function between(source,start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  assert(a>=0&&b>a,`Could not locate source block ${start}`);
  return source.slice(a,b);
}

assert(/import\s+\{[^}]*normalize[^}]*instructions[^}]*responseEffort[^}]*\}\s+from\s+'\.\.\/lib\/personalization-core\.js'/.test(api),
  'The API must import the shared personalization core');
assert(api.includes('personalizationInstructions(p)'),
  'The shared system instruction must include canonical personalization guidance');
assert(api.includes('personalizationResponseEffort(personalization)'),
  'The shared provider boundary must use canonical response effort');

const normalizeSource=between(api,'function normalizeChatPersonalizationForRequest(input=','\nfunction applyChatFeatureSettings');
const normalizeForRequest=new Function('normalizePersonalization','personalizationResponseEffort',
  `${normalizeSource}\nreturn normalizeChatPersonalizationForRequest;`)(core.normalize,core.responseEffort);
const raw={
  baseStyle:'Friendly',warm:'More',enthusiastic:'Less',headersLists:'More',emoji:'Less',
  intelligence:'High',fastAnswers:false,suggestedPrompts:false,
  customInstructions:'Keep answers in short paragraphs.',nickname:'Jay',pet:'Fox'
};
const normalized=normalizeForRequest(raw);
assert.equal(normalized.baseStyle,'Friendly');
assert.equal(normalized.warm,'More');
assert.equal(normalized.enthusiastic,'Less');
assert.equal(normalized.headersLists,'More');
assert.equal(normalized.emoji,'Less');
assert.equal(normalized.intelligence,'High');
assert.equal(normalized.fastAnswers,false);
assert.equal(normalized.suggestedPrompts,false);
assert.equal(normalized.nickname,'Jay','Unrelated personalization fields must survive canonical normalization');
assert.deepEqual(normalizeForRequest(null),null,'Absent preferences should remain absent');
assert.equal(normalizeForRequest({...raw,intelligence:'bogus'}).intelligence,'Instant',
  'Unsupported effort values must be normalized before routing');
assert.equal(normalizeForRequest({...raw,intelligence:'High',fastAnswers:true}).intelligence,'Instant',
  'The legacy fast-answer toggle must override the selected effort consistently');

const systemSource=between(api,'function buildSystemInstruction(', '\n\n/* =========================================================\n   SMART REAL-TIME RESEARCH');
assert(systemSource.includes('personalizationInstructions(p)'),
  'The canonical prompt instructions must be included for every provider');
assert(systemSource.includes('personalization?.suggestedPrompts!==false'),
  'Disabling suggested prompts must still suppress follow-up generation');

const routerSource=between(api,'async function runProvider(provider,args){','\nfunction responseMeta(');
const calls=[];
const capture=name=>async(...args)=>{calls.push({name,args});return {ok:true};};
const runProvider=new Function(
  'runGenericCustomApi','runGemini','runCloudflare','runCohere','runAIHorde','runBailucode',
  'runAgentRouter','runSeekAI','runOpenAICompatible',
  `return (${routerSource.trim()});`
)(capture('custom-api'),capture('gemini'),capture('cloudflare'),capture('cohere'),
  capture('aihorde'),capture('bailucode'),capture('agentrouter'),capture('seekai'),capture('openai-compatible'));

const providers=[
  ['gemini','gemini'],['cloudflare','cloudflare'],['cohere','cohere'],['aihorde','aihorde'],
  ['bailucode','bailucode'],['agentrouter','agentrouter'],['seekai','seekai'],
  ...['groq','openrouter','mistral','unorouter','nvidia','codecraft','hcnsec'].map(provider=>[provider,'openai-compatible']),
  ['custom-api','custom-api']
];
const systemInstruction=`Jepong persona: ${core.instructions(normalized)}`;
for(const [provider,expectedAdapter] of providers){
  const args={model:'test-model',history:[],files:[],message:'hello',systemInstruction,
    responseEffort:normalized.intelligence,personalization:normalized,
    customApiProfile:{name:'Example',baseUrl:'https://api.example.com',model:'test-model'}};
  await runProvider(provider,args);
  const call=calls.at(-1);
  assert.equal(call.name,expectedAdapter,`${provider} must reach its expected adapter`);
  const adapterArgs=provider==='custom-api'?call.args[1]:call.args.at(-1);
  assert.equal(adapterArgs.systemInstruction,systemInstruction,`${provider} must receive the shared persona prompt`);
  assert.equal(adapterArgs.responseEffort,'High',`${provider} must receive the normalized effort`);
}

const adapterBlocks=[
  ['Gemini','async function runGemini(','\nasync function runCloudflare('],
  ['Cloudflare','async function runCloudflare(','\nfunction sanitizeCustomApiProfile('],
  ['Custom API','async function runGenericCustomApi(','\nfunction chatCompletionsUrl('],
  ['SEEKAI','async function runSeekAI(','\nasync function runOpenAICompatible('],
  ['OpenAI-compatible','async function runOpenAICompatible(','\nasync function runCohere('],
  ['Cohere','async function runCohere(','\nfunction aiHordeNativePrompt('],
  ['AI Horde','async function runAIHordeNativeSelected(','\nasync function runAIHorde('],
  ['AgentRouter','async function runAgentRouter(','\nasync function runBailuAnthropic('],
  ['BailuCode Anthropic','async function runBailuAnthropic(','\nasync function runBailucode(']
];
for(const [label,start,end] of adapterBlocks){
  const source=between(api,start,end);
  assert(source.includes('systemInstruction'),`${label} must use the shared system prompt in its upstream payload`);
  assert(source.includes('responseEffort'),`${label} must use the shared response effort`);
}

console.log('PASS: canonical personalization and response effort reach every built-in and custom provider adapter.');
