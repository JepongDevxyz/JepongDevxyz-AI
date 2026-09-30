import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const api=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
const start=api.indexOf('function publicSearchFallbackResultLabel(');
const end=api.indexOf('\nfunction ',start+10);
assert(start>=0&&end>start,'Public-search fallback status formatter must exist');
const format=new Function(api.slice(start,end)+'\nreturn publicSearchFallbackResultLabel;')();

assert.equal(format({provider:'DuckDuckGo',resultCount:2,reason:'no Web Search API is configured'}),
  'Found 2 relevant web results • DuckDuckGo • public fallback (no Web Search API is configured)');
assert.equal(format({provider:'Bing',resultCount:1,reason:'configured APIs returned no usable results'}),
  'Found 1 relevant web result • Bing • public fallback (configured APIs returned no usable results)');

console.log('PASS: final search activity explicitly identifies the actual public source and why API fallback was used.');
