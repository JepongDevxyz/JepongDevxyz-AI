import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const agent=readFileSync(new URL('../agent.js',import.meta.url),'utf8');
const loader=agent.slice(agent.indexOf('  var V='),agent.indexOf('  function go(ver)'));

assert.match(loader,/window\.__JD_PATCH_LOADER_STATE__/,
  'separately evaluated copies of agent.js must share one patch-loader state');
assert.match(loader,/if\s*\(patchLoaderState\.version\s*===\s*ver\)\s*return/,
  'the current patch version must not be injected again');
assert.match(loader,/patchLoaderState\.version\s*=\s*ver;\s*loadPatches\(ver\)/,
  'record the version before injecting its scripts to prevent concurrent duplicate loads');

console.log('PASS: patch scripts are loaded once per version across repeated agent.js executions');
