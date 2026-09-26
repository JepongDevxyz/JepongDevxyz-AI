import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const api=fs.readFileSync('api/chat.js','utf8');
const html=fs.readFileSync('index.html','utf8');

function between(src,start,end){
  const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
  assert(a>=0&&b>a,'missing section: '+start);
  return src.slice(a,b);
}

const helperSource=between(api,'function cleanTaskText(message=', '\nfunction contextActivityPlan(message=');
const sandbox={
  console,
  URL,
  Date,
  detectArtifactRequest:()=>null,
  extractPublicUrl:text=>(String(text).match(/https?:\/\/\S+/g)||[]),
  isSafePublicUrl:()=>true,
  normalizeIntentText:input=>String(input||'').toLowerCase()
    .replace(/\byung\b/g,'iyong').replace(/\byan\b/g,'iyan')
    .replace(/\s+/g,' ').trim(),
  looksReferential:message=>/\b(ito|iyan|iyon|iyong|ganito|ganyan|same|ulit|again|this|that|previous|earlier)\b/i.test(String(message||'')),
  looksAmbiguousButLowRisk:message=>{
    const t=String(message||'').trim();
    return t.split(/\s+/).filter(Boolean).length<=5&&!/[?]/.test(t);
  },
  shouldAutoResearch:()=>false
};
vm.createContext(sandbox);
vm.runInContext(helperSource,sandbox);

const history=[
  {role:'user',parts:[{text:'Paki ayos yung status activity ng JepongDevxyz AI para accurate sa user request.'}]},
  {role:'model',parts:[{text:'Sige.'}]}
];
const contextual=sandbox.contextualTaskMessage('Yung latest ngayon ang gawin mo',history);
assert(contextual.includes('status activity ng JepongDevxyz AI'),'parts[] history must become the follow-up task anchor');
assert(contextual.endsWith('Follow-up: Yung latest ngayon ang gawin mo'));

assert.equal(sandbox.isVagueFreshnessFollowUp('Yung latest ngayon ang gawin mo'),true,
  'bare latest/ngayon continuation must be recognized as vague freshness');

assert(api.includes('if(isVagueFreshnessFollowUp(message))return false;'),
  'bare freshness follow-up must not auto-trigger live research');
assert(api.includes('contextMessage:taskMessage'),
  'live search layer must receive resolved conversation task');
assert(api.includes('const vagueFreshFollowUp=isVagueFreshnessFollowUp(message);'),
  'live search layer must gate vague freshness follow-ups');

assert(html.includes('function clientActivityTaskSubject('),
  'client should resolve a short follow-up before painting the temporary status lead');
assert(html.includes('Continuing the requested task:'),
  'temporary client status should describe the inherited task, not generic research');
assert(html.includes("if(summary && card.dataset.finalized!=='true')summary.textContent='Thinking';"),
  'provider plumbing must not replace the stable Thinking header');

console.log('PASS: vague latest/current follow-ups inherit real task context and do not launch unrelated research/status rows.');
