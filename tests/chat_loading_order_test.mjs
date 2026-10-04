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
const orderHelper=between(skeleton,'  function keepActivityBeforeSkeleton(','  function watchChat() {');

assert(/chatBox\.insertBefore\(indicator,\s*chatSkeleton\)/.test(indicator),
  'a skeleton created first must be moved below the activity indicator');
assert(/chatBox\.insertBefore\(chatSkEl,\s*activeIndicator\.nextSibling\)/.test(chatWatcher),
  'a skeleton created later must occupy the same slot immediately below the activity indicator');
assert(!chatWatcher.includes('chatBox.scrollTop = chatBox.scrollHeight'),
  'adding the skeleton must not force a competing scroll jump');
assert(/if \(generating && chatBox\) \{\s*if \(!chatSkEl\)/.test(chatWatcher),
  'the observer must keep running its generation branch after the skeleton already exists');
assert(!/if \(generating && chatBox && !chatSkEl\)/.test(chatWatcher),
  'the persistent order repair must not be gated on first-time skeleton creation');
assert(/keepActivityBeforeSkeleton\(chatBox\);\s*}\s*else if \(!generating && chatSkEl\)/.test(chatWatcher),
  'the chat observer must repair activity and skeleton order on every generation mutation');

const nodes={
  activity:{parentNode:null},
  skeleton:{parentNode:null}
};
const box={children:[nodes.skeleton,nodes.activity],querySelector:()=>nodes.skeleton,insertBefore(node,before){
  this.children.splice(this.children.indexOf(node),1);
  this.children.splice(this.children.indexOf(before),0,node);
  node.parentNode=this;
}};
nodes.activity.parentNode=box;
nodes.skeleton.parentNode=box;
const normalize=new Function('document',orderHelper+'\nreturn keepActivityBeforeSkeleton;')({
  getElementById:id=>id==='activeAiIndicator'?nodes.activity:null
});
normalize(box);
assert.deepEqual(box.children,[nodes.activity,nodes.skeleton],
  'a DOM update that leaves skeleton before activity must be reordered to match the reference image');
const runtimeVersion=agent.match(/var V='\?v=([^']+)'/);
assert(runtimeVersion && runtimeVersion[1]===patchVersion,
  'runtime asset cache version must match patch-version.txt');

console.log('PASS: activity indicator stays above the chat skeleton without competing auto-scroll');
