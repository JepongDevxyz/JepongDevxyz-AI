import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../api/chat.js', import.meta.url), 'utf8');
const handlerStart = source.indexOf('export default async function handler(req)');
const streamStart = source.indexOf('function activityStreamResponse(');
assert(handlerStart >= 0, 'Chat handler must exist.');
assert(streamStart >= 0 && streamStart < handlerStart, 'The streaming response must be defined before the handler.');

assert.ok(/export\s+const\s+config\s*=\s*\{\s*runtime\s*:\s*['"]edge['"]\s*\}/i.test(source),
  'The chat route must stay on Edge to fit the Vercel Hobby serverless function limit.');

const streamDispatch = source.indexOf('if(body.activityStream===true) return activityStreamResponse(body,req.signal,req);', handlerStart);
const inlineSessionLookup = source.indexOf('const githubSession=await getGitHubSession(req);', handlerStart);
assert(streamDispatch > handlerStart && (inlineSessionLookup < 0 || streamDispatch < inlineSessionLookup),
  'SSE requests must return before waiting for the GitHub session lookup.');

const streamSection = source.slice(streamStart, handlerStart);
const open = streamSection.indexOf("controller.enqueue(encoder.encode(': stream-open\\n\\n'));");
const githubHydration = streamSection.indexOf('await attachChatGitHubAccess(request,body);');
const chat = streamSection.indexOf('await processChat(body,emit)');
assert(open >= 0 && githubHydration > open && chat > githubHydration,
  'The SSE stream must open before GitHub session lookup and chat generation.');

console.log('PASS: Edge chat opens SSE before external session lookup and model work.');
