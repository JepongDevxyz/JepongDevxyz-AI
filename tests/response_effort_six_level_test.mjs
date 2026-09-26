import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync('index.html','utf8');
const api=readFileSync('api/chat.js','utf8');

const levels=['Instant','Low','Medium','High','Extra','Max'];

assert(html.includes("const RESPONSE_EFFORT_LEVELS=['Instant','Low','Medium','High','Extra','Max']"),
  'frontend six-level effort model missing');
assert(html.includes('aria-valuemax="5"'),'frontend slider must expose six positions');
assert((html.match(/data-effort-index="/g)||[]).length>=6,'frontend six effort dots missing');
for(const level of levels) assert(html.includes(level),'frontend effort level missing: '+level);

assert(api.includes("const RESPONSE_EFFORT_LEVELS=['Instant','Low','Medium','High','Extra','Max']"),
  'server six-level effort model missing');
assert(api.includes("if(raw==='low'||raw==='light')return 'Low'"),'server Low normalization missing');
assert(api.includes("if(raw==='extra'||raw==='xhigh'||raw==='extra-high')return 'Extra'"),'server Extra normalization missing');
assert(api.includes("if(raw==='max'||raw==='maximum')return 'Max'"),'server Max normalization missing');

for(const level of levels){
  assert(api.includes(`responseEffort==='${level}'`), 'server quality instruction missing for '+level);
}

assert(api.includes('responseEffortRank(responseEffort)>=2 && shouldUseQualityOrchestrator'),
  'Medium/High/Extra/Max must enable provider-independent quality preflight for complex requests');
assert(api.includes("responseEffort==='Max'?16000:12000"),
  'Max must use the stronger internal verification brief budget');
assert(api.includes('responseEffortRank(effort)>=3'),
  'High/Extra/Max must be treated as heavy API effort');
assert(api.includes("personalization={...personalization,intelligence:responseEffort,fastAnswers}"),
  'normalized six-level effort must be carried into provider system instructions');

assert(api.includes("openRouter:['none','minimal','low','medium','high','xhigh']"),
  'OpenRouter must preserve all six native effort positions');
assert(api.includes("gemini:['MINIMAL','LOW','MEDIUM','HIGH','HIGH','HIGH']"),
  'Gemini thinking-level mapping missing');
assert(api.includes("reasoning_effort:policy.rank===0?'none':policy.standard"),
  'Groq Qwen reasoning effort mapping missing');
assert(api.includes("reasoning_effort:policy.standard"),
  'Groq GPT-OSS reasoning effort mapping missing');
assert(api.includes("provider==='mistral' && target==='mistral-small-latest'"),
  'Mistral native reasoning mapping missing');
assert(api.includes("provider==='nvidia' && target.includes('nemotron')"),
  'NVIDIA thinking budget mapping missing');
assert(api.includes("effortOutputBudgetFor(message,responseEffort)"),
  'provider generation budget must reflect selected response effort');
assert(api.includes("responseEffort:args.responseEffort||'Instant'"),
  'custom API path must receive selected response effort');
assert(api.includes("responseEffort:normalizeResponseEffort(body?.personalization?.intelligence,body?.personalization?.fastAnswers)"),
  'automatic continuation must preserve selected response effort');
assert(api.includes("Retry without only those optional fields") || api.includes("retry once without thinkingConfig"),
  'native effort compatibility fallback missing');

console.log('PASS: six-level response effort frontend/backend/provider contract');
