import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const indexPath = path.join(root, 'index.html');
const html = readFileSync(indexPath, 'utf8');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const full = path.join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const allFiles = walk(root);
const sourceFiles = allFiles.filter(file => /\.(?:js|mjs|html|css|json|py|sql|ya?ml)$/i.test(file));

// Catch unresolved merge debris in executable/configuration sources.
const mergeMarker = /^(?:<<<<<<<|=======|>>>>>>>)\s/m;
for (const file of sourceFiles) {
  const text = readFileSync(file, 'utf8');
  assert(!mergeMarker.test(text), `Unresolved merge marker in ${path.relative(root, file)}`);
}

// Validate relative JavaScript imports against the repository tree.
function resolvesRelativeImport(fromFile, specifier) {
  const clean = specifier.split(/[?#]/, 1)[0];
  const base = path.resolve(path.dirname(fromFile), clean);
  const candidates = [
    base,
    `${base}.js`,
    `${base}.mjs`,
    `${base}.json`,
    path.join(base, 'index.js'),
    path.join(base, 'index.mjs')
  ];
  return candidates.some(existsSync);
}

for (const file of allFiles.filter(file => /\.(?:js|mjs)$/i.test(file))) {
  const text = readFileSync(file, 'utf8');
  const specs = new Set();
  for (const match of text.matchAll(/(?:\bfrom\s*|\bimport\s*\()\s*['"]([^'"]+)['"]/g)) specs.add(match[1]);
  for (const match of text.matchAll(/\bimport\s*['"]([^'"]+)['"]/g)) specs.add(match[1]);
  for (const spec of specs) {
    if (!spec.startsWith('.')) continue;
    assert(
      resolvesRelativeImport(file, spec),
      `Missing relative import target ${spec} from ${path.relative(root, file)}`
    );
  }
}

// Local scripts, stylesheets and manifest references in the main page must exist.
for (const match of html.matchAll(/<(script|link)\b[^>]*(?:src|href)=["'](\/[^"'?#]+)[^"']*["'][^>]*>/gi)) {
  const localPath = match[2].replace(/^\/+/, '');
  assert(existsSync(path.join(root, localPath)), `Missing local HTML asset: /${localPath}`);
}

// A literal <style> start token inside CSS raw text is malformed HTML/CSS.
// Track raw-text regions so template strings inside JavaScript are ignored.
const rawTag = /<\/?(script|style)\b[^>]*>/gi;
let mode = null;
let token;
while ((token = rawTag.exec(html))) {
  const raw = token[0];
  const tag = token[1].toLowerCase();
  const closing = /^<\//.test(raw);
  if (!mode) {
    if (!closing) mode = tag;
    continue;
  }
  if (mode === 'style' && tag === 'style' && !closing) {
    assert.fail(`Nested <style> token inside a style block near offset ${token.index}`);
  }
  if (closing && tag === mode) mode = null;
}
assert.equal(mode, null, 'Unclosed script/style raw-text block in index.html');

// Guard the composer cleanup: keep the compact canonical layer, not the
// superseded 330px override that used to sit immediately before it.
const composer = html.match(/<style id="composerVerticalReferenceFix">([\s\S]*?)<\/style>/)?.[1] || '';
assert(composer.includes('width:min(248px,calc(100vw - 44px))'), 'Canonical compact composer rule missing');
assert(!composer.includes('width:min(330px,calc(100vw - 34px))'), 'Superseded composer override returned');

console.log(`codebase structure audit passed: ${sourceFiles.length} source/config files checked`);
