import fs from 'node:fs'; import assert from 'node:assert';
const html=fs.readFileSync('index.html','utf8');
const activity=html.split('<style id="activityTimelineV4">')[1]?.split('</style>')[0]||'';
assert(activity.includes('.ai-activity-row{'), 'Activity timeline stylesheet missing');
assert(activity.includes('padding:7px 0!important'), 'borderless Activity rows need readable spacing');
assert(activity.includes('background:transparent!important;border:0!important'), 'Activity rows must be borderless');
assert(activity.includes('.ai-activity-card.collapsed .ai-activity-list{display:none!important}'),
  'Activity history must remain collapsible');
assert(html.includes('async function ensureAudioPlaybackUnlocked'),'audio playback unlock helper missing');
assert(html.includes('await ensureAudioPlaybackUnlocked()'),'voice actions must unlock audio from user gesture');
assert(html.includes('if(!neuralStarted)'),'neural TTS needs device fallback when playback never starts');
console.log('PASS activity + voice v3');
