-- JepongDevxyz AI — per-user usage stats in Supabase.
-- Replaces the localStorage counters (jepong_word_count / jepong_query_count):
-- words and queries are now synced per account, not per device.
-- Run in the Supabase SQL editor.

create table if not exists public.usage_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  words bigint not null default 0,
  queries bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.usage_stats enable row level security;

drop policy if exists "Users read own usage" on public.usage_stats;
create policy "Users read own usage" on public.usage_stats
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert own usage" on public.usage_stats;
create policy "Users insert own usage" on public.usage_stats
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users update own usage" on public.usage_stats;
create policy "Users update own usage" on public.usage_stats
  for update using (auth.uid() = user_id);

-- Atomic increment, called by the service role (one round trip, no races).
create or replace function public.add_usage_stats(p_uid uuid, p_words bigint, p_queries bigint)
returns void
language plpgsql
as $$
begin
  insert into public.usage_stats(user_id, words, queries, updated_at)
  values (p_uid, greatest(p_words, 0), greatest(p_queries, 0), now())
  on conflict (user_id) do update set
    words = public.usage_stats.words + greatest(p_words, 0),
    queries = public.usage_stats.queries + greatest(p_queries, 0),
    updated_at = now();
end
$$;
