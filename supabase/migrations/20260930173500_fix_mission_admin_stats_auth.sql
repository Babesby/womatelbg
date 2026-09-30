-- WOMATE Canopy: repair Mission Admin stats authorization.
-- The project uses canopy_is_manager(uuid); canopy_is_staff(uuid) does not exist.
set lock_timeout='8s';
set statement_timeout='60s';

create or replace function public.canopy_admin_mission_stats()
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  eligible_count integer:=0;
  groups_count integer:=0;
  invited_count integer:=0;
  accepted_count integer:=0;
  waiting_count integer:=0;
  declined_count integer:=0;
  replacement_count integer:=0;
  submitted_count integer:=0;
  verified_count integer:=0;
begin
  if auth.uid() is null or not public.canopy_is_manager(auth.uid()) then
    raise exception 'Programme Manager access required.';
  end if;

  -- Keep the broadened Mission rule: any one manually Completed Module 01-05.
  select count(*) into eligible_count
  from public.canopy_profiles p
  where p.role='learner'
    and public.canopy_mission_eligible(p.user_id);

  select count(*) into groups_count from public.canopy_mission_groups;
  select count(*) into invited_count from public.canopy_mission_group_members where invitation_status='invited';
  select count(*) into accepted_count from public.canopy_mission_group_members where invitation_status='accepted';

  select count(*) into waiting_count
  from public.canopy_profiles p
  where p.role='learner'
    and public.canopy_mission_eligible(p.user_id)
    and not exists(select 1 from public.canopy_mission_exclusions e where e.user_id=p.user_id)
    and not exists(
      select 1 from public.canopy_mission_group_members m
      where m.user_id=p.user_id and m.invitation_status in('invited','accepted')
    );

  select count(*) into declined_count
  from public.canopy_mission_exclusions
  where lower(coalesce(reason,'')) like '%declined%';

  select coalesce(sum(greatest(0,5-coalesce(x.live_seats,0))),0)::integer into replacement_count
  from public.canopy_mission_groups g
  left join (
    select group_id,count(*)::integer live_seats
    from public.canopy_mission_group_members
    where invitation_status in('invited','accepted')
    group by group_id
  ) x on x.group_id=g.id
  where g.status='inviting';

  select count(*) into submitted_count from public.canopy_mission_groups where status='submitted';
  select count(*) into verified_count from public.canopy_mission_groups where status='verified';

  return jsonb_build_object(
    'eligible',eligible_count,
    'groups_formed',groups_count,
    'invited',invited_count,
    'accepted',accepted_count,
    'waiting',waiting_count,
    'declined',declined_count,
    'replacement_needed',replacement_count,
    'submitted',submitted_count,
    'verified',verified_count,
    'updated_at',now()
  );
end;
$$;

revoke all on function public.canopy_admin_mission_stats() from public;
grant execute on function public.canopy_admin_mission_stats() to authenticated;

reset lock_timeout;
reset statement_timeout;
