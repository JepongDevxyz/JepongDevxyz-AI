import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('reference-shell.css', 'utf8');

assert(html.includes('const jdRenameTitleAnimations = new Map()'));
assert(html.includes('function animateJdRenamedSidebarTitle(sessionId, oldTitle, newTitle)'));
assert(html.includes("item.dataset.sessionId = session.id"));
assert(html.includes("await waitJdRenameFrame(30)"));
assert(html.includes("await waitJdRenameFrame(24)"));
assert(html.includes("await waitJdRenameFrame(72)"));
assert(html.includes("persistJdRenamedSession(sessionType)"));
assert(html.includes("animateJdRenamedSidebarTitle(id, oldTitle, nextTitle)"));

assert(css.includes('#sidebar .history-item-text.jd-rename-animating'));
assert(css.includes('#sidebar .jd-rename-title-value'));
assert(css.includes('#sidebar .jd-rename-title-cursor'));
assert(css.includes('border-radius:50%'));
assert(css.includes('#sidebar .history-item.jd-title-renaming .jd-history-actions-trigger'));

console.log('reference rename title animation checks passed');
