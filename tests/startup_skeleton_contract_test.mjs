import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('index.html', 'utf8');
const agent = fs.readFileSync('agent.js', 'utf8');
const bodyStart = html.indexOf('<body>');
const boot = html.indexOf('id="jdBootSkeleton"');
const firstRun = html.indexOf('id="jdFirstRunWelcome"');
const prePaint = html.indexOf('html.jd-boot-pending::before');
const prePaintClass = html.indexOf("classList.add('jd-boot-pending')");
const firstBlockingScript = html.indexOf('<script src="https://cdn.jsdelivr.net/npm/marked');

assert(bodyStart >= 0, 'application body must exist');
assert(prePaint >= 0 && prePaintClass >= 0 && prePaintClass < firstBlockingScript, 'pre-paint loader must activate before blocking head scripts');
assert(boot > bodyStart && boot < firstRun, 'boot skeleton must be in the body before the app and welcome overlays');
assert(html.includes('data-jd-boot="true"'), 'boot skeleton must be marked for the startup controller');
assert(html.includes('jd-boot-header') && html.includes('jd-boot-tabs') && html.includes('jd-boot-composer'), 'boot skeleton must mirror the app navigation and composer');
assert(html.includes('html[data-theme="light"] #jdBootSkeleton') && html.includes('body.theme-light #jdBootSkeleton'), 'boot skeleton must follow both persisted theme selectors');
assert(agent.includes("getElementById('jdBootSkeleton')"), 'agent bootstrap must manage the static first-paint skeleton');
assert(!agent.includes("sk.id='jdInitSkeleton'"), 'agent bootstrap must not create a second, late skeleton');
assert(agent.includes('setTimeout(hide,15000)'), 'startup skeleton must have a bounded failsafe');
assert(agent.includes("window.addEventListener('load'"), 'startup skeleton must wait for the application load lifecycle');

console.log('PASS: first-paint app-shaped skeleton, theme matching, and single startup loader');
