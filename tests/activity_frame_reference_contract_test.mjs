import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('reactbits-micro.css','utf8');

for(const token of [
  "indicator.className = 'ai-activity-card reference-work-flow'",
  "return {...e,label:label||'Thinking',kind:kind||'process'}",
  "return evt.visibility!=='details'",
  "const detailsOnly = normalized.visibility==='details'",
  "const iconless = id==='thinking'",
  "row.dataset.activityVisibility=detailsOnly?'details':'primary'",
  "scrollToBottom(false)",
  "const JD_ACTIVITY_MIN_VISIBLE_GAP_MS=230",
  "const JD_ACTIVITY_MIN_RUNNING_DWELL_MS=650",
  "function drainActivityPlayback(",
  "jdActivityPlaybackQueue.push(normalized)",
  "await drainActivityPlayback();"
]) assert(html.includes(token),'Missing frame-reference runtime token: '+token);

for(const token of [
  '.ai-activity-card.reference-work-flow .ai-activity-header-actions{',
  'display:flex!important;',
  '.rb-lattice-loader',
  'width:min(calc(100% - 26px),760px)',
  'margin:8px 12px 30px 14px',
  'grid-template-columns:22px minmax(0,1fr)!important',
  'font-size:15.5px',
  'font-size:16px',
  '.ai-activity-row.ai-activity-iconless',
  '[data-activity-visibility="details"]',
  '@keyframes jdActivityReferenceIn',
  '.ai-activity-row.running.ai-activity-current .ai-activity-label::after',
  '@keyframes jdActivityCurrentDot'
]) assert(css.includes(token),'Missing frame-reference CSS metric: '+token);

assert(/\.ai-activity-card\.reference-work-flow \.ai-activity-header-actions\{[\s\S]*?display:flex!important;[\s\S]*?\}/.test(css),
  'Requested Lattice/Thought header must remain visible without replacing the real Activity timeline');
assert(html.includes("clone.removeAttribute('data-activity-visibility')"),
  'Secondary diagnostics must remain visible in the audit sheet');

console.log('PASS: requested Work Activity frame contract with visible Lattice/Thought header is locked.');
