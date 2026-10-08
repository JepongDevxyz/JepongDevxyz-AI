import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../memory-chatgpt.js',import.meta.url),'utf8');
const failures=[];
let elements;
function test(name,fn){
  try{fn();console.log('PASS',name);}
  catch(error){failures.push({name,error});console.error('FAIL',name,'-',error.message);}
}

function createElement(tag='div'){
  const listeners={};
  const classes=new Set();
  const attributes={};
  const el={
    tagName:tag.toUpperCase(),id:'',value:'',hidden:false,style:{},children:[],
    textContent:'',_html:'',
    addEventListener(type,fn){(listeners[type]??=[]).push(fn);},
    click(){for(const fn of listeners.click||[])fn({target:this,currentTarget:this});},
    setAttribute(name,value){attributes[name]=String(value);if(name==='hidden')this.hidden=true;},
    removeAttribute(name){delete attributes[name];if(name==='hidden')this.hidden=false;},
    appendChild(child){this.children.push(child);if(child.id)elements.set(child.id,child);return child;},
    set innerHTML(value){
      this._html=String(value);
      for(const match of this._html.matchAll(/<([a-z][a-z0-9-]*)\b[^>]*\bid=["']([^"']+)["'][^>]*>/gi)){
        const child=createElement(match[1]);child.id=match[2];this.appendChild(child);
      }
    },
    get innerHTML(){return this._html;}
  };
  el.classList={
    toggle(name,force){const next=force===undefined?!classes.has(name):!!force;if(next)classes.add(name);else classes.delete(name);return next;},
    contains(name){return classes.has(name);}
  };
  return el;
}
function createEnvironment(){
  elements=new Map();
  const body=createElement('body'),head=createElement('head');
  const domListeners={};
  body.id='body';head.id='head';elements.set('body',body);elements.set('head',head);
  const document={
    readyState:'loading',body,head,
    createElement,
    getElementById(id){return elements.get(id)||null;},
    addEventListener(type,fn){(domListeners[type]??=[]).push(fn);},
    fire(type){for(const fn of domListeners[type]||[])fn();}
  };
  const canonical={memoryEnabled:false,nickname:'Pogi',occupation:'Student',moreAbout:'Accurate',memorySummary:'Remember this'};
  const actions=[],navigation=[],localWrites=[];
  const context={
    document,personalizationSettings:canonical,
    localStorage:{getItem(){return null;},setItem(key,value){localWrites.push([key,value]);}},
    setPersonalizationToggle(key,value){actions.push(['toggle',key,value]);canonical[key]=!!value;},
    savePersonalizationField(key,value){actions.push(['field',key,value]);canonical[key]=value;},
    openPersonalizationSettings(){navigation.push('openPersonalizationSettings');},
    filterPersonalizationSettings(query){navigation.push('filter:'+query);},
    openMemorySummaryEditor(){navigation.push('openMemorySummaryEditor');},
    showToast(){},
    console
  };
  context.window=context;
  vm.runInNewContext(source,context,{filename:'memory-chatgpt.js'});
  document.fire('DOMContentLoaded');
  return {context,document,canonical,actions,navigation,localWrites};
}

test('memory page loads profile and toggle from canonical personalization state',()=>{
  const e=createEnvironment();
  e.context.openSettingsMemory();
  assert.equal(e.document.getElementById('jdMemToggle').classList.contains('on'),false);
  assert.equal(e.document.getElementById('jdMemNick').value,'Pogi');
  assert.equal(e.document.getElementById('jdMemOcc').value,'Student');
  assert.equal(e.document.getElementById('jdMemAbout').value,'Accurate');
});

test('memory page saves all edits through canonical cloud-sync handlers',()=>{
  const e=createEnvironment();
  e.context.openSettingsMemory();
  e.document.getElementById('jdMemToggle').click();
  e.document.getElementById('jdMemNick').value='Pogi Dev';
  e.document.getElementById('jdMemOcc').value='Developer';
  e.document.getElementById('jdMemAbout').value='Builds JepongDevxyz AI';
  e.document.getElementById('jdMemSave').click();
  assert.deepEqual(e.actions,[
    ['toggle','memoryEnabled',true],
    ['field','nickname','Pogi Dev'],
    ['field','occupation','Developer'],
    ['field','moreAbout','Builds JepongDevxyz AI']
  ]);
  assert.equal(e.localWrites.length,0,'Memory must not save a localStorage shadow copy');
  assert.deepEqual(e.canonical,{memoryEnabled:true,nickname:'Pogi Dev',occupation:'Developer',moreAbout:'Builds JepongDevxyz AI',memorySummary:'Remember this'});
});

test('memory summary action opens the canonical memory editor from personalization settings',()=>{
  const e=createEnvironment();
  e.context.openSettingsMemory();
  e.document.getElementById('jdMemSummaryCard').click();
  assert.deepEqual(e.navigation,[
    'openPersonalizationSettings',
    'filter:memory',
    'openMemorySummaryEditor'
  ]);
});

if(failures.length){
  console.error(`${failures.length} memory contract test(s) failed`);
  process.exitCode=1;
}else console.log('PASS all memory cloud-flow contracts');

