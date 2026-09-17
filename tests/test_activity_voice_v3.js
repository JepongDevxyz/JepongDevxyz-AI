const fs=require('fs'), assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
assert(html.includes('row-gap:12px!important'),'activity rows need readable 12px vertical spacing');
assert(html.includes('padding:10px 8px!important'),'activity rows need readable padding');
assert(html.includes('min-height:44px!important'),'activity rows need stable minimum height');
assert(html.includes('async function ensureAudioPlaybackUnlocked'),'audio playback unlock helper missing');
assert(html.includes('await ensureAudioPlaybackUnlocked()'),'voice actions must unlock audio from user gesture');
assert(html.includes('if(!neuralStarted)'),'neural TTS needs device fallback when playback never starts');
console.log('PASS activity + voice v3');
