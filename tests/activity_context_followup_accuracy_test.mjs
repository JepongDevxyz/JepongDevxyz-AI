import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';
import vm from 'node:vm';

const api=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

function between(src,start,end){
  const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
  assert(a>=0&&b>a,'missing section: '+start);
  return src.slice(a,b);
}

// Evaluate the intent/context block with only its harmless dependencies.
const source=between(api,'function normalizeIntentText(input=', '\nfunction contextActivityPlan(');
const sandbox={
  extractPublicUrl:text=>String(text||'').match(/https?:\/\/\S+/g)||[],
  detectArtifactRequest:()=>false,
  userAttachmentCount:()=>0,
  responseLengthPreference:()=>null,
  normalizeResponseEffort:()=> 'Medium'
};
const exported=vm.runInNewContext(source+`
;({
  normalizeIntentText,
  looksReferential,
  contextualTaskMessage,
  splitContextualTaskMessage,
  isVagueFreshnessFollowUp,
  activityTaskSubject,
  taskProfile,
  shouldAutoResearch
})`,sandbox);

assert.equal(exported.shouldAutoResearch('Yung latest ngayon ang gawin mo'),false,
  'vague freshness follow-up must not launch live web research');
assert.equal(exported.shouldAutoResearch('Ano ang latest ChatGPT model ngayon?'),true,
  'a freshness request with a concrete subject should still be live-research eligible');
assert.equal(exported.shouldAutoResearch('Search mo latest ChatGPT model'),true,
  'explicit search request must still search');

const history=[
  {role:'user',text:'Paki ayos ang statuses activity ng JepongDevxyz AI UI para accurate sa actual coding task.'},
  {role:'assistant',text:'Sige.'},
  {role:'user',text:'Gawin mong katulad ng Grok at ChatGPT ang activity timeline.'}
];
const contextual=exported.contextualTaskMessage('Yung latest ngayon ang gawin mo',history);
assert(contextual.includes('Follow-up: Yung latest ngayon ang gawin mo'));
assert(/status|activity|Grok|ChatGPT/i.test(contextual),'concrete prior task must be carried into vague follow-up');

const profile=exported.taskProfile(contextual,[]);
assert.notEqual(profile.kind,'research','contextual latest follow-up must keep project/task classification');
assert.equal(profile.freshnessFollowUp,true,'vague freshness follow-up should be marked as continuation');
assert(!/Yung latest ngayon ang gawin mo/i.test(profile.subject),
  'activity subject should use the concrete prior task instead of the vague follow-up');

assert(api.includes("getEnhancedLiveWebContext(message,webSearch,emit,{fast:fastAnswers,contextMessage:taskMessage})"),
  'live-web gate must evaluate the literal current message and use context only for query construction');
assert(api.includes("if(!terms.length)return false;"),
  'empty/generic search terms must not accept arbitrary Wikipedia results');

assert(html.includes("if(summary)summary.textContent='Thinking';"),
  'activity header should remain Thinking instead of provider connection text');
assert(html.includes("card.dataset.taskSummary=String(normalized.label||'').slice(0,220)"),
  'server task context should be retained separately from header plumbing');
assert(!html.includes("if(summary&&normalized.label)summary.textContent=String(normalized.label).slice(0,88);"),
  'task-context must not overwrite the ChatGPT/Grok-like header');

console.log('PASS: vague latest follow-ups stay bound to the real task, irrelevant web research is suppressed, and activity header remains task-neutral.');
