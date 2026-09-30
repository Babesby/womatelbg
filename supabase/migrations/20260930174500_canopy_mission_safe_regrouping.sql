-- WOMATE Canopy: safe Mission regrouping.
-- Accepted members are anchored. Only unaccepted/invited seats may be rebalanced.
-- Duplicate-country pending seats are rematched where possible. Replaced learners remain
-- eligible for another group instead of being permanently stranded.

set lock_timeout='8s';
set statement_timeout='120s';

create or replace function public.canopy_refill_mission_seat(p_group uuid,p_seat integer,p_mission integer)
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  rec record;
begin
  -- First choice: an eligible learner from a country not currently represented.
  -- Never immediately put someone back into the same group they were removed from.
  select p.user_id,p.country into rec
  from public.canopy_profiles p
  where p.role='learner'
    and public.canopy_mission_eligible(p.user_id)
    and not exists(select 1 from public.canopy_mission_exclusions e where e.user_id=p.user_id)
    and not exists(
      select 1 from public.canopy_mission_group_members live
      where live.user_id=p.user_id
        and live.invitation_status in('invited','accepted')
    )
    and not exists(
      select 1 from public.canopy_mission_group_members prior
      where prior.group_id=p_group and prior.user_id=p.user_id
    )
    and not exists(
      select 1 from public.canopy_mission_group_members x
      where x.group_id=p_group
        and x.invitation_status in('invited','accepted')
        and lower(trim(x.country))=lower(trim(p.country))
    )
  order by random()
  limit 1;

  -- If diversity is impossible, keep the group moving with another eligible learner.
  if rec.user_id is null then
    select p.user_id,p.country into rec
    from public.canopy_profiles p
    where p.role='learner'
      and public.canopy_mission_eligible(p.user_id)
      and not exists(select 1 from public.canopy_mission_exclusions e where e.user_id=p.user_id)
      and not exists(
        select 1 from public.canopy_mission_group_members live
        where live.user_id=p.user_id
          and live.invitation_status in('invited','accepted')
      )
      and not exists(
        select 1 from public.canopy_mission_group_members prior
        where prior.group_id=p_group and prior.user_id=p.user_id
      )
    order by random()
    limit 1;
  end if;

  if rec.user_id is null then return false; end if;

  delete from public.canopy_mission_group_members
  where group_id=p_group
    and seat_no=p_seat
    and invitation_status<>'accepted';

  insert into public.canopy_mission_group_members(group_id,user_id,country,seat_no,mission_no)
  values(p_group,rec.user_id,rec.country,p_seat,p_mission);

  perform public.canopy_notify_mission_invite(p_group,rec.user_id);
  return true;
end;
$$;
revoke all on function public.canopy_refill_mission_seat(uuid,integer,integer) from public;

create or replace function public.canopy_rebalance_mission_groups()
returns integer
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  g record;
  m record;
  moved integer:=0;
  did_refill boolean;
  country_seen text[];
begin
  perform pg_advisory_xact_lock(hashtext('womate_canopy_mission_regroup')::bigint);

  -- Only pending/inviting groups can be automatically rebalanced.
  -- Fully accepted/active groups are never broken apart.
  for g in
    select cg.id
    from public.canopy_mission_groups cg
    where cg.status='inviting'
    order by cg.created_at
  loop
    country_seen:=array[]::text[];

    -- Accepted members always anchor their countries first.
    select coalesce(array_agg(distinct lower(trim(country))),array[]::text[])
      into country_seen
    from public.canopy_mission_group_members
    where group_id=g.id
      and invitation_status='accepted';

    -- Keep the first invited learner for a country only when that country is not
    -- already represented. Extra duplicate-country invites are released and rematched.
    for m in
      select id,user_id,country,seat_no,mission_no,invited_at
      from public.canopy_mission_group_members
      where group_id=g.id
        and invitation_status='invited'
      order by invited_at,seat_no
    loop
      if lower(trim(m.country)) = any(country_seen) then
        update public.canopy_mission_group_members
        set invitation_status='replaced',responded_at=now()
        where id=m.id and invitation_status='invited';

        insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
        values(
          m.user_id,
          'mission_regrouped',
          'Your WOMATE Mission match is being refreshed',
          'To improve the mix of pending Mission groups, your unaccepted invitation has been released for regrouping. You remain Mission-eligible and may receive a new team invitation. No accepted Mission commitment has been changed.',
          '/canopy/opportunities',
          'mission-regrouped:'||m.id::text
        )
        on conflict(fingerprint) do update
          set title=excluded.title,body=excluded.body,link=excluded.link,type=excluded.type,read_at=null;

        did_refill:=public.canopy_refill_mission_seat(g.id,m.seat_no,m.mission_no);
        moved:=moved+1;
      else
        country_seen:=array_append(country_seen,lower(trim(m.country)));
      end if;
    end loop;
  end loop;

  return moved;
end;
$$;
revoke all on function public.canopy_rebalance_mission_groups() from public;

-- Update pairing maintenance so previously replaced/regrouped learners may be matched again.
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

  -- Improve country mix in pending groups before other maintenance.
  perform public.canopy_rebalance_mission_groups();

  -- Release invitations left unanswered for more than 24 hours.
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
      'Your Mission invitation was not accepted within 24 hours, so the seat has been released to keep groups moving. You remain eligible to be matched again into another available Mission team.',
      '/canopy/opportunities',
      'mission-invite-expired:'||stale.id::text
    )
    on conflict(fingerprint) do update
      set title=excluded.title,body=excluded.body,link=excluded.link,type=excluded.type,read_at=null;

    did_refill:=public.canopy_refill_mission_seat(stale.group_id,stale.seat_no,stale.mission_no);
  end loop;

  -- Fill missing seats in pending groups.
  for g in
    select cg.id
    from public.canopy_mission_groups cg
    where cg.status='inviting'
    order by cg.created_at
  loop
    for missing_seat in 1..5 loop
      if not exists(
        select 1
        from public.canopy_mission_group_members m
        where m.group_id=g
          and m.seat_no=missing_seat
          and m.invitation_status in('invited','accepted')
      ) then
        did_refill:=public.canopy_refill_mission_seat(g,missing_seat,missing_seat);
      end if;
    end loop;
  end loop;

  -- Form new five-person groups from everyone currently eligible and not holding
  -- a live invitation/accepted seat. Historical replaced rows do not block rematching.
  loop
    select count(*) into picked
    from public.canopy_profiles p
    where p.role='learner'
      and public.canopy_mission_eligible(p.user_id)
      and not exists(select 1 from public.canopy_mission_exclusions e where e.user_id=p.user_id)
      and not exists(
        select 1
        from public.canopy_mission_group_members mm
        where mm.user_id=p.user_id
          and mm.invitation_status in('invited','accepted')
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
            select 1
            from public.canopy_mission_group_members mm
            where mm.user_id=p.user_id
              and mm.invitation_status in('invited','accepted')
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

-- Run the regrouping/pairing maintenance immediately.
select public.canopy_try_form_mission_groups();

reset lock_timeout;
reset statement_timeout;
