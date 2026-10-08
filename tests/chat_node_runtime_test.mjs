import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../api/chat.js', import.meta.url), 'utf8');

assert.ok(
  !/export\s+const\s+config\s*=\s*\{\s*runtime\s*:\s*['"]edge['"]\s*\}/i.test(source),
  '/api/chat must not use Edge because Vercel Edge functions can time out before the first response.'
);
assert.match(source, /function activityStreamResponse\(/, 'Chat must keep its SSE response path.');
assert.match(source, /: stream-open\\n\\n/, 'The SSE path must open before provider generation starts.');

console.log('PASS: /api/chat uses the Node runtime and preserves immediate SSE startup.');
