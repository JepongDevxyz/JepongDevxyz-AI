import assert from 'node:assert/strict';
import '../lib/personalization-core.js';
import '../lib/personalization-store.js';

const createStore = globalThis.createPersonalizationStore;
assert.equal(typeof createStore, 'function', 'store factory is exposed to the browser bridge');

const defaults = { baseStyle: 'Default', fastAnswers: true, intelligence: 'Instant' };
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
async function waitFor(predicate) {
  for (let i = 0; i < 100; i++) {
    if (predicate()) return;
    await tick();
  }
  assert.fail('timed out waiting for store operation');
}

{
  let saves = 0;
  const store = createStore({ defaults, loadRemote: async () => null, saveRemote: async () => { saves++; } });
  await store.load(null);
  store.updateField('baseStyle', 'Friendly');
  assert.equal(store.getSnapshot().baseStyle, 'Friendly');
  assert.equal(saves, 0, 'signed-out edits remain in memory and are not persisted');
}

{
  let resolveA, resolveB;
  const store = createStore({
    defaults,
    loadRemote: userId => new Promise(resolve => { if (userId === 'A') resolveA = resolve; else resolveB = resolve; }),
    saveRemote: async () => {}
  });
  const loadA = store.load('A');
  const loadB = store.load('B');
  resolveB({ personalization: { baseStyle: 'Professional' } });
  await loadB;
  resolveA({ personalization: { baseStyle: 'Cynical' } });
  await loadA;
  assert.equal(store.getSnapshot().baseStyle, 'Professional', 'late account A data cannot replace account B');
}

{
  const calls = [];
  let releaseFirst;
  let active = 0;
  let maxActive = 0;
  const store = createStore({
    defaults,
    loadRemote: async () => ({ personalization: {} }),
    saveRemote: async (_userId, snapshot) => {
      active++;
      maxActive = Math.max(maxActive, active);
      calls.push(snapshot.baseStyle);
      if (calls.length === 1) await new Promise(resolve => { releaseFirst = resolve; });
      active--;
    }
  });
  await store.load('user');
  store.updateField('baseStyle', 'Friendly');
  const firstSave = store.retrySave();
  await waitFor(() => calls.length === 1);
  store.updateField('baseStyle', 'Cynical');
  releaseFirst();
  await firstSave;
  await store.retrySave();
  assert.deepEqual(calls, ['Friendly', 'Cynical'], 'newest snapshot is written after a slower earlier save');
  assert.equal(maxActive, 1, 'remote saves are serialized');
  assert.equal(store.getSnapshot().baseStyle, 'Cynical');
}

{
  let attempts = 0;
  const store = createStore({
    defaults,
    loadRemote: async () => ({ personalization: {} }),
    saveRemote: async () => { attempts++; if (attempts === 1) throw new Error('offline'); }
  });
  await store.load('user');
  store.updateField('baseStyle', 'Efficient');
  assert.equal(await store.retrySave(), false);
  assert.equal(store.getStatus().status, 'error');
  assert.equal(store.getSnapshot().baseStyle, 'Efficient');
  assert.equal(await store.retrySave(), true);
  assert.equal(store.getStatus().status, 'saved');
  assert.equal(attempts, 2);
}

{
  let loads = 0;
  const store = createStore({
    defaults,
    loadRemote: async () => {
      loads++;
      if (loads === 1) throw new Error('offline while loading');
      return { personalization: { baseStyle: 'Professional' } };
    },
    saveRemote: async () => {}
  });
  await store.load('user');
  assert.equal(store.getStatus().status, 'error');
  assert.equal(await store.retrySave(), true);
  assert.equal(store.getSnapshot().baseStyle, 'Professional', 'retry after a load failure fetches the account value again');
  assert.equal(loads, 2);
}

{
  const cleared = [];
  const store = createStore({
    defaults,
    loadRemote: async () => null,
    saveRemote: async () => { await tick(); },
    clearLegacy: key => cleared.push(key)
  });
  await store.load('user');
  assert.equal(await store.importLegacy({ baseStyle: 'Candid' }), true);
  assert.equal(store.getSnapshot().baseStyle, 'Candid');
  assert.deepEqual(cleared, ['jepong_personalization']);
}

{
  const cleared = [];
  let saves = 0;
  const store = createStore({
    defaults,
    loadRemote: async () => null,
    saveRemote: async () => { saves++; },
    clearLegacy: key => cleared.push(key)
  });
  await store.load('user');
  assert.equal(await store.discardLegacy(), true);
  assert.deepEqual(cleared, ['jepong_personalization']);
  assert.equal(saves, 0, 'discarding a legacy value does not import it');
}

{
  let remoteLoads = 0;
  const store = createStore({
    defaults,
    loadRemote: async () => { remoteLoads++; return { personalization: { baseStyle: 'Default' } }; },
    saveRemote: async () => {}
  });
  await store.load('user', { personalization: { baseStyle: 'Cynical' } });
  assert.equal(remoteLoads, 0, 'an already loaded user_settings row can hydrate the store without a duplicate query');
  assert.equal(store.getSnapshot().baseStyle, 'Cynical');
  assert.equal(store.hasRemoteSettings(), true, 'the store can gate explicit legacy import when Supabase already has a value');
}

{
  let resolveRemote;
  const saves = [];
  const store = createStore({
    defaults,
    loadRemote: async () => new Promise(resolve => { resolveRemote = resolve; }),
    saveRemote: async (_userId, value) => { saves.push(value); }
  });
  const loading = store.load('user');
  store.updateField('baseStyle', 'Friendly');
  resolveRemote({ personalization: { baseStyle: 'Candid', intelligence: 'High' } });
  await loading;
  assert.equal(store.getSnapshot().baseStyle, 'Friendly', 'an edit made during load is preserved');
  assert.equal(store.getSnapshot().intelligence, 'High', 'untouched values still come from Supabase');
  await store.retrySave();
  assert.equal(saves.at(-1).baseStyle, 'Friendly', 'the preserved edit is written after load');
}

console.log('PASS: account-scoped personalization state, race protection, retry, and explicit legacy actions');
