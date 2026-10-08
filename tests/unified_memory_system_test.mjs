import fs from 'node:fs';
import assert from 'node:assert/strict';
const s=fs.readFileSync('memory-system.js','utf8');
assert.match(s,/window\.JDMemory/);
assert.match(s,/\.eq\('user_id',cloudUser\.id\)/);
assert.match(s,/incognito\(\)/);
assert.match(s,/memoryEnabled/); 
assert.match(s,/explicitRemember/);
console.log('unified memory contract: PASS');