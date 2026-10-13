-- WOMATE Canopy appreciation communication for Latonia Alicia, with LinkedIn emphasis.
-- Safe whether the earlier appreciation migration has or has not already run.

set lock_timeout='8s';
set statement_timeout='60s';

do $$
declare
  v_latonia uuid;
  v_actor uuid;
  v_count integer;
  v_action_id uuid;
  v_subject text:='We see your positive energy, Latonia';
  v_message text:='Latonia, WOMATE sees and appreciates the positive energy you bring to Canopy. Thank you for being consistently active, engaging with the programme, and especially for the way you connect, encourage and build relationships with others on LinkedIn. We see the effort you make to stay visible, support your fellow learners and keep meaningful conversations going. That kind of engagement helps strengthen both your own professional presence and the wider WOMATE community. Please keep showing up, sharing, learning, connecting and encouraging others. Your consistency, warmth and willingness to engage matter, and we hope you continue carrying this spirit through the rest of the programme and beyond.';
begin
  select count(distinct p.user_id)
  into v_count
  from public.canopy_profiles p
  where lower(regexp_replace(trim(coalesce(p.full_name,'')),'\s+',' ','g'))='latonia alicia';

  if v_count<>1 then
    raise exception 'Preflight failed: expected exactly one Latonia Alicia learner profile, found %. No communication was changed.',v_count;
  end if;

  select distinct p.user_id
  into v_latonia
  from public.canopy_profiles p
  where lower(regexp_replace(trim(coalesce(p.full_name,'')),'\s+',' ','g'))='latonia alicia'
  limit 1;

  if not exists(
    select 1 from public.canopy_enrollments e
    where e.user_id=v_latonia and e.status='active'
  ) then
    raise exception 'Preflight failed: Latonia Alicia does not have an active Canopy enrolment. No communication was changed.';
  end if;

  select x.user_id into v_actor
  from (
    select p.user_id,1 pr from public.canopy_profiles p where p.role='admin'
    union all
    select p.user_id,2 from public.canopy_profiles p where p.role='manager'
    union all
    select m.user_id,3 from public.canopy_staff_memberships m
      where m.status='active' and m.role='programme_manager'
  ) x
  order by x.pr
  limit 1;

  if v_actor is null then
    raise exception 'Preflight failed: no authorised WOMATE Admin/Manager account found.';
  end if;

  select a.id
  into v_action_id
  from public.canopy_manager_actions a
  where a.learner_id=v_latonia
    and a.action_type='feedback'
    and a.subject=v_subject
  order by a.created_at desc,a.id desc
  limit 1;

  if v_action_id is null then
    insert into public.canopy_manager_actions(
      learner_id,action_type,subject,message,status,created_by,resolved_at
    )
    values(v_latonia,'feedback',v_subject,v_message,'resolved',v_actor,now())
    returning id into v_action_id;
  else
    update public.canopy_manager_actions
    set message=v_message,
        status='resolved',
        resolved_at=coalesce(resolved_at,now())
    where id=v_action_id;
  end if;

  -- Keep the learner notification wording aligned even if the manager action
  -- already existed before this migration. The existing insert trigger uses
  -- this fingerprint convention.
  update public.canopy_notifications
  set title=v_subject,
      body=v_message,
      link='/canopy/notifications',
      type='feedback',
      read_at=null
  where user_id=v_latonia
    and fingerprint='manager-action:'||v_action_id::text;

  if not exists(
    select 1 from public.canopy_manager_actions a
    where a.id=v_action_id
      and a.learner_id=v_latonia
      and a.message=v_message
  ) then
    raise exception 'Postflight failed: Latonia LinkedIn appreciation communication did not persist.';
  end if;
end;
$$;

reset lock_timeout;
reset statement_timeout;
