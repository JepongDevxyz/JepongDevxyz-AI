// Build-time decoder: turns base64 text assets into real binary files.
// The GitHub integration used to deploy this repo cannot push binary files,
// so logo images are stored as text (assets/*.jpg.b64) and decoded here
// during the Vercel build. This script never fails the build on purpose.
'use strict';
var fs = require('fs');
var path = require('path');
try {
  var root = path.join(__dirname, '..');
  var dir = path.join(root, 'assets');
  if (!fs.existsSync(dir)) { console.log('[decode-assets] no assets dir, skipping'); process.exit(0); }
  var files = fs.readdirSync(dir).filter(function (f) { return f.slice(-8) === '.jpg.b64'; });
  files.forEach(function (f) {
    try {
      var b64 = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\s+/g, '');
      var out = path.join(root, f.slice(0, -4));
      fs.writeFileSync(out, Buffer.from(b64, 'base64'));
      console.log('[decode-assets] wrote ' + out + ' (' + fs.statSync(out).size + ' bytes)');
    } catch (e) { console.log('[decode-assets] skip ' + f + ': ' + e.message); }
  });
} catch (e) { console.log('[decode-assets] ' + e.message); }
process.exit(0);
