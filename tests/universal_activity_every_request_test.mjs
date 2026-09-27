import assert from 'node:assert/strict';
import fs from 'node:fs';

const api=fs.readFileSync('api/chat.js','utf8');
const html=fs.readFileSync('index.html','utf8');

assert(html.includes('showAIIndicator(promptText, currentFiles);'),
  'Every normal AI send must create the Activity surface before the request');
assert(html.includes('activityStream: true'),
  'Every normal AI request must ask the backend for Activity SSE');
assert(!html.includes("if(shouldShowAIActivity(promptText, currentFiles)) showAIIndicator"),
  'Activity must not be gated to only heavy/special prompts');

for(const token of [
  "activity(emit,'task-plan'",
  "work-commentary-plan",
  "runPlannedActivityResearch(activityBlueprint,emit",
  "activity(emit,'task-checkpoint'",
  "activity(emit,'task-work'",
  "activity(emit,'thinking','Thinking'",
  "id:'response-audit'",
  "taskAuditActivity(activityContextMessage,body.files||[],responseAudit,result.activityBlueprint||null)",
  "id:'output-verification'",
  "taskCodeVerificationLabel(activityContextMessage,body.files||[]"
]) assert(api.includes(token),'Missing universal/task-specific Activity stage: '+token);

assert(api.includes("const responseAudit=auditGeneratedResponse(activityContextMessage,generatedText,body.files||[]);"),
  'Every completed response must receive the server result audit');
assert(api.includes('const generatedBlocks=responseAudit.codeBlocks||extractCodeBlocks(generatedText);'),
  'Generated code must be statically checked without requiring an explicit test keyword');
assert(api.includes('Gawan mo ako ng HTML snake game'),
  'Source comment should preserve the regression example that motivated universal code verification');

const verifyStart=api.indexOf("function shouldVerifyTask(message='', files=[]){");
const verifyEnd=api.indexOf('\n}\n\nfunction auditGeneratedResponse',verifyStart)+2;
assert(verifyStart>=0&&verifyEnd>verifyStart,'shouldVerifyTask section missing');
const verifySrc=api.slice(verifyStart,verifyEnd);
const normalizeIntentText=x=>String(x||'').toLowerCase();
const shouldVerifyTask=new Function('normalizeIntentText',verifySrc+'\nreturn shouldVerifyTask;')(normalizeIntentText);
assert.equal(shouldVerifyTask('Gawan mo ako ng HTML snake game',[]),true);
assert.equal(shouldVerifyTask('Create a Python calculator',[]),true);
assert.equal(shouldVerifyTask('Write JavaScript for a todo app',[]),true);

// Internal bookkeeping stays auditable but must not clutter the primary ChatGPT-style work trace.
const normalizeStart=html.indexOf('        function normalizeActivityEventForUI(evt = {}) {');
const normalizeEnd=html.indexOf('\n        function shouldShowAIActivity',normalizeStart);
assert(normalizeStart>=0&&normalizeEnd>normalizeStart,'Activity UI normalizer missing');
const normalizer=html.slice(normalizeStart,normalizeEnd);
assert(normalizer.includes("if(id==='response-audit')"),
  'Final response audit must still exist for details/history');
assert(normalizer.includes("if(id==='output-verification')"),
  'Generated-code verification must still exist for details/history');
assert(normalizer.includes("visibility:'details'"),
  'Internal audit/verification rows must stay out of the primary reference surface');

console.log('PASS: Activity is universal and task-specific; model planning, real tools, commentary, work, and hidden audits share one request flow.');
