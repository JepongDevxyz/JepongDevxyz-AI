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
  "activity(emit,'task-prepared'",
  "Implementation plan prepared:",
  "activity(emit,'thinking'",
  "id:'response-audit'",
  "Checked final response against",
  "id:'output-verification'",
  "Generated code passed"
]) assert(api.includes(token),'Missing universal Activity stage: '+token);

assert(api.includes("const responseAudit=auditGeneratedResponse(body.message||'',generatedText,body.files||[]);"),
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

// UI must keep the new audit milestones visible instead of classifying them as transport details.
const normalizeStart=html.indexOf('        function normalizeActivityEventForUI(evt = {}) {');
const normalizeEnd=html.indexOf('\n        function shouldShowAIActivity',normalizeStart);
assert(normalizeStart>=0&&normalizeEnd>normalizeStart,'Activity UI normalizer missing');
const normalizer=html.slice(normalizeStart,normalizeEnd);
assert(!normalizer.includes("id==='response-audit')return null"),
  'Final response audit must remain visible');
assert(normalizer.includes("if(id==='output-verification')"),
  'Generated-code verification needs reference-style test status');

console.log('PASS: Activity is universal for normal AI requests; HTML snake-game creation gets plan, Thinking, final-response audit, and generated-code static verification.');
