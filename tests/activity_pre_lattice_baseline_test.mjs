import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync('index.html','utf8');
const css=readFileSync('reactbits-micro.css','utf8');
const between=(source,start,end)=>{
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  assert(a>=0&&b>a,`Missing source section: ${start}`);
  return source.slice(a,b);
};

const normalizerSource=between(html,'        function normalizeActivityEventForUI(evt = {}) {','        function shouldShowAIActivity(');
const normalize=new Function('sanitizeUiErrorMessage',normalizerSource+'\nreturn normalizeActivityEventForUI;')(
  value=>String(value||'')
);
const visibleSource=between(html,'        function activityEventUsesVisibleTimeline(evt={}){','        function resolveActivityPlaybackWaiters(');
const usesVisibleTimeline=new Function('activityPlaybackId',visibleSource+'\nreturn activityEventUsesVisibleTimeline;')(
  event=>String(event.id||'event').replace(/[^a-zA-Z0-9_-]/g,'-')
);

for(const event of [
  {id:'provider-codecraft',label:'CodeCraftAPI connected',kind:'provider',state:'completed'},
  {id:'generation',label:'Generating response',kind:'generate',state:'running'},
  {id:'response-audit',label:'Checking the response',kind:'test',state:'running'},
  {id:'output-verification',label:'Checking generated code',kind:'test',state:'completed'}
]){
  const normalized=normalize(event);
  assert.equal(normalized.visibility,'details',`Restore pre-Lattice visibility for ${event.id}`);
  assert.equal(usesVisibleTimeline(normalized),false,`Internal status must stay out of the original user-facing rows: ${event.id}`);
}
assert.equal(usesVisibleTimeline({id:'router',label:'Smart Router selected a model',kind:'route'}),false,
  'Smart Router details must stay out of the original user-facing rows');
for(const event of [
  {id:'task-plan',label:'Planned the response',kind:'process',state:'completed'},
  {id:'planned-trace-0',label:'Drafted the requested response',kind:'process',state:'completed'},
  {id:'web-search',label:'Searching the web',kind:'web',state:'running'},
  {id:'attachments',label:'Reviewed the uploaded file',kind:'file',state:'completed'}
]){
  const normalized=normalize(event);
  assert.equal(usesVisibleTimeline(normalized),true,`Original user-facing status must remain visible: ${event.id}`);
}

const finish=between(html,'        function finishAIIndicator(success = true, elapsedMs = null) {','        function removeAIIndicator(');
assert(!finish.includes('isActivityAutoCollapseEnabled'),
  'Finishing a response must keep the original visible status rows open');
assert(!finish.includes("classList.add('collapsed')"),
  'Only the user may collapse the original Activity list');
assert(!html.includes('id="jdAutoCollapseActivityToggle"'),
  'The later auto-collapse setting must not hide the original Activity response');

const show=between(html,'        function showAIIndicator(promptText, files = []) {','        function toggleActivityDetails(btn)');
assert(show.includes('class="rb-lattice-loader"'),
  'Lattice Loader must be added to the original activity header');
assert(show.includes('class="thought-line__text" id="aiActivitySummary"'),
  'Thought Line must be added to the original activity header');
assert(show.includes('class="ai-activity-list" id="aiActivityList"'),
  'The original activity timeline must stay in the same card');
assert(/\.ai-activity-card\.reference-work-flow \.ai-activity-header-actions\{[\s\S]*?display:flex!important;[\s\S]*?\}/.test(css),
  'The additive Lattice/Thought header must remain visible');

console.log('PASS: pre-Lattice Activity behavior is restored; Lattice Loader and Thought Line remain additive.');
