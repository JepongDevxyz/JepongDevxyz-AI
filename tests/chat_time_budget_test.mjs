/* Contract test: /api/chat Hobby time-budget adaptation (P0/A1).
   Vercel Hobby clamps Edge functions to ~25s; vercel.json maxDuration:300
   is silently ignored there. The chat endpoint must bound upstream
   timeouts, the tool loop, and auto-continuations to a configurable
   budget (default 22s) so long chains degrade gracefully instead of
   being hard-killed mid-stream. */
import test from 'node:test';
import assert from 'node:assert/strict';

delete process.env.CHAT_TIME_BUDGET_MS;
const mod = await import('../api/chat.js');
const { JD_CHAT_BUDGET_MS, jdDeadlineMs, jdBudgetLeft } = mod;

test('default budget is Hobby-safe (22s < 25s wall)', () => {
  assert.equal(JD_CHAT_BUDGET_MS, 22000);
  assert.ok(JD_CHAT_BUDGET_MS < 25000, 'budget must stay under the Hobby 25s kill wall');
});

test('jdDeadlineMs returns a future timestamp ~budget away', () => {
  const before = Date.now();
  const d = jdDeadlineMs();
  assert.ok(d >= before + JD_CHAT_BUDGET_MS - 50, 'deadline should be ~budget in the future');
  assert.ok(d <= Date.now() + JD_CHAT_BUDGET_MS + 50);
});

test('jdBudgetLeft clamps correctly', () => {
  assert.ok(jdBudgetLeft(jdDeadlineMs()) > 0, 'future deadline -> positive');
  assert.equal(jdBudgetLeft(Date.now() - 5000), 0, 'past deadline -> 0');
  assert.equal(jdBudgetLeft(null), 0, 'missing deadline -> 0');
  assert.equal(jdBudgetLeft(undefined), 0, 'undefined deadline -> 0');
  assert.equal(jdBudgetLeft('not-a-number'), 0, 'garbage deadline -> 0');
});

test('upstream timeout defaults are capped under the budget', async () => {
  // api/chat.js was split into lib/chat/*.js (mechanical, no behavior change);
  // verify the source constraint across the concatenated chat sources.
  // default upstream cap = budget - 4000 = 18000 < budget.
  const { readChatSources } = await import('./chat-sources.mjs');
  const src = readChatSources();
  assert.ok(src.includes('JD_CHAT_BUDGET_MS-4000'), 'upstream caps derive from the budget');
  assert.ok(src.includes('jdBudgetLeft(body._jdDeadline)<=6000'), 'tool loop + continuations check the deadline');
});
