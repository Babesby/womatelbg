-- WOMATE Canopy Phase 2 follow-up
-- 1) Remove the Abena Mansa test membership and refill that seat.
-- 2) Make decline/replacement reliable.
-- 3) Automatically form/refill cross-country groups as Module 01 learners become manually Completed.

set lock_timeout='8s';
set statement_timeout='90s';

create table if not exists public.canopy_mission_exclusions(
  user_id uuid primary key,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.canopy_mission_exclusions enable row level security;
revoke all on public.canopy_mission_exclusions from anon, authenticated;

create or replace function public.canopy_refill_mission_seat(p_group uuid,p_seat integer,p_mission integer)
returns boolean language plpgsql security definer set search_path=public,auth as $$
declare rec record;
begin
  select p.user_id,p.country into rec
  from public.canopy_profiles p
  where p.role='learner'
    and public.canopy_module1_mission_eligible(p.user_id)
    and not exists(select 1 from public.canopy_mission_exclusions e where e.user_id=p.user_id)
    and not exists(select 1 from public.canopy_mission_group_members x where x.user_id=p.user_id)
    and not exists(
      select 1 from public.canopy_mission_group_members x
      where x.group_id=p_group
        and x.invitation_status in('invited','accepted')
        and lower(trim(x.country))=lower(trim(p.country))
    )
  order by random() limit 1;

  if rec.user_id is null then return false; end if;

  delete from public.canopy_mission_group_members
  where group_id=p_group and seat_no=p_seat and invitation_status not in('accepted');

  insert into public.canopy_mission_group_members(group_id,user_id,country,seat_no,mission_no)
  values(p_group,rec.user_id,rec.country,p_seat,p_mission);

  update public.canopy_mission_groups
  set status='inviting',updated_at=now()
  where id=p_group and status='active';

  perform public.canopy_notify_mission_invite(p_group,rec.user_id);
  return true;
end;$$;
revoke all on function public.canopy_refill_mission_seat(uuid,integer,integer) from public;

create or replace function public.canopy_try_form_mission_groups()
returns integer language plpgsql security definer set search_path=public,auth as $$
declare
  formed integer:=0;
  g uuid;
  rec record;
  seat integer;
  picked integer;
  missing_seat integer;
  did_refill boolean;
begin
  -- First refill incomplete inviting groups before creating new groups.
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

  -- Then create new full five-country groups whenever enough eligible learners exist.
  loop
    select count(*) into picked from (
      select distinct lower(trim(p.country)) c
      from public.canopy_profiles p
      where p.role='learner'
        and public.canopy_module1_mission_eligible(p.user_id)
        and not exists(select 1 from public.canopy_mission_exclusions e where e.user_id=p.user_id)
        and not exists(select 1 from public.canopy_mission_group_members mm where mm.user_id=p.user_id)
    ) q;
    exit when picked<5;

    insert into public.canopy_mission_groups default values returning id into g;
    seat:=0;
    for rec in
      select * from (
        select distinct on(lower(trim(p.country))) p.user_id,p.country,p.full_name
        from public.canopy_profiles p
        where p.role='learner'
          and public.canopy_module1_mission_eligible(p.user_id)
          and not exists(select 1 from public.canopy_mission_exclusions e where e.user_id=p.user_id)
          and not exists(select 1 from public.canopy_mission_group_members mm where mm.user_id=p.user_id)
        order by lower(trim(p.country)),random()
      ) d order by random() limit 5
    loop
      seat:=seat+1;
      insert into public.canopy_mission_group_members(group_id,user_id,country,seat_no,mission_no)
      values(g,rec.user_id,rec.country,seat,seat);
      perform public.canopy_notify_mission_invite(g,rec.user_id);
    end loop;
    if seat<5 then delete from public.canopy_mission_groups where id=g; exit; end if;
    formed:=formed+1;
  end loop;
  return formed;
end;$$;
revoke all on function public.canopy_try_form_mission_groups() from public;

create or replace function public.canopy_respond_mission_invite(p_accept boolean)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare m public.canopy_mission_group_members%rowtype; accepted_count integer; replacement boolean;
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  select * into m from public.canopy_mission_group_members
  where user_id=auth.uid() and invitation_status='invited'
  order by invited_at desc limit 1 for update;
  if m.id is null then raise exception 'No active mission invitation was found.'; end if;

  if p_accept then
    update public.canopy_mission_group_members set invitation_status='accepted',responded_at=now() where id=m.id;
    select count(*) into accepted_count from public.canopy_mission_group_members where group_id=m.group_id and invitation_status='accepted';
    if accepted_count=5 then
      update public.canopy_mission_groups set status='active',updated_at=now() where id=m.group_id;
      insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
      select user_id,'mission_group_ready','Your Canopy Mission team is ready',
        'All five members have accepted. Open your private mission group, meet your team and begin planning together.',
        '/canopy/opportunities','mission-ready:'||m.group_id::text||':'||user_id::text
      from public.canopy_mission_group_members where group_id=m.group_id and invitation_status='accepted'
      on conflict(fingerprint) do nothing;
    end if;
  else
    insert into public.canopy_mission_exclusions(user_id,reason)
    values(auth.uid(),'Learner declined optional mission invitation')
    on conflict(user_id) do update set reason=excluded.reason,created_at=now();

    delete from public.canopy_mission_group_members where id=m.id;
    replacement:=public.canopy_refill_mission_seat(m.group_id,m.seat_no,m.mission_no);
    perform public.canopy_try_form_mission_groups();
  end if;
  return public.canopy_get_my_mission_hub();
end;$$;
revoke all on function public.canopy_respond_mission_invite(boolean) from public;
grant execute on function public.canopy_respond_mission_invite(boolean) to authenticated;

create or replace function public.canopy_autopair_after_module1_completed()
returns trigger language plpgsql security definer set search_path=public,auth as $$
begin
  if new.week_key='module-01'
     and new.assessment_status='completed'
     and new.review_source='manual' then
    perform public.canopy_try_form_mission_groups();
  end if;
  return new;
end;$$;

DROP TRIGGER IF EXISTS canopy_autopair_after_module1_completed_trg ON public.canopy_assignment_submissions;
CREATE TRIGGER canopy_autopair_after_module1_completed_trg
AFTER INSERT OR UPDATE OF assessment_status,review_source ON public.canopy_assignment_submissions
FOR EACH ROW EXECUTE FUNCTION public.canopy_autopair_after_module1_completed();

-- Remove the Abena Mansa test participant from any current mission group,
-- exclude that tester from future random pairing, and refill the vacated seat.
do $$
declare
  r record;
  did_refill boolean;
begin
  for r in
    select m.id,m.group_id,m.user_id,m.seat_no,m.mission_no
    from public.canopy_mission_group_members m
    join public.canopy_profiles p on p.user_id=m.user_id
    where lower(trim(coalesce(p.full_name,'')))='abena mansa'
  loop
    insert into public.canopy_mission_exclusions(user_id,reason)
    values(r.user_id,'Removed after WOMATE mission-flow test')
    on conflict(user_id) do update set reason=excluded.reason,created_at=now();

    delete from public.canopy_mission_messages where group_id=r.group_id and user_id=r.user_id;
    delete from public.canopy_mission_reports where group_id=r.group_id and user_id=r.user_id;
    delete from public.canopy_mission_group_members where id=r.id;
    update public.canopy_mission_groups set status='inviting',updated_at=now()
      where id=r.group_id and status='active';
    did_refill:=public.canopy_refill_mission_seat(r.group_id,r.seat_no,r.mission_no);
  end loop;
end$$;

-- Also fill any other waiting seats and form any newly possible groups now.
select public.canopy_try_form_mission_groups();

reset lock_timeout;
reset statement_timeout;