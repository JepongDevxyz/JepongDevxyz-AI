// Pure, unit-testable projection of the official Codex SDK JSONL event format.
// Never expose raw tool arguments, command output, file contents or reasoning.
const limited = (value, max) => String(value ?? '').slice(0, max);

export function projectCodexEvent(event) {
  if (!event || typeof event !== 'object') return {};
  if (event.type === 'thread.started')
    return { threadId: limited(event.thread_id, 150) };
  if (event.type === 'turn.completed') return { completed: true };
  if (event.type === 'turn.failed' || event.type === 'error')
    return { error: limited(event.error?.message || event.message || 'Codex turn failed.', 700) };
  if (!['item.started', 'item.updated', 'item.completed'].includes(event.type)) return {};
  const item = event.item || {};
  const supported = ['command_execution', 'file_change', 'agent_message', 'mcp_tool_call'];
  if (!supported.includes(item.type)) return {};
  const isMessage = item.type === 'agent_message' && event.type === 'item.completed';
  const response = isMessage ? limited(item.text, 20_000) : undefined;
  return {
    response,
    activity: {
      type: event.type,
      itemType: item.type,
      status: limited(item.status, 40),
      text: isMessage ? limited(item.text, 1200) : undefined
    }
  };
}
