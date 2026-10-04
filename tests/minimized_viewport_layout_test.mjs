import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('        function syncVisualViewport() {');
const end=html.indexOf('        function scheduleVisualViewportSync()',start);
assert(start>=0&&end>start,'viewport sync function must exist');
const source=html.slice(start,end);

const app={style:{}};
const document={
  scrollingElement:{scrollTop:0},
  body:{scrollTop:0},
  documentElement:{clientHeight:167,style:{setProperty(){}},classList:{toggle(){}}},
  getElementById:id=>id==='appContainer'?app:null
};
const window={
  innerHeight:167,
  visualViewport:{height:167,offsetTop:0},
  matchMedia:()=>({matches:true})
};
const sync=new Function('window','document','lockDocumentViewport','syncLivePetSafeLane',
  source+'\nreturn syncVisualViewport;')(window,document,()=>{},()=>{});

sync();
assert.equal(app.style.height,'167px',
  'a minimized webview shorter than 320px must fit its real visual viewport');
assert.equal(app.style.maxHeight,'167px',
  'the app must not leave the skeleton or chat flow below the floating window');
console.log('PASS: minimized viewport dimensions are respected');
