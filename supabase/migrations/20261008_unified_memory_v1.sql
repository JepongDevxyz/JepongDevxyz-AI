-- JepongDevxyz AI — Unified account-scoped memory v1 (2026-10-08)
-- Additive/idempotent. Existing memory_summary rows are preserved.
alter table public.memories add column if not exists category text not null default 'general';
alter table public.memories add column if not exists origin text not null default 'explicit';
alter table public.memories add column if not exists confidence numeric not null default 1;
alter table public.memories add column if not exists pinned boolean not null default false;
alter table public.memories add column if not exists source_conversation_id uuid null;
alter table public.memories add column if not exists deleted_at timestamptz null;

create index if not exists memories_user_pinned_updated_idx
  on public.memories(user_id, pinned desc, updated_at desc);

drop policy if exists "memories own all" on public.memories;
create policy "memories own all" on public.memories
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.memories to authenticated;
revoke all on public.memories from anon;

-- Keep updated_at truthful for edits.
create or replace function public.touch_memories_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
drop trigger if exists memories_touch_updated_at on public.memories;
create trigger memories_touch_updated_at
before update on public.memories
for each row execute function public.touch_memories_updated_at();
