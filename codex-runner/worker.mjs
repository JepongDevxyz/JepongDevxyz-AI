import { Codex } from '@openai/codex-sdk';

const safeString = (value, max = 1200) => String(value ?? '').slice(0, max);
let busy = false;
let activeAbort = null;

process.on('message', async (request) => {
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
      // Do not forward the HTTP gateway secret or any GitHub credentials.
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
    for await (const event of events) {
      if (event.type === 'thread.started') {
        process.send?.({ kind: 'thread', threadId: safeString(thread.id, 150) });
      }
      if (event.type === 'thread.item.completed' || event.type === 'thread.item.updated' || event.type === 'thread.item.started') {
        const item = event.item || {};
        // Never send chain-of-thought, raw tool input, credentials or entire command output to the browser.
        if (item.type === 'agent_message' && event.type === 'thread.item.completed') {
          finalResponse = safeString(item.text, 20_000);
        }
        if (['command_execution', 'file_change', 'agent_message', 'mcp_tool_call'].includes(item.type)) {
          process.send?.({
            kind: 'event', event: {
              type: event.type, itemType: item.type,
              status: safeString(item.status, 40),
              command: item.type === 'command_execution' ? safeString(item.command, 500) : undefined,
              text: item.type === 'agent_message' && event.type === 'thread.item.completed' ? safeString(item.text, 1200) : undefined
            }
          });
        }
      }
      if (event.type === 'turn.failed') throw new Error(safeString(event.error?.message || 'Codex turn failed.', 700));
    }
    process.send?.({ kind: 'done', threadId: safeString(thread.id, 150), finalResponse });
  } catch (err) {
    process.send?.({ kind: 'failed', error: abort.signal.aborted ? 'Cancelled.' : safeString(err?.message || 'Codex execution failed.', 650) });
  } finally {
    busy = false;
    activeAbort = null;
  }
});
