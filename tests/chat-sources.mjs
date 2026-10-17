/* Shared helper for source-grep tests of the /api/chat Edge function.
   api/chat.js was mechanically split into lib/chat/*.js (no behavior change).
   Tests that grep the backend source (including positional slicing between
   functions) read the concatenated sources in ORIGINAL declaration order,
   so existing assertions keep working. */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIB = path.join(HERE, '../lib/chat');

/* Module files in the order their code appeared in the original api/chat.js.
   api/chat.js goes last: its remaining content (the default-export handler)
   was at the end of the original file. */
const ORDERED_MODULES = [
  'utils.js',      // 52-55, 218-238, 337-373 (inlineMapPageUrl, json/parseKeys/shuffle, safeEmit/activity/*)
  'config.js',     // 56-217 (PROVIDERS, budgets, API_GUARD)
  'keys.js',       // 239-336 (provider keys)
  'effort.js',     // 374-517 (effort levels)
  'artifacts.js',  // 518-638 (artifact request/instruction)
  'tools.js',      // 639-682 (toolWebSearch/toolFetchWebpage/modelToolsInstruction)
  'archive.js',    // 683-1023 (zip/pdf/artifact builders)
  'prompts.js',    // 1024-1734 (intent/prompts/blueprints)
  'sanitize.js',   // 1735-1967 (sanitize + system instruction)
  'search.js',     // 1968-2398 (web search)
  'attachments.js',// 2399-2694 (attachments/media)
  'verify.js',     // 2695-2799 (code verify/probe)
  'task.js',       // 2800-3393 (task profile/activity)
  'github-inspect.js', // 3394-3598 (link/github inspection)
  'project-inspect.js',// 3599-3899 (uploaded project inspection)
  'context.js',    // 3900-4060 (live context/history/routing)
  'stream.js',     // 4061-4187 (stream helpers)
  'providers.js',  // 4188-4704 (provider runners)
  'aihorde.js',    // 4705-5274 (AI Horde)
  'fallback.js',   // 5275-5367 (fallback/runner dispatch)
  'refine.js',     // 5368-5461 (UI refinement pass)
  'process.js',    // 5462-6096 (processChat)
  'models.js',     // 6097-6216 (model catalog)
  'sse.js',        // 6217-6754 (continuations + SSE activity stream)
  'tts.js',        // 6755-7075 (TTS)
  'image.js',      // 7076-7368 (image generation)
  'credits.js',    // 7369-7488 (credit coupling)
];

export const CHAT_SOURCE_FILES = [
  ...ORDERED_MODULES.map((f) => path.join(LIB, f)),
  path.join(HERE, '../api/chat.js'),
];

/* Strip the lines the mechanical split added (header comment, generated
   imports, generated export footer) so the concatenation is faithful to
   the original api/chat.js source that tests slice/execute. */
function stripGenerated(src) {
  return src
    .split('\n')
    .filter((l) => {
      const t = l.trim();
      if (t.startsWith('/* lib/chat/')) return false;
      if (/^import\s*\{[^}]*\}\s*from\s*'[^']*';$/.test(t)) return false;
      if (/^export\s*\{[^}]*\};$/.test(t)) return false;
      return true;
    })
    .join('\n');
}

export function readChatSources() {
  return CHAT_SOURCE_FILES.map((f) => stripGenerated(readFileSync(f, 'utf8'))).join('\n');
}
