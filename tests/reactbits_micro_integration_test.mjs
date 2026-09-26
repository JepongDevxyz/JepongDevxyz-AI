import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html=readFileSync('index.html','utf8');
const css=readFileSync('reactbits-micro.css','utf8');
const js=readFileSync('reactbits-micro.js','utf8');
const activityCss=readFileSync('activity-reference.css','utf8');
const shellCss=readFileSync('reference-shell.css','utf8');
const settingsCss=readFileSync('haptics-notifications.css','utf8');

assert(html.includes('/reactbits-micro.css'),'ReactBits stylesheet must load');
assert(html.includes('/reactbits-micro.js'),'ReactBits runtime must load');

// 1/6 LatticeLoader + ThoughtLine: direct real Activity rendering, not overlay injection.
for (const token of ['lattice-loader','thought-line','thought-line__trace']) {
  assert(html.includes(token), 'Activity direct markup missing: '+token);
  assert(css.includes(token), 'Activity style missing: '+token);
}
assert(html.includes('id="aiActivityLattice"'),'Activity LatticeLoader live status hook missing');
assert(html.includes('id="aiActivityTimer"'),'ThoughtLine elapsed timer hook missing');
assert(html.includes("if(summary && card.dataset.finalized!=='true')summary.textContent='Thinking';"),
 'ThoughtLine headline must remain stable while exact milestones stay in the activity trace');
assert(html.includes("card.dataset.taskSummary=String(normalized.label||'').slice(0,220)"),
 'Task-specific activity context must be preserved separately from the headline');
assert(html.includes('function appendActivityEvent'),'real backend Activity event bridge must remain');
assert(html.includes("if(id==='task-context')"),'real task-context Activity lead must remain');
assert(html.includes('initialActivityForRequest'),'request-specific temporary lead must remain');
assert(html.includes("lattice.dataset.status = success ? 'done' : 'error'"),'Activity final status must drive LatticeLoader');
assert(!html.includes('class="ai-activity-summary-row"'),'legacy Activity summary markup must be removed');
assert(!html.includes('id="aiActivitySummaryIcon"'),'legacy Activity icon markup must be removed');
assert(activityCss.includes('migrated to reactbits-micro.css'),'legacy Activity stylesheet must be retired');

// 2/6 BellToggle: real notification state and permission handler remain.
for (const token of ['bell-toggle','bell-toggle__button']) {
  assert(html.includes(token), 'BellToggle markup missing: '+token);
  assert(css.includes(token), 'BellToggle style missing: '+token);
}
assert(html.includes('id="replyBellToggle"'),'BellToggle state hook missing');
assert(js.includes('toggleBell'),'BellToggle runtime missing');
assert(js.includes('settingsNotifyToggle'),'BellToggle must reuse actual notification state');
assert(html.includes('toggleResponseNotifications(this.checked)'),'notification permission handler must remain wired');
assert(!html.includes('jd-reply-notify-switch'),'legacy notification switch markup must be removed');
assert(!settingsCss.includes('.jd-reply-notify-switch'),'legacy notification switch CSS must be removed');

// 3/6 PromptBar busy=true, models=false: official ReactBits DOM/CSS/runtime port.
for (const token of [
  'prompt-bar','prompt-bar__menu','prompt-bar__glow','prompt-bar__row',
  'prompt-bar__field','prompt-bar__sparks','prompt-bar__chips','prompt-bar__chip',
  'prompt-bar__input','prompt-bar__bar','prompt-bar__pick','prompt-bar__send',
  'prompt-bar__effort-track','data-models="false"'
]) {
  assert(html.includes(token) || css.includes(token), 'PromptBar ReactBits token missing: '+token);
}
assert(html.includes('id="promptBarSendPath"'),'PromptBar morph path hook missing');
assert(html.includes('id="responseEffortTrack"'),'PromptBar effort slider missing');
assert(html.includes('aria-valuemax="5"'),'PromptBar six-step slider range missing');
for (const level of ['Instant','Low','Medium','High','Extra','Max']) {
  assert(html.includes(level), 'PromptBar effort level missing: '+level);
}
assert((html.match(/data-effort-index="/g)||[]).length >= 6,'PromptBar must render six discrete effort stops');
assert(html.includes("const RESPONSE_EFFORT_LEVELS=['Instant','Low','Medium','High','Extra','Max']"),
 'PromptBar six-level state model missing');
assert(js.includes("toLowerCase()==='max'"),'ReactBits spark/max state must be tied to Max, not High');
assert(html.includes('id="composerToolSheet"') && html.includes('data-kind="at"'),
 'PromptBar source menu missing');
assert(!html.includes('prompt-bar__vision'),'custom extra bottom-bar Vision control must not alter ReactBits layout');
assert(!html.includes('class="response-effort-menu"'),'legacy response effort menu markup must be removed');
assert(!html.includes('class="response-effort-option"'),'legacy response effort options must be removed');
assert(!html.includes('class="composer-tool-sheet"'),'legacy composer sheet markup must be removed');
assert(css.includes('--pb-w: 400px;'),'PromptBar width must match ReactBits source');
assert(css.includes('--pb-radius: 16px;'),'PromptBar radius must match ReactBits source');
assert(css.includes('.prompt-bar__menu[data-kind=\'effort\']'),'ReactBits effort popup styling missing');
assert(css.includes('.prompt-bar__effort-thumb'),'ReactBits effort thumb styling missing');
assert(css.includes('.prompt-bar__chip-x'),'ReactBits attachment chip styling missing');
assert(js.includes('PB_ARROW_UP') && js.includes('PB_SQUARE'),'ReactBits send morph geometry missing');
assert(js.includes('animatePromptGlyph'),'ReactBits send morph runtime missing');
assert(js.includes('startPromptSparks'),'ReactBits max-effort spark runtime missing');
assert(js.includes("bar.toggleAttribute('data-busy',busy)"),'ReactBits boolean busy attribute contract missing');
assert(js.includes("action.setAttribute('data-pressed','')"),'ReactBits send press state missing');
assert(html.includes('function updateGenerationActionButton'),'send/stop state function must remain');
assert(html.includes('function handleMainAction'),'send/stop handler must remain');
assert(html.includes('composerToolSheet'),'attachment/source menu must remain');
assert(html.includes('responseEffortMenu'),'response effort menu must remain');
assert(!html.includes('class="chat-input-pill"'),'legacy composer root markup must be removed');
assert(!html.includes('class="pill-mic-btn"'),'legacy mic markup must be removed');
assert(!shellCss.includes('.chat-input-pill'),'legacy composer stylesheet must be removed');

// 4/6 RefineFrame complete: emitted directly by image generation.
for (const token of ['refine-frame','refine-frame__media','refine-frame__chip','data-status="complete"']) {
  assert(html.includes(token), 'RefineFrame output missing: '+token);
  assert(css.includes(token), 'RefineFrame style missing: '+token);
}
assert(html.includes("action:'generate-image'"),'existing image generation route must remain');
assert(html.includes('alt="Generated artwork"'),'generated image output must remain');
assert(js.includes('hydrateRefine'),'RefineFrame settle runtime missing');

// 5/6 SquishSwitch: all static legacy toggle hosts replaced while their input handlers remain.
assert(html.includes('class="squish-switch-root"'),'SquishSwitch markup missing');
assert(css.includes('.squish-switch-root'),'SquishSwitch style missing');
assert(js.includes('bindSquish'),'SquishSwitch interaction runtime missing');
assert(js.includes('setPointerCapture'),'SquishSwitch drag interaction missing');
assert(!html.includes('class="mini-toggle'),'legacy mini-toggle markup must be removed');
assert(!html.includes('class="ios-switch"'),'legacy ios-switch markup must be removed');
assert(!html.includes('class="jd-haptics-switch"'),'legacy haptics switch markup must be removed');
assert(!settingsCss.includes('.jd-haptics-switch'),'legacy haptics switch CSS must be removed');
for (const handler of [
  'setLiveWebSearchEnabled(this.checked)',
  'toggleResponseSpeech(this.checked)',
  'toggleAutoFallback(this.checked)',
  'toggleSmartRouter(this.checked)',
  'setJdHaptics(this.checked)',
  'setPersonalizationToggle'
]) assert(html.includes(handler),'existing toggle handler lost: '+handler);

// 6/6 VoicePill: direct mic + read-aloud UI, real speech handlers retained.
for (const token of ['voice-pill','voice-pill__capsule','voice-pill__wave','read-aloud-pill']) {
  assert(html.includes(token), 'VoicePill direct markup missing: '+token);
  assert(css.includes(token), 'VoicePill style missing: '+token);
}
assert(html.includes('function startSpeechRecognition'),'explicit microphone start behavior missing');
assert(html.includes('function stopSpeechRecognition'),'explicit microphone stop behavior missing');
assert(html.includes('function toggleSpeechRecognition'),'real microphone behavior must remain');
assert(html.includes('data-mode="auto" data-hold-after="300"'),'VoicePill auto tap/hold configuration missing');
assert(!html.includes('id="micBtn" data-state="idle" aria-pressed="false" onclick='),'VoicePill must not use legacy click-only microphone binding');
assert(js.includes('VOICE_HOLD_AFTER=300'),'VoicePill 300ms hold threshold missing');
assert(js.includes("if(isHold)window.stopSpeechRecognition?.('release')"),'VoicePill hold-to-release behavior missing');
assert(js.includes('VOICE_CANCEL_DISTANCE=64'),'VoicePill slide-to-cancel distance missing');
assert(html.includes('function toggleSpeechMiniPlayback'),'real read-aloud playback must remain');
assert(html.includes('function stopAllSpeech'),'read-aloud stop behavior must remain');
assert(!html.includes('class="speech-mini-player"'),'legacy read-aloud markup must be removed');
assert(!html.includes('id="waveContainer"'),'legacy duplicate mic waveform must be removed');

// Startup safety: only targeted observers, no page-wide upgradeAll mutation loop.
assert(!js.includes('upgradeAll'),'old broad ReactBits mutation upgrader must be gone');
assert(!js.includes("observer.observe(root,{childList:true,subtree:true})"),'old page-wide mutation observer pattern must be gone');
assert(js.includes('hydrateSquish(node)'),'dynamic switch hydration must remain targeted');
assert((js.match(/new MutationObserver/g)||[]).length <= 4,'ReactBits runtime must keep observers narrowly bounded');
assert(js.includes('window.__JD_REACTBITS_MICRO_READY__=true'),'runtime readiness marker missing');

// No React/Motion runtime dependencies added to this vanilla application.
assert(!/from\s+['"]react['"]|motion\/react|@hugeicons\/react/.test(js),'vanilla runtime must not add React/Motion dependencies');

console.log('ReactBits 6/6 replacement audit passed');
