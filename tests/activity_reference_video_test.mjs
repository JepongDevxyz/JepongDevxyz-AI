import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../reactbits-micro.css',import.meta.url),'utf8');
const backend=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
function between(source,start,end){
 const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
 assert(a>=0&&b>a,'Missing source boundary: '+start);
 return source.slice(a,b);
}
assert(html.includes("indicator.id = 'activeAiIndicator'"),'Activity container should be created for every request');
for(const id of ['aiActivityList','aiActivitySummary','aiActivityTimer','aiActivityLattice','jdThoughtsOverlay','jdThoughtsList','jdThoughtsSheet','jdThoughtsTitle']){
 assert(html.includes('id="'+id+'"'),'Missing activity element: '+id);
}
assert(html.includes('<link rel="stylesheet" href="/activity-reference.css">'));
assert(html.includes('onclick="openJdThoughts(this)"'));
assert(html.includes('onclick="toggleActivityDetails(this)"'),'Original inline collapse remains usable');
assert(html.includes("if(event.target===this)closeJdThoughts()"));
assert(html.includes("event.key==='Escape'"),'Thoughts needs keyboard close');
assert(html.includes('jdThoughtsDragStart'),'Thoughts should allow swipe-down on handle');
assert(css.includes('.ai-activity-card.collapsed .thought-line__trace{display:none}'),
 'ThoughtLine trace must collapse with the Activity card');
assert(css.includes('.jd-thoughts-overlay.open{display:flex}'));
assert(css.includes('.jd-thoughts-list'));
assert(css.includes('.thought-line__head{'),
 'ThoughtLine header styling must replace the legacy summary row');
assert(css.includes('.ai-activity-card.reference-work-flow .ai-activity-header-actions{display:none!important}'),
 'Frame-matched Work surface must not show the old Thinking/Thought for header');
assert(css.includes('font-size:15.5px') && css.includes('font-size:16px'),
 'Reference status/commentary typography calibration missing');
assert(css.includes('.ai-activity-row.ai-activity-iconless'),
 'Plain process rows must align like the supplied Work recording');
assert.equal((html.match(/<lottie-player/g)||[]).length,6,'Preserve original welcome animations');
assert(html.includes('<div class="welcome-title">JepongDevxyz AI</div>'));

const functions=between(html,'        // The reference shows a live elapsed header','        function showAIIndicator(');
assert(!functions.includes("appendActivityEvent({"),'Elapsed timers must not fabricate activity events');
assert(functions.includes('target.replaceChildren(...content)'),'Thoughts must display existing DOM activity rows');
assert(functions.includes("list?.querySelectorAll('.ai-activity-row').forEach(row=>"));
assert(functions.includes('row.cloneNode(true)'),'The sheet must copy real SSE-derived rows, not script fake work');
const formatterSource=between(functions,'function formatJdActivityElapsed(ms){','function stopJdActivityClock(){');
const format=new Function(formatterSource+'\nreturn formatJdActivityElapsed;')();
for(const [ms,label] of [[0,'0s'],[950,'0s'],[1000,'1s'],[59999,'59s'],[60000,'1m 0s'],[277000,'4m 37s']]){
 assert.equal(format(ms),label,'Elapsed clock formatting '+ms);
}
const timer={textContent:''};
const card={dataset:{startedAt:'100000',finalized:'false'},querySelector(selector){
 return selector==='#aiActivityTimer'?timer:null;
}};
const tick=new Function('Date',formatterSource+'\nreturn tickJdActivityClock;')({now:()=>377000});
tick(card);
assert.equal(timer.textContent,'4m 37s');
card.dataset.finalized='true';tick(card);
assert.equal(timer.textContent,'4m 37s','Finished card must not restart the clock');

const normalizer=between(html,'        function normalizeActivityEventForUI(','        function shouldShowAIActivity(');
const normalize=new Function('sanitizeUiErrorMessage',normalizer+
 '\nreturn normalizeActivityEventForUI;')(value=>String(value));
assert.equal(normalize({id:'stream-open',kind:'process',label:'Streaming'}),null);
assert.equal(normalize({id:'live-progress-4',kind:'process',label:'fake scheduled work'}),null);
assert.equal(normalize({id:'task-context',kind:'process',state:'completed',label:'Checking requested design'}).label,'Checking requested design');
assert.equal(normalize({id:'web-search',kind:'web',state:'running',label:'Searching live web'}).label,'Searching live web');
assert.equal(normalize({id:'thinking',kind:'build',state:'running',label:'Preparing implementation'}).label,'Preparing implementation');
assert.equal(normalize({id:'generation',kind:'generate',state:'running',label:'Generating response'}).visibility,'details');

const append=between(html,'        function appendActivityEvent(evt = {}) {','        function finishAIIndicator(');
assert(append.includes("if(id==='task-context')"),'Backend task-context must enter the reference-style timeline');
assert(append.includes("if(lead)lead.textContent=''"),
 'Temporary client lead must clear as soon as the first truthful server milestone arrives');
assert(append.includes('syncJdThoughts();'),'New real events must reach an already-open Thoughts sheet');
assert(append.includes('ChatGPT-style activity history: keep completed statuses visible in order.'));
assert(append.includes("const detailsOnly = normalized.visibility==='details'"),
 'Low-level provider/generation plumbing must be excluded from the primary reference surface');
assert(append.includes("const iconless = id==='thinking'"),
 'Task-specific model work must use the no-icon reference row');
assert(append.includes("toolLikeKinds=new Set(['web','search','research','file','test','deploy','api','image','video','document','github','plugin'])"),
 'Real tool lifecycle transitions must include web, files, tests, GitHub, and plugins');
assert(append.includes("['thinking','generation','router'].includes(id)"),
 'Response audit and generated-code verification must remain truthful visible tool lifecycles');
assert(append.includes("row.dataset.activityId=id+'-history-'+Date.now()"),
 'A real running tool row must remain visible when its truthful completion milestone arrives');
assert(append.includes("scrollToBottom(false)"),
 'Reference activity growth must keep the newest status above the composer');
assert(append.includes("card.dataset.taskSummary=String(normalized.label||'').slice(0,220)"),
 'Task-specific context must stay separate from provider/tool plumbing');
assert(!append.includes("appendActivityEvent({"),
 'Activity renderer must not fabricate client-side plan events');
assert(backend.includes("activity(emit,id,`Read attached"),'Real file events remain server-grounded');
assert(backend.includes("activity(emit,'web-search'"),'Real web events remain server-grounded');
assert(backend.includes("activity(emit,'fallback'"),'Real fallback events remain server-grounded');
const reveal=between(html,'                const revealFinalResponse = async (elapsedMs=null) => {','                if (contentType.includes(\'text/event-stream\')) {');
assert(reveal.includes('await drainActivityPlayback();'),
 'Queued truthful activity must drain before the final answer is revealed');
assert(reveal.indexOf('await drainActivityPlayback();') < reveal.indexOf('finishAIIndicator(true, elapsedMs);'),
 'Activity playback must drain before finalization');
assert(reveal.includes('requestAnimationFrame(() => requestAnimationFrame(() => {'),
 'Activity must finalize before the reply is revealed');
assert(html.includes('const JD_ACTIVITY_MIN_VISIBLE_GAP_MS=230;'));
assert(html.includes('const JD_ACTIVITY_MIN_RUNNING_DWELL_MS=650;'));
assert(html.includes('const JD_ACTIVITY_FINAL_DRAIN_MAX_MS=2800;'));
assert(html.includes('function pumpActivityPlayback(){'));
assert(html.includes('function flushActivityPlaybackNow(){'));
assert(html.includes('jdActivityPlaybackQueue.push(normalized);'));
assert(css.includes('@keyframes jdActivityCurrentDot'));
assert(css.includes('.ai-activity-row.running.ai-activity-current .ai-activity-label::after'),
 'Current reference step needs the inline breathing dot seen in the supplied videos');
console.log('PASS: frame-matched Work activity surface, task-specific model-work row, commentary flow, auto-scroll, and truthful SSE sequencing.');
