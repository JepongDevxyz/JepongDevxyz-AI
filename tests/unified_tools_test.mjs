/* Contract tests for the unified model tools (lib/tools/index.js).
   Run: node tests/unified_tools_test.mjs */
import assert from 'node:assert';
import {
  UNIFIED_TOOLS,
  TOOL_FAMILY_OPENAI,
  TOOL_FAMILY_GEMINI,
  TOOL_FAMILY_ANTHROPIC,
  MAX_TOOL_ROUNDS,
  toolsForFamily,
  accumulateOpenAIToolDeltas,
  recordGeminiFunctionCall,
  accumulateAnthropicEvent,
  finalizeToolCalls,
  buildToolFollowUp,
  executeUnifiedTool,
} from '../lib/tools/index.js';

// Registry
assert.strictEqual(UNIFIED_TOOLS.length, 7, 'seven canonical tools');
assert.deepStrictEqual(UNIFIED_TOOLS.map(t => t.name),
  ['share_file', 'create_session', 'web_search', 'fetch_webpage', 'generate_image', 'get_directions', 'get_weather']);
assert.strictEqual(MAX_TOOL_ROUNDS, 3, 'tool loop is bounded');
console.log('PASS: registry');

// Converters
const oai = toolsForFamily(TOOL_FAMILY_OPENAI, UNIFIED_TOOLS);
assert.strictEqual(oai.length, 7);
assert.strictEqual(oai[0].type, 'function');
assert.strictEqual(oai[0].function.name, 'share_file');
assert.ok(oai[0].function.parameters.properties.content, 'share_file content param');

const gem = toolsForFamily(TOOL_FAMILY_GEMINI, UNIFIED_TOOLS);
assert.strictEqual(gem.length, 1);
assert.strictEqual(gem[0].functionDeclarations.length, 7);
assert.ok(gem[0].functionDeclarations.some(d => d.name === 'get_weather'), 'gemini has get_weather');

const ant = toolsForFamily(TOOL_FAMILY_ANTHROPIC, UNIFIED_TOOLS);
assert.strictEqual(ant.length, 7);
assert.strictEqual(ant[0].name, 'share_file');
assert.ok(ant[0].input_schema.properties.filename, 'anthropic input_schema');

assert.strictEqual(toolsForFamily('nope', UNIFIED_TOOLS), null, 'unknown family -> null');
console.log('PASS: converters');

// OpenAI streaming accumulation (arguments split across deltas)
{
  const fs = {};
  accumulateOpenAIToolDeltas(fs, [{ index: 0, id: 'call_1', function: { name: 'share', arguments: '{"file' } }]);
  accumulateOpenAIToolDeltas(fs, [{ index: 0, function: { arguments: 'name":"r.md","con' } }]);
  accumulateOpenAIToolDeltas(fs, [{ index: 0, function: { name: '_file', arguments: 'tent":"hi"}' } }]);
  accumulateOpenAIToolDeltas(fs, [{ index: 1, id: 'call_2', function: { name: 'create_session', arguments: '{"title":"X"}' } }]);
  const calls = finalizeToolCalls(TOOL_FAMILY_OPENAI, fs);
  assert.strictEqual(calls.length, 2);
  assert.strictEqual(calls[0].name, 'share_file');
  assert.deepStrictEqual(calls[0].args, { filename: 'r.md', content: 'hi' });
  assert.strictEqual(calls[0].id, 'call_1');
  assert.strictEqual(calls[1].name, 'create_session');
  assert.deepStrictEqual(calls[1].args, { title: 'X' });
}
console.log('PASS: openai accumulation');

// Gemini
{
  const fs = {};
  recordGeminiFunctionCall(fs, { name: 'share_file', args: { filename: 'a.txt', content: 'x' } });
  recordGeminiFunctionCall(fs, null);
  const calls = finalizeToolCalls(TOOL_FAMILY_GEMINI, fs);
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].name, 'share_file');
  assert.deepStrictEqual(calls[0].args, { filename: 'a.txt', content: 'x' });
}
console.log('PASS: gemini');

// Anthropic
{
  const fs = {};
  accumulateAnthropicEvent(fs, { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'tu_1', name: 'share_file' } });
  accumulateAnthropicEvent(fs, { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '{"filename":' } });
  accumulateAnthropicEvent(fs, { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '"b.md"}' } });
  const calls = finalizeToolCalls(TOOL_FAMILY_ANTHROPIC, fs);
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].id, 'tu_1');
  assert.deepStrictEqual(calls[0].args, { filename: 'b.md' });
}
console.log('PASS: anthropic');

// Follow-up builders
{
  const calls = [{ id: 'c1', name: 'share_file', args: { filename: 'r.md', content: 'hi' } }];
  const results = [{ call: calls[0], result: { ok: true, url: 'https://x/y' } }];

  const o = buildToolFollowUp(TOOL_FAMILY_OPENAI, [{ role: 'user', content: 'hi' }], calls, results);
  assert.strictEqual(o.messages.length, 3);
  assert.strictEqual(o.messages[1].role, 'assistant');
  assert.strictEqual(o.messages[1].tool_calls[0].function.name, 'share_file');
  assert.strictEqual(o.messages[2].role, 'tool');
  assert.strictEqual(o.messages[2].tool_call_id, 'c1');

  const g = buildToolFollowUp(TOOL_FAMILY_GEMINI, [{ role: 'user', parts: [{ text: 'hi' }] }], calls, results);
  assert.strictEqual(g.contents.length, 3);
  assert.strictEqual(g.contents[1].role, 'model');
  assert.strictEqual(g.contents[1].parts[0].functionCall.name, 'share_file');
  assert.strictEqual(g.contents[2].parts[0].functionResponse.name, 'share_file');
  assert.ok(typeof g.contents[2].parts[0].functionResponse.response === 'object', 'gemini response must be object');

  const a = buildToolFollowUp(TOOL_FAMILY_ANTHROPIC, [{ role: 'user', content: 'hi' }], calls, results);
  assert.strictEqual(a.messages[1].content[0].type, 'tool_use');
  assert.strictEqual(a.messages[2].content[0].type, 'tool_result');
  assert.strictEqual(a.messages[2].content[0].tool_use_id, 'c1');

  assert.strictEqual(buildToolFollowUp('nope', [], calls, results), null);
}
console.log('PASS: follow-up builders');

// Executor
{
  // share_file success
  let shared = null;
  const okRes = await executeUnifiedTool(
    { name: 'share_file', args: { filename: 'r.md', content: '# report', mimeType: 'text/markdown' } },
    {
      uploadSharedFile: async () => ({ ok: true, url: 'https://blob/x/r.md', filename: 'r.md' }),
      onShared: (up) => { shared = up; },
    }
  );
  assert.strictEqual(okRes.ok, true);
  assert.strictEqual(okRes.url, 'https://blob/x/r.md');
  assert.ok(shared && shared.url, 'onShared fired');

  // share_file upload failure -> honest fallback instruction
  const failRes = await executeUnifiedTool(
    { name: 'share_file', args: { filename: 'r.md', content: 'x' } },
    { uploadSharedFile: async () => ({ ok: false, reason: 'missing-token' }) }
  );
  assert.strictEqual(failRes.ok, false);
  assert.ok(failRes.error.includes('fenced code block'), 'failure tells model the fallback');

  // share_file empty content
  const emptyRes = await executeUnifiedTool(
    { name: 'share_file', args: { filename: 'r.md', content: '   ' } },
    { uploadSharedFile: async () => { throw new Error('must not be called'); } }
  );
  assert.strictEqual(emptyRes.ok, false);

  // create_session (permission is enforced by the model instruction)
  let createdTitle = '';
  const csRes = await executeUnifiedTool(
    { name: 'create_session', args: { title: 'My plan' } },
    { onCreateSession: (t) => { createdTitle = t; } }
  );
  assert.strictEqual(csRes.ok, true);
  assert.strictEqual(createdTitle, 'My plan');

  // unknown tool
  const unk = await executeUnifiedTool({ name: 'nope', args: {} }, {});
  assert.strictEqual(unk.ok, false);

  // web_search (mocked)
  const ws = await executeUnifiedTool(
    { name: 'web_search', args: { query: 'Vercel Blob pricing', count: 3 } },
    { webSearch: async (q, n) => { assert.strictEqual(q, 'Vercel Blob pricing'); assert.strictEqual(n, 3); return [{ title: 'T', url: 'https://x', snippet: 'S' }]; } }
  );
  assert.strictEqual(ws.ok, true);
  assert.strictEqual(ws.results.length, 1);
  const wsEmpty = await executeUnifiedTool({ name: 'web_search', args: { query: '   ' } }, {});
  assert.strictEqual(wsEmpty.ok, false);
  const wsNone = await executeUnifiedTool({ name: 'web_search', args: { query: 'q' } }, { webSearch: async () => [] });
  assert.strictEqual(wsNone.ok, false);

  // fetch_webpage (mocked)
  const fw = await executeUnifiedTool(
    { name: 'fetch_webpage', args: { url: 'https://example.com' } },
    { fetchWebpage: async (u) => ({ ok: true, url: u, text: 'hello' }) }
  );
  assert.strictEqual(fw.ok, true);
  assert.strictEqual(fw.text, 'hello');
  const fwBad = await executeUnifiedTool({ name: 'fetch_webpage', args: { url: '' } }, {});
  assert.strictEqual(fwBad.ok, false);

  // generate_image (pure URL builder, no network)
  const gi = await executeUnifiedTool({ name: 'generate_image', args: { prompt: 'a red cat' } }, {});
  assert.strictEqual(gi.ok, true);
  assert.ok(gi.imageUrl.startsWith('https://image.pollinations.ai/prompt/a%20red%20cat'), 'pollinations url');
  const giEmpty = await executeUnifiedTool({ name: 'generate_image', args: { prompt: '  ' } }, {});
  assert.strictEqual(giEmpty.ok, false);
}
console.log('PASS: executor');

console.log('ALL UNIFIED TOOL CONTRACT TESTS PASS');
