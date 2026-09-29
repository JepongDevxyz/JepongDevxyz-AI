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
const timelineSource=between(html,'        function activityEventUsesVisibleTimeline(evt={}){','        function resolveActivityPlaybackWaiters(');
const usesVisibleTimeline=new Function(timelineSource+'\nreturn activityEventUsesVisibleTimeline;')();

const priorStatuses=[
  {id:'provider-codecraft',label:'CodeCraftAPI connected',kind:'provider',state:'completed',detail:'GPT 5.6 Luna'},
  {id:'router',label:'Smart Router selected a model',kind:'route',state:'completed'},
  {id:'generation',label:'Generating response',kind:'generate',state:'running'},
  {id:'response-audit',label:'Checking the response against your request',kind:'test',state:'running'},
  {id:'output-verification',label:'Generated code static check complete',kind:'test',state:'completed'},
  {id:'attachment-media-selected',label:'Read attached image',kind:'image',state:'completed'}
];
for(const event of priorStatuses){
  const normalized=normalize(event);
  assert(normalized,`Existing activity status must be retained: ${event.id}`);
  assert.notEqual(normalized.visibility,'details',`Existing status was demoted to hidden details: ${event.id}`);
  assert.equal(usesVisibleTimeline(normalized),true,`Existing status must use the main timeline: ${event.id}`);
}

const render=between(html,'        function renderActivityEventNow(normalized = {}) {','        function appendJdWorkNote(');
const detailsStart=render.indexOf("const detailsOnly = normalized.visibility==='details'");
const iconlessStart=render.indexOf('const iconless =',detailsStart);
assert(detailsStart>=0&&iconlessStart>detailsStart);
const detailsGate=render.slice(detailsStart,iconlessStart);
assert(!detailsGate.includes("kind==='provider'")&&!detailsGate.includes("kind==='route'")&&
  !detailsGate.includes('attachment-media-'),
  'Real provider, routing, and attachment statuses must not be hidden by the row renderer');

const indicator=between(html,'        function showAIIndicator(promptText, files = []) {','        function toggleActivityDetails(btn)');
assert(indicator.includes('class="rb-lattice-loader"')&&indicator.includes('class="thought-line__text"'),
  'Lattice Loader and Thought Line must remain in the activity header');
assert(indicator.includes('class="ai-activity-list" id="aiActivityList"'),
  'The original full activity status list must remain alongside the added header');
assert(/\.ai-activity-card\.reference-work-flow \.ai-activity-header-actions\{[\s\S]*?display:flex!important;[\s\S]*?\}/.test(css),
  'The added Lattice/Thought header must remain visible');

console.log('PASS: the original full Activity timeline remains visible alongside Lattice Loader and Thought Line.');
