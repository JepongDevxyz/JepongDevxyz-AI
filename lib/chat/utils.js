/* lib/chat/utils.js — split from api/chat.js (mechanical move, no behavior change). */
import { buildInlineMapDataUrl } from '../../api/location-tools.js';
import { modelLabel, providerLabel } from './keys.js';

function inlineMapPageUrl(html){
  try{return buildInlineMapDataUrl(html);}catch(_){return '';}
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders }
  });
}

function parseKeys(pluralName, singleName) {
  const raw = process.env[pluralName] || process.env[singleName] || '';
  return raw.split(/[\n,]+/).map(x => x.trim()).filter(Boolean);
}

function shuffle(input) {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function safeEmit(emit, event) {
  try { emit?.(event); } catch (_) {}
}

function activity(emit, id, label, state = 'running', kind = 'process', detail = '') {
  safeEmit(emit, { type:'activity', id, label, state, kind, detail, at:Date.now() });
}

function providerAttemptDetail({model='',attemptIndex=0,attemptCount=1,attemptNoun='credential',fallbackModel=''}) {
  const parts=[];
  if(model) parts.push(modelLabel(model));
  if(attemptCount>1) parts.push(`${attemptNoun} ${attemptIndex+1}/${attemptCount}`);
  if(fallbackModel) parts.push(`fallback model ${modelLabel(fallbackModel)}`);
  return parts.join(' • ');
}

function providerLifecycleActivity(emit, {
  provider='', model='', state='running', phase='connecting', detail='',
  attemptIndex=0, attemptCount=1, attemptNoun='credential', fallbackModel=''
}={}) {
  if(!provider) return;
  const name=providerLabel(provider);
  const id=`provider-${provider}`;
  let label=`Connecting to ${providerLabel(provider)}`;

  if(phase==='connected') label=`${providerLabel(provider)} connected`;
  else if(phase==='retry') label=`Retrying ${name}`;
  else if(phase==='failed') label='Provider connection failed';

  const attemptDetail=providerAttemptDetail({model,attemptIndex,attemptCount,attemptNoun,fallbackModel});
  // Keep one lifecycle row per provider. Retries are transient diagnostics; once a
  // later credential/model succeeds, the same activity id is overwritten by the
  // final connected state instead of leaving a scary stale failure in the UI.
  activity(emit,id,label,state,'provider',detail || attemptDetail);
}

export { inlineMapPageUrl, json, parseKeys, shuffle, safeEmit, activity, providerAttemptDetail, providerLifecycleActivity };
