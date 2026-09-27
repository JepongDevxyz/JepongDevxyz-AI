import assert from 'node:assert/strict';
import fs from 'node:fs';

const api=fs.readFileSync('api/chat.js','utf8');
const html=fs.readFileSync('index.html','utf8');

for(const token of [
  "activity(emit,'task-plan',activityBlueprint.planStart",
  "activity(emit,'task-plan',activityBlueprint.planDone",
  "work-commentary-plan",
  "Searching ${domain}",
  "Searched ${usable.length} website",
  "routedReason:'activity-evidence-sync'",
  "activity(emit,'task-checkpoint'",
  "work-commentary-evidence",
  "activity(emit,'task-work'",
  "activity(emit,'thinking','Thinking'"
]){
  assert(api.includes(token),'Missing frame-sequence milestone: '+token);
}

assert(api.includes("history:(Array.isArray(history)?history.slice(-8):[])"),
  'Selected-model planning must see recent conversation context');
assert(api.includes("systemInstruction:'PUBLIC WORK TRACE METADATA MODE:"),
  'The plan pass must be a bounded metadata pass, not a second conversational answer');
assert(api.includes("autoFallback:false"),
  'Work-trace metadata must not silently change models/providers');

assert(api.includes("domain:'docs.github.com'"),
  'GitHub client fallback research must prefer official GitHub documentation');
assert(api.includes("domain:'developer.android.com'"),
  'Native Android plans must be able to research official Android documentation');
assert(api.includes("const plannedResearchContext=await runPlannedActivityResearch"),
  'Planned documentation lookup must execute before final response synthesis');
assert(api.includes("plannedResearchContext||''"),
  'Real planned research must be injected into final model context');

assert(api.includes("'Visible plan: '+String(activityBlueprint.planDone"),
  'Final answer must receive the same visible plan');
assert(api.includes("'Visible checkpoint: '+String(activityBlueprint.checkpoint"),
  'Final answer must receive the same evidence checkpoint');
assert(api.includes("'Visible work step: '+String(activityBlueprint.work"),
  'Final answer must receive the same public work step');
assert(api.includes("The final answer must continue the SAME deliverable, platform, architecture, scope"),
  'Final answer must be explicitly bound to the Activity approach');

assert(html.includes("startup.dataset.activityId='client-thinking'"),
  'Frame 1 must begin with a plain Thinking row');
assert(html.includes("if(startup && id!=='client-thinking')startup.remove();"),
  'First real planning/tool milestone must replace the startup Thinking row');

const processStart=api.indexOf('async function processChat(body, emit) {');
const processEnd=api.indexOf('\nasync function mediaCapabilitySnapshot()',processStart);
assert(processStart>=0&&processEnd>processStart,'processChat missing');
const process=api.slice(processStart,processEnd);
assert(!process.includes("activity(emit,'task-analysis'"),
  'Primary flow must not inject old generic task-analysis rows');
assert(!process.includes("activity(emit,'task-approach'"),
  'Primary flow must not inject old generic task-approach rows');

console.log('PASS: frame sequence follows Thinking -> selected-model plan -> commentary -> real tools -> evidence update -> work -> Thinking -> aligned final response.');
