import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync('index.html','utf8');
const css=readFileSync('reactbits-micro.css','utf8');
const finish=html.slice(html.indexOf('function finishAIIndicator('),html.indexOf('function removeAIIndicator('));

assert(/id="jdAutoCollapseActivityToggle"[^>]*onchange="setActivityAutoCollapse\(this\.checked\)"/.test(html),
  'Settings must expose a functional auto-collapse switch');
assert(/function setActivityAutoCollapse\(enabled\)[\s\S]*?localStorage\.setItem\('jd_activity_auto_collapse',JSON\.stringify\(checked\)\)/.test(html),
  'Auto-collapse preference must persist locally');
assert(html.includes('jd_activity_auto_collapse'),'Activity setting storage key is missing');
assert(/\.rb-lattice-loader\{[^}]*color:var\(--rb-success\)/.test(css),
  'The active Lattice Loader must be green');
assert(/\.ai-activity-row\.running\.ai-activity-current \.ai-activity-label\{[^}]*color:var\(--rb-success\)/.test(css),
  'The current activity text and its marker must be green');
assert(css.includes('.thought-line__step-marker--done::before{content:"✓"}'),
  'The added checklist must show checkmarks without changing existing activity icons');
const activityIcon=html.slice(html.indexOf('function activityIconMarkup('),html.indexOf('function clientActivityTaskSubject('));
assert(!activityIcon.includes("state==='completed'"),
  'The add-on must preserve existing Activity timeline icon behavior');
assert(finish.includes("if(isActivityAutoCollapseEnabled())card.classList.add('collapsed')"),
  'Auto-collapse must apply only when the real activity finishes');
assert(finish.includes("toggle?.setAttribute('aria-expanded',String(!card.classList.contains('collapsed')))"),
  'Auto-collapse must keep the activity disclosure state accessible');

console.log('PASS: green active Thought Line, visible completed checkmarks, and persisted activity auto-collapse setting.');
