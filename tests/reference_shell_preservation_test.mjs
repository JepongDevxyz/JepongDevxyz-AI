import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../reference-shell.css',import.meta.url),'utf8');
const backend=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');

// These existing runtime bindings are essential to the 3-tab UI. The header
// buttons call their original mode/navigation functions, never stub handlers.
for(const contract of [
 'function selectMode(', 'function sendMessage()', 'function handleMainAction()',
 'function openMenuFromBrandIcon()', 'function startIncognitoChat()',
 'function exitIncognitoChat()', 'function openModelPicker()',
 'function toggleSpeechRecognition()', 'function renderWelcomeScreen()',
 'function renderBibleWelcomeScreen()', 'function renderIncognitoWelcomeScreen()',
 'function createNewChat()', 'function saveSessions()',
 'function renderPetCompanionAcrossApp()', 'function syncLivePetSafeLane()',
 'function updateResponseEffortUI()'
]){
 assert(html.includes(contract),'Original runtime handler missing: '+contract);
}
assert(html.includes('<div class="welcome-title">JepongDevxyz AI</div>'),
 'Original JepongDevxyz AI welcome title must remain unchanged');
const top='https://lottie.host/035962ae-ec85-4735-ac5b-3a3764108916/y2Kb1ZKXAi.json';
const bottom='https://lottie.host/2477a7dc-71fb-4c1b-ab00-e006ead8ebe6/Ydd9GqGGLm.json';
const players=[...html.matchAll(/<lottie-player\b[^>]*>/g)].map(m=>m[0]);
assert.equal(players.length,6,'Keep both original Lottie elements in all three welcome modes');
assert.equal(players.filter(t=>t.includes(top)).length,3);
assert.equal(players.filter(t=>t.includes(bottom)).length,3);
assert(players.every(tag=>tag.includes('speed="1" loop autoplay')),
 'Existing Lottie animation timing and autoplay attributes must remain');
assert(html.includes('<link rel="stylesheet" href="/reference-shell.css">'));
assert(html.includes('id="jdNavigation"'));
assert(html.includes("onclick=\"selectMode('general','General AI')\""));
assert(html.includes("onclick=\"selectMode('imagen','Image Generator')\""));
assert(html.includes("onclick=\"selectMode('coder','Expert Coder')\""));
assert(html.includes('onclick="openMenuFromBrandIcon()"'));
assert(html.includes('onclick="toggleJdPrivateMode()"'));
assert(html.includes("onclick=\"jdQuickAction('imagen','Image Generator')\""));
assert(html.includes("onclick=\"jdQuickAction('coder','Expert Coder')\""));
assert(html.includes('aria-label="Toggle incognito chat"'));
assert(html.includes('syncJdNavigation();'));
assert(html.includes('id="userInput"')&&html.includes('id="mainActionBtn"'));
assert(html.includes('id="modelModalOverlay"')&&html.includes('id="composerToolSheet"'));
assert(html.includes('id="livePetLayer"')&&html.includes('id="chatHistoryList"'));
assert(backend.includes("if(autoFallback&&fallbackable){"),
 'Do not drop quota fallback while restyling the frontend');

for(const marker of [
 '.jd-navigation','.jd-nav-tab.active','.jd-welcome-quick-actions',
 '.chat-input-pill .pill-input','.chat-input-pill .pill-action-btn',
 '.welcome-screen .welcome-title','.sidebar','.msg.user.has-bubble',
 'body.theme-light','@media(max-width:520px)','html.keyboard-open .jd-welcome-quick-actions'
]){
 assert(css.includes(marker),'Responsive stylesheet missing: '+marker);
}
assert(!/lottie-player[^\n{]*\{[^}]*animation\s*:/s.test(css),
 'Visual shell must not override actual Lottie animation');
assert(!css.includes('display:none!important}.welcome-screen'),
 'Visual shell must not hide the original branded welcome state');

const a=html.indexOf('function syncJdNavigation(){'),b=html.indexOf('function toggleJdPrivateMode(){',a);
assert(a>=0&&b>a,'Navigation state updater missing');
const syncText=html.slice(a,b);
for(const [selectedMode,expectedTab,privateMode] of [
 ['general','ask',false],['school','ask',false],['tagalog','ask',false],
 ['imagen','imagine',false],['coder','build',false],['custom','ask',true]
]){
 const tabs=['ask','imagine','build'].map(name=>({
   dataset:{jdTab:name},active:false,attrs:{},
   classList:{toggle(cls,on){assert.equal(cls,'active');this.parent.active=on;}},
   setAttribute(k,v){this.attrs[k]=v}
 }));
 for(const btn of tabs)btn.classList.parent=btn;
 const priv={attrs:{},setAttribute(k,v){this.attrs[k]=v}};
 const fakeDocument={
   querySelectorAll:()=>tabs,
   getElementById:id=>id==='jdPrivateBtn'?priv:null
 };
 const sync=new Function('document','currentSelectedMode','isIncognito',
   syncText+'return syncJdNavigation;')(fakeDocument,selectedMode,privateMode);
 sync();
 assert.deepEqual(tabs.filter(x=>x.active).map(x=>x.dataset.jdTab),[expectedTab]);
 assert.equal(priv.attrs['aria-pressed'],String(privateMode));
}
console.log('PASS: original six Lottie elements, title, chat/voice/pet/provider handlers, navigation switching, responsive dark/light shell, and emergency fallback preserved.');
