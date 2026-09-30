// Consolidated Plugins API — one edge function.
//   /api/plugins                  ->  /api/plugins?route=index
//   /api/plugin-proposals         ->  /api/plugins?route=proposals
//   /api/plugin-batch-proposals   ->  /api/plugins?route=batch
//   /api/plugin-execute           ->  /api/plugins?route=execute
//   /api/plugin-workspace         ->  /api/plugins?route=workspace
export const config = { runtime: 'edge' };

import { handler as indexHandler } from '../lib/plugins/index.js';
import { handler as proposals } from '../lib/plugins/proposals.js';
import { handler as batch } from '../lib/plugins/batch.js';
import { handler as execute } from '../lib/plugins/execute.js';
import { handler as workspace } from '../lib/plugins/workspace.js';
// api/chat.js and api/_plugin_*.js import these named helpers from './plugins.js';
// re-export them so those files keep working unchanged.
export { parseGitHubTarget, fetchPublicGitHubContext } from '../lib/plugins/index.js';

const ROUTES = { index: indexHandler, proposals, batch, execute, workspace };

export default async function handler(req) {
  let route = 'index';
  try { route = new URL(req.url).searchParams.get('route') || 'index'; } catch {}
  const fn = ROUTES[route] || indexHandler;
  return fn(req);
}
