-- WOMATE 2027 cohort routing foundation, Phase 2
set lock_timeout='8s';
set statement_timeout='60s';
begin;

create or replace function public.canopy_admin_set_cohort_membership(
  p_user_id uuid,p_cohort_key text,p_status text default 'active'
)
returns public.canopy_cohort_memberships
language plpgsql security definer set search_path=public,auth
as $$
declare r public.canopy_cohort_memberships%rowtype;
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then raise exception 'Only WOMATE Admin can assign cohort membership.'; end if;
  if p_status not in ('pending','active','paused','completed','withdrawn','inactive') then raise exception 'Unsupported cohort membership status.'; end if;
  if not exists(select 1 from public.canopy_programme_cohorts c where c.cohort_key=p_cohort_key) then raise exception 'Unknown Canopy cohort.'; end if;
  if not exists(select 1 from public.canopy_profiles p where p.user_id=p_user_id and p.role='learner') then raise exception 'The selected account is not a Canopy learner.'; end if;

  if p_status='active' and exists(
    select 1
    from public.canopy_cohort_memberships m
    join public.canopy_programme_cohorts c on c.cohort_key=m.cohort_key
    where m.user_id=p_user_id and c.cohort_year=2027 and m.cohort_key<>p_cohort_key and m.status='active'
  ) then
    raise exception 'This learner already has another active 2027 cohort. Pause or complete it before activating a different 2027 cohort.';
  end if;

  insert into public.canopy_cohort_memberships(user_id,cohort_key,status,source,joined_at,metadata)
  values(p_user_id,p_cohort_key,p_status,'admin',now(),jsonb_build_object('assigned_by',auth.uid()))
  on conflict(user_id,cohort_key) do update set
    status=excluded.status,updated_at=now(),
    completed_at=case when excluded.status='completed' then coalesce(public.canopy_cohort_memberships.completed_at,now()) else public.canopy_cohort_memberships.completed_at end,
    withdrawn_at=case when excluded.status='withdrawn' then coalesce(public.canopy_cohort_memberships.withdrawn_at,now()) else null end,
    metadata=coalesce(public.canopy_cohort_memberships.metadata,'{}'::jsonb)||jsonb_build_object('last_assigned_by',auth.uid())
  returning * into r;
  return r;
end;
$$;
revoke all on function public.canopy_admin_set_cohort_membership(uuid,text,text) from public;
grant execute on function public.canopy_admin_set_cohort_membership(uuid,text,text) to authenticated;

create or replace function public.canopy_my_active_cohort()
returns jsonb language sql stable security definer set search_path=public,auth
as $$
  select coalesce((
    select jsonb_build_object(
      'cohort_key',c.cohort_key,'display_name',c.display_name,'programme_key',c.programme_key,
      'cohort_year',c.cohort_year,'region',c.region,'access_model',c.access_model,'cohort_status',c.status,
      'membership_status',m.status,'starts_at',c.starts_at,'ends_at',c.ends_at,'timezone',c.timezone
    )
    from public.canopy_cohort_memberships m
    join public.canopy_programme_cohorts c on c.cohort_key=m.cohort_key
    where m.user_id=auth.uid() and m.status='active'
    order by case when c.cohort_year=2027 then 0 else 1 end,c.cohort_year desc,m.updated_at desc
    limit 1
  ),'null'::jsonb);
$$;
revoke all on function public.canopy_my_active_cohort() from public;
grant execute on function public.canopy_my_active_cohort() to authenticated;

commit;
reset lock_timeout;
reset statement_timeout;
