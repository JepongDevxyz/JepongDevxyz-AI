import fs from 'node:fs';
import assert from 'node:assert';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname,'..','index.html');
const apiPath = path.join(__dirname,'..','api','chat.js');
const html = fs.readFileSync(htmlPath, 'utf8');
let api = fs.readFileSync(apiPath, 'utf8');

function loadDetector(source) {
  let s = source
    // Strip the known ESM import only in this isolated eval harness; the real
    // backend resolves it through Node/Vercel's module loader.
    .replace(/^import \{ fetchPublicGitHubContext \} from '\.\/plugins\.js';\s*/m, '')
    .replace(/^import \{ getGitHubSession \} from '\.\/_github_oauth\.js';\s*/m, '')
    .replace(/^import \{ fetchGitHubRunContext \} from '\.\/_plugin_execution_context\.js';\s*/m, '')
    .replace(/^import \{ resolveGitHubAccess \} from '\.\/_github_app\.js';\s*/m, '')
    .replace(/^import \{ fetchGitHubIssuesContext,shouldReadGitHubIssues \} from '\.\/_plugin_issues_context\.js';\s*/m, '')
    .replace(/^import \{ runConfiguredWebSearch \} from '\.\/web-search\.js';\s*/m, '')
    .replace(/^import \{[\s\S]*?\} from '\.\/location-tools\.js';\s*/m, '')
    .replace(/^import \{[\s\S]*?\} from '\.\.\/lib\/tools\/geo\.js';\s*/m, '')
    .replace(/^import \{ uploadSharedFile \} from '\.\.\/lib\/share-file\/upload\.js';\s*/m, '')
    .replace(/^import \{[^}]*\} from '\.\.\/lib\/tools\/index\.js';\s*/m, '')
    .replace(/^export const config/m, 'const config')
    .replace(/^export default async function handler/m, 'async function handler');
  s += '\n;globalThis.__detectArtifactRequest = detectArtifactRequest;';
  (0, eval)(s);
  return globalThis.__detectArtifactRequest;
}

const detectArtifactRequest = loadDetector(api);

// False-positive download regression: dotted code identifiers / mentioned filenames are not requests for files.
assert.strictEqual(detectArtifactRequest('Ayusin mo itong req.method sa code ko'), null, 'req.method must not create a download artifact');
assert.strictEqual(detectArtifactRequest('I-host mo sa parehong folder ng chat.js mo'), null, 'mentioning chat.js must not create a download artifact');
assert.strictEqual(detectArtifactRequest('Check res.ok at response.status dito'), null, 'dotted code identifiers must not create download artifacts');
assert.strictEqual(detectArtifactRequest('Open https://example.com/docs/api.html and explain it'), null, 'URL/file mention without download intent must not create an artifact');

// Explicit user requests still create artifacts.
assert.deepStrictEqual(detectArtifactRequest('Paki send as project.zip'), {kind:'zip', ext:'zip', filename:'project.zip'});
const htmlReq = detectArtifactRequest('Gawan mo ako ng downloadable HTML file');
assert(htmlReq && htmlReq.ext === 'html', 'explicit downloadable HTML request must still create an artifact');

// Android keyboard/viewport regression: app must follow the visual viewport rather than letting Chrome pan it away.
assert(/visualViewport\.addEventListener\(['\"]scroll['\"]/.test(html), 'visualViewport scroll listener missing');
assert(/app\.style\.position\s*=\s*['\"]fixed['\"]/.test(html), 'mobile app is not fixed to the visual viewport');
assert(/const appTop = keepFloatingWindowGeometry \? 0 : offsetTop/.test(html), 'mobile app top must use the selected visual viewport geometry');
assert(/app\.style\.top\s*=\s*`\$\{appTop\}px`/.test(html), 'mobile app top must apply the computed viewport position');
assert(!/app\.style\.top\s*=\s*`\$\{offsetTop\}px`/.test(html), 'visualViewport offsetTop must not shift the whole app');
assert(/app\.style\.transform\s*=\s*['\"]['\"]/.test(html), 'mobile app transform must be cleared');
assert(/overscroll-behavior\s*:\s*none/.test(html), 'root overscroll lock missing');
assert(/function\s+lockDocumentViewport\s*\(/.test(html), 'document viewport lock helper missing');

// Login must never create an account; signup may create one only when that mode is active.
const emailOtp = html.match(/signInWithOtp\(\{email,options:\{shouldCreateUser:([^}]+)\}\}\)/);
assert(emailOtp, 'email OTP auth call missing');
assert.strictEqual(emailOtp[1], 'jdAuthSignUpMode', 'email OTP must create accounts only in explicit signup mode');
assert(/let jdAuthSignUpMode=false;/.test(html), 'email OTP must default to existing-account login mode');

// Gemini picker IDs must match the backend allowlist; migrate stale selections before the first request.
assert.match(html,/const GEMINI_ALLOWED_MODELS=\['gemini-3\.1-flash-lite','gemini-3\.5-flash-lite'\]/,
  'Gemini frontend choices must match the server allowlist');
assert.match(html,/currentSelectedProvider==='gemini'&&!GEMINI_ALLOWED_MODELS\.includes\(currentSelectedModel\)/,
  'a stale Gemini model selection must be normalized');
assert.match(html,/currentSelectedModel='gemini-3\.5-flash-lite';\s*localStorage\.setItem\('jepong_last_model',currentSelectedModel\)/,
  'stale Gemini model selection must persist the supported default');
const geminiSection=html.slice(html.indexOf('<section class="model-provider-page" data-provider="gemini">'),html.indexOf('<section class="model-provider-page" data-provider="cloudflare">'));
assert(geminiSection.includes('data-model="gemini-3.5-flash-lite"'), 'supported Gemini model is missing from the picker');
for (const id of ['gemini-flash-latest','gemini-3.8-flash','gemini-3.7-flash']) {
  assert(!geminiSection.includes('data-model="'+id+'"'), 'unsupported Gemini model remains selectable: '+id);
}


// A click on the Library plus button's SVG path must not be treated as an outside click.
const libraryPath = path.join(__dirname,'..','library-chatgpt.js');
const library = fs.readFileSync(libraryPath, 'utf8');
const plusTargetStart = library.indexOf('  function isLibraryPlusTarget(target) {');
assert.notEqual(plusTargetStart, -1, 'Library plus target detection helper is missing');
const plusTargetEnd = library.indexOf('\n  }\n', plusTargetStart);
assert.notEqual(plusTargetEnd, -1, 'Library plus target detection helper is incomplete');
const plusTargetHelper = library.slice(plusTargetStart, plusTargetEnd + 4).trim();
const isLibraryPlusTarget = vm.runInNewContext('(' + plusTargetHelper + ')');
const plusButton = { closest: (selector) => selector === '#jdLibPlus' ? plusButton : null };
const plusIconPath = { closest: (selector) => selector === '#jdLibPlus' ? plusButton : null };
assert.equal(isLibraryPlusTarget(plusIconPath), true, 'SVG icon clicks must count as plus-button clicks');
assert.equal(isLibraryPlusTarget({ closest: () => null }), false, 'unrelated clicks must remain outside clicks');
assert(library.includes('!isLibraryPlusTarget(e.target)) pp.hidden = true;'),
  'the outside-click handler must use the SVG-aware plus-button target check');
console.log('PASS: runtime regressions');
