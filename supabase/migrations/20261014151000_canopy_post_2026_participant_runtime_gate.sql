-- WOMATE Canopy participant runtime safety gate
-- 2026-10-14
-- This migration does not alter Cohort 2 data or runtime.
-- It exposes a small read-only RPC so participant routing can verify that
-- a post-2026 cohort exists and is assigned to the authenticated participant.

set lock_timeout='8s';
set statement_timeout='60s';
begin;

create or replace function public.canopy_my_runtime_cohort()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v jsonb;
begin
  if auth.uid() is null then
    return null;
  end if;

  select jsonb_build_object(
    'cohort_key',c.cohort_key,
    'programme_key',c.programme_key,
    'display_name',c.display_name,
    'cohort_year',c.cohort_year,
    'region',c.region,
    'access_model',c.access_model,
    'status',c.status,
    'membership_status',m.status
  )
  into v
  from public.canopy_cohort_memberships m
  join public.canopy_programme_cohorts c on c.cohort_key=m.cohort_key
  where m.user_id=auth.uid()
    and m.status='active'
    and c.cohort_year>=2027
  order by c.cohort_year desc,m.joined_at desc
  limit 1;

  return v;
end;
$$;

revoke all on function public.canopy_my_runtime_cohort() from public;
grant execute on function public.canopy_my_runtime_cohort() to authenticated;

commit;
reset lock_timeout;
reset statement_timeout;
