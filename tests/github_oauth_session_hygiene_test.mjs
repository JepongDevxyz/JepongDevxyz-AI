import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';

const oauth=readFileSync(new URL('../api/_github_oauth.js',import.meta.url),'utf8');
const callback=readFileSync(new URL('../api/github-oauth-callback.js',import.meta.url),'utf8');

assert(oauth.includes('export const GITHUB_SESSION_MAX_AGE_MS=7*24*60*60*1000'),
  'GitHub session lifetime must be centralized');
assert(oauth.includes("const issuedAt=Number(data.createdAt||0);"),
  'Encrypted GitHub sessions must validate their server-side issue time');
assert(oauth.includes('Date.now()-issuedAt>GITHUB_SESSION_MAX_AGE_MS'),
  'Expired encrypted GitHub sessions must be rejected even if a stale cookie is replayed');
assert(oauth.includes('issuedAt>Date.now()+60_000'),
  'Future-dated GitHub sessions must be rejected');
assert(callback.includes('Math.floor(GITHUB_SESSION_MAX_AGE_MS/1000)'),
  'Browser cookie lifetime must use the same server-side session lifetime');

for(const required of ["'SameSite=Lax'","'Secure'","attrs.push('HttpOnly')"]){
  assert(oauth.includes(required),'Secure GitHub cookie attribute missing: '+required);
}
assert(callback.includes("expected!==state"),'OAuth callback must validate the state cookie');
assert(callback.includes("sanitizeReturnPath(readCookie"),'OAuth return path must stay sanitized');

console.log('PASS: GitHub OAuth state, cookie flags, return paths, and encrypted session lifetime are bounded.');
