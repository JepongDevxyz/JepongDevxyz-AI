-- JepongDevxyz AI — private Library chunk search (2026-10-08)
-- Additive/idempotent. Indexed chunks remain account-scoped through parent Library RLS.
create table if not exists public.library_item_chunks (
  id uuid primary key default gen_random_uuid(),
  library_item_id uuid not null references public.library_items(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null check (char_length(content) between 1 and 1000),
  search_vector tsvector generated always as (to_tsvector('simple'::regconfig, coalesce(content,''))) stored,
  created_at timestamptz not null default now(),
  unique (library_item_id, chunk_index)
);
create index if not exists library_item_chunks_search_idx on public.library_item_chunks using gin(search_vector);
create index if not exists library_item_chunks_item_idx on public.library_item_chunks(library_item_id, chunk_index);
alter table public.library_item_chunks enable row level security;
revoke all on public.library_item_chunks from public, anon;
grant select, insert, delete on public.library_item_chunks to authenticated;
drop policy if exists library_item_chunks_owner_select on public.library_item_chunks;
drop policy if exists library_item_chunks_owner_insert on public.library_item_chunks;
drop policy if exists library_item_chunks_owner_delete on public.library_item_chunks;
create policy library_item_chunks_owner_select on public.library_item_chunks for select to authenticated using (exists(select 1 from public.library_items i where i.id=library_item_chunks.library_item_id and i.user_id=auth.uid()));
create policy library_item_chunks_owner_insert on public.library_item_chunks for insert to authenticated with check (exists(select 1 from public.library_items i where i.id=library_item_chunks.library_item_id and i.user_id=auth.uid()));
create policy library_item_chunks_owner_delete on public.library_item_chunks for delete to authenticated using (exists(select 1 from public.library_items i where i.id=library_item_chunks.library_item_id and i.user_id=auth.uid()));
create or replace function public.search_library_chunks(search_query text, result_limit integer default 6)
returns table(library_item_id uuid,file_name text,content text,rank real)
language sql stable security invoker set search_path=public,pg_temp
as $$
with query as (select plainto_tsquery('simple'::regconfig,left(coalesce(search_query,''),512)) terms)
select c.library_item_id,i.file_name,c.content,ts_rank(c.search_vector,query.terms)::real
from public.library_item_chunks c join public.library_items i on i.id=c.library_item_id cross join query
where auth.uid() is not null and nullif(btrim(search_query),'') is not null and c.search_vector @@ query.terms
order by ts_rank(c.search_vector,query.terms) desc,i.created_at desc,c.chunk_index asc
limit greatest(1,least(coalesce(result_limit,6),6));
$$;
revoke all on function public.search_library_chunks(text,integer) from public,anon;
grant execute on function public.search_library_chunks(text,integer) to authenticated;