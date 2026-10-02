import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const api=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
function extract(name,nextName){
  const start=html.indexOf(`function ${name}(`);
  const end=html.indexOf(`\n        function ${nextName}(`,start);
  assert(start>=0&&end>start,`${name} must exist as a separate model-selection helper`);
  return html.slice(start,end);
}
const matchSource=extract('selectedModelOptionMatches','updateSelectedModelUI');
const matches=new Function(matchSource+'\nreturn selectedModelOptionMatches;')();

assert.equal(matches('bailucode','bailu-apex','normal','bailucode','bailu-apex','normal'),true);
assert.equal(matches('bailucode','bailu-apex','anthropic','bailucode','bailu-apex','normal'),false,
  'normal and Anthropic routes for the same model id must never both be selected');
assert.equal(matches('bailucode','bailu-apex','anthropic','bailucode','bailu-apex','anthropic'),true);
assert.equal(matches('bailucode','bailu-2.8-lite','anthropic','bailucode','bailu-apex','anthropic'),false);

const page=html.match(/<section class="model-provider-page" data-provider="bailucode">([\s\S]*?)<\/section>/)?.[1]||'';
assert.match(page,/data-bailu-route="anthropic" onclick="selectProviderModel\('bailucode','bailu-apex','BAILU Apex · Anthropic','anthropic'\)"/);
assert.match(page,/data-bailu-route="anthropic" onclick="selectProviderModel\('bailucode','bailu-2\.8-lite','BAILU 2\.8 Lite · Anthropic','anthropic'\)"/);
assert.match(html,/bailuRoute:\s*currentSelectedProvider==='bailucode'\?currentBailuRoute:undefined/,
  'chat requests must carry the selected Bailucode route');
assert.match(html,/\.model-provider-page\.carousel-away\s*\{[^}]*visibility:\s*hidden/s,
  'inactive provider pages must not ghost over the active page during mobile swipes');
assert.match(html,/if\(!\["unorouter","nvidia","codecraft","agentrouter","hcnsec","seekai"\]\.includes\(page\.dataset\.provider\)\)return;/,
  'Bailucode Normal and Anthropic sections must remain grouped instead of being flattened by price sorting');
assert.match(api,/if\(args\.bailuRoute==='anthropic'\)/,
  'the backend must honor the selected Anthropic route before OpenAI-compatible fallback');

const start=api.indexOf('async function runBailucode(args){');
const end=api.indexOf('\nfunction fallbackProviderCandidates',start);
assert(start>=0&&end>start,'Bailucode dispatch helper must be present');
const dispatch=new Function('runBailuAnthropic','runOpenAICompatible',api.slice(start,end)+'\nreturn runBailucode;');
const calls=[];
let anthropicResult={ok:true,id:'anthropic'};
let openAIResult={ok:true,id:'openai'};
const runBailuAnthropic=async()=>{calls.push('anthropic');return anthropicResult;};
const runOpenAICompatible=async()=>{calls.push('openai');return openAIResult;};
const runBailucode=dispatch(runBailuAnthropic,runOpenAICompatible);

assert.equal((await runBailucode({bailuRoute:'anthropic',autoFallback:false})).id,'anthropic');
assert.deepEqual(calls,['anthropic'],'selected Anthropic must run first without touching normal route');
calls.length=0;
anthropicResult={ok:false,status:503};
assert.equal((await runBailucode({bailuRoute:'anthropic',autoFallback:true})).id,'openai');
assert.deepEqual(calls,['anthropic','openai'],'normal route may run only as opted-in Anthropic fallback');
calls.length=0;
anthropicResult={ok:true,id:'anthropic'};
assert.equal((await runBailucode({bailuRoute:'normal',autoFallback:true})).id,'openai');
assert.deepEqual(calls,['openai'],'normal route remains the first choice when selected');
console.log('PASS: Bailucode normal and Anthropic model routes are mutually exclusive and the selected route reaches chat API');
