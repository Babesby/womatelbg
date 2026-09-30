-- WOMATE Canopy mission access and pairing follow-up.
-- Eligibility: at least one Module 01-05 assignment manually marked Completed.
-- Pairing: prefer country diversity, but do not block groups when five countries are unavailable.
-- Invitations unanswered for 24 hours are released and refilled from the eligible waiting pool.

set lock_timeout='8s';
set statement_timeout='120s';

create or replace function public.canopy_mission_eligible(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path=public,auth
as $$
  with latest as (
    select distinct on (s.week_key)
      s.week_key,
      s.assessment_status,
      s.review_source
    from public.canopy_assignment_submissions s
    where s.user_id=p_user
      and s.week_key in ('module-01','module-02','module-03','module-04','module-05')
    order by s.week_key, coalesce(s.attempt_no,1) desc, s.submitted_at desc nulls last, s.id desc
  )
  select
    exists(
      select 1 from latest
      where assessment_status='completed' and review_source='manual'
    )
    and exists(
      select 1 from public.canopy_profiles p
      where p.user_id=p_user
        and p.role='learner'
        and nullif(trim(coalesce(p.country,'')),'') is not null
    );
$$;
revoke all on function public.canopy_mission_eligible(uuid) from public;

-- Keep the legacy helper name because existing learner/admin RPCs call it.
create or replace function public.canopy_module1_mission_eligible(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path=public,auth
as $$
  select public.canopy_mission_eligible(p_user);
$$;
revoke all on function public.canopy_module1_mission_eligible(uuid) from public;

create or replace function public.canopy_refill_mission_seat(p_group uuid,p_seat integer,p_mission integer)
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  rec record;
begin
  -- Prefer a country not already represented in the live group.
  select p.user_id,p.country into rec
  from public.canopy_profiles p
  where p.role='learner'
    and public.canopy_mission_eligible(p.user_id)
    and not exists(select 1 from public.canopy_mission_exclusions e where e.user_id=p.user_id)
    and not exists(
      select 1 from public.canopy_mission_group_members x
      where x.user_id=p.user_id and x.invitation_status in('invited','accepted')
    )
    and not exists(
      select 1 from public.canopy_mission_group_members x
      where x.group_id=p_group
        and x.invitation_status in('invited','accepted')
        and lower(trim(x.country))=lower(trim(p.country))
    )
  order by random()
  limit 1;

  -- If country diversity would block the group, fill the seat with any eligible learner.
  if rec.user_id is null then
    select p.user_id,p.country into rec
    from public.canopy_profiles p
    where p.role='learner'
      and public.canopy_mission_eligible(p.user_id)
      and not exists(select 1 from public.canopy_mission_exclusions e where e.user_id=p.user_id)
      and not exists(
        select 1 from public.canopy_mission_group_members x
        where x.user_id=p.user_id and x.invitation_status in('invited','accepted')
      )
    order by random()
    limit 1;
  end if;

  if rec.user_id is null then return false; end if;

  delete from public.canopy_mission_group_members
  where group_id=p_group and seat_no=p_seat and invitation_status<>'accepted';

  insert into public.canopy_mission_group_members(group_id,user_id,country,seat_no,mission_no)
  values(p_group,rec.user_id,rec.country,p_seat,p_mission);

  update public.canopy_mission_groups
  set status='inviting',updated_at=now()
  where id=p_group and status='active';

  perform public.canopy_notify_mission_invite(p_group,rec.user_id);
  return true;
end;
$$;
revoke all on function public.canopy_refill_mission_seat(uuid,integer,integer) from public;

create or replace function public.canopy_try_form_mission_groups()
returns integer
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  formed integer:=0;
  g uuid;
  rec record;
  seat integer;
  picked integer;
  missing_seat integer;
  did_refill boolean;
  stale record;
begin
  perform pg_advisory_xact_lock(hashtext('womate_canopy_mission_autopair')::bigint);

  -- Release invitations left unanswered for more than 24 hours.
  -- Accepted members remain in place; only the inactive seat is replaced.
  for stale in
    select m.id,m.group_id,m.user_id,m.seat_no,m.mission_no
    from public.canopy_mission_group_members m
    join public.canopy_mission_groups cg on cg.id=m.group_id
    where m.invitation_status='invited'
      and m.invited_at <= now()-interval '24 hours'
      and cg.status='inviting'
    order by m.invited_at
  loop
    update public.canopy_mission_group_members
    set invitation_status='replaced',responded_at=now()
    where id=stale.id and invitation_status='invited';

    insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
    values(
      stale.user_id,
      'mission_invite_expired',
      'Your Canopy Mission invitation expired',
      'Your mission invitation was not accepted within 24 hours, so the seat has been released to keep the group moving. If you still want to participate, contact WOMATE through Help & complaints.',
      '/canopy/help',
      'mission-invite-expired:'||stale.id::text
    )
    on conflict(fingerprint) do nothing;

    did_refill:=public.canopy_refill_mission_seat(stale.group_id,stale.seat_no,stale.mission_no);
  end loop;

  -- Refill any other incomplete inviting groups before creating new groups.
  for g in
    select cg.id
    from public.canopy_mission_groups cg
    where cg.status='inviting'
    order by cg.created_at
  loop
    for missing_seat in 1..5 loop
      if not exists(
        select 1 from public.canopy_mission_group_members m
        where m.group_id=g and m.seat_no=missing_seat and m.invitation_status in('invited','accepted')
      ) then
        did_refill:=public.canopy_refill_mission_seat(g,missing_seat,missing_seat);
      end if;
    end loop;
  end loop;

  -- Form groups whenever five eligible ungrouped learners exist.
  -- The ranking spreads countries first, then allows duplicates if necessary.
  loop
    select count(*) into picked
    from public.canopy_profiles p
    where p.role='learner'
      and public.canopy_mission_eligible(p.user_id)
      and not exists(select 1 from public.canopy_mission_exclusions e where e.user_id=p.user_id)
      and not exists(
        select 1 from public.canopy_mission_group_members mm
        where mm.user_id=p.user_id and mm.invitation_status in('invited','accepted')
      )
      and not exists(
        select 1 from public.canopy_mission_group_members oldm
        where oldm.user_id=p.user_id and oldm.invitation_status='replaced'
      );
    exit when picked<5;

    insert into public.canopy_mission_groups default values returning id into g;
    seat:=0;

    for rec in
      select user_id,country,full_name
      from (
        select p.user_id,p.country,p.full_name,
          row_number() over(partition by lower(trim(p.country)) order by random()) as country_rank
        from public.canopy_profiles p
        where p.role='learner'
          and public.canopy_mission_eligible(p.user_id)
          and not exists(select 1 from public.canopy_mission_exclusions e where e.user_id=p.user_id)
          and not exists(
            select 1 from public.canopy_mission_group_members mm
            where mm.user_id=p.user_id and mm.invitation_status in('invited','accepted')
          )
          and not exists(
            select 1 from public.canopy_mission_group_members oldm
            where oldm.user_id=p.user_id and oldm.invitation_status='replaced'
          )
      ) q
      order by country_rank,random()
      limit 5
    loop
      seat:=seat+1;
      insert into public.canopy_mission_group_members(group_id,user_id,country,seat_no,mission_no)
      values(g,rec.user_id,rec.country,seat,seat);
      perform public.canopy_notify_mission_invite(g,rec.user_id);
    end loop;

    if seat<5 then
      delete from public.canopy_mission_groups where id=g;
      exit;
    end if;
    formed:=formed+1;
  end loop;

  return formed;
end;
$$;
revoke all on function public.canopy_try_form_mission_groups() from public;

-- Learner Mission visits also perform a cheap maintenance check. This makes
-- 24-hour seat replacement self-healing without requiring a staff action.
create or replace function public.canopy_get_my_mission_hub()
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  m public.canopy_mission_group_members%rowtype;
  g public.canopy_mission_groups%rowtype;
  eligible boolean:=false;
  result jsonb;
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  eligible:=public.canopy_mission_eligible(auth.uid());

  if exists(
       select 1
       from public.canopy_mission_group_members x
       join public.canopy_mission_groups cg on cg.id=x.group_id
       where x.invitation_status='invited'
         and x.invited_at<=now()-interval '24 hours'
         and cg.status='inviting'
     )
     or (
       eligible and not exists(
         select 1 from public.canopy_mission_group_members x
         where x.user_id=auth.uid() and x.invitation_status in('invited','accepted')
       )
     ) then
    perform public.canopy_try_form_mission_groups();
  end if;

  select * into m
  from public.canopy_mission_group_members
  where user_id=auth.uid() and invitation_status in('invited','accepted')
  order by invited_at desc limit 1;

  if m.id is null then
    return jsonb_build_object('eligible',eligible,'state',case when eligible then 'waiting' else 'locked' end);
  end if;

  select * into g from public.canopy_mission_groups where id=m.group_id;
  result:=jsonb_build_object(
    'eligible',eligible,'state',m.invitation_status,'member',to_jsonb(m),'group',to_jsonb(g),
    'members',case when m.invitation_status='accepted' then coalesce((select jsonb_agg(jsonb_build_object('user_id',x.user_id,'name',coalesce(p.full_name,'Learner'),'country',x.country,'seat_no',x.seat_no,'mission_no',x.mission_no,'status',x.invitation_status) order by x.seat_no) from public.canopy_mission_group_members x left join public.canopy_profiles p on p.user_id=x.user_id where x.group_id=m.group_id and x.invitation_status in('invited','accepted')),'[]'::jsonb) else '[]'::jsonb end,
    'messages',case when m.invitation_status='accepted' then coalesce((select jsonb_agg(z order by z.created_at) from (select msg.id,msg.body,msg.created_at,msg.user_id,coalesce(p.full_name,'Learner') sender_name from public.canopy_mission_messages msg left join public.canopy_profiles p on p.user_id=msg.user_id where msg.group_id=m.group_id order by msg.created_at desc limit 80) z),'[]'::jsonb) else '[]'::jsonb end,
    'reports',case when m.invitation_status='accepted' then coalesce((select jsonb_agg(jsonb_build_object('user_id',r.user_id,'mission_no',r.mission_no,'summary',r.summary,'proof_url',r.proof_url,'submitted_at',r.submitted_at,'name',coalesce(p.full_name,'Learner')) order by r.mission_no) from public.canopy_mission_reports r left join public.canopy_profiles p on p.user_id=r.user_id where r.group_id=m.group_id),'[]'::jsonb) else '[]'::jsonb end
  );
  return result;
end;
$$;
revoke all on function public.canopy_get_my_mission_hub() from public;
grant execute on function public.canopy_get_my_mission_hub() to authenticated;

-- Autopair after ANY Module 01-05 assignment is manually completed.
create or replace function public.canopy_autopair_after_module1_completed()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if new.week_key in ('module-01','module-02','module-03','module-04','module-05')
     and new.assessment_status='completed'
     and new.review_source='manual' then
    if tg_op='INSERT' then
      perform public.canopy_try_form_mission_groups();
    elsif old.assessment_status is distinct from new.assessment_status
       or old.review_source is distinct from new.review_source
       or old.week_key is distinct from new.week_key then
      perform public.canopy_try_form_mission_groups();
    end if;
  end if;
  return new;
end;
$$;

-- Keep country/profile changes able to unlock pairing for any completed module.
create or replace function public.canopy_autopair_after_profile_country_change()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_changed boolean:=false;
begin
  if tg_op='INSERT' then
    v_changed:=true;
  else
    v_changed:=old.country is distinct from new.country or old.role is distinct from new.role;
  end if;

  if v_changed
     and new.role='learner'
     and nullif(trim(coalesce(new.country,'')),'') is not null
     and public.canopy_mission_eligible(new.user_id)
     and not exists(select 1 from public.canopy_mission_exclusions e where e.user_id=new.user_id)
     and not exists(
       select 1 from public.canopy_mission_group_members m
       where m.user_id=new.user_id and m.invitation_status in('invited','accepted')
     ) then
    perform public.canopy_try_form_mission_groups();
  end if;
  return new;
end;
$$;
revoke all on function public.canopy_autopair_after_profile_country_change() from public;

-- Admin mission stats now use the broader eligibility rule and also perform
-- lightweight maintenance so 24-hour replacements are processed when staff opens Missions.
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
  if auth.uid() is null or not public.canopy_is_staff(auth.uid()) then
    raise exception 'Staff access required.';
  end if;

  perform public.canopy_try_form_mission_groups();

  select count(*) into eligible_count
  from public.canopy_profiles p
  where p.role='learner' and public.canopy_mission_eligible(p.user_id);

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
    )
    and not exists(
      select 1 from public.canopy_mission_group_members oldm
      where oldm.user_id=p.user_id and oldm.invitation_status='replaced'
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
    'eligible',eligible_count,'groups_formed',groups_count,'invited',invited_count,
    'accepted',accepted_count,'waiting',waiting_count,'declined',declined_count,
    'replacement_needed',replacement_count,'submitted',submitted_count,
    'verified',verified_count,'updated_at',now()
  );
end;
$$;
revoke all on function public.canopy_admin_mission_stats() from public;
grant execute on function public.canopy_admin_mission_stats() to authenticated;

-- Run the broader eligibility backfill immediately.
select public.canopy_try_form_mission_groups();

-- Respond to and resolve the Mission complaints supplied to WOMATE on 29-30 Sep 2026.
-- Responses are intentionally specific to the access/pairing fix above.
with target as (
  select a.id,
    case
      when lower(trim(coalesce(p.full_name,'')))='elva achieng'
           and lower(coalesce(a.subject,'')) like '%finding my mission team members%'
      then 'We have updated the Mission matching system. Members who already accepted remain in their team, while invitations left unanswered for more than 24 hours are released and the open seats are refilled from eligible learners. Please reopen your private Mission team and notifications to see any replacement members as they are matched.'
      else 'Your Mission access has been refreshed. Mission eligibility now requires at least one Canopy module manually marked Completed, rather than specifically Module 01. Pairing has been rerun using your current learner profile and country. Please reopen Missions and your notifications. If you are still in the waiting pool, Canopy will place you into the next available five-person team automatically.'
    end as response_text
  from public.canopy_manager_actions a
  left join public.canopy_profiles p on p.user_id=a.learner_id
  where a.action_type='complaint'
    and a.status='open'
    and (
      (lower(trim(coalesce(p.full_name,'')))='lezinart dickson' and lower(coalesce(a.subject,'')) like '%mission%')
      or (lower(trim(coalesce(p.full_name,'')))='elva achieng' and lower(coalesce(a.subject,'')) like '%mission%')
      or (lower(trim(coalesce(p.full_name,'')))='karabo ellen balekanye' and lower(coalesce(a.subject,'')) like '%mission%')
      or (lower(trim(coalesce(p.full_name,'')))='ludess bonongwe' and lower(coalesce(a.subject,'')) like '%mission%')
      or (lower(trim(coalesce(p.full_name,'')))='tami pascoe' and lower(coalesce(a.subject,'')) like '%mission%')
      or (lower(trim(coalesce(p.full_name,'')))='wada goitsemang' and lower(coalesce(a.subject,'')) like '%mission%')
      or (
        lower(trim(coalesce(a.subject,'')))='mission project'
        and lower(coalesce(a.message,'')) like '%completed%module%'
      )
    )
)
update public.canopy_manager_actions a
set response_message=target.response_text,
    responded_at=now(),
    status='resolved',
    resolved_at=now()
from target
where a.id=target.id;

reset lock_timeout;
reset statement_timeout;
