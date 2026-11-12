-- Allow 2027 certified graduates to use the unchanged Cohort 2 quarterly alumni check-in.
-- The private verification function includes approved 2026 graduates and issued 2027 certificates.
drop policy if exists alumni_checkins_insert_own on public.womate_alumni_checkins;
create policy alumni_checkins_insert_own on public.womate_alumni_checkins
 for insert to authenticated with check (
 user_id=(select auth.uid()) and private.womate_is_verified_graduate((select auth.uid()))
 );
drop policy if exists alumni_checkins_update_own on public.womate_alumni_checkins;
create policy alumni_checkins_update_own on public.womate_alumni_checkins
 for update to authenticated using (
 user_id=(select auth.uid()) and private.womate_is_verified_graduate((select auth.uid()))
 ) with check (
 user_id=(select auth.uid()) and private.womate_is_verified_graduate((select auth.uid()))
 );
create or replace function public.womate_my_graduate_eligibility()
 returns boolean language sql stable security definer
 set search_path=public,auth,private,pg_temp as $$
 select auth.uid() is not null and private.womate_is_verified_graduate(auth.uid());
$$;
revoke all on function public.womate_my_graduate_eligibility() from public,anon;
grant execute on function public.womate_my_graduate_eligibility() to authenticated;
