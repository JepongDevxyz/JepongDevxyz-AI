-- Normalize policies when upgrading a project with existing user_settings policies.
drop policy if exists "user settings own all" on public.user_settings;
drop policy if exists "Users can insert own settings" on public.user_settings;
drop policy if exists "Users can read own settings" on public.user_settings;
drop policy if exists "Users can update own settings" on public.user_settings;
create policy "user settings own all" on public.user_settings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Supabase default privileges can add explicit grants to anon/service_role;
-- only authenticated callers need this private search function.
revoke all on function public.search_library_items(text, integer) from public, anon, service_role;
grant execute on function public.search_library_items(text, integer) to authenticated;
