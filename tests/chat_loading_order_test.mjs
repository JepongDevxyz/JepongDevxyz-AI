import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const skeleton=readFileSync(new URL('../skeleton.js',import.meta.url),'utf8');
const agent=readFileSync(new URL('../agent.js',import.meta.url),'utf8');
const patchVersion=readFileSync(new URL('../patch-version.txt',import.meta.url),'utf8').trim();
function between(source,start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  assert(a>=0&&b>a,'Missing source boundary: '+start);
  return source.slice(a,b);
}

const indicator=between(html,'        function showAIIndicator(','        function toggleActivityDetails(');
const chatWatcher=between(skeleton,'  function watchChat() {','  /* 2. Generic: add skeletons');

assert(/chatBox\.insertBefore\(indicator,\s*chatSkeleton\)/.test(indicator),
  'a skeleton created first must be moved below the activity indicator');
assert(/chatBox\.insertBefore\(chatSkEl,\s*activeIndicator\.nextSibling\)/.test(chatWatcher),
  'a skeleton created later must occupy the same slot immediately below the activity indicator');
assert(!chatWatcher.includes('chatBox.scrollTop = chatBox.scrollHeight'),
  'adding the skeleton must not force a competing scroll jump');
const runtimeVersion=agent.match(/var V='\?v=([^']+)'/);
assert(runtimeVersion && runtimeVersion[1]===patchVersion,
  'runtime asset cache version must match patch-version.txt');

console.log('PASS: activity indicator stays above the chat skeleton without competing auto-scroll');
