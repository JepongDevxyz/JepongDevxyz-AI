import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('index.html', 'utf8');
const agent = fs.readFileSync('agent.js', 'utf8');
const patchVersion = fs.readFileSync('patch-version.txt', 'utf8').trim();
const manifest = JSON.parse(fs.readFileSync('patch-manifest.json', 'utf8'));
const shell = fs.readFileSync('reference-shell.css', 'utf8');
const bodyStart = html.indexOf('<body>');
const boot = html.indexOf('id="jdBootSkeleton"');
const firstRun = html.indexOf('id="jdFirstRunWelcome"');
const prePaint = html.indexOf('html.jd-boot-pending::before');
const prePaintClass = html.indexOf("classList.add('jd-boot-pending')");
const firstBlockingScript = html.indexOf('<script src="https://cdn.jsdelivr.net/npm/marked');
const prePaintAfterStyle = html.match(/html\.jd-boot-pending::after\{[^}]*z-index:(\d+)/);
const bootLayerStyle = html.match(/#jdBootSkeleton\{[^}]*z-index:(\d+)/);

assert(bodyStart >= 0, 'application body must exist');
assert(prePaint >= 0 && prePaintClass >= 0 && prePaintClass < firstBlockingScript, 'pre-paint loader must activate before blocking head scripts');
assert(boot > bodyStart && boot < firstRun, 'boot skeleton must be in the body before the app and welcome overlays');
assert(html.includes('data-jd-boot="true"'), 'boot skeleton must be marked for the startup controller');
assert(html.includes('jd-boot-header') && html.includes('jd-boot-tabs') && html.includes('jd-boot-composer'), 'boot skeleton must mirror the app navigation and composer');
assert(prePaintAfterStyle && bootLayerStyle && Number(prePaintAfterStyle[1]) < Number(bootLayerStyle[1]), 'pre-paint shimmer must stay underneath the visible boot skeleton rather than covering it with a blank screen');
assert(html.includes('data:image/svg+xml') && html.includes('preserveAspectRatio%3D%22none%22'), 'pre-paint fallback must draw the matching chat skeleton before the body loader can be parsed');
assert(html.includes('jd-boot-conversation') && html.includes('jd-boot-welcome') && html.includes('jd-boot-welcome-title'), 'empty-chat skeleton must reserve the same centered welcome position as the real mobile UI');
assert(html.includes('jd-boot-search') && html.includes('floating-search-trigger-btn'), 'boot skeleton must place the floating chat-search control with the real UI');
assert(!html.includes('jd-boot-status-dots') && !html.includes('jd-boot-model') && !html.includes('fill%3D%22%23f05252%22'), 'empty welcome loader must not invent status indicators or a model badge absent from the screen');
assert(html.includes('.jd-boot-welcome{width:min(100%,280px);height:138px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:13px;margin-top:-20px;transform:translateY(-40px)') && html.includes('.jd-boot-welcome-title{width:min(100%,228px)') && html.includes('.jd-boot-welcome-bottom{width:min(100%,96px)'), 'welcome skeleton must match the real animation vertical position and text widths');
assert(shell.includes('.jd-navigation{grid-template-columns:48px minmax(0,1fr) 48px;gap:7px;min-height:52px}') && html.includes('#jdBootSkeleton{--boot-base:#171717;--boot-surface:#222;--boot-line:rgba(255,255,255,.075);--boot-hi:rgba(255,255,255,.13);position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;min-height:100dvh;padding:env(safe-area-inset-top) max(16px,env(safe-area-inset-right)) env(safe-area-inset-bottom) max(16px,env(safe-area-inset-left))') && html.includes('#jdBootSkeleton{padding-left:12px;padding-right:12px}.jd-boot-header{height:70px;flex-basis:70px;grid-template-columns:48px minmax(0,1fr) 48px;gap:7px;padding:0 3px}') && html.includes('.jd-boot-search{top:16px;right:3px;width:36px;height:36px}') && html.includes('.jd-boot-tab:first-child:before{bottom:-26px}'), 'mobile skeleton navigation, search control, and composer insets must track the real shell measurements');
assert(html.includes('background:#171717') && !html.includes('background:#0b0f19'), 'dark boot skeleton must use the app shell charcoal palette instead of the obsolete navy palette');
assert(!html.includes('jd-boot-brand'), 'boot skeleton must not add a fake brand mark');
assert(/^20\d{6}[a-z0-9]+$/.test(patchVersion) && agent.includes(`var V='?v=${patchVersion}'`) && manifest.version === patchVersion, 'startup loader fallback, patch manifest, and version file must stay aligned');
assert(html.includes('html[data-theme="light"] #jdBootSkeleton') && html.includes('body.theme-light #jdBootSkeleton'), 'boot skeleton must follow both persisted theme selectors');
assert(agent.includes("getElementById('jdBootSkeleton')"), 'agent bootstrap must manage the static first-paint skeleton');
assert(!agent.includes("sk.id='jdInitSkeleton'"), 'agent bootstrap must not create a second, late skeleton');
assert(agent.includes('setTimeout(hide,15000)'), 'startup skeleton must have a bounded failsafe');
assert(agent.includes("window.addEventListener('load'"), 'startup skeleton must wait for the application load lifecycle');

console.log('PASS: first-paint app-shaped skeleton, theme matching, and single startup loader');
