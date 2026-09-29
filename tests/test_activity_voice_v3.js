import fs from 'node:fs'; import assert from 'node:assert';
const html=fs.readFileSync('index.html','utf8');
const activity=fs.readFileSync('reactbits-micro.css','utf8');
assert(activity.includes('.ai-activity-row{'), 'Activity timeline stylesheet missing');
assert(activity.includes('padding:5px 0!important'), 'compact borderless Activity rows need reference spacing');
assert(activity.includes('background:transparent!important') && activity.includes('border:0!important'), 'Activity rows must be borderless');
assert(activity.includes('.ai-activity-card.collapsed .thought-line__trace{display:none}'),
  'ThoughtLine Activity history must remain collapsible');
assert(activity.includes('.lattice-loader__run .lattice-loader__cell'), 'Requested 3x3 Lattice activity indicator missing');
assert(html.includes('async function ensureAudioPlaybackUnlocked'),'audio playback unlock helper missing');
assert(html.includes('await ensureAudioPlaybackUnlocked()'),'voice actions must unlock audio from user gesture');
assert(html.includes('if(!neuralStarted)'),'neural TTS needs device fallback when playback never starts');
assert(html.includes('class="voice-pill" id="micBtn"'),'VoicePill microphone markup missing');
assert(html.includes('class="read-aloud-pill" id="speechMiniPlayer"'),'VoicePill read-aloud markup missing');
console.log('PASS ReactBits Lattice activity + voice v3');
