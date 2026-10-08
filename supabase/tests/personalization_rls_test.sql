begin;

select plan(6);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
values
  ('11111111-1111-4111-8111-111111111111', null, 'authenticated', 'authenticated', 'personalization-user-a@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), false, false),
  ('22222222-2222-4222-8222-222222222222', null, 'authenticated', 'authenticated', 'personalization-user-b@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), false, false)
on conflict (id) do nothing;

insert into public.user_settings (user_id, personalization)
values
  ('11111111-1111-4111-8111-111111111111', '{"baseStyle":"Friendly"}'::jsonb),
  ('22222222-2222-4222-8222-222222222222', '{"baseStyle":"Candid"}'::jsonb)
on conflict (user_id) do update set personalization = excluded.personalization;

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select is((select count(*) from public.user_settings), 1::bigint, 'user A sees only the owned settings row');
select lives_ok($$update public.user_settings set personalization = '{"baseStyle":"Efficient"}'::jsonb where user_id = '11111111-1111-4111-8111-111111111111'$$, 'user A can update owned settings');
select throws_ok($$insert into public.user_settings (user_id, personalization) values ('22222222-2222-4222-8222-222222222222', '{}'::jsonb)$$, '42501', null, 'user A cannot insert settings for user B');
select is((select count(*) from public.user_settings where user_id = '22222222-2222-4222-8222-222222222222'), 0::bigint, 'user A cannot read user B settings');

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
select is((select count(*) from public.user_settings), 1::bigint, 'user B sees only the owned settings row');

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is((select count(*) from public.user_settings), 0::bigint, 'anonymous requests cannot read settings');

select * from finish();
rollback;
