begin;

select plan(8);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
values
  ('33333333-3333-4333-8333-333333333333', null, 'authenticated', 'authenticated', 'library-search-user-a@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), false, false),
  ('44444444-4444-4444-8444-444444444444', null, 'authenticated', 'authenticated', 'library-search-user-b@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), false, false)
on conflict (id) do nothing;

insert into public.library_items (id, user_id, storage_path, file_name, mime_type, size_bytes)
values
  ('55555555-5555-4555-8555-555555555555', '33333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333/library-a.txt', 'library-a.txt', 'text/plain', 32),
  ('66666666-6666-4666-8666-666666666666', '44444444-4444-4444-8444-444444444444', '44444444-4444-4444-8444-444444444444/library-b.txt', 'library-b.txt', 'text/plain', 34)
on conflict (id) do nothing;

insert into public.library_item_chunks (library_item_id, chunk_index, content)
values
  ('55555555-5555-4555-8555-555555555555', 0, 'mango orchard notes belong to user A'),
  ('66666666-6666-4666-8666-666666666666', 0, 'mango banana coastal notes belong to user B')
on conflict (library_item_id, chunk_index) do update set content = excluded.content;

set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
select is((select count(*) from public.library_item_chunks), 1::bigint, 'user A sees only their own chunks');
select is((select count(*) from public.search_library_chunks('mango', 6)), 1::bigint, 'user A search returns their matching chunk');
select is((select count(*) from public.search_library_chunks('banana', 6)), 0::bigint, 'user A search cannot find user B content');
select throws_ok($$insert into public.library_item_chunks (library_item_id, chunk_index, content) values ('66666666-6666-4666-8666-666666666666', 1, 'attempt to write into user B library')$$, '42501', null, 'user A cannot add chunks under user B Library item');

select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}', true);
select is((select count(*) from public.library_item_chunks), 1::bigint, 'user B sees only their own chunks');
select is((select count(*) from public.search_library_chunks('banana', 6)), 1::bigint, 'user B search returns their matching chunk');

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$select * from public.library_item_chunks$$, '42501', null, 'anonymous users cannot read private chunks');
select throws_ok($$select * from public.search_library_chunks('mango', 6)$$, '42501', null, 'anonymous users cannot execute private Library search');

select * from finish();
rollback;
