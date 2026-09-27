import assert from 'node:assert/strict';
import fs from 'node:fs';

const api=fs.readFileSync('api/chat.js','utf8');

const auditStart=api.indexOf("function taskAuditActivity(");
const verifyStart=api.indexOf("function taskCodeVerificationLabel(",auditStart);
const nextStart=api.indexOf("\n\nfunction linkLabel",verifyStart);
assert(auditStart>=0&&verifyStart>auditStart&&nextStart>verifyStart,'audit/verification functions missing');

const audit=api.slice(auditStart,verifyStart);
const verify=api.slice(verifyStart,nextStart);

assert(audit.includes('const dynamicPlan=Boolean(blueprint&&('),'audit must detect selected-model plan');
assert(audit.includes("'Checked the response against your request'"),'dynamic audit must use universal evidence-backed label');
assert(!audit.includes("blueprint?.audit||copy.label"),'legacy/domain audit copy must not override dynamic plan');

assert(verify.includes('const dynamicPlan=Boolean(blueprint&&('),'verification must detect selected-model plan');
assert(verify.includes("let noun='Checking the generated code'"),'dynamic code verification must use universal evidence-backed label');
assert(api.includes("postReports.length,result.activityBlueprint||null"),'response pipeline must pass the model plan into code verification');

const processStart=api.indexOf('async function processChat(body, emit) {');
const processEnd=api.indexOf('\nasync function mediaCapabilitySnapshot()',processStart);
const process=api.slice(processStart,processEnd);
assert(process.includes("const activityTrace=Array.isArray(activityBlueprint?.trace)"),'primary flow must use selected-model trace');
assert(!process.includes("taskPreparationStages("),'legacy preparation-stage generator must not be emitted by primary flow');
assert(!process.includes("taskWorkingActivity("),'legacy work-stage generator must not be emitted by primary flow');

console.log('PASS: dynamic Activity no longer leaks legacy website/app/domain audit or verification rows.');
