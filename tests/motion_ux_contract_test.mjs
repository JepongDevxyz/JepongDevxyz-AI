import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const js=fs.readFileSync('motion-ux.js','utf8');
const css=fs.readFileSync('motion-ux.css','utf8');

assert(html.includes('/motion-ux.css?v=20260927-three-reference-v1'),'motion UX stylesheet is not loaded');
assert(html.includes('/motion-ux.js?v=20260927-three-reference-v1'),'motion UX runtime is not loaded');
assert(html.indexOf('/motion-ux.js')>html.indexOf('/reactbits-micro.js'),'motion UX must load after ReactBits PromptBar runtime');

for(const token of [
  'PULL_THRESHOLD','dampPull','thresholdTicked','jdHapticPulse','triggerRefresh',
  "history.scrollRestoration='manual'","captureScroll","restoreScroll","data-jd-scroll-anchor",
  'enhanceUploadCards','attachmentProgressStats','attachmentRate','attachmentEta','retryAttachment',
  '_sourceFile','attachmentJobs'
]){
  assert(js.includes(token),`missing motion UX contract: ${token}`);
}

for(const selector of [
  '.jd-pull-refresh',
  '.chat-box.jd-pull-settle',
  'scroll-margin-top:72px',
  '.jd-upload-card__progress',
  '.jd-upload-card__retry',
  '#inputContainer.attachment-drop-active .prompt-bar__field::after'
]){
  assert(css.includes(selector),`missing motion UX styling: ${selector}`);
}

assert(js.includes("cloudUser!=='undefined'&&cloudUser&&typeof loadCloudState==='function'"),
  'pull refresh should use real cloud state only when an authenticated cloud user exists');
assert(js.includes("Incognito stays in-memory"),
  'pull refresh must not rebuild incognito from persistent storage');
assert(css.includes('Release to add files'),
  'drag feedback must tell the user what release will do');

console.log('PASS: three supplied reference UX contracts are wired: pull refresh, scroll state, honest upload queue.');