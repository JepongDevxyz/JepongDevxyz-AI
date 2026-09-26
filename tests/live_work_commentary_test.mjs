import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const api=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../reactbits-micro.css',import.meta.url),'utf8');

assert(api.includes('LIVE WORK COMMENTARY:'),'backend must teach models the live work-note protocol');
assert(api.includes('[[JD_WORK_NOTE]]<note>[[/JD_WORK_NOTE]]'),'exact work-note wrapper missing');
assert(api.includes('never hidden chain-of-thought'),'work notes must be high-level, not private reasoning');
assert(api.includes('Do not claim a search, test, build, deployment'),'work notes must stay grounded in verified tool context');

for(const fn of ['extractJdWorkNotes','stripJdWorkNotes','appendJdWorkNote','syncJdWorkNotesFromStream']){
  assert(html.includes('function '+fn+'('),'missing frontend work-note helper: '+fn);
}
assert(html.includes('const jdWorkNotesSeen = new Set();'),'stream-level work-note dedupe missing');
assert(html.includes('syncJdWorkNotesFromStream(fullResponse,jdWorkNotesSeen);'),'SSE/non-SSE stream must surface notes live');
assert(html.includes('activePartialResponse=stripJdWorkNotes(fullResponse);'),'partial answer must not leak protocol markers');
assert(html.includes('fullResponse=stripJdWorkNotes(fullResponse);'),'final answer must remove work-note metadata');
assert(css.includes('.ai-work-commentary{')&&css.includes('.ai-work-commentary__text{'),'work-note styles missing');

function between(src,start,end){
  const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
  assert(a>=0&&b>a,'missing source segment: '+start);
  return src.slice(a,b);
}
const helperSrc=between(html,"        function extractJdWorkNotes(raw=''){",
  "\n        const safeAssistantText = (text='') =>");
const helpers=new Function(helperSrc+'\nreturn {extractJdWorkNotes,stripJdWorkNotes};')();

const sample=`Final answer intro.

[[JD_WORK_NOTE]]Gagawa ako ng single-file implementation habang pinapanatili ang existing UI at behavior.[[/JD_WORK_NOTE]]

Some answer text.

[[JD_WORK_NOTE]]Na-verify ko ang available tool context bago ko i-finalize ang integration.[[/JD_WORK_NOTE]]

\`\`\`js
console.log("done")
\`\`\``;

const notes=helpers.extractJdWorkNotes(sample);
assert.deepEqual(notes,[
  'Gagawa ako ng single-file implementation habang pinapanatili ang existing UI at behavior.',
  'Na-verify ko ang available tool context bago ko i-finalize ang integration.'
]);
const stripped=helpers.stripJdWorkNotes(sample);
assert(!stripped.includes('JD_WORK_NOTE'),'final response must not expose protocol');
assert(!stripped.includes('Gagawa ako ng single-file implementation'),'work note must not duplicate in final response');
assert(stripped.includes('Final answer intro.')&&stripped.includes('console.log("done")'),'normal final response must remain intact');

const partial=helpers.stripJdWorkNotes('Visible answer\n[[JD_WORK_NOTE]]Still streaming');
assert.equal(partial,'Visible answer','incomplete work-note token must not leak');

console.log('PASS: reference-style live work commentary is additive, grounded, deduped, and stripped from the final answer.');
