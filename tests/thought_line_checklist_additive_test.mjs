import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync('index.html','utf8');
const css=readFileSync('reactbits-micro.css','utf8');

assert(html.includes('class="thought-line__steps" id="aiActivityThoughtSteps"'),
  'Thought Line must add its own checklist container');
const sync=html.slice(html.indexOf('function syncThoughtLineSteps('),html.indexOf('function showAIIndicator('));
assert(sync.includes("list.querySelectorAll('.ai-activity-row[data-activity-visibility=\"primary\"]')"),
  'Checklist must mirror only real primary activity rows');
assert(sync.includes('.slice(-4)'),
  'Thought Line must display the four recent reference-style steps');
assert(sync.includes("container.replaceChildren(...items)"),
  'Checklist must update its own additive container');
assert(!sync.includes('list.replaceChildren')&&!sync.includes('row.remove()'),
  'Checklist sync must not remove or replace existing activity rows');
assert(sync.includes("row.querySelector('.ai-activity-label')"),
  'Checklist labels must come from existing real activity statuses');
assert(sync.includes("row.classList.contains('running')"),
  'Checklist must identify the active real status');
assert(sync.includes("row.classList.contains('completed')"),
  'Checklist must identify completed real statuses');
assert(css.includes('.thought-line__steps{'),
  'Added checklist must be styled as the circled compact status list');
assert(css.includes('.thought-line__step-marker'),
  'Added checklist must include check and current-step markers');
assert(html.includes('syncThoughtLineSteps(card);'),
  'Checklist must refresh when activity events render and finish');

console.log('PASS: four-step Thought Line checklist is additive and mirrors real activity without replacing existing rows.');
