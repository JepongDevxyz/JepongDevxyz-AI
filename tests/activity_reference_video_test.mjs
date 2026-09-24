import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../activity-reference.css',import.meta.url),'utf8');
const backend=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
function between(source,start,end){
 const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
 assert(a>=0&&b>a,'Missing source boundary: '+start);
 return source.slice(a,b);
}
for(const id of ['activeAiIndicator','aiActivityList','aiActivitySummary','jdThoughtsOverlay','jdThoughtsList','jdThoughtsSheet','jdThoughtsTitle']){
 assert(html.includes('id="'+id+'"'),'Missing activity element: '+id);
}
assert(html.includes('<link rel="stylesheet" href="/activity-reference.css">'));
assert(html.includes('onclick="openJdThoughts(this)"'));
assert(html.includes('onclick="toggleActivityDetails(this)"'),'Original inline collapse remains usable');
assert(html.includes("if(event.target===this)closeJdThoughts()"));
assert(html.includes("event.key==='Escape'"),'Thoughts needs keyboard close');
assert(html.includes('jdThoughtsDragStart'),'Thoughts should allow swipe-down on handle');
assert(css.includes('.ai-activity-card.collapsed .ai-activity-lead'));
assert(css.includes('.jd-thoughts-overlay.open{display:flex}'));
assert(css.includes('.jd-thoughts-list'));
assert(css.includes('.ai-activity-summary-row{gap:8px!important'));
assert.equal((html.match(/<lottie-player/g)||[]).length,6,'Preserve original welcome animations');
assert(html.includes('<div class="welcome-title">JepongDevxyz AI</div>'));

const functions=between(html,'        // The reference shows a live elapsed header','        function showAIIndicator(');
assert(!functions.includes("appendActivityEvent({"),'Elapsed timers must not fabricate activity events');
assert(functions.includes('target.replaceChildren(...content)'),'Thoughts must display existing DOM activity rows');
assert(functions.includes("list?.querySelectorAll('.ai-activity-row').forEach(row=>"));
assert(functions.includes('row.cloneNode(true)'),'The sheet must copy real SSE-derived rows, not script fake work');
const format=new Function(functions+'\nreturn formatJdActivityElapsed;')();
for(const [ms,label] of [[0,'0s'],[950,'0s'],[1000,'1s'],[59999,'59s'],[60000,'1m 0s'],[277000,'4m 37s']]){
 assert.equal(format(ms),label,'Elapsed clock formatting '+ms);
}
const label={textContent:''};
const card={dataset:{startedAt:'100000',finalized:'false'},querySelector(selector){
 return selector==='.ai-activity-summary-text'?label:null;
}};
const tick=new Function('Date',functions+'\nreturn tickJdActivityClock;')({now:()=>377000});
tick(card);
assert.equal(label.textContent,'Thinking for 4m 37s');
card.dataset.finalized='true';tick(card);
assert.equal(label.textContent,'Thinking for 4m 37s','Finished card must not restart the clock');

const normalizer=between(html,'        function normalizeActivityEventForUI(','        function shouldShowAIActivity(');
const normalize=new Function('sanitizeUiErrorMessage',normalizer+
 '\nreturn normalizeActivityEventForUI;')(value=>String(value));
assert.equal(normalize({id:'stream-open',kind:'process',label:'Streaming'}),null);
assert.equal(normalize({id:'live-progress-4',kind:'process',label:'fake scheduled work'}),null);
assert.equal(normalize({id:'task-context',kind:'process',state:'completed',label:'Checking requested design'}).label,'Checking requested design');
assert.equal(normalize({id:'web-search',kind:'web',state:'running',label:'Searching live web'}).label,'Searching live web');

const append=between(html,'        function appendActivityEvent(evt = {}) {','        function finishAIIndicator(');
assert(append.includes("if(id==='task-context')"),'Backend task-context must become a reference-style lead');
assert(append.includes("lead.textContent=String(normalized.label||'').slice(0,220)"));
assert(append.includes('syncJdThoughts();'),'New real events must reach an already-open Thoughts sheet');
assert(append.includes('ChatGPT-style activity history: keep completed statuses visible in order.'));
assert(!append.includes("summary.textContent='Thinking';"),
 'Real-time header must not be overwritten by each SSE event');
assert(backend.includes("activity(emit,id,`Read attached"),'Real file events remain server-grounded');
assert(backend.includes("activity(emit,'web-search'"),'Real web events remain server-grounded');
assert(backend.includes("activity(emit,'fallback'"),'Real fallback events remain server-grounded');
const reveal=between(html,'                const revealFinalResponse = (elapsedMs=null) => {','                if (contentType.includes(\'text/event-stream\')) {');
assert(reveal.includes('finishAIIndicator(true, elapsedMs);'));
assert(reveal.includes('requestAnimationFrame(() => requestAnimationFrame(() => {'),
 'Activity must finalize before the reply is revealed');
console.log('PASS: video-reference elapsed clock, real SSE milestone lead/list, live Thoughts sheet and swipe/escape, deduped activity, original reply sequencing, and animations preserved.');
