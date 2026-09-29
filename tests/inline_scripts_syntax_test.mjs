import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('index.html','utf8');
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
let checked=0;
for(const [index,match] of scripts.entries()){
  const attrs=match[1]||'';
  const type=attrs.match(/\btype\s*=\s*["']?([^\s"'>]+)/i)?.[1]?.toLowerCase();
  if(/\bsrc\s*=/.test(attrs)||type&&type!=='text/javascript'&&type!=='application/javascript'&&type!=='module')continue;
  if(!match[2].trim())continue;
  assert.doesNotThrow(()=>new vm.Script(match[2],{filename:`index.html inline script ${index+1}`}),
    `inline JavaScript block ${index+1} must parse before app initialization`);
  checked++;
}
assert(checked>0,'expected to parse at least one inline application script');
console.log(`PASS: ${checked} inline JavaScript blocks parse successfully.`);
