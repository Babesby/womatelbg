-- WOMATE Canopy cohort-context admin architecture
-- 2026-10-13
-- Admin-only cohort catalog + repair of overly broad 2027 portfolio access.
-- No Cohort 2 learner data is changed.

set lock_timeout='8s';
set statement_timeout='60s';
begin;

create or replace function public.canopy_admin_cohort_catalog()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'WOMATE Admin access required.';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'cohort_key',c.cohort_key,
        'programme_key',c.programme_key,
        'display_name',c.display_name,
        'cohort_year',c.cohort_year,
        'cohort_number',c.cohort_number,
        'region',c.region,
        'access_model',c.access_model,
        'status',c.status,
        'member_count',coalesce(m.member_count,0),
        'active_count',coalesce(m.active_count,0),
        'member_ids',coalesce(m.member_ids,'[]'::jsonb)
      )
      order by c.cohort_year desc,c.display_name
    )
    from public.canopy_programme_cohorts c
    left join lateral (
      select
        count(*)::integer member_count,
        count(*) filter(where cm.status='active')::integer active_count,
        coalesce(jsonb_agg(cm.user_id order by cm.joined_at),'[]'::jsonb) member_ids
      from public.canopy_cohort_memberships cm
      where cm.cohort_key=c.cohort_key
        and cm.status not in ('withdrawn','inactive')
    ) m on true
  ),'[]'::jsonb);
end;
$$;

revoke all on function public.canopy_admin_cohort_catalog() from public;
grant execute on function public.canopy_admin_cohort_catalog() to authenticated;

-- Re-tighten the old portfolio RPC. A previous repair temporarily widened this
-- to manager/programme-manager identities. The cohort control plane is admin-only.
create or replace function public.canopy_admin_2027_portfolio()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'Only WOMATE Admin can view the 2027 portfolio.';
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
