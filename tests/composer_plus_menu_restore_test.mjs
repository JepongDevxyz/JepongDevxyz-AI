import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');

function between(src,start,end){
  const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
  assert(a>=0&&b>a,'missing composer tool sheet');
  return src.slice(a,b);
}

const sheet=between(
  html,
  '<div class="prompt-bar__menu" id="composerToolSheet"',
  '<div class="prompt-bar__menu" id="responseEffortMenu"'
);

assert(!sheet.includes('Photos &amp; files'),'Photos and Files must not be merged');
assert(sheet.includes('data-prompt-source="photos"'),'Photos row missing');
assert(sheet.includes('composerToolAction(\'photos\')'),'Photos action missing');
assert(sheet.includes('<span class="prompt-bar__row-name">Photos</span>'),'Photos label missing');

assert(sheet.includes('data-prompt-source="files"'),'Files row missing');
assert(sheet.includes('composerToolAction(\'files\')'),'Files action missing');
assert(sheet.includes('<span class="prompt-bar__row-name">Files</span>'),'Files label missing');

assert(!sheet.includes('data-prompt-source="web"'),'Web search must not be in the plus menu');
assert(!sheet.includes('<span class="prompt-bar__row-name">Web search</span>'),'Web search label must not be in the plus menu');

assert(sheet.includes('data-prompt-source="vision"'),'Vision prompt must stay in the plus menu');
assert(sheet.includes('<span class="prompt-bar__row-name">Vision prompt</span>'),'Vision prompt label missing');

const order=['Camera','Photos','Files','Library','Plugins','Vision prompt']
  .map(label=>sheet.indexOf('>'+label+'</span>'));
for(const pos of order)assert(pos>=0,'missing expected composer item');
for(let i=1;i<order.length;i++)assert(order[i]>order[i-1],'composer menu order changed unexpectedly');

console.log('PASS: composer plus menu restored with Camera, separate Photos/Files, Library, Plugins, Vision prompt, and no Web search.');
