import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('reactbits-micro.css','utf8');

for(const token of [
  "indicator.className = 'ai-activity-card reference-work-flow'",
  "return {...e,label:'Thinking',kind:'process'}",
  "visibility:'details'",
  "const detailsOnly = normalized.visibility==='details'",
  "const iconless = id==='thinking'",
  "row.dataset.activityVisibility=detailsOnly?'details':'primary'",
  "scrollToBottom(false)"
]) assert(html.includes(token),'Missing frame-reference runtime token: '+token);

for(const token of [
  '.ai-activity-card.reference-work-flow .ai-activity-header-actions{display:none!important}',
  'width:min(calc(100% - 26px),760px)',
  'margin:8px 12px 30px 14px',
  'grid-template-columns:22px minmax(0,1fr)!important',
  'font-size:15.5px',
  'font-size:16px',
  '.ai-activity-row.ai-activity-iconless',
  '[data-activity-visibility="details"]',
  '@keyframes jdActivityReferenceIn'
]) assert(css.includes(token),'Missing frame-reference CSS metric: '+token);

assert(!/\.reference-work-flow[^}]*display:flex!important/.test(css),
  'Reference Work surface must not resurrect the old header');
assert(html.includes("clone.removeAttribute('data-activity-visibility')"),
  'Secondary diagnostics must remain visible in the audit sheet');

console.log('PASS: supplied-video Work Activity frame contract is locked.');
