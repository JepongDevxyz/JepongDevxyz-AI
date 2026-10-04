import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.match(html,/<meta name="viewport" content="[^"]*interactive-widget=resizes-visual/,
  'keyboard resizing must not collapse the full layout viewport in floating browser windows');
assert.match(html,/#userInput\s*\{[^}]*font-size:\s*16px\s*!important/s,
  'the composer font must not trigger browser auto-zoom when focused');
const start=html.indexOf('        function syncVisualViewport() {');
const end=html.indexOf('        function scheduleVisualViewportSync()',start);
assert(start>=0&&end>start,'viewport sync function must exist');
const source=html.slice(start,end);

const app={style:{}};
const classes=new Set();
const cssVars={};
const document={
  scrollingElement:{scrollTop:0},
  body:{scrollTop:0},
  activeElement:null,
  documentElement:{clientHeight:167,style:{setProperty(name,value){cssVars[name]=value;}},classList:{toggle(name,enabled){enabled?classes.add(name):classes.delete(name);}}},
  getElementById:id=>id==='appContainer'?app:null
};
const window={
  innerHeight:167,
  innerWidth:286,
  outerHeight:167,
  outerWidth:286,
  screen:{height:167,width:286},
  visualViewport:{height:167,width:286,offsetTop:12,offsetLeft:24,scale:1},
  matchMedia:()=>({matches:true})
};
const sync=new Function('window','document','lockDocumentViewport','syncLivePetSafeLane',
  'let jepongStableViewportHeight=0,jepongStableViewportWidth=0;\n'+source+'\nreturn syncVisualViewport;')(window,document,()=>{},()=>{});

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
assert.equal(cssVars['--jepong-vh'],'260px',
  'the CSS important app height must receive the keyboard-safe size through its viewport variable');
window.innerHeight=700;
window.visualViewport.height=700;
document.documentElement.clientHeight=700;
sync();
assert.ok(!classes.has('keyboard-open'),
  'keyboard state must clear after the IME closes without requiring input blur');

// Floating Chrome window: the OS keyboard is outside the window, so preserve the
// pre-keyboard window dimensions instead of moving the composer over the header.
window.innerHeight=700;
window.innerWidth=220;
window.outerHeight=440;
window.outerWidth=220;
window.screen={height:900,width:286};
window.visualViewport.height=700;
window.visualViewport.width=220;
window.visualViewport.offsetTop=0;
window.visualViewport.offsetLeft=0;
document.documentElement.clientHeight=700;
document.activeElement=null;
sync();
window.innerHeight=260;
window.visualViewport.height=260;
window.visualViewport.width=170;
window.visualViewport.offsetTop=30;
window.visualViewport.offsetLeft=18;
document.documentElement.clientHeight=260;
document.activeElement={tagName:'TEXTAREA',readOnly:false,disabled:false};
sync();
assert.equal(app.style.height,'700px',
  'floating browser windows must keep their full usable window height while the keyboard is outside them');
assert.equal(cssVars['--jepong-vh'],'700px',
  'the CSS viewport height variable must preserve floating-window geometry');
assert.equal(app.style.top,'0px',
  'keyboard viewport panning must not shift a floating app window downward');
assert.equal(app.style.width,'220px',
  'floating windows should use their window width rather than a keyboard/pinch-reduced width');

// Tablet/desktop layouts should not inherit mobile inline fixed sizing.
const wideApp={style:{}};
document.getElementById=id=>id==='appContainer'?wideApp:null;
window.matchMedia=()=>({matches:false});
sync();
assert.equal(wideApp.style.position,undefined,
  'desktop pointer layouts must retain their normal responsive sizing');
window.innerWidth=1024;
window.innerHeight=768;
window.visualViewport.width=1024;
window.visualViewport.height=768;
window.screen={width:1024,height:768};
window.outerWidth=1024;
window.outerHeight=768;
window.matchMedia=query=>({matches:query.includes('pointer: coarse')});
sync();
assert.equal(wideApp.style.width,'1024px',
  'tablet touch layouts should track viewport changes even above the phone breakpoint');
assert.equal(wideApp.style.height,'768px',
  'tablet touch layouts should fit the visual viewport height');
window.innerWidth=286;
window.innerHeight=220;
window.outerWidth=220;
window.outerHeight=150;
window.screen={width:286,height:300};
window.visualViewport.width=220;
window.visualViewport.height=220;
document.documentElement.clientHeight=220;
document.activeElement=null;
sync();
window.innerHeight=160;
window.visualViewport.height=160;
document.documentElement.clientHeight=160;
document.activeElement={tagName:'TEXTAREA',readOnly:false,disabled:false};
sync();
assert.ok(classes.has('keyboard-open'),
  'keyboard detection must adapt to short minimized browser windows');
assert.equal(cssVars['--jepong-vh'],'220px',
  'a compact floating window must not collapse after even a modest keyboard resize');
console.log('PASS: minimized viewport dimensions are respected');
