import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html=readFileSync('index.html','utf8');
const css=readFileSync('reactbits-micro.css','utf8');
const js=readFileSync('reactbits-micro.js','utf8');

assert(html.includes('/reactbits-micro.css'),'ReactBits micro stylesheet must load');
assert(html.includes('/reactbits-micro.js'),'ReactBits micro runtime must load');

for(const token of ['rb-lattice','rb-thought-line','rb-bell-toggle','rb-prompt-bar','rb-refine-frame','rb-squish-host','rb-voice-pill']){
  assert(css.includes(token), 'missing micro style: '+token);
  assert(js.includes(token), 'missing micro runtime: '+token);
}

assert(js.includes(".ai-activity-card"),'Activity integration missing');
assert(js.includes("data-finalized"),'Activity final state bridge missing');
assert(js.includes("settingsNotifyToggle"),'Bell Toggle must use existing notification state');
assert(js.includes("mainActionBtn"),'Prompt Bar must use existing send/stop button');
assert(js.includes("Generated artwork"),'Refine Frame must wrap generated images');
assert(js.includes("micBtn"),'Voice Pill must reuse existing microphone handler');
assert(js.includes("speechMiniPlayer"),'Voice Pill styling must reuse read-aloud player');

assert(!/from\s+['"]react['"]|motion\/react|@hugeicons\/react/.test(js),'Vanilla bridge must not add React/Motion runtime dependencies');
assert(html.includes('function appendActivityEvent'),'truthful Activity backend bridge must remain');
assert(html.includes('function toggleSpeechRecognition'),'existing microphone behavior must remain');
assert(html.includes('function updateGenerationActionButton'),'existing send/stop behavior must remain');
assert(html.includes("action:'generate-image'"),'existing image generation route must remain');

console.log('ReactBits micro integration contract passed');