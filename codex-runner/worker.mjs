import { projectCodexEvent } from './events.mjs';
import { Codex } from '@openai/codex-sdk';

const safeString = (value, max = 1200) => String(value ?? '').slice(0, max);
let busy = false;
let activeAbort = null;
const emit = message => { if (process.connected) process.send(message); };

process.on('message', async request => {
  if (request?.action === 'cancel') {
    activeAbort?.abort();
    return;
  }
  if (busy || request?.action !== 'run') return;
  busy = true;
  const { workspace, home, prompt, threadId } = request;
  const abort = new AbortController();
  activeAbort = abort;
  try {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured on the runner.');
    const codex = new Codex({
      apiKey: process.env.OPENAI_API_KEY,
      // Never forward GitHub access tokens or the gateway signing secret to the agent.
      env: {
        PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
        HOME: home,
        CODEX_HOME: home + '/.codex',
        TMPDIR: process.env.TMPDIR || '/tmp',
        LANG: 'C.UTF-8'
      }
    });
    const options = {
      workingDirectory: workspace,
      sandboxMode: 'workspace-write',
      approvalPolicy: 'never',
      networkAccessEnabled: false,
      webSearchMode: 'disabled'
    };
    const thread = threadId ? codex.resumeThread(threadId, options) : codex.startThread(options);
    const { events } = await thread.runStreamed(prompt, { signal: abort.signal });
    let finalResponse = '';
    let completed = false;
    for await (const event of events) {
      const projected = projectCodexEvent(event);
      if (projected.threadId) emit({ kind: 'thread', threadId: projected.threadId });
      if (projected.activity) emit({ kind: 'event', event: projected.activity });
      if (projected.response !== undefined) finalResponse = projected.response;
      if (projected.error) throw new Error(projected.error);
      if (projected.completed) completed = true;
    }
    if (!completed) throw new Error('Codex ended without a completed turn.');
    emit({ kind: 'done', threadId: safeString(thread.id, 150), finalResponse });
  } catch (err) {
    emit({ kind: 'failed', error: abort.signal.aborted ? 'Cancelled.' : safeString(err?.message || 'Codex execution failed.', 650) });
  } finally {
    busy = false;
    activeAbort = null;
  }
});
