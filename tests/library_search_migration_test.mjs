import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const migrationPath='supabase/migrations/20261008_library_chunk_search_regression_safe.sql';
const testPath='supabase/tests/library_search_rls_test.sql';
assert.ok(existsSync(migrationPath),'private Library search migration exists');
assert.ok(existsSync(testPath),'private Library search RLS allow/deny test exists');
const migration=readFileSync(migrationPath,'utf8');
const rlsTest=readFileSync(testPath,'utf8');
const expectPattern=(value,pattern,message)=>assert.ok(pattern.test(value),message);

expectPattern(migration,/create table if not exists public\.library_item_chunks/i,'chunk table must be created');
expectPattern(migration,/library_item_id\s+uuid\s+not null\s+references\s+public\.library_items\s*\(id\)\s+on delete cascade/i,
  'deleting a Library parent must remove its indexed chunks');
expectPattern(migration,/search_vector\s+tsvector\s+generated always as\s*\([^)]*to_tsvector/i,
  'search vectors must be generated from stored chunk content');
expectPattern(migration,/using gin\s*\(search_vector\)/i,'full-text queries must have a GIN index');
expectPattern(migration,/alter table public\.library_item_chunks enable row level security/i,'RLS must be enabled');
for(const action of ['select','insert','delete']){
  expectPattern(migration,new RegExp(`create policy[^;]+for ${action} to authenticated`, 'i'),
    `authenticated users need an owner-checked ${action} policy`);
}
expectPattern(migration,/library_items\.user_id\s*=\s*auth\.uid\(\)/i,
  'chunk access must be tied to the parent Library item owner');

const rpc=migration.slice(migration.indexOf('create or replace function public.search_library_chunks'));
expectPattern(rpc,/returns table\s*\(\s*library_item_id\s+uuid\s*,\s*file_name\s+text\s*,\s*content\s+text\s*,\s*rank\s+real/i,'RPC result contract must be stable');
expectPattern(rpc,/security invoker/i,'search must run with caller privileges so RLS remains active');
expectPattern(rpc,/auth\.uid\(\)\s+is not null/i,'anonymous callers must not retrieve private search results');
expectPattern(rpc,/limit\s+[^;]*least\s*\([^;]*6/is,'the RPC must cap requested results at six');
expectPattern(migration,/revoke all on function public\.search_library_chunks\(text,\s*integer\) from public, anon/i,'anonymous/default execution must be revoked');
expectPattern(migration,/grant execute on function public\.search_library_chunks\(text,\s*integer\) to authenticated/i,'RPC execution must be granted to signed-in users only');

expectPattern(rlsTest,/set local role authenticated/i,'runtime test must exercise authenticated users');
expectPattern(rlsTest,/set local role anon/i,'runtime test must exercise anonymous access');
expectPattern(rlsTest,/search_library_chunks\(/i,'runtime test must cover the RPC');
expectPattern(rlsTest,/cannot insert|cannot write|cannot add chunks|reject.*insert/i,'runtime test must cover cross-owner writes');
expectPattern(rlsTest,/user A|user B/i,'runtime test must use separate owners');
console.log('PASS: private Library chunk schema, bounded invoker RPC, and cross-user RLS contract.');
