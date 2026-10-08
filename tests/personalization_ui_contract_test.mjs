import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const persona = readFileSync(new URL('../personalization-chatgpt.js', import.meta.url), 'utf8');
const migrationPath = new URL('../supabase/migrations/20261006120000_personalization_rls.sql', import.meta.url);
const migrationTestPath = new URL('../supabase/tests/personalization_rls_test.sql', import.meta.url);

assert.ok(existsSync(migrationPath), 'personalization owner RLS migration exists');
assert.ok(existsSync(migrationTestPath), 'personalization RLS allow/deny SQL test exists');
const migration = readFileSync(migrationPath, 'utf8');
const sqlTest = readFileSync(migrationTestPath, 'utf8');

assert.match(index, /createPersonalizationStore\(/, 'the settings page uses the account-scoped store');
assert.match(index, /window\.JDPersonalization\s*=\s*Object\.freeze/, 'the canonical bridge is public to page controls');
assert.match(index, /jd:personalization-save-state/, 'save state is observable by the compact personalization page');
assert.match(index, /await\s+personalizationStore\.ready\(\)/, 'chat requests wait for remote personalization to load');
assert.match(index, /personalizationStore\.load\(cloudUser\?\.id\s*\?\?\s*null\)/, 'auth changes reset or load the matching account');
assert.match(index, /personalizationStore\.updateField\(/, 'native settings edits write through the store');
assert.doesNotMatch(index, /readLocalJSON\(['"]jepong_personalization['"]/, 'normal initialization never reads legacy personalization');
assert.doesNotMatch(index, /localStorage\.setItem\(['"]jepong_personalization(?:_updated_at)?['"]/, 'normal settings saves never write browser personalization');
assert.doesNotMatch(index, /localStorage\.setItem\(['"]jepong_personalization_updated_at['"]/, 'timestamp freshness no longer controls remote settings');
assert.match(index, /getLegacyPreview/, 'legacy settings are exposed only as a preview before import');
assert.match(index, /personalizationStore\.importLegacy\(/, 'legacy data requires explicit import');
assert.match(index, /personalizationStore\.discardLegacy\(/, 'legacy data can be explicitly discarded');

assert.doesNotMatch(persona, /localStorage\.(?:getItem|setItem)\(['"]jepong_personalization/, 'compact page has no direct local storage path');
for (const value of ['Professional', 'Friendly', 'Candid', 'Quirky', 'Efficient', 'Cynical']) {
  assert.ok(persona.includes(value), `compact page supports canonical style ${value}`);
}
for (const method of ['updateField', 'setToggle', 'retrySave', 'importLegacy', 'discardLegacy']) {
  assert.ok(persona.includes(`?.${method}`) || persona.includes(`.${method}`), `compact page calls bridge method ${method}`);
}

assert.match(migration, /create table if not exists public\.user_settings/i);
assert.match(migration, /alter table public\.user_settings enable row level security/i);
for (const action of ['select', 'insert', 'update', 'delete']) {
  assert.match(migration, new RegExp(`as restrictive for ${action}`, 'i'), `restrictive owner check exists for ${action}`);
}
assert.match(migration, /auth\.uid\(\)\s*=\s*user_id/i);
assert.match(sqlTest, /authenticated/i);
assert.match(sqlTest, /anon/i);
assert.match(sqlTest, /user[_ -]?a/i);
assert.match(sqlTest, /user[_ -]?b/i);
console.log('PASS: Supabase-authoritative personalization UI, explicit legacy import, save states, and RLS contract');
