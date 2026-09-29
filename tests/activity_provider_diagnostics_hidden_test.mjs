import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const section=(start,end)=>{
  const a=html.indexOf(start),b=html.indexOf(end,a+start.length);
  assert(a>=0&&b>a,`Missing source section: ${start}`);
  return html.slice(a,b);
};
const normalizer=section('function normalizeActivityEventForUI(evt = {}) {','function shouldShowAIActivity(');
const normalize=new Function('sanitizeUiErrorMessage',normalizer+'\nreturn normalizeActivityEventForUI;')(value=>String(value||''));
const visible=section('function activityEventUsesVisibleTimeline(evt={}){','function resolveActivityPlaybackWaiters(');
const usesVisible=new Function('activityPlaybackId',visible+'\nreturn activityEventUsesVisibleTimeline;')(event=>String(event.id||'event').replace(/[^a-zA-Z0-9_-]/g,'-'));
const provider=normalize({id:'provider-codecraft',kind:'provider',state:'running',label:'Connecting to CodeCraft API'});
assert.equal(provider.label,'Connecting to CodeCraft API');
assert.notEqual(provider.visibility,'details','Provider connection status must not be marked private');
assert.equal(usesVisible(provider),true,'Provider connection status must be shown in the live activity timeline');
assert.equal(usesVisible(normalize({id:'provider-codecraft',kind:'provider',state:'completed',label:'CodeCraft API connected'})),true,
  'Provider connected status must remain visible');
assert.equal(usesVisible({id:'router',kind:'route',visibility:'primary'}),true,'Real router activity stays visible');
assert.equal(usesVisible({id:'response-audit',kind:'test',visibility:'details'}),false,'Internal audit details stay hidden');

const helper=section('function isPrivateActivityDetails(', 'function syncJdThoughts(');
const isPrivate=new Function(helper+'\nreturn isPrivateActivityDetails;')();
assert.equal(isPrivate({id:'provider-codecraft',kind:'provider'}),false,'Provider status must be retained in Thoughts and saved activity');
assert.equal(isPrivate({id:'provider-codecraft',kind:'provider',visibility:'primary'}),false,'Visible provider rows must persist');
assert.equal(isPrivate({id:'router',kind:'route'}),false,'Real router activity stays in Thoughts and saved history');
assert.equal(isPrivate({id:'response-audit',kind:'test',visibility:'details'}),true,'Other explicit details stay private');
for(const marker of ['isPrivateActivityDetails({']){
  assert(section('function syncJdThoughts(){','function syncThoughtLineSteps(').includes(marker),'Thoughts should continue filtering only private rows');
  assert(section('function captureJdActivitySnapshot(allowLive=false){','function renderJdStoredActivity(').includes(marker),'Snapshots should continue filtering only private rows');
}
assert(section('function renderJdStoredActivity(saved){','recoverInterruptedGenerationDraft();').includes('isPrivateActivityDetails('),
  'Saved sessions should filter private details but retain provider rows');
console.log('PASS: provider connection and retry statuses are visible live and retained in Thoughts/saved activity; internal details remain hidden.');
