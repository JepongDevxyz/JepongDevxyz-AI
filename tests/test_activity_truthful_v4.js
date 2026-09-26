import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const api=fs.readFileSync('api/chat.js','utf8');
const ui=fs.readFileSync('index.html','utf8');
const between=(src,start,end)=>{
  const a=src.indexOf(start), b=src.indexOf(end,a+start.length);
  assert(a>=0&&b>a,`missing section: ${start}`);
  return src.slice(a,b);
};
const planSource=between(api,'function contextActivityPlan(message=','\nfunction emitContextActivityStart');
const makePlan=vm.runInNewContext(planSource+'\ncontextActivityPlan',{
  taskProfile:(message,files)=>({
    kind:/github/i.test(message)?'github':files.length?'image':'general',
    subject:String(message).slice(0,90),
    intent:{}
  }),
  // The extracted function uses these independent helpers in production.
  shortTaskSubject:message=>String(message||'').trim(),
  extractPublicUrl:()=>[],
  isSafePublicUrl:()=>false,
  isWebsiteSecurityRequest:()=>false
});
for(const [message,files] of [
  ['Hi',[]],['Check GitHub workflow for my app',[]],
  ['Summarize this picture',[{name:'sample.png',mimeType:'image/png'}]]
]){
  const plan=makePlan(message,files);
  assert.equal(plan.steps.length,1,'only one real request-classification milestone');
  assert.equal(plan.steps[0].id,'task-context');
  if(files.length) assert(plan.steps[0].label.includes(files[0].name),
    'attachment activity must identify the actual uploaded file');
  else assert(plan.steps[0].label.includes(message.slice(0,Math.min(message.length,20))),
    'text task activity must identify the current request');
  assert(!/Searching GitHub|Fetching GitHub|Running tests|Reading uploaded image/i.test(plan.steps[0].label),
    'classification must not claim an unperformed operation');
}
const sse=between(api,'function activityStreamResponse(','\nconst CLOUDFLARE_TTS_MODEL');
assert(!sse.includes('progress-heartbeat-')&&!sse.includes('live-progress-'),
  'no timer-generated pseudo activities');
assert(sse.includes("if(!data || data.type!=='activity')return;")&&sse.includes("send('activity',data);"),
  'real tool events must be validated and streamed');
assert(sse.includes("send('done'"),'completion event must stream');
const process=between(api,'async function processChat(','\nasync function providerUsageSnapshot');
assert(process.includes("const taskWork=taskWorkingActivity(contextPlan);") &&
  process.includes("activity(emit,'thinking',taskWork.label,'running',taskWork.kind);") &&
  process.includes("let first=await runProvider"),
  'task-specific model work must start at the real provider invocation after context/tool operations');
assert(process.includes('const grouped=new Map();')&&process.includes('else if(textParts){')&&process.includes('activity(emit,id,`Read attached '),
  'actual extracted attachment content must generate a file-specific event');
const show=between(ui,'function showAIIndicator(','function toggleActivityDetails(');
assert(show.includes('real rows come only from backend/tool/provider milestones.') &&
  !show.includes("appendActivityEvent({id:'task-context'") &&
  !show.includes("appendActivityEvent({id:'request-submitted'"),
  'client may show a temporary literal task lead but must not synthesize timeline rows before backend events');
assert(!show.includes("appendActivityEvent({id:'thinking'"),'do not put Thinking ahead of tool work');
const streamUI=between(ui,"if (contentType.includes('text/event-stream')) {","\n                {\n                    fullResponse=stripJdWorkNotes(fullResponse);");
const textHandler=between(streamUI,'text: (payload) => {','\n                        artifact:');
assert(!textHandler.includes('renderLiveResponse('),'answer must stay hidden during Activity');
assert(streamUI.includes('done: (payload) => revealFinalResponse(payload.elapsedMs)'),
  'collapse Activity then reveal final answer');
assert(!sse.includes("id:'stream-open'"),'transport stream opening must not appear as user-visible work');
assert(sse.includes('completedResponseNumber=continuationCount')&&sse.includes('nextResponseNumber=continuationCount+1')&&sse.includes('Response ${nextResponseNumber} — continuing'),
  'real automatic continuations must expose numbered Response milestones');
assert(process.includes("activity(emit,'plugins-active'")&&process.includes('activeSkillPlugins.length'),
  'only matched installed plugins may emit an active-plugin milestone');
console.log('PASS truthful chronological Activity + final response sequencing');
