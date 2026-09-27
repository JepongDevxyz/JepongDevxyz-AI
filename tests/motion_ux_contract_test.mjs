import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const js=fs.readFileSync('motion-ux.js','utf8');
const css=fs.readFileSync('motion-ux.css','utf8');

assert(html.includes('/motion-ux.css?v=20260927-three-reference-v2'),'motion UX stylesheet v2 is not loaded');
assert(html.includes('/motion-ux.js?v=20260927-three-reference-v2'),'motion UX runtime v2 is not loaded');
assert(html.indexOf('/motion-ux.js')>html.indexOf('/reactbits-micro.js'),'motion UX must load after ReactBits PromptBar runtime');

for(const token of [
  'PULL_THRESHOLD','dampPull','thresholdTicked','jdHapticPulse','triggerRefresh',
  "history.scrollRestoration='manual'","captureScroll","restoreScroll","data-jd-scroll-anchor",
  'stableAnchorId','RESTORE_DELAYS','pullCandidate',
  'enhanceUploadCards','attachmentProgressStats','attachmentRate','attachmentEta','retryAttachment',
  'jd-upload-lane','jd-upload-lane__thumb','_sourceFile','attachmentJobs'
]){
  assert(js.includes(token),`missing motion UX v2 contract: ${token}`);
}

for(const selector of [
  '.jd-pull-refresh__arrow',
  '.jd-pull-refresh__spinner',
  '.chat-box.jd-pull-settle',
  'scroll-margin-top:var(--jd-scroll-offset,12px)',
  '.jd-upload-lane__progress',
  '.jd-upload-lane__retry',
  '.jd-upload-lane__thumb',
  '#inputContainer.attachment-drop-active .prompt-bar__field::after'
]){
  assert(css.includes(selector),`missing motion UX v2 styling: ${selector}`);
}

assert(!css.includes('.jd-pull-refresh__label'),'large text pull-to-refresh pill must not return');
assert(!css.includes('scroll-margin-top:72px'),'scroll offset must not use the old guessed fixed header value');
assert(js.includes("cloudUser!=='undefined'&&cloudUser&&typeof loadCloudState==='function'"),
  'pull refresh should use real cloud state only when an authenticated cloud user exists');
assert(js.includes("Incognito stays in-memory"),
  'pull refresh must not rebuild incognito from persistent storage');
assert(css.includes('Release to add files'),
  'drag feedback must tell the user what release will do');

console.log('PASS: reference-faithful pull refresh, durable scroll state, and per-file upload feedback are wired.');
