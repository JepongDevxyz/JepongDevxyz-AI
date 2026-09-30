import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('        function activityHistoryKeepsDistinctTransitions(evt={}){');
const end=html.indexOf('\n        function appendActivityEvent(',start);
assert(start>=0&&end>start,'Activity transition policy helper must exist before appendActivityEvent');
const policy=new Function(html.slice(start,end)+'\nreturn activityHistoryKeepsDistinctTransitions;')();

for(const event of [
  {id:'provider-codecraft',kind:'provider'},
  {id:'web-search',kind:'web'},
  {id:'web-search-alt',kind:'web'},
  {id:'planned-web-0',kind:'web'}
])assert.equal(policy(event),false,`${event.id} must update one lifecycle row instead of duplicating start/result rows`);

for(const event of [
  {id:'plugin-github',kind:'github'},
  {id:'attachment-media-selected',kind:'image'},
  {id:'output-verification',kind:'test'}
])assert.equal(policy(event),true,`${event.id} must preserve distinct real operation milestones`);

const append=html.slice(html.indexOf('        function appendActivityEvent('),html.indexOf('        function finishAIIndicator('));
assert(append.includes('activityHistoryKeepsDistinctTransitions(normalized)'),
  'The activity renderer must consult the lifecycle transition policy');

console.log('PASS: provider and web-search lifecycle transitions coalesce while real tool milestones remain distinct.');
