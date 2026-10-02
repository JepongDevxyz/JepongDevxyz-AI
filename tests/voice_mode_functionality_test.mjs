import fs from 'node:fs';
import assert from 'node:assert/strict';

const voice = fs.readFileSync('voice-mode.js', 'utf8');
const micro = fs.readFileSync('reactbits-micro.js', 'utf8');
const app = fs.readFileSync('index.html', 'utf8');
const api = fs.readFileSync('api/chat.js', 'utf8');

assert(app.includes('/reactbits-micro.js?v=20261002a9'), 'voice-slot state fix must ship with a fresh ReactBits cache version');
assert(voice.includes("speak('Hello, I\\'m JepongDevxyz AI. How can I help you today?', 'en-US')"), 'voice mode must speak the requested opening greeting in English');
assert(voice.includes('scheduleIdleNudge();'), 'voice mode must schedule a spoken prompt when the user is quiet');
assert(voice.includes('stopRec();\n      speak(followups'), 'voice nudges must pause recognition to avoid echo feedback');
assert(voice.includes("S.lastSpokenLanguage = detectUserLanguage(text)"), 'voice mode must detect the language from each user utterance');
assert(voice.includes("send.addEventListener('click'") && voice.includes("}, true);"), 'voice action must intercept the Sling button click in capture phase');
assert(voice.includes('event.stopImmediatePropagation();') && voice.includes('if (!send.__jdVoiceSwapped) return;'), 'voice click must stop the Sling send handler only while the composer is in voice mode');
assert(voice.includes('window.handleMainAction = wrappedHandleMainAction;') && voice.includes('if (send.__jdVoiceSwapped) {'), 'the voice swap must intercept Sling pointer-release calls that invoke handleMainAction directly without a click event');
assert(voice.includes("send.setAttribute('aria-label', t('entryAria'))"), 'voice state must update the real composer action accessibility label');
assert(micro.includes('var voiceEntry=!busy&&!!action.__jdVoiceSwapped;') && micro.includes('var armed=busy||hasText||hasFiles||voiceEntry;'), 'the visible voice-action slot must remain enabled while the empty composer is in voice-entry mode');
assert(voice.includes('window.JDReactBits?.syncPrompt?.();'), 'voice/send swaps must immediately resynchronize the Sling button disabled state');
assert(!voice.includes("mic.addEventListener('click'"), 'voice mode must preserve the microphone button dictation gesture');
assert(app.includes('voiceResponseLanguage: window.__jdVoiceResponseLanguage || undefined'), 'voice requests must pass their detected response language to the chat API');
assert(api.includes('voiceResponseLanguage') && api.includes('follow the new language'), 'the chat system instruction must apply the detected language to voice replies');

console.log('PASS: voice greeting, idle nudges, per-utterance language detection, and response-language instruction');
