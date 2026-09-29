import assert from 'node:assert/strict';
import fs from 'node:fs';

const api=fs.readFileSync('api/chat.js','utf8');
const html=fs.readFileSync('index.html','utf8');

function between(src,start,end){
  const a=src.indexOf(start), b=src.indexOf(end,a+start.length);
  assert(a>=0&&b>a,'Missing section: '+start);
  return src.slice(a,b);
}

const profileSrc=between(api,"function taskProfile(message='', files=[]){","\n\nfunction taskSpecificActivityCopy(");
const taskProfile=new Function(
  'extractPublicUrl','detectArtifactRequest','shouldAutoResearch','splitContextualTaskMessage','activityTaskSubject',
  profileSrc+'\nreturn taskProfile;'
)(
  ()=>[],
  ()=>null,
  ()=>false,
  message=>({anchor:'',followUp:'',raw:String(message||'')}),
  message=>String(message||'').replace(/^Gawan mo naman ako ng\s+/i,'').trim()
);

const githubApp=taskProfile('Gawan mo naman ako ng app na kaya mag push at mag edit/commit sa GitHub',[]);
assert.equal(githubApp.kind,'github','GitHub app request must not be misclassified as a website');
assert.equal(githubApp.subtype,'github-client','GitHub client request must get GitHub-client activity copy');

const genericApp=taskProfile('Gawan mo ako ng app para sa personal notes',[]);
assert.equal(genericApp.kind,'app','Standalone app request must not silently become a web app');

const explicitWeb=taskProfile('Gawan mo ako ng HTML web app para sa personal notes',[]);
assert.equal(explicitWeb.kind,'web','Explicit HTML/web request must remain a web task');

assert(api.includes("'RESPONSE_CONTRACT is a compact high-level contract"),
  'Activity planner needs a shared final-answer contract');
assert(api.includes("All fields, TRACE, and RESPONSE_CONTRACT must describe ONE coherent approach."),
  'Planner must reject status/answer architecture drift and bind the dynamic trace to the same contract');
assert(api.includes("[RESPONSE-ACTIVITY COHERENCE CONTRACT — internal, do not quote]"),
  'Final response model must receive the same high-level plan used by Activity');
assert(api.includes("Do not silently switch from native app to website"),
  'Final response must not silently contradict the visible Activity plan');

const dynamicPlanner=between(api,'if(effortPolicy.activityPlanner&&shouldUseDynamicActivityPlanner(taskMessage,files)',"contextPlan.activityBlueprint=activityBlueprint;");
assert(dynamicPlanner.includes('runProvider(provider,{') && dynamicPlanner.includes('model,'),
  'Dynamic Activity planning must use the same selected provider/model variables as the final response');
assert(dynamicPlanner.includes("autoFallback:false"),
  'Activity plan must not silently switch to another provider/model');
assert(api.includes("routedReason:'activity-evidence-sync'"),
  'Real tool evidence must be synchronized back into the same selected-model plan');
assert(api.includes("runPlannedActivityResearch(activityBlueprint,emit"),
  'Technical tasks must support real bounded tool research between planning and final response');

assert(html.includes('Planning the GitHub app or repository flow: '),
  'Immediate Activity lead should recognize GitHub app/client prompts');
assert(html.includes("kind:'github'"),
  'GitHub app Activity should use the GitHub activity kind');

console.log('PASS: Activity planning, real tool evidence, and final response share one selected-model approach contract.');
