-- One-time WOMATE Mission consolidation and targeted Abigail-team notification.
-- Do not disturb groups with five accepted members, submitted/verified groups,
-- or donor groups with Canopy messages, mission reports or custom mission work.
set lock_timeout = '8s';
set statement_timeout = '120s';

do $mission_consolidate$
declare
  destination record;
  donor record;
  selected_member record;
  empty_seat integer;
  displaced record;
  old_group uuid;
  old_seat integer;
  new_group uuid;
  relocated integer := 0;
  move_id uuid;
  n integer;
  g uuid;
  group_count integer;
  target_count integer;
  notified integer;
begin
  -- Coordinate with existing Mission auto-pairing maintenance.
  perform pg_advisory_xact_lock(hashtext('womate_canopy_mission_autopair')::bigint);
  perform pg_advisory_xact_lock(hashtext('womate_canopy_mission_regroup')::bigint);

  -- Prioritize nearly complete teams; consolidate only from groups with 1 or 2 accepted.
  for n in 1..1000 loop
    select cg.id, count(*) filter(where mm.invitation_status='accepted')::int as accepted_count
    into destination
    from public.canopy_mission_groups cg
    join public.canopy_mission_group_members mm on mm.group_id=cg.id
    where cg.status='inviting' and cg.submitted_at is null and cg.verified_at is null
    group by cg.id,cg.created_at
    having count(*) filter(where mm.invitation_status='accepted') between 2 and 4
    order by count(*) filter(where mm.invitation_status='accepted') desc,cg.created_at,cg.id
    limit 1;
    if destination.id is null then exit; end if;

    select cg.id, count(*) filter(where mm.invitation_status='accepted')::int as accepted_count
    into donor
    from public.canopy_mission_groups cg
    join public.canopy_mission_group_members mm on mm.group_id=cg.id
    where cg.id<>destination.id
      and cg.status='inviting'
      and cg.submitted_at is null and cg.verified_at is null
      and cg.mission_choice='standard'
      and cg.name='Cross-country climate mission'
      and nullif(trim(coalesce(cg.custom_brief,'')),'') is null
      and nullif(trim(coalesce(cg.evidence_folder_url,'')),'') is null
      and not exists(select 1 from public.canopy_mission_reports r where r.group_id=cg.id)
      and not exists(select 1 from public.canopy_mission_messages msg where msg.group_id=cg.id)
    group by cg.id,cg.created_at
    having count(*) filter(where mm.invitation_status='accepted') between 1 and 2
    order by count(*) filter(where mm.invitation_status='accepted') asc,cg.created_at,cg.id
    limit 1;
    if donor.id is null then exit; end if;

    select mm.id,mm.user_id,mm.country,mm.group_id,mm.seat_no
    into selected_member
    from public.canopy_mission_group_members mm
    where mm.group_id=donor.id and mm.invitation_status='accepted'
      and not exists(select 1 from public.canopy_mission_group_members prior where prior.group_id=destination.id and prior.user_id=mm.user_id)
      and not exists (select 1 from public.canopy_mission_reports r where r.group_id=donor.id and r.user_id=mm.user_id)
    order by case when exists (
      select 1 from public.canopy_mission_group_members tm
      where tm.group_id=destination.id and tm.invitation_status='accepted'
        and lower(trim(tm.country))=lower(trim(mm.country))
    ) then 1 else 0 end, mm.seat_no
    limit 1;
    if selected_member.id is null then exit; end if;

    -- The destination must have a seat with no accepted member.
    select seat into empty_seat from generate_series(1,5) as seat
    where not exists(
      select 1 from public.canopy_mission_group_members m
      where m.group_id=destination.id and m.seat_no=seat and m.invitation_status='accepted'
    ) order by case when exists (
       select 1 from public.canopy_mission_group_members m
       where m.group_id=destination.id and m.seat_no=seat and m.invitation_status='invited'
    ) then 1 else 0 end,seat limit 1;
    if empty_seat is null then exit; end if;

    -- Release any existing unaccepted invitation in this seat, without removing an acceptance.
    for displaced in
      select id,user_id from public.canopy_mission_group_members
      where group_id=destination.id and seat_no=empty_seat and invitation_status='invited'
    loop
      insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
      values(displaced.user_id,'mission_regrouped','Your Mission invitation is being rematched',
        'WOMATE has reallocated this unaccepted Mission seat to help active learners form complete teams. You remain eligible for another Mission invitation. Please check Canopy for your next match.',
        '/canopy/opportunities','mission-consolidation-invite:'||displaced.id::text)
      on conflict(fingerprint) do nothing;
    end loop;
    delete from public.canopy_mission_group_members
    where group_id=destination.id and seat_no=empty_seat and invitation_status<>'accepted';

    old_group:=selected_member.group_id;
    old_seat:=selected_member.seat_no;
    new_group:=destination.id;
    move_id:=selected_member.id;
    update public.canopy_mission_group_members
      set group_id=new_group,seat_no=empty_seat,mission_no=empty_seat,invited_at=now(),responded_at=now()
      where id=move_id and invitation_status='accepted' and group_id=old_group;
    if not found then raise exception 'Mission team changed during consolidation; transaction rolled back.'; end if;

    insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
    values(selected_member.user_id,'mission_regrouped','Your new WOMATE Mission team',
      'WOMATE has moved your accepted Mission place into a more complete five-person team so you can begin together. Your Mission remains accepted. Open Canopy Missions now to see your new teammates, role and private chat. Any earlier team invitation is superseded.',
      '/canopy/opportunities','mission-consolidation-moved:'||move_id::text)
    on conflict(fingerprint) do nothing;

    insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
    select mm.user_id,'mission_team_update','Your Mission team has been updated',
      'WOMATE has reassigned a member to help form a complete five-person Mission team. Open Canopy Missions to see your current teammates. Your own accepted status has not changed.',
      '/canopy/opportunities',
      'mission-consolidation-team:'||old_group::text||':'||move_id::text||':'||mm.user_id::text
    from public.canopy_mission_group_members mm
    where mm.group_id=old_group and mm.invitation_status='accepted'
    on conflict(fingerprint) do nothing;

    insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
    select mm.user_id,'mission_team_update','Your Mission team has a new member',
      'A committed Mission participant has joined your team. Open Canopy Missions to welcome her and coordinate your shared work. Your accepted status and any existing progress are unchanged.',
      '/canopy/opportunities',
      'mission-consolidation-joined:'||new_group::text||':'||move_id::text||':'||mm.user_id::text
    from public.canopy_mission_group_members mm
    where mm.group_id=new_group and mm.invitation_status='accepted' and mm.id<>move_id
    on conflict(fingerprint) do nothing;

    select count(*) into target_count
    from public.canopy_mission_group_members
    where group_id=new_group and invitation_status='accepted';
    if target_count=5 then
      update public.canopy_mission_groups set status='active',updated_at=now()
      where id=new_group and status='inviting';
      insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
      select mm.user_id,'mission_group_ready','Your five-person WOMATE Mission team is ready',
      'All five members of your Mission group are now accepted. Open your private Canopy Mission chat to meet your team and agree on your next steps.',
      '/canopy/opportunities','mission-ready:'||new_group::text||':'||mm.user_id::text
      from public.canopy_mission_group_members mm
      where mm.group_id=new_group and mm.invitation_status='accepted'
      on conflict(fingerprint) do nothing;
    end if;
    relocated:=relocated+1;
  end loop;
  raise notice 'Consolidated % accepted Mission participants.',relocated;

  -- One-time targeted WhatsApp coordination request for Abigail's fully accepted team.
  -- Do not silently notify an unrelated group if a participant has since moved.
  with matching as (
    select mm.group_id
    from public.canopy_mission_group_members mm
    join public.canopy_profiles p on p.user_id=mm.user_id
    where mm.invitation_status='accepted'
      and lower(btrim(p.full_name))=any(array[
       'esther bwanali','fadilatu habib gunu','joan jepngetich',
       'abigail mannathoko','nakasagga joan'])
    group by mm.group_id
    having count(distinct lower(btrim(p.full_name)))=5
       and (select count(*) from public.canopy_mission_group_members other
            where other.group_id=mm.group_id and other.invitation_status='accepted')=5
  ) select count(*),(array_agg(group_id))[1] into group_count,g from matching;
  if group_count=1 then
    select count(*) into target_count
    from public.canopy_mission_group_members mm
    join public.canopy_profiles p on p.user_id=mm.user_id
    where mm.group_id=g and mm.invitation_status='accepted'
      and lower(btrim(p.full_name))=any(array[
       'fadilatu habib gunu','joan jepngetich','nakasagga joan']);
    if target_count=3 then
      insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
      select mm.user_id,'mission_team_action',
        'Action needed: join your Mission team WhatsApp group',
        'Your five-person WOMATE Mission team has accepted the mission, but Abigail Mannathoko and Esther Bwanali are waiting for you to join the team WhatsApp chat. Please tap this notification to join, introduce yourself and plan together. WhatsApp: https://chat.whatsapp.com/CGXNOTSsDW52TyXcyaX1oj  If WhatsApp is unavailable, reply in the private Canopy Mission chat. - WOMATE Team',
        'https://chat.whatsapp.com/CGXNOTSsDW52TyXcyaX1oj',
        'mission-whatsapp-join-oct04:'||g::text||':'||mm.user_id::text
      from public.canopy_mission_group_members mm
      join public.canopy_profiles p on p.user_id=mm.user_id
      where mm.group_id=g and mm.invitation_status='accepted'
        and lower(btrim(p.full_name))=any(array[
        'fadilatu habib gunu','joan jepngetich','nakasagga joan'])
      on conflict(fingerprint) do nothing;
      get diagnostics notified=row_count;
      raise notice 'Abigail team: % new WhatsApp notifications queued.',notified;
    else raise notice 'Abigail team recipients changed; no WhatsApp notifications sent.';
    end if;
  else raise notice 'Abigail team not uniquely confirmed; no WhatsApp notifications sent.';
  end if;
end $mission_consolidate$;
reset lock_timeout;
reset statement_timeout;
