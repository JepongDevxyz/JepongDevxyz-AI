import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const api=readFileSync('api/chat.js','utf8');
const start=api.indexOf("const RESPONSE_EFFORT_LEVELS=['Instant'");
const end=api.indexOf('function effortOutputBudgetFor(',start);
assert(start>=0&&end>start,'Shared response effort policy must exist');
const source=api.slice(start,end);
const policy=new Function(source+'\nreturn {normalizeResponseEffort,responseEffortRank,responseEffortPolicy};')().responseEffortPolicy;
const levels=['Instant','Low','Medium','High','Extra','Max'];
const expected=[
  {activityPlanner:false,qualityPreflight:false,activityEvidence:false},
  {activityPlanner:true,qualityPreflight:false,activityEvidence:false},
  {activityPlanner:true,qualityPreflight:true,activityEvidence:false},
  {activityPlanner:true,qualityPreflight:true,activityEvidence:true},
  {activityPlanner:true,qualityPreflight:true,activityEvidence:true},
  {activityPlanner:true,qualityPreflight:true,activityEvidence:true}
];
levels.forEach((level,index)=>{
  const actual=policy(level);
  for(const [key,value] of Object.entries(expected[index])){
    assert.equal(actual[key],value,`${level} must set ${key}=${value}`);
  }
});
assert(api.includes('effortPolicy.activityPlanner&&shouldUseDynamicActivityPlanner(taskMessage,files)'),
  'Instant requests must skip the extra model call used only to write Activity labels');
assert(api.includes('effortPolicy.activityEvidence&&activityEvidence&&shouldUseDynamicActivityPlanner(taskMessage,files)'),
  'Instant requests must skip the extra evidence-checkpoint model call');
assert(/effortPolicy\.qualityPreflight\s*&&\s*shouldUseQualityOrchestrator\(message,files,mode\)/.test(api),
  'Instant and Low must not add a separate quality-preflight generation');
const agentRouterStart=api.indexOf('async function runAgentRouter(');
const agentRouter=api.slice(agentRouterStart,api.indexOf('async function runBailuAnthropic(',agentRouterStart));
assert(agentRouter.includes('max_tokens:effortOutputBudgetFor(message,responseEffort)'),
  'The AgentRouter bridge must receive a real effort-scaled generation budget');
console.log('PASS: effort levels gate auxiliary model calls; Instant uses the direct response path.');
