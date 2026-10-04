import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../reactions-v2.js',import.meta.url),'utf8');
const regexMatch=source.match(/^  var MARKER_RE = (\/[^;]+);$/m);
assert(regexMatch,'reaction marker parser must be present');
const markerRe=new Function('return '+regexMatch[1])();

const start=source.indexOf('  function removeMarkerText(root, markerText) {');
const end=source.indexOf('\n  function botContentEl',start);
assert(start>=0&&end>start,'shared text-node marker removal helper must be present');
const helperSource=source.slice(start,end).trim();
const textNodes=[
  {nodeValue:'Route info [USER_REACTION:'},
  {nodeValue:'👍]'},
  {nodeValue:'\n\n'},
  {nodeValue:'Guimba → Baguio map appendix'}
];
for(const node of textNodes)node.parentElement={closest:()=>null};
const document={createTreeWalker:()=>{let i=-1;return{nextNode(){i++;return i<textNodes.length;},get currentNode(){return textNodes[i];}};}};
const removeMarkerText=new Function('document','NodeFilter','return ('+helperSource+');')(document,{SHOW_TEXT:4});

const rendered=textNodes.map(node=>node.nodeValue).join('');
const match=Array.from(rendered.matchAll(markerRe)).at(-1);
assert(match,'reaction token is recognized even when map content follows it');
assert.equal(removeMarkerText({querySelector:()=>null},match[0]),true);
assert.equal(textNodes.map(node=>node.nodeValue).join(''),'Route info \n\nGuimba → Baguio map appendix');
assert(!textNodes.map(node=>node.nodeValue).join('').includes('[USER_REACTION'));
console.log('PASS: reaction marker is stripped across text nodes when route-map content follows');
