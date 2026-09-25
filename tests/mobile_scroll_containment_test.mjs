import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('reference-shell.css', 'utf8');

// The document shell itself must never become a swipe/overscroll surface.
assert(/html, body \{[\s\S]*?overflow: hidden !important;[\s\S]*?overscroll-behavior: none;[\s\S]*?touch-action: none;/.test(html));

// Rename mode must explicitly lock and release the root viewport.
assert(html.includes("document.documentElement.classList.add('jd-rename-lock')"));
assert(html.includes("document.documentElement.classList.remove('jd-rename-lock')"));
assert(html.includes("overlay.addEventListener('touchmove'"));
assert(html.includes("{ passive: false }"));

// The reference-shell guard keeps non-content shells from becoming accidental scrollers.
assert(css.includes('/* Mobile scroll contract: only intentional inner content surfaces may scroll. */'));
assert(css.includes('html.jd-rename-lock .app-container'));
assert(css.includes('.jd-rename-overlay{'));
assert(css.includes('touch-action:none!important'));

// Intended content regions remain independently scrollable.
assert(/\.chat-box\s*\{[\s\S]*?overflow-y:\s*auto/.test(html));
assert(/\.chat-history-list\s*\{[\s\S]*?overflow-y:\s*auto/.test(html));
assert(html.includes('.settings-home-scroll{flex:1;min-height:0;overflow-y:auto!important'));

console.log('mobile scroll containment checks passed');
