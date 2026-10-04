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
const orderHelper=between(skeleton,'  function keepLoadingOrder(chatBox) {','  function watchChat() {');

assert(/chatBox\.insertBefore\(indicator,\s*chatSkeleton\)/.test(indicator),
  'a skeleton created first must be moved below the activity indicator');
assert.match(html,/class="jd-stream-cursor"/,
  'the three-dot loading indicator belongs to the live assistant response');
assert.match(html,/botMsgElem\.innerHTML = `<div>\$\{renderCustomMarkdown\(visibleText\)\}\$\{cursor\}/,
  'the live assistant response must own the streaming cursor while its text is revealed');
assert(/chatBox\.insertBefore\(chatSkEl,\s*responseMessage\.nextSibling\)/.test(chatWatcher),
  'the skeleton must be inserted after the live assistant message that contains the three-dot cursor');
assert(!chatWatcher.includes('chatBox.scrollTop = chatBox.scrollHeight'),
  'adding the skeleton must not force a competing scroll jump');
assert(/if \(generating && chatBox\) \{\s*if \(!chatSkEl\)/.test(chatWatcher),
  'the observer must keep running its generation branch after the skeleton already exists');
assert(!/if \(generating && chatBox && !chatSkEl\)/.test(chatWatcher),
  'the persistent order repair must not be gated on first-time skeleton creation');
assert(/keepLoadingOrder\(chatBox\);\s*}\s*else if \(!generating && chatSkEl\)/.test(chatWatcher),
  'the chat observer must repair activity, response cursor, and skeleton order on every generation mutation');

const nodes={activity:{parentNode:null},skeleton:{parentNode:null},response:{parentNode:null,className:'msg bot'}};
const box={children:[nodes.skeleton,nodes.response,nodes.activity],querySelector:()=>nodes.skeleton,querySelectorAll:()=>[nodes.response],insertBefore(node,before){
  this.children.splice(this.children.indexOf(node),1);
  const index=before===null?this.children.length:this.children.indexOf(before);
  this.children.splice(index,0,node);
  node.parentNode=this;
}};
Object.defineProperty(nodes.skeleton,'previousSibling',{get(){return box.children[box.children.indexOf(this)-1]||null;}});
Object.defineProperty(nodes.response,'nextSibling',{get(){return box.children[box.children.indexOf(this)+1]||null;}});
nodes.activity.parentNode=box;
nodes.skeleton.parentNode=box;
nodes.response.parentNode=box;
const normalize=new Function('document',orderHelper+'\nreturn keepLoadingOrder;')({
  getElementById:id=>id==='activeAiIndicator'?nodes.activity:null
});
normalize(box);
assert.deepEqual(box.children,[nodes.activity,nodes.response,nodes.skeleton],
  'a DOM update must leave the response three-dot cursor immediately before the skeleton');
const runtimeVersion=agent.match(/var V='\?v=([^']+)'/);
assert(runtimeVersion && runtimeVersion[1]===patchVersion,
  'runtime asset cache version must match patch-version.txt');

console.log('PASS: activity and assistant cursor stay above the chat skeleton without competing auto-scroll');
