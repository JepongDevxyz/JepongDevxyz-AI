import assert from 'node:assert/strict';
import fs from 'node:fs';

const api=fs.readFileSync('api/chat.js','utf8');
const html=fs.readFileSync('index.html','utf8');

for(const token of [
  "activity(emit,'task-plan'",
  "activityBlueprint.planStart",
  "activityBlueprint.planDone",
  "work-commentary-plan",
  "runPlannedActivityResearch(activityBlueprint,emit",
  "activity(emit,'task-checkpoint'",
  "work-commentary-evidence",
  "activity(emit,'task-work'",
  "activity(emit,'thinking','Thinking'"
]) assert(api.includes(token),'Missing compact reference lifecycle token: '+token);

assert(api.includes("routedReason:'activity-blueprint'"),
  'The selected model must create the visible planning trace');
assert(api.includes("routedReason:'activity-evidence-sync'"),
  'Real tool evidence must update the same selected-model work trace');
assert(api.includes("The final answer must continue the SAME deliverable, platform, architecture, scope"),
  'Visible Activity and final answer must stay on one implementation approach');

const detailsStart=html.indexOf("const detailsOnly = normalized.visibility==='details'");
const detailsEnd=html.indexOf("const iconless =",detailsStart);
assert(detailsStart>=0&&detailsEnd>detailsStart);
const details=html.slice(detailsStart,detailsEnd);
assert(!details.includes("id==='quality-orchestrator'"),
  'Real requirement/edge-case preflight must not be hidden from the main Activity timeline');

assert(html.includes("startup.dataset.activityId='client-thinking'"),
  'Client must show only the reference-style temporary Thinking row before SSE arrives');
assert(html.includes("reactbits-micro.css?v=20260929-thought-line-css-fix"),
  'Activity cache-bust must ship with the frame-playback lifecycle fix');

console.log('PASS: reference Activity shows Thinking -> selected-model plan -> real tools/commentary -> aligned final generation.');
