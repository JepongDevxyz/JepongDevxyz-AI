import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const between=(start,end)=>{
  const a=html.indexOf(start),b=html.indexOf(end,a+start.length);
  assert(a>=0&&b>a,`Missing source section: ${start}`);
  return html.slice(a,b);
};
const normalizer=between('function normalizeActivityEventForUI(evt = {}) {','function shouldShowAIActivity(');
const normalize=new Function('sanitizeUiErrorMessage',normalizer+'\nreturn normalizeActivityEventForUI;')(String);
for(const event of [
  {id:'generation',kind:'generate',label:'Generating response'},
  {id:'response-audit',kind:'test',label:'Checking the response'},
  {id:'output-verification',kind:'test',label:'Checking generated code'}
])assert.notEqual(normalize(event).visibility,'details',`Real milestone must remain visible: ${event.id}`);

const timeline=between('function activityEventUsesVisibleTimeline(evt={}){','function resolveActivityPlaybackWaiters(');
const usesTimeline=new Function('activityPlaybackId',timeline+'\nreturn activityEventUsesVisibleTimeline;')(
  event=>String(event.id||'event').replace(/[^a-zA-Z0-9_-]/g,'-')
);
for(const event of [
  {id:'router',kind:'route'},
  {id:'attachment-media-selected',kind:'image'},
  {id:'attachment-media-bridge',kind:'image'},
  {id:'provider-custom-api',kind:'provider'}
])assert.equal(usesTimeline(event),true,`Real activity step must enter visible timeline: ${event.id}`);

const privacy=between('function isPrivateActivityDetails(', 'function syncJdThoughts(');
const isPrivate=new Function(privacy+'\nreturn isPrivateActivityDetails;')();
assert.equal(isPrivate({id:'router',kind:'route'}),false,'Real router milestone is user-visible activity');
assert.equal(isPrivate({id:'attachment-media-selected',kind:'image'}),false,'Real media milestone is user-visible activity');
assert.equal(isPrivate({id:'response-audit',kind:'test',visibility:'details'}),true,'Explicit internal-only details remain private');

const append=between('function appendActivityEvent(evt = {}) {','function finishAIIndicator(');
assert(!append.includes('candidate.remove()'),'Repeated real activity labels must not delete older milestones');
assert(!append.includes('removable?.remove()'),'Long traces must not discard their earliest rows');
assert(!append.includes('MAX_VISIBLE_ACTIVITY_ROWS'),'There must be no live activity row cap');
assert(append.includes('previousLabel!==nextLabel'),'Changed lifecycle labels should retain the earlier milestone');
const capture=between('function captureJdActivitySnapshot(allowLive=false){','function renderJdStoredActivity(');
assert(!capture.includes('.slice(-12)'),'Saved activity must keep the full status trail');
const restore=between('function renderJdStoredActivity(saved){','recoverInterruptedGenerationDraft();');
assert(!restore.includes('.slice(-12)'),'Restored activity must keep the full status trail');
console.log('PASS: all real activity milestones stay visible, chronological, and complete in live and saved history.');
