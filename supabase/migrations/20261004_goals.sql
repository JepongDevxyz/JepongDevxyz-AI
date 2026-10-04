-- JepongDevxyz AI — Goals tables migration v2 (2026-10-04)
-- Full Muse-app parity: emoji, category, goal kind, value alignment,
-- current_state pulse, subgoals (parent_goal_id), activity timeline entries.
-- Run this in Supabase SQL Editor. Idempotent: safe to re-run.

-- 1) Base table first (all columns) — works on fresh installs
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text,
  target_date date,
  progress int not null default 0 check (progress >= 0 and progress <= 100),
  status text not null default 'active' check (status in ('active','completed')),
  reminder_time time,
  reminder_days text,
  emoji text,
  category text,
  goal_kind text,
  value_alignment text,
  current_state text,
  parent_goal_id uuid references public.goals(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Idempotent upgrades for installs that already ran v1
alter table public.goals add column if not exists emoji text;
alter table public.goals add column if not exists category text;
alter table public.goals add column if not exists goal_kind text;
alter table public.goals add column if not exists value_alignment text;
alter table public.goals add column if not exists current_state text;
-- parent_goal_id needs a DO block: ADD COLUMN IF NOT EXISTS cannot carry REFERENCES inline on all versions
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'goals' and column_name = 'parent_goal_id'
  ) then
    alter table public.goals add column parent_goal_id uuid references public.goals(id) on delete set null;
  end if;
end $$;

-- 3) v1 used ('active','completed','paused'); Muse parity = active/completed only.
update public.goals set status = 'active' where status = 'paused';
alter table public.goals drop constraint if exists goals_status_check;
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'goals' and constraint_name = 'goals_status_check'
  ) then
    alter table public.goals add constraint goals_status_check check (status in ('active','completed'));
  end if;
end $$;

-- 4) RLS + grants
alter table public.goals enable row level security;
drop policy if exists "Users manage own goals" on public.goals;
create policy "Users manage own goals" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.goals to service_role;
grant select, insert, update, delete on public.goals to authenticated;

-- 5) Activity timeline entries (Muse-style: dated progress entries)
create table if not exists public.goal_entries (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text,
  current_state text,
  effective_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.goal_entries enable row level security;
drop policy if exists "Users manage own goal entries" on public.goal_entries;
create policy "Users manage own goal entries" on public.goal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.goal_entries to service_role;
grant select, insert, update, delete on public.goal_entries to authenticated;
create index if not exists goal_entries_goal_id_idx on public.goal_entries(goal_id);
