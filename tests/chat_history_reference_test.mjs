import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../chat-history-reference.js', import.meta.url), 'utf8');
const context = { window: {}, console };
vm.runInNewContext(source, context);

const build = context.window.JDChatHistoryReference.buildPastReference;

const sessions = {
  current: {
    id: 'current',
    title: 'Current chat',
    messages: [{ role: 'user', text: 'Continue the current work' }]
  },
  relevant: {
    id: 'relevant',
    title: 'JepongDevxyz Library search',
    messages: [
      { role: 'user', text: 'We need private Library search with Supabase chunks.' },
      { role: 'bot', text: 'The Library search should stay account scoped.' }
    ]
  },
  irrelevant: {
    id: 'irrelevant',
    title: 'Birthday recipe ideas',
    messages: [{ role: 'user', text: 'Chocolate cake recipe ideas.' }]
  }
};

const refs = build(sessions, 'current', 'How should the Supabase Library search work?');
assert.equal(refs.length, 1, 'one compact reference context should be returned');
assert.match(refs[0].parts[0].text, /JepongDevxyz Library search/);
assert.match(refs[0].parts[0].text, /private Library search/);
assert.doesNotMatch(refs[0].parts[0].text, /Birthday recipe ideas/);
assert.doesNotMatch(refs[0].parts[0].text, /Current chat/);

const none = build(sessions, 'current', 'zzzz qqqq');
assert.deepEqual(none, [], 'unrelated prompts should not inject unrelated chats');

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.match(index, /function getHistoryForRequest\(history, prompt='')/);
assert.match(index, /if \(isIncognito \|\| !personalizationSettings\.referenceChatHistory\) return history;/);
assert.match(index, /JDChatHistoryReference\?\.buildPastReference/);
assert.match(index, /getHistoryForRequest\(continuousChatHistory, promptText\)/);
assert.match(index, /chat-history-reference\.js\?v=20261008-v1/);

console.log('chat history reference tests passed');
