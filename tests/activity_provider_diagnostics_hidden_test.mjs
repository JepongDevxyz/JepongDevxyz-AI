import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const section=(start,end)=>{
  const a=html.indexOf(start),b=html.indexOf(end,a+start.length);
  assert(a>=0&&b>a,`Missing source section: ${start}`);
  return html.slice(a,b);
};

const helperSource=section('function isPrivateActivityDetails(', 'function syncJdThoughts(');
const isPrivate=new Function(helperSource+'\nreturn isPrivateActivityDetails;')();
for(const row of [
  {id:'provider-codecraft',kind:'provider',visibility:'details'},
  {id:'router',kind:'route',visibility:'details'},
  {id:'response-audit',kind:'test',visibility:'details'},
  {id:'provider-codecraft',kind:'provider'}
])assert.equal(isPrivate(row),true,`Internal connection diagnostic should stay hidden: ${row.id}`);
for(const row of [
  {id:'task-plan',kind:'process',visibility:'primary'},
  {id:'web-search',kind:'web',visibility:'primary'}
])assert.equal(isPrivate(row),false,`User-facing activity should stay visible: ${row.id}`);

const thoughts=section('function syncJdThoughts(){','function syncThoughtLineSteps(');
assert(thoughts.includes('isPrivateActivityDetails({'),
  'Thoughts panel must not unhide internal connection diagnostics');
const snapshot=section('function captureJdActivitySnapshot(allowLive=false){','function renderJdStoredActivity(');
assert(snapshot.includes('isPrivateActivityDetails({'),
  'Saved assistant activity snapshots must exclude internal connection diagnostics');
const stored=section('function renderJdStoredActivity(saved){','recoverInterruptedGenerationDraft();');
assert(stored.includes('isPrivateActivityDetails('),
  'Previously saved conversations must filter legacy provider and router statuses');

console.log('PASS: provider connection diagnostics stay hidden from live Thoughts and current/legacy saved activity.');
