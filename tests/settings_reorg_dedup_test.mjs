import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../settings-reorg.js',import.meta.url),'utf8');
const block=source.slice(source.indexOf('  function addMissingToolsItems(section)'),source.indexOf('  function moveTogglesToTools()'));

assert.match(block,/querySelectorAll\('\.settings-nav-row, \.settings-toggle-row'\)/,
  'deduplicate against existing native settings rows as well as injected rows');
assert.match(block,/var byTitle = Object\.create\(null\)/,
  'track one canonical row for each settings item');
assert.match(block,/if \(byTitle\[title\]\)\s*\{\s*row\.remove\(\)/,
  'remove duplicate Mode, Models, Permissions, or Connectors rows');
assert.match(block,/if \(byTitle\[cfg\.title\]\) return/,
  'do not inject custom copies when a working row already exists');
assert.match(block,/reorderSection\(section, AI_TOOLS_ORDER\)/,
  'preserve the requested item order after deduplication');
assert.doesNotMatch(block,/if \(section\.querySelector\('\[data-jd-custom-tool="mode"\]'\)\) return/,
  'do not skip missing tool rows just because Mode already exists');

console.log('PASS: settings reorganization preserves one functional row per tool');
