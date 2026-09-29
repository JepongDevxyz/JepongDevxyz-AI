import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const api=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
const section=(start,end)=>{
  const a=api.indexOf(start),b=api.indexOf(end,a+start.length);
  assert(a>=0&&b>a,`Missing source section: ${start}`);
  return api.slice(a,b);
};

const policySource=section('function finishReasonNeedsContinuation(', 'function buildContinuationHistory(');
const policy=new Function(policySource+'\nreturn {continuationNeeded,continuationOverlapLength:typeof continuationOverlapLength==="function"?continuationOverlapLength:null};')();
assert.equal(policy.continuationNeeded({reason:'max_tokens'},'partial answer'),false,
  'A normal output-token cap must not start an automatic provider continuation');
assert.equal(policy.continuationNeeded({reason:'unknown'},'partial answer'),false,
  'An unknown stream finish must not be mistaken for a credit failure');
assert.equal(policy.continuationNeeded({reason:'credit_exhausted',creditExhausted:true},'partial answer'),true,
  'A confirmed mid-stream credit exhaustion must continue the existing response');
assert.equal(policy.continuationNeeded({reason:'credit_exhausted',creditExhausted:true},''),false,
  'Do not create a continuation if the provider produced no partial response');
assert.equal(typeof policy.continuationOverlapLength,'function','Continuation overlap helper must exist');
const repeatedTail='ends with a unique phrase.';
assert.equal(policy.continuationOverlapLength(`The answer ${repeatedTail}`,`${repeatedTail} Next sentence`),repeatedTail.length,
  'Continuation must remove exact repeated text at the stream boundary');

const parser=section('function openAIStreamToText(', 'function cohereStreamToText(');
assert(parser.includes('captureProviderStreamError('),'OpenAI-compatible SSE errors must be classified while streaming');
const errorSource=section('function captureProviderStreamError(', 'function isFallbackableProviderFailure(');
const captureError=new Function(errorSource+'\nreturn captureProviderStreamError;')();
const openAIParser=new Function('captureProviderStreamError',parser+'\nreturn openAIStreamToText;')(captureError);
const streamState={reason:''};
const sse=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('data: {"error":{"code":429,"status":"RESOURCE_EXHAUSTED","message":"quota exhausted"}}\n\n'));controller.close();}});
await new Response(openAIParser(sse,streamState)).text();
assert.equal(streamState.creditExhausted,true,'An actual mid-stream quota SSE event must reach the continuation trigger');
const gemini=section('async function runGemini(', 'async function runCloudflare(');
assert(gemini.includes('captureProviderStreamError('),'Gemini SSE quota errors must be detected mid-stream');
const quotaState={reason:''};
captureError(quotaState,{code:429,status:'RESOURCE_EXHAUSTED',message:'You exceeded your current quota.'});
assert.equal(quotaState.creditExhausted,true,'Gemini RESOURCE_EXHAUSTED events must trigger one continuation');
const rateLimitState={reason:''};
captureError(rateLimitState,{code:429,message:'Requests are rate limited; retry later.'});
assert.equal(rateLimitState.creditExhausted,false,'Ordinary rate limits must not be mislabeled as exhausted credits');
const stream=section('function activityStreamResponse(', 'export default async function handler(req)');
assert(stream.includes('continuationOverlapLength('),'Continuation output must be de-duplicated before reaching the user');
console.log('PASS: only confirmed mid-stream credit exhaustion continues; output-limit loops stop and repeated text is stripped.');
