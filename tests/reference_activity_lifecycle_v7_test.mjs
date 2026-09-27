import assert from 'node:assert/strict';
import fs from 'node:fs';

const api=fs.readFileSync('api/chat.js','utf8');
const html=fs.readFileSync('index.html','utf8');

for(const token of [
  "activity(emit,'task-analysis'",
  "activity(emit,'task-approach'",
  "Structuring the game mechanics and controls",
  "Setting up the page, game loop, and interaction flow",
  "Building movement, collision, scoring, and UI behavior",
  "Checking gameplay, controls, restart, and delivery",
  "Checking the generated game code"
]) assert(api.includes(token),'Missing compact reference lifecycle token: '+token);

assert(api.includes("activity(emit,'task-analysis',taskAnalysis.label,'running'"),
  'Task analysis must visibly start as real work');
assert(api.includes("activity(emit,'task-analysis',activityBlueprint.analysis||taskAnalysis.label,'completed'"),
  'Task analysis must complete after context assembly using the request-specific label');
assert(api.includes("activity(emit,'task-approach',taskApproach.label,'running'"),
  'Task approach must visibly start before final prompt preparation');
assert(api.includes("activity(emit,'task-approach',activityBlueprint.approach||taskApproach.label,'completed'"),
  'Task approach must complete before provider generation using the request-specific label');
assert(api.includes("activity(emit,'thinking',taskWork.label,'running'"),
  'Task-specific implementation work must remain the running model stage');

const detailsStart=html.indexOf("const detailsOnly = normalized.visibility==='details'");
const detailsEnd=html.indexOf("const iconless =",detailsStart);
assert(detailsStart>=0&&detailsEnd>detailsStart);
const details=html.slice(detailsStart,detailsEnd);
assert(!details.includes("id==='quality-orchestrator'"),
  'Real requirement/edge-case preflight must not be hidden from the main Activity timeline');

assert(html.includes("Planning the requested game: '+subject"),
  'Client lead must use the same compact task vocabulary before SSE arrives');
assert(html.includes("reactbits-micro.css?v=20260927-activity-v7"),
  'Activity cache-bust must ship with the lifecycle fix');

console.log('PASS: reference Activity now shows a compact, changing real lifecycle instead of one generic status.');
