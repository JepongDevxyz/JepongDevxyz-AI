import assert from 'node:assert/strict';
import fs from 'node:fs';

const api=fs.readFileSync('api/chat.js','utf8');
const html=fs.readFileSync('index.html','utf8');

for(const token of [
  "'TRACE: 3-8 compact public milestones",
  'Do not force one fixed stage template across requests.',
  'All fields, TRACE, and RESPONSE_CONTRACT must describe ONE coherent approach.',
  "const activityTrace=Array.isArray(activityBlueprint?.trace)",
  "activity(emit,'planned-trace-'+index",
  "activity(emit,'thinking','Thinking','running','process','')"
]) assert(api.includes(token),'Missing dynamic trace integration: '+token);

assert(api.includes("history:(Array.isArray(history)?history.slice(-8):[])"),
  'Planner must see recent conversation context');
assert(api.includes("autoFallback:false"),
  'Planner/evidence sync must remain on selected model');
assert(api.includes("routedReason:'activity-evidence-sync'"),
  'Real evidence must synchronize the selected-model plan');
assert(api.includes('real tool events\n  // remain separate and are never fabricated from the plan.'),
  'Trace must not invent external execution');
assert(html.includes("startup.dataset.activityId='client-thinking'"),
  'UI must start from the reference-style Thinking frame');
assert(html.includes('const JD_ACTIVITY_MIN_VISIBLE_GAP_MS=230'),
  'UI must preserve frame playback pacing');
assert(html.includes('const JD_ACTIVITY_MIN_RUNNING_DWELL_MS=650'),
  'Running milestones must have readable dwell time');

const processStart=api.indexOf('async function processChat(body, emit) {');
const processEnd=api.indexOf('\nasync function mediaCapabilitySnapshot()',processStart);
assert(processStart>=0&&processEnd>processStart,'processChat missing');
const process=api.slice(processStart,processEnd);
assert(!process.includes("activity(emit,'task-analysis'"),
  'Primary flow must not restore the old fixed analysis row');
assert(!process.includes("activity(emit,'task-approach'"),
  'Primary flow must not restore the old fixed approach row');

console.log('PASS: request-specific model trace is reconciled with the current ChatGPT-style Activity lifecycle.');
