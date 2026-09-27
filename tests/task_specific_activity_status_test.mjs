import assert from 'node:assert/strict';
import fs from 'node:fs';

const api=fs.readFileSync('api/chat.js','utf8');
const html=fs.readFileSync('index.html','utf8');

function between(src,start,end){
  const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
  assert(a>=0&&b>a,'Missing section: '+start);
  return src.slice(a,b);
}

const copySrc=between(api,'function taskSpecificActivityCopy(profile={}, phase=\'context\'){','\nfunction contextActivityPlan(');
const taskSpecificActivityCopy=new Function(copySrc+'\nreturn taskSpecificActivityCopy;')();

const snake={kind:'web',subtype:'game',intent:{create:true},subject:'HTML snake game'};
const apiTask={kind:'backend',subtype:'api',intent:{create:true},subject:'REST API for notes'};
const writing={kind:'writing',subtype:'message',intent:{create:true},subject:'email to teacher'};
const math={kind:'study',subtype:'math',intent:{},subject:'quadratic equation'};
const research={kind:'research',subtype:'current',intent:{research:true},subject:'latest Android release'};
const troubleshoot={kind:'troubleshooting',subtype:'diagnose',intent:{edit:true},subject:'page crashes on submit'};

assert.match(taskSpecificActivityCopy(snake,'context').label,/gameplay, controls/i);
assert.match(taskSpecificActivityCopy(snake,'prepared').label,/Game structure/i);
assert.match(taskSpecificActivityCopy(snake,'work').label,/game loop, controls, scoring/i);
assert.match(taskSpecificActivityCopy(snake,'audit').label,/game output/i);

assert.match(taskSpecificActivityCopy(apiTask,'context').label,/API inputs, outputs/i);
assert.match(taskSpecificActivityCopy(apiTask,'work').label,/API behavior/i);
assert.match(taskSpecificActivityCopy(writing,'context').label,/message purpose, tone, and audience/i);
assert.match(taskSpecificActivityCopy(math,'work').label,/calculation and checking the result/i);
assert.match(taskSpecificActivityCopy(research,'context').label,/current facts.*verification/i);
assert.match(taskSpecificActivityCopy(troubleshoot,'work').label,/root cause/i);

const labels=[
  taskSpecificActivityCopy(snake,'work').label,
  taskSpecificActivityCopy(apiTask,'work').label,
  taskSpecificActivityCopy(writing,'work').label,
  taskSpecificActivityCopy(math,'work').label,
  taskSpecificActivityCopy(research,'work').label,
  taskSpecificActivityCopy(troubleshoot,'work').label
];
assert.equal(new Set(labels).size,labels.length,'Different task classes must not collapse to one generic status');

assert(html.includes("return {...e,label:label||'Thinking',kind:kind||'process'}"),
  'Frontend must preserve server task-specific model-work wording');
assert(html.includes('Planning gameplay, controls, and browser behavior: '),
  'Immediate client Activity lead must already recognize game creation');
assert(html.includes('Mapping backend inputs, outputs, and failure paths: '),
  'Immediate client Activity lead must recognize backend work');
assert(html.includes('Shaping the requested writing, tone, and structure: '),
  'Immediate client Activity lead must recognize writing work');
assert(html.includes('Identifying the problem, target, and method: '),
  'Immediate client Activity lead must recognize study/math work');

console.log('PASS: different user tasks produce distinct, request-related Activity wording while preserving the common reference UI.');
