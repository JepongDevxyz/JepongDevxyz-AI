import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';

const source=readFileSync(new URL('../api/_github_oauth.js',import.meta.url),'utf8');
const start=source.indexOf('export function githubApiUrl(');
const end=source.indexOf('export async function githubApi(',start);
assert(start>=0&&end>start,'githubApiUrl helper missing');
const helper=source.slice(start,end).replace('export function githubApiUrl','function githubApiUrl');
const githubApiUrl=new Function('URL',helper+'\nreturn githubApiUrl;')(URL);

assert.equal(githubApiUrl('/user'),'https://api.github.com/user');
assert.equal(githubApiUrl('/repos/openai/openai'),'https://api.github.com/repos/openai/openai');
assert.equal(githubApiUrl('https://api.github.com/repos/openai/openai'),'https://api.github.com/repos/openai/openai');
for(const bad of [
  'http://api.github.com/user',
  'https://evil.example/user',
  'https://api.github.com.evil.example/user',
  'https://user:pass@api.github.com/user',
  'https://api.github.com/user#secret'
]){
  assert.throws(()=>githubApiUrl(bad),/only be sent|Invalid GitHub API URL|GitHub API path/);
}
const api=source.slice(end,source.indexOf('export function json(',end));
assert(api.includes('const url=githubApiUrl(path);'),'githubApi must validate the origin before attaching Authorization');
assert(!api.includes("path.startsWith('https://')"),'githubApi must not trust arbitrary absolute HTTPS URLs');

console.log('PASS: GitHub bearer tokens can only be sent to the official api.github.com origin.');
