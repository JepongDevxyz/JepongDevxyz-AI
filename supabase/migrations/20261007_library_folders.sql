create table if not exists public.library_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  unique (user_id,name)
);

alter table public.library_folders enable row level security;
revoke all on public.library_folders from anon, authenticated;
grant select, insert, delete on public.library_folders to authenticated;

drop policy if exists "library folders own select" on public.library_folders;
drop policy if exists "library folders own insert" on public.library_folders;
drop policy if exists "library folders own delete" on public.library_folders;
create policy "library folders own select" on public.library_folders for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "library folders own insert" on public.library_folders for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "library folders own delete" on public.library_folders for delete to authenticated
  using ((select auth.uid()) = user_id);

grant update (metadata) on public.library_items to authenticated;
drop policy if exists "library own update" on public.library_items;
create policy "library own update" on public.library_items for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
