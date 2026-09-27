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
      prepared:'Plan prepared for '+subject,
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
    'CONTEXT: Planning canvas controls and snake movement',
    'PREPARED: Game loop and scoring structure mapped',
    'WORK: Building movement collisions and restart flow',
    'AUDIT: Checking gameplay logic and browser delivery',
    'COMMENTARY: I’m keeping the game in one browser-ready file with keyboard and touch controls.'
  ].join('\n'),
  {kind:'web',subtype:'game',subject:'HTML snake game'}
);
assert.equal(snake.dynamic,true);
assert.match(snake.context,/snake movement/i);
assert.match(snake.work,/collisions/i);
assert.match(snake.audit,/gameplay logic/i);
assert.match(snake.commentary,/browser-ready file/i);

const translation=build.parseActivityBlueprintOutput(
  [
    'CONTEXT: Identifying meaning tone and Filipino phrasing',
    'PREPARED: Translation style and terminology mapped',
    'WORK: Translating while preserving the original tone',
    'AUDIT: Checking meaning fluency and consistency',
    'COMMENTARY: I’m preserving the original intent while making the Filipino phrasing sound natural.'
  ].join('\n'),
  {kind:'writing',subtype:'translation',subject:'translate this'}
);
assert.notEqual(snake.context,translation.context,'Different tasks must receive different model-authored Activity labels');
assert.equal(build.shouldUseDynamicActivityPlanner('Gawan mo ako ng HTML snake game',[]),true);
assert.equal(build.shouldUseDynamicActivityPlanner('Translate this to Filipino',[]),true);
assert.equal(build.shouldUseDynamicActivityPlanner('Hi',[]),false);

const prompt=build.buildActivityBlueprintPrompt('Gawan mo ako ng HTML snake game',[],{kind:'web',subtype:'game'});
for(const token of ['CONTEXT: <label>','PREPARED: <label>','WORK: <label>','AUDIT: <label>','COMMENTARY: <one short sentence>']){
  assert(prompt.includes(token),'Missing exact activity blueprint field '+token);
}
assert(prompt.includes('specific to THIS exact task'),'Planner must be instructed to avoid generic statuses');

for(const token of [
  "routedReason:'activity-blueprint'",
  "contextPlan.activityBlueprint=activityBlueprint",
  "activity(emit,'work-commentary-blueprint'",
  "activityBlueprint:contextPlan.activityBlueprint||activityBlueprint",
  "taskAuditActivity(body.message||'',body.files||[],responseAudit,result.activityBlueprint||null)"
]){
  assert(api.includes(token),'Missing dynamic Activity integration: '+token);
}

assert(api.includes('emit 2 to 4 short high-level progress notes'),
  'Substantial selected-model responses should emit natural task-specific work notes');
assert(api.includes("if(activityPlanResponse.ok)"),
  'Instant/Low requests need the dynamic metadata pass when no quality preflight exists');

console.log('PASS: dynamic request-specific Activity labels and live work notes are wired across selected models.');
