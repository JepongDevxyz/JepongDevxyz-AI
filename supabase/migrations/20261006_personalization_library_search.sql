-- Keep per-user personalization and Library search in Supabase, protected by RLS.
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  personalization jsonb not null default '{}'::jsonb,
  appearance jsonb not null default '{}'::jsonb,
  voice jsonb not null default '{}'::jsonb,
  pet jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_settings add column if not exists personalization jsonb not null default '{}'::jsonb;
alter table public.user_settings add column if not exists appearance jsonb not null default '{}'::jsonb;
alter table public.user_settings add column if not exists voice jsonb not null default '{}'::jsonb;
alter table public.user_settings add column if not exists pet jsonb not null default '{}'::jsonb;
alter table public.user_settings add column if not exists preferences jsonb not null default '{}'::jsonb;
alter table public.user_settings add column if not exists updated_at timestamptz not null default now();
alter table public.user_settings enable row level security;
drop policy if exists "user settings own all" on public.user_settings;
create policy "user settings own all" on public.user_settings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.user_settings to authenticated;

alter table public.library_items add column if not exists search_text text not null default '';
alter table public.library_items add column if not exists search_vector tsvector
  generated always as (to_tsvector('simple', coalesce(file_name, '') || ' ' || coalesce(search_text, ''))) stored;
create index if not exists library_items_search_vector_idx on public.library_items using gin (search_vector);

create or replace function public.search_library_items(search_query text, result_limit integer default 5)
returns table(file_name text, snippet text)
language sql
stable
security invoker
set search_path = public
as $$
  with query as (
    select plainto_tsquery('simple', left(coalesce(search_query, ''), 500)) as terms
  )
  select item.file_name,
         coalesce(
           nullif(ts_headline('simple', coalesce(item.search_text, ''), query.terms,
             'StartSel=<mark>,StopSel=</mark>,MaxFragments=2,MinWords=4,MaxWords=32'), ''),
           item.file_name
         ) as snippet
    from public.library_items as item
    cross join query
   where auth.uid() is not null
     and item.user_id = auth.uid()
     and numnode(query.terms) > 0
     and item.search_vector @@ query.terms
   order by ts_rank_cd(item.search_vector, query.terms) desc, item.created_at desc
   limit greatest(1, least(coalesce(result_limit, 5), 5));
$$;
revoke all on function public.search_library_items(text, integer) from public, anon, service_role;
grant execute on function public.search_library_items(text, integer) to authenticated;
