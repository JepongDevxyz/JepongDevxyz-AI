import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../account-appearance.css',import.meta.url),'utf8');
const backend=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
assert(html.includes('id="jdHapticsToggle"'),'Settings must include a real haptics toggle');
assert(html.includes('onchange="setJdHaptics(this.checked)"'));
assert(html.includes('id="jdHapticsDescription"'));
assert(html.includes('syncJdHapticsUI();'),'Saved haptics preference must hydrate on load');
assert(html.includes('id="jdTextSizeRange"')&&html.includes('id="jdTextPreviewAnswer"'));
assert(html.includes('class="jd-text-preview-question"'));
assert(/\.jd-text-preview-question\s*\{[^}]*font-size:calc\(\.78rem\s*\*\s*var\(--jd-chat-scale,1\)\)/s.test(css),
  'Question bubble must scale with the same live value as the answer');
assert(/\.jd-text-preview-chat p\s*\{[^}]*font-size:calc\(1rem\s*\*\s*var\(--jd-chat-scale,1\)\)/s.test(css),
  'Answer preview must scale with the same live value as the question');
assert(css.includes('.chat-box .user-bubble-body')&&css.includes('var(--jd-chat-scale,1)'),
  'Real user and AI messages must retain text scaling');
assert(!html.includes("preview.style.fontSize='calc(1rem * '"),
  'Answer-only inline font scaling must be removed');

const from=html.indexOf("        const JD_HAPTICS_KEY='jd_haptics_enabled';");
const to=html.indexOf('        function openJdAppearance(){',from);
assert(from>=0&&to>from,'Haptics UI functions missing');
const source=html.slice(from,to);
const saved=new Map();
const calls=[];
let timestamp=1000;
const toggler={checked:false};
const description={textContent:''};
let clickHandler=null;
let canVibrate=true;
const navigatorMock={
  vibrate:duration=>{calls.push(duration);return true;}
};
const documentMock={
  getElementById:id=>id==='jdHapticsToggle'?toggler:id==='jdHapticsDescription'?description:null,
  addEventListener:(name,callback)=>{assert.equal(name,'click');clickHandler=callback;}
};
const storage={
  getItem:key=>saved.get(key)||null,
  setItem:(key,value)=>saved.set(key,value)
};
const harness=new Function('document','localStorage','navigator','Date','safeSetLocalStorage',
  source+'\nreturn {setJdHaptics,jdHapticPulse,syncJdHapticsUI,jdHapticsSupported};')(
  documentMock,storage,navigatorMock,{now:()=>timestamp},
  (key,value)=>{saved.set(key,value);return true;}
);
harness.syncJdHapticsUI();
assert.equal(toggler.checked,false,'Default haptics must remain off');
const target={
  disabled:false,
  closest:selector=>selector==='button,[role="button"],input[type="checkbox"],input[type="radio"]'
    ?target:null
};
clickHandler({isTrusted:true,target});
assert.deepEqual(calls,[],'Off must never vibrate');
harness.setJdHaptics(true);
assert.equal(saved.get('jd_haptics_enabled'),'true');
assert.equal(toggler.checked,true);
assert.equal(calls.length,1,'Enabling should preview a short pulse');
assert.equal(calls[0],12);
timestamp=1100;
clickHandler({isTrusted:true,target});
assert.equal(calls.length,2,'Trusted buttons vibrate once when enabled');
clickHandler({isTrusted:true,target});
assert.equal(calls.length,2,'Rapid repeated events are throttled');
timestamp=1200;
clickHandler({isTrusted:false,target});
assert.equal(calls.length,2,'Synthetic events must not trigger hardware');
harness.setJdHaptics(false);
assert.equal(saved.get('jd_haptics_enabled'),'false');
assert.equal(toggler.checked,false);
assert.equal(calls.at(-1),0,'Turning off must cancel outstanding vibration');
timestamp=1400;
clickHandler({isTrusted:true,target});
assert.equal(calls.length,3,'OFF state must never pulse');
delete navigatorMock.vibrate;
harness.setJdHaptics(true);
assert.equal(toggler.checked,true);
assert.equal(harness.jdHapticsSupported(),false);
assert.match(description.textContent,/unavailable/i,'Unsupported browsers need honest UI');
assert.equal(harness.jdHapticPulse(),false);

assert.equal((html.match(/<lottie-player\b/g)||[]).length,6,'Existing welcome animations must remain');
assert(html.includes('<div class="welcome-title">JepongDevxyz AI</div>'));
assert(backend.includes('if(autoFallback&&fallbackable){'),'Unrelated model routing should not change');
console.log('PASS: haptics ON/OFF, persistence, trusted click, feedback throttle, unsupported API, both preview bubbles + chat scale, all original Lottie and API fallback.');
