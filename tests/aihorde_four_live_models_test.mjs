import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';

const chat=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function extract(start,end){
 const a=chat.indexOf(start),b=chat.indexOf(end,a+start.length);
 assert(a>=0&&b>a,'Missing source: '+start);
 return chat.slice(a,b);
}
const pickSource=extract('function fourResponsiveAIHordeModels(','\nfunction summarizeAIHordeError(');
const create=new Function('isAllowedAIHordeModelName','scoreAIHordeModel','getAIHordeActiveModels','AbortSignal',pickSource+
 '\nreturn {fourResponsiveAIHordeModels,liveAIHordePickerModels};');
const data=[
 {name:'fast-24b',workers:3,eta:8,queued:0,performance:90},
 {name:'fast-7b',workers:4,eta:16,queued:1,performance:80},
 {name:'fast-13b',workers:2,eta:22,queued:0,performance:65},
 {name:'fast-32b',workers:2,eta:30,queued:2,performance:100},
 {name:'other-8b',workers:1,eta:38,queued:2,performance:70},
 {name:'offline',workers:0,eta:1,queued:0,performance:100},
 {name:'slow-70b',workers:20,eta:240,queued:240,performance:100}
];
const api=create(()=>true,(m)=>100-m.eta,async()=>data,{timeout:()=>null});
const picks=api.fourResponsiveAIHordeModels(data);
assert.equal(picks.length,4);
assert.deepEqual(picks.map(x=>x.name),['fast-24b','fast-7b','fast-13b','fast-32b']);
assert(!picks.some(x=>x.workers===0||x.eta>60));
const live=await api.liveAIHordePickerModels();
assert.equal(live.status,'ready');
assert.deepEqual(live.models.map(x=>x.id),picks.map(x=>x.name));
assert(live.models.every(x=>x.online===true&&x.etaSeconds>=0));
const partial=create(()=>true,m=>100-m.eta,async()=>data.slice(0,2),{timeout:()=>null});
assert.equal((await partial.liveAIHordePickerModels()).models.length,2,
 'Never invent four active models when fewer are verified');
const failed=create(()=>true,m=>100-m.eta,async()=>{throw Error('Status API unavailable');},{timeout:()=>null});
assert.deepEqual((await failed.liveAIHordePickerModels()).models,[],
 'No unverified hardcoded fallbacks for model choices');
assert(!ui.includes('data-provider="aihorde" data-model="auto"'));
assert(ui.includes("action:'aihorde-live-models'"));
assert(ui.includes("if(currentSelectedProvider==='aihorde'&&!currentSelectedModel)"));
assert(chat.includes("if(provider==='aihorde'&&(!selected||selected==='auto'))"));
assert(chat.includes('if(!autoFallback)candidates=candidates.slice(0,1);'),
 'OFF should keep a single selected model');
console.log('AI Horde live four-model picker PASS: ranks verified online workers; no offline/slow entries; fewer than four stays fewer; network error stays empty; no Auto selectable; strict OFF preserved.');
