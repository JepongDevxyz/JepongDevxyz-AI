import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const api=fs.readFileSync('api/chat.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('reactbits-micro.css','utf8');

const between=(src,start,end)=>{
  const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
  assert(a>=0&&b>a,'missing section: '+start);
  return src.slice(a,b);
};

assert(api.includes('RESPONSE PRESENTATION CONTRACT:'),'universal polished response contract missing');
assert(api.includes('PUBLIC_UPDATE:'),'quality preflight must produce a visible work update');
assert(api.includes("activity(emit,'work-commentary-1',parsedBrief.publicUpdate,'completed','commentary')"),
  'server must emit the quality work update as real activity');
assert(api.includes('responseEffortRank(responseEffort)>=2 && shouldUseQualityOrchestrator'),
  'complex Medium+ requests should get model-independent preflight');

const parseSrc=between(api,"function parseQualityPreflightOutput(raw=''){",
  '\nasync function readInternalProviderText(');
const parseSandbox={
  sanitizeAssistantOutput:text=>String(text||'').trim()
};
vm.createContext(parseSandbox);
vm.runInContext(parseSrc,parseSandbox);
const parsed=parseSandbox.parseQualityPreflightOutput(
  'PUBLIC_UPDATE: Gagawa ako ng kumpletong single-file build at susundin ko ang lahat ng requirements.\n'+
  'INTERNAL_BRIEF: Preserve the requested model, tools, streaming, and secure server-side behavior.'
);
assert.match(parsed.publicUpdate,/Gagawa ako ng kumpletong/);
assert.match(parsed.brief,/Preserve the requested model/);

const probeSrc=between(api,"function shouldProbeRequestedUrl(url='',message=''){",
  '\nasync function probeRequestedUrls(');
const probeSandbox={
  URL,
  normalizeIntentText:text=>String(text||'').toLowerCase()
};
vm.createContext(probeSandbox);
vm.runInContext(probeSrc,probeSandbox);
assert.equal(probeSandbox.shouldProbeRequestedUrl(
  'https://api.x.ai/v1',
  'Create a production-ready chatbot using base URL https://api.x.ai/v1'
),false,'API base configuration URL must not be GET-probed during a build request');
assert.equal(probeSandbox.shouldProbeRequestedUrl(
  'https://api.x.ai/v1',
  'Check if https://api.x.ai/v1 is reachable'
),true,'explicit endpoint check should still probe the requested URL');

assert(html.includes("String(normalized.kind||'').toLowerCase()==='commentary'"),
  'frontend must render server commentary separately from tiny status rows');
assert(html.includes("card.classList.add('ai-activity-kimi-flow')"),
  'Kimi activity layout class missing');
assert(html.includes("const notes=[...card.querySelectorAll('.ai-work-commentary__text')]"),
  'work commentary must persist in chat history');
assert(html.includes("const notesHtml=notes.map("),
  'saved work commentary must restore after refresh');
assert(css.includes('.ai-activity-kimi-flow .ai-work-commentary__text'),
  'Kimi-like work commentary typography missing');

console.log('PASS: Kimi-style grounded commentary, universal quality preflight, API-base probe guard, and persistence.');
