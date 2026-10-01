// Build-time decoder (ESM — package.json has "type": "module").
// Turns base64 text assets into real binary files during the Vercel build.
// Never fails the build on purpose.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  const dir = path.join(root, 'assets');
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.jpg.b64')) continue;
      try {
        const b64 = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\s+/g, '');
        const out = path.join(root, f.slice(0, -4));
        fs.writeFileSync(out, Buffer.from(b64, 'base64'));
        console.log('[decode-assets] wrote ' + out + ' (' + fs.statSync(out).size + ' bytes)');
      } catch (e) { console.log('[decode-assets] skip ' + f + ': ' + e.message); }
    }
  } else { console.log('[decode-assets] no assets dir, skipping'); }
} catch (e) { console.log('[decode-assets] ' + e.message); }
process.exit(0);
