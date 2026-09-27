import assert from 'node:assert/strict';
import fs from 'node:fs';

const api=fs.readFileSync('api/chat.js','utf8');

function between(src,start,end){
  const a=src.indexOf(start), b=src.indexOf(end,a+start.length);
  assert(a>=0&&b>a,'Missing source boundary: '+start);
  return src.slice(a,b);
}

const helperSrc=between(api,'function cleanActivityLabel(value=','\nasync function readInternalProviderText');
const build=new Function(
  'sanitizeAssistantOutput','taskSpecificActivityCopy','classifyUserTask','isVisualWebUiRequest',
  helperSrc+'\nreturn {parseActivityBlueprintOutput,shouldUseDynamicActivityPlanner,buildActivityBlueprintPrompt};'
)(
  x=>String(x||''),
  (profile,phase)=>{
    const subject=String(profile?.subject||'request');
    const map={
      context:'Understanding '+subject,
      prepared:'Analyzing '+subject,
      prepared2:'Planning '+subject,
      work:'Building '+subject,
      audit:'Checking '+subject
    };
    return {label:map[phase],kind:'build'};
  },
  ()=>'coding',
  ()=>false
);

const snake=build.parseActivityBlueprintOutput(
  [
    'PLAN_START: Planning the snake game',
    'PLAN_DONE: Planned the snake game',
    'CONTEXT: Planning snake movement and browser controls',
    'ANALYSIS: Mapping collisions scoring and touch input',
    'APPROACH: Structuring one-file canvas game flow',
    'WORK: Building movement collisions and restart behavior',
    'CHECKPOINT: Chose the canvas game structure',
    'AUDIT: Checking gameplay logic and browser delivery',
    'COMMENTARY: I’m keeping the game in one browser-ready file with keyboard and touch controls.',
    'RESEARCH_QUERY_1: ',
    'RESEARCH_DOMAIN_1: ',
    'RESEARCH_QUERY_2: ',
    'RESEARCH_DOMAIN_2: ',
    'RESPONSE_CONTRACT: Deliver one browser-ready HTML snake game with keyboard and touch controls.'
  ].join('\n'),
  {kind:'web',subtype:'game',subject:'HTML snake game'}
);
assert.equal(snake.dynamic,true);
assert.match(snake.context,/snake movement/i);
assert.match(snake.analysis,/collisions/i);
assert.match(snake.approach,/one-file/i);
assert.match(snake.work,/restart/i);
assert.match(snake.audit,/gameplay logic/i);
assert.match(snake.commentary,/browser-ready file/i);

const translation=build.parseActivityBlueprintOutput(
  [
    'PLAN_START: Planning the translation',
    'PLAN_DONE: Planned the translation',
    'CONTEXT: Identifying meaning tone and Filipino phrasing',
    'ANALYSIS: Mapping idioms and terminology',
    'APPROACH: Preserving tone with natural Filipino wording',
    'WORK: Translating the passage naturally',
    'CHECKPOINT: Set the Filipino phrasing',
    'AUDIT: Checking meaning fluency and consistency',
    'COMMENTARY: I’m preserving the original intent while making the Filipino phrasing sound natural.',
    'RESEARCH_QUERY_1: ',
    'RESEARCH_DOMAIN_1: ',
    'RESEARCH_QUERY_2: ',
    'RESEARCH_DOMAIN_2: ',
    'RESPONSE_CONTRACT: Translate the passage naturally into Filipino while preserving meaning and tone.'
  ].join('\n'),
  {kind:'writing',subtype:'translation',subject:'translate this'}
);
assert.notEqual(snake.context,translation.context,'Different tasks must get different Activity labels');
assert.notEqual(snake.work,translation.work,'Work labels must vary by request');
assert.equal(build.shouldUseDynamicActivityPlanner('Gawan mo ako ng HTML snake game',[]),true);
assert.equal(build.shouldUseDynamicActivityPlanner('Translate this to Filipino',[]),true);
assert.equal(build.shouldUseDynamicActivityPlanner('Hi',[]),false);

const prompt=build.buildActivityBlueprintPrompt('Gawan mo ako ng HTML snake game',[],{kind:'web',subtype:'game'});
for(const token of [
  'PLAN_START: <short running planning label>',
  'PLAN_DONE: <short completed planning label>',
  'CONTEXT: <specific label>',
  'ANALYSIS: <specific label>',
  'APPROACH: <specific label>',
  'WORK: <specific label>',
  'CHECKPOINT: <specific evidence-safe milestone>',
  'AUDIT: <specific label>',
  'COMMENTARY: <1-3 sentence public work update>',
  'RESEARCH_QUERY_1: <query or blank>',
  'RESPONSE_CONTRACT: <one-line high-level answer contract>'
]) assert(prompt.includes(token),'Missing activity blueprint field '+token);
assert(prompt.includes('one coherent approach'),'Planner must bind the work trace and final answer to one approach');
assert(prompt.includes('Never claim a search, file read, build, compile, runtime test, deployment'),
  'Planner must reject fabricated tool/execution statuses');
assert(api.includes('shouldUseDynamicActivityPlanner(taskMessage,files)'),
  'Dynamic Activity planner must use the resolved conversation task');
assert(api.includes('buildActivityBlueprintPrompt(taskMessage,files,contextPlan?.profile||{})'),
  'Dynamic Activity labels must be planned from resolved task context');

for(const token of [
  "routedReason:'activity-blueprint'",
  "activity(emit,'task-plan'",
  "work-commentary-plan",
  "runPlannedActivityResearch(activityBlueprint,emit",
  "routedReason:'activity-evidence-sync'",
  "activity(emit,'task-work'",
  "contextPlan.activityBlueprint=activityBlueprint",
  "activityBlueprint:contextPlan.activityBlueprint||activityBlueprint",
  "taskAuditActivity(activityContextMessage,body.files||[],responseAudit,result.activityBlueprint||null)"
]){
  assert(api.includes(token),'Missing dynamic Activity integration: '+token);
}

assert(api.includes("history:(Array.isArray(history)?history.slice(-8):[])"),
  'Activity planning must use recent conversation context like the final response');
assert(api.includes("autoFallback:false"),
  'Activity metadata must stay on the selected model without silent fallback');

console.log('PASS: selected-model Activity blueprint drives a coherent plan, commentary, bounded research, evidence update, and final-answer contract.');
