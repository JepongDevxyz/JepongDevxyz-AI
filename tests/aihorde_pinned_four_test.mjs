import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';

const backend=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
const frontend=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=backend.indexOf('function fourResponsiveAIHordeModels(');
const end=backend.indexOf('\nasync function checkAIHordeCredential(',start);
assert(start>=0&&end>start,'AI Horde picker source missing');
const factory=new Function('isAllowedAIHordeModelName','scoreAIHordeModel',
  backend.slice(start,end)+'\nreturn fourResponsiveAIHordeModels;');
const choose=factory(()=>true,model=>100-model.eta);
const live=[
 {name:'a-24b',workers:2,eta:8},{name:'b-32b',workers:1,eta:11},
 {name:'c-7b',workers:4,eta:13},{name:'d-70b',workers:1,eta:18},
 {name:'e-8b',workers:2,eta:20}
];
assert.deepEqual(choose(live).map(x=>x.name),['a-24b','b-32b','c-7b','d-70b']);
assert.deepEqual(choose(live,['d-70b','a-24b','c-7b','b-32b']).map(x=>x.name),
 ['d-70b','a-24b','c-7b','b-32b'],'Stable four named choices while all remain online');
const changed=live.map(x=>x.name==='c-7b'?{...x,workers:0}:x);
assert.deepEqual(choose(changed,['d-70b','a-24b','c-7b','b-32b']).map(x=>x.name),
 ['d-70b','a-24b','b-32b','e-8b'],'Replace offline model with verified online model');
assert(!choose(live.filter(x=>x.name==='a-24b'),['offline-model']).some(x=>x.name==='offline-model'),
 'Never resurrect offline pinned models');
assert(backend.includes('liveAIHordePickerModels(body.preferredModels)'));
assert(frontend.includes("localStorage.setItem('jepong_aihorde_pinned_models'"));
assert(frontend.includes('preferredModels:aihordePinnedModels'));
assert(frontend.includes('toggleAutoFallback(true)'));
assert(frontend.includes('Your AI Horde API key was rejected.'));
console.log('PASS: four stable live model slots; offline replacement; credential recovery requires explicit user action.');
