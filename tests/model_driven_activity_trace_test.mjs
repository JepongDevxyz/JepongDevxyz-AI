import assert from 'node:assert/strict';
import fs from 'node:fs';

const api=fs.readFileSync('api/chat.js','utf8');
const html=fs.readFileSync('index.html','utf8');

assert(api.includes("'TRACE: 3-8 compact public milestones"),
  'selected model must create a request-specific public trace');
assert(api.includes("Do not force a fixed five-stage template."),
  'Activity trace must vary with the user request instead of using a fixed template');
assert(api.includes("The Activity labels, TRACE, and RESPONSE_CONTRACT must describe the SAME approach."),
  'Activity and final response must share one semantic plan');
assert(api.includes("const plannedTrace=Array.isArray(activityBlueprint?.trace)"),
  'runtime must consume the model-created trace');
assert(api.includes("activity(emit,'planned-trace-'+index"),
  'runtime must emit trace milestones');
assert(api.includes("activityTrace:plannedTrace"),
  'trace must survive into the response stream lifecycle');
assert(api.includes("Complete the selected model's public plan in order before result audit."),
  'stream must complete trace in chronological order');
assert(api.includes("if(!Array.isArray(result.activityTrace)||!result.activityTrace.length)"),
  'legacy generic thinking row must not reappear when a dynamic trace exists');
assert(html.includes("if(state==='queued')"),
  'frontend must not reveal future milestones before they start');

const promptSection=api.slice(api.indexOf("function buildActivityBlueprintPrompt"),api.indexOf("function parseActivityBlueprintOutput"));
for(const phrase of [
  'task-specific, chronological, non-repetitive',
  'observable operations, artifacts, requirements, files, tools, checks, or answer sections',
  'must not claim unverified external execution'
]){
  assert(promptSection.includes(phrase), 'missing trace quality rule: '+phrase);
}

console.log('PASS: all selected models use a request-specific model-driven Activity trace tied to the final response contract.');
