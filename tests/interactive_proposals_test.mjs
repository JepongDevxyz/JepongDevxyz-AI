import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const api=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../interactive-proposals.css',import.meta.url),'utf8');
const badge=readFileSync(new URL('../notification-badge.svg',import.meta.url),'utf8');

assert(html.includes('<link rel="stylesheet" href="/interactive-proposals.css">'));
assert(html.includes("badge:'/notification-badge.svg'"),'notification badge must use JD transparent asset');
assert(badge.includes('viewBox="0 0 96 96"')&&badge.includes('stroke="#fff"'),'JD monochrome badge asset missing');

for(const fn of [
  'parseJdAssistantInteraction','renderJdAssistantInteraction','submitJdChoiceOption',
  'submitJdChoiceOwn','submitJdFollowup','dismissJdChoice','jdInteractionHistoryText'
]){
  assert(html.includes('function '+fn+'('),'missing interaction function '+fn);
}

assert(api.includes('[[JD_CHOICE]]'),'backend must teach every selected model the choice protocol');
assert(api.includes('[[JD_FOLLOWUPS]]'),'backend must teach every selected model the follow-up protocol');
assert(api.includes('MATERIAL unresolved choice'),'choice protocol must be gated to real ambiguity');
assert(api.includes('Do NOT use it for clear requests'),'clear requests must still be answered directly');
assert(api.includes("personalization?.suggestedPrompts!==false"),'follow-up protocol must honor Suggested prompts setting');

function between(src,start,end){
  const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
  assert(a>=0&&b>a,'missing segment '+start);
  return src.slice(a,b);
}

const parserSource=between(html,"        function parseJdAssistantInteraction(raw=''){",
  "\n        function jdInteractionHistoryText(");
const parse=new Function(parserSource+'\nreturn parseJdAssistantInteraction;')();

const parsed=parse(`Short intro.

[[JD_CHOICE]]
QUESTION: Anong features ang kailangan mo talaga sa una?
OPTION: Basic lang: trim, crop, merge clips
OPTION: May text, stickers, at filters din
OPTION: Full editor: timeline, multi-track, effects, export
[[/JD_CHOICE]]`);
assert.equal(parsed.text,'Short intro.');
assert.equal(parsed.interaction.choice.question,'Anong features ang kailangan mo talaga sa una?');
assert.deepEqual(parsed.interaction.choice.options,[
  'Basic lang: trim, crop, merge clips',
  'May text, stickers, at filters din',
  'Full editor: timeline, multi-track, effects, export'
]);

const follow=parse(`Hi! Ako ang JepongDevxyz AI.

[[JD_FOLLOWUPS]]
ITEM: Ano ang kaya mong gawin?
ITEM: Paano gumagana ang models mo?
[[/JD_FOLLOWUPS]]`);
assert(!follow.text.includes('JD_FOLLOWUPS'));
assert.deepEqual(follow.interaction.followups,['Ano ang kaya mong gawin?','Paano gumagana ang models mo?']);

const malformed=parse(`Visible answer
[[JD_CHOICE]]
QUESTION: Missing enough choices
OPTION: One
[[/JD_CHOICE]]`);
assert.equal(malformed.interaction,null,'invalid card must be dropped rather than rendered');
assert.equal(malformed.text,'Visible answer');

assert(html.includes('renderJdAssistantInteraction(assistantInteraction)'),'live reply must render interaction UI');
assert(html.includes("interaction:assistantInteraction"),'interaction metadata must persist with bot reply');
assert(html.includes('renderJdAssistantInteraction(m.interaction)'),'saved chats must restore interaction UI');
assert(html.includes('jdInteractionHistoryText(m.interaction)'),'next user reply must retain question context');

for(const cls of ['.jd-choice-card','.jd-choice-option','.jd-choice-own','.jd-followups','.jd-followup-btn']){
  assert(css.includes(cls),'missing UI style '+cls);
}
assert(css.includes('body.theme-light .jd-choice-card'),'light mode must be supported');

console.log('PASS: contextual choice card, own answer, Grok-style follow-ups, persistence/context, and JD notification badge.');
