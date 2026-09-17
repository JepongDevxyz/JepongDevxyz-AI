const fs = require('fs');
const assert = require('assert');

const htmlPath = require('path').join(__dirname,'..','index.html');
const apiPath = require('path').join(__dirname,'..','api','chat.js');
const html = fs.readFileSync(htmlPath, 'utf8');
let api = fs.readFileSync(apiPath, 'utf8');

function loadDetector(source) {
  let s = source
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
assert(/app\.style\.top\s*=\s*`\$\{offsetTop\}px`/.test(html), 'mobile app is not anchored to visualViewport.offsetTop');
assert(/overscroll-behavior\s*:\s*none/.test(html), 'root overscroll lock missing');
assert(/function\s+lockDocumentViewport\s*\(/.test(html), 'document viewport lock helper missing');

console.log('PASS: runtime regressions');
