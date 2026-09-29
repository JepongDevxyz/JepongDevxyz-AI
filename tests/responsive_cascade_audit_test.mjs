import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../reference-shell.css',import.meta.url),'utf8');

assert(!/@media\s*\(min-width:\s*768px\)\s*\{\s*body\s*\{[^}]*padding:\s*20px/i.test(html),
  'legacy inline desktop shell still conflicts with the canonical shell rules');
assert.equal((css.match(/@media\s*\(min-width:\s*768px\)/g)||[]).length,1,
  'desktop shell must have one authoritative breakpoint block');
assert(css.includes('width:min(100%,1440px)!important'),
  'canonical fluid desktop shell sizing is missing');

const pillRules=[...html.matchAll(/\.floating-scroll-pill\s*\{([^}]*)\}/g)].map(match=>match[1]);
assert(!pillRules.some(rule=>/top\s*:\s*var\(--jd-scroll-pill-top/.test(rule)),
  'stale top-based rule can pull the scroll control away from the composer');
assert(html.includes('bottom:calc(var(--jd-composer-reserve,92px) + 14px)!important'),
  'final mobile placement must use the composer reserve');
assert(html.includes('const visibleComposerReserve=Math.max(72, Math.ceil(viewportTop+viewportHeight-composerTop));'),
  'composer reserve must continue to come from live geometry');
assert(html.includes('onclick="scrollToBottom(true)"'),
  'scroll-to-latest action handler must remain wired');

console.log('responsive shell cascade audit checks passed');
