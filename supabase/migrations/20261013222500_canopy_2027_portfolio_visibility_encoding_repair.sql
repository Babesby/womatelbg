-- WOMATE Canopy - 2027 portfolio manager visibility repair
-- 2026-10-13
-- Additive function replacement only. No Cohort 2 data mutation.

set lock_timeout='8s';
set statement_timeout='60s';
begin;

create or replace function public.canopy_admin_2027_portfolio()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_profile_role text;
  v_staff_role text;
begin
  if auth.uid() is null then
    raise exception 'Sign in to continue.';
  end if;

  select p.role into v_profile_role
  from public.canopy_profiles p
  where p.user_id=auth.uid()
  limit 1;

  begin
    v_staff_role := public.canopy_staff_role(auth.uid());
  exception when undefined_function then
    v_staff_role := null;
  end;

  if not (
    public.canopy_is_womate_admin(auth.uid())
    or coalesce(v_profile_role,'') in ('admin','manager')
    or coalesce(v_staff_role,'')='programme_manager'
  ) then
    raise exception 'WOMATE management access required to view the 2027 portfolio.';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'cohort_key',c.cohort_key,
        'display_name',c.display_name,
        'programme_key',c.programme_key,
        'year',c.cohort_year,
        'region',c.region,
        'access_model',c.access_model,
        'status',c.status,
        'competitive_entry',c.competitive_entry,
        'installments_allowed',c.installments_allowed,
        'capacity',c.capacity,
        'starts_at',c.starts_at,
        'ends_at',c.ends_at,
        'audience_criteria',c.audience_criteria,
        'delivery_rules',c.delivery_rules
      )
      order by c.display_name
    )
    from public.canopy_programme_cohorts c
    where c.cohort_year=2027
  ),'[]'::jsonb);
end;
$$;

revoke all on function public.canopy_admin_2027_portfolio() from public;
grant execute on function public.canopy_admin_2027_portfolio() to authenticated;

commit;
reset lock_timeout;
reset statement_timeout;
