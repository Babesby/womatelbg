-- Fill 4/5 WOMATE Mission groups with accepted learners from unstarted 3/5 groups.
-- Never change a fully accepted group or move a learner out of a group with recorded work.
set lock_timeout = '8s';
set statement_timeout = '120s';

do $fill_four_of_five$
declare
  destination record;
  donor record;
  candidate record;
  displaced record;
  open_seat integer;
  n integer;
  moved integer := 0;
  current_count integer;
  move_token text;
begin
  perform pg_advisory_xact_lock(hashtext('womate_canopy_mission_autopair')::bigint);
  perform pg_advisory_xact_lock(hashtext('womate_canopy_mission_regroup')::bigint);

  for n in 1..3 loop
    destination := null;
    donor := null;
    candidate := null;
    open_seat := null;

    select g.id into destination
    from public.canopy_mission_groups g
    join public.canopy_mission_group_members m on m.group_id=g.id
    where g.status in ('inviting','active')
      and g.submitted_at is null and g.verified_at is null
    group by g.id,g.created_at
    having count(*) filter (where m.invitation_status='accepted')=4
    order by g.created_at,g.id limit 1;
    if destination.id is null then exit; end if;

    -- A donor must have exactly 3 accepted members and no recorded team work.
    select g.id into donor
    from public.canopy_mission_groups g
    join public.canopy_mission_group_members m on m.group_id=g.id
    where g.id<>destination.id
      and g.status in ('inviting','active')
      and g.submitted_at is null and g.verified_at is null
      and g.mission_choice='standard'
      and g.name='Cross-country climate mission'
      and nullif(btrim(coalesce(g.custom_brief,'')),'') is null
      and nullif(btrim(coalesce(g.evidence_folder_url,'')),'') is null
      and not exists (select 1 from public.canopy_mission_reports r where r.group_id=g.id)
      and not exists (select 1 from public.canopy_mission_messages c where c.group_id=g.id)
    group by g.id,g.created_at
    having count(*) filter (where m.invitation_status='accepted')=3
    order by g.created_at,g.id limit 1;
    if donor.id is null then
      raise notice 'No safe, unstarted 3/5 donor group available. Other groups were not disturbed.';
      exit;
    end if;

    select m.id,m.user_id,m.country,m.seat_no into candidate
    from public.canopy_mission_group_members m
    where m.group_id=donor.id and m.invitation_status='accepted'
      and not exists(select 1 from public.canopy_mission_group_members prev
                     where prev.group_id=destination.id and prev.user_id=m.user_id)
    order by case when exists(
      select 1 from public.canopy_mission_group_members already
      where already.group_id=destination.id and already.invitation_status='accepted'
        and lower(btrim(already.country))=lower(btrim(m.country))
    ) then 1 else 0 end,m.seat_no
    limit 1;
    if candidate.id is null then
      raise notice 'No suitable accepted member found in donor group; no further moves made.';
      exit;
    end if;

    select seat into open_seat from generate_series(1,5) seat
    where not exists(select 1 from public.canopy_mission_group_members m
      where m.group_id=destination.id and m.seat_no=seat and m.invitation_status='accepted')
    order by case when exists(select 1 from public.canopy_mission_group_members m
      where m.group_id=destination.id and m.seat_no=seat and m.invitation_status='invited')
      then 1 else 0 end,seat limit 1;
    if open_seat is null then raise exception 'Destination has no unaccepted seat; transaction rolled back.'; end if;

    -- The pending invite must be vacated before reassigning the seat.
    for displaced in select id,user_id from public.canopy_mission_group_members
      where group_id=destination.id and seat_no=open_seat and invitation_status='invited'
    loop
      insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
      values(displaced.user_id,'mission_regrouped','Your Mission invitation is being rematched',
        'WOMATE has reallocated your unanswered Mission invitation to complete a team of five accepted learners. You remain eligible to receive another Mission invitation. Please check Canopy for your next match.',
        '/canopy/opportunities','mission-oct04-fill-invite:'||displaced.id::text)
      on conflict(fingerprint) do nothing;
    end loop;
    delete from public.canopy_mission_group_members
    where group_id=destination.id and seat_no=open_seat and invitation_status<>'accepted';

    update public.canopy_mission_group_members
      set group_id=destination.id,seat_no=open_seat,mission_no=open_seat,
          invited_at=now(),responded_at=now()
    where id=candidate.id and group_id=donor.id and invitation_status='accepted';
    if not found then raise exception 'Accepted learner moved concurrently; transaction rolled back.'; end if;

    move_token := 'mission-oct04-fill:'||candidate.id::text||':'||destination.id::text;
    insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
    values(candidate.user_id,'mission_regrouped','Your new WOMATE Mission team is ready',
      'WOMATE has moved your accepted Mission place to complete a five-person team. Your accepted status is unchanged. Open Canopy Missions to meet your current teammates and coordinate your shared work.',
      '/canopy/opportunities',move_token||':moved')
    on conflict(fingerprint) do nothing;

    insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
    select m.user_id,'mission_team_update','Your Mission team has been updated',
      'One accepted teammate has been reassigned to complete another five-person Mission team. Open Canopy Missions for your current team details; your own accepted status has not changed.',
      '/canopy/opportunities',move_token||':donor:'||m.user_id::text
    from public.canopy_mission_group_members m
    where m.group_id=donor.id and m.invitation_status='accepted'
    on conflict(fingerprint) do nothing;

    insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
    select m.user_id,'mission_group_ready','Your five-person WOMATE Mission team is ready',
      'Your Mission team now has five accepted members. Open Canopy Missions to meet your team in the private chat and agree on your next steps.',
      '/canopy/opportunities',move_token||':ready:'||m.user_id::text
    from public.canopy_mission_group_members m
    where m.group_id=destination.id and m.invitation_status='accepted'
    on conflict(fingerprint) do nothing;

    select count(*) into current_count from public.canopy_mission_group_members
    where group_id=destination.id and invitation_status='accepted';
    if current_count<>5 then raise exception 'Destination did not reach 5/5; transaction rolled back.'; end if;
    update public.canopy_mission_groups set status='active',updated_at=now()
    where id=destination.id and status='inviting';
    moved:=moved+1;
  end loop;
  raise notice 'Completed % additional 4/5 Mission teams.',moved;
end $fill_four_of_five$;
reset lock_timeout;
reset statement_timeout;
