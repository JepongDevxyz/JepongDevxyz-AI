import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.match(html,/<meta name="viewport" content="[^"]*interactive-widget=resizes-content/,
  'Android should resize the app layout viewport with the on-screen keyboard');
assert.match(html,/#userInput\s*\{[^}]*font-size:\s*16px\s*!important/s,
  'the composer font must not trigger browser auto-zoom when focused');
const start=html.indexOf('        function syncVisualViewport() {');
const end=html.indexOf('        function scheduleVisualViewportSync()',start);
assert(start>=0&&end>start,'viewport sync function must exist');
const source=html.slice(start,end);

const app={style:{}};
const classes=new Set();
const document={
  scrollingElement:{scrollTop:0},
  body:{scrollTop:0},
  activeElement:null,
  documentElement:{clientHeight:167,style:{setProperty(){}},classList:{toggle(name,enabled){enabled?classes.add(name):classes.delete(name);}}},
  getElementById:id=>id==='appContainer'?app:null
};
const window={
  innerHeight:167,
  innerWidth:286,
  visualViewport:{height:167,width:286,offsetTop:12,offsetLeft:24,scale:1},
  matchMedia:()=>({matches:true})
};
const sync=new Function('window','document','lockDocumentViewport','syncLivePetSafeLane',
  'let jepongStableViewportHeight=0;\n'+source+'\nreturn syncVisualViewport;')(window,document,()=>{},()=>{});

sync();
assert.equal(app.style.height,'167px',
  'a minimized webview shorter than 320px must fit its real visual viewport');
assert.equal(app.style.maxHeight,'167px',
  'the app must not leave the skeleton or chat flow below the floating window');
assert.equal(app.style.width,'286px',
  'the app must fit the actual minimized visual viewport width');
assert.equal(app.style.left,'24px',
  'the app must follow a horizontally offset minimized viewport');
assert.equal(app.style.top,'12px',
  'the app must follow a vertically offset minimized viewport');

// Simulate Android Chrome configured to resize both viewports when the keyboard opens.
window.innerHeight=700;
window.visualViewport.height=700;
document.documentElement.clientHeight=700;
sync();
window.innerHeight=260;
window.visualViewport.height=260;
document.documentElement.clientHeight=260;
document.activeElement={tagName:'TEXTAREA',readOnly:false,disabled:false};
sync();
assert.ok(classes.has('keyboard-open'),
  'keyboard state must be recognized when layout and visual viewport shrink together');
assert.equal(app.style.height,'260px',
  'the composer must remain inside the keyboard-safe resized viewport');
window.innerHeight=700;
window.visualViewport.height=700;
document.documentElement.clientHeight=700;
sync();
assert.ok(!classes.has('keyboard-open'),
  'keyboard state must clear after the IME closes without requiring input blur');
console.log('PASS: minimized viewport dimensions are respected');
