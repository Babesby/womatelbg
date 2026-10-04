-- WOMATE Canopy: consolidate accepted members before waiting on unaccepted invitations.
-- One-time reconciliation. Preserve complete groups and donors with recorded collaboration.
set lock_timeout = '8s';
set statement_timeout = '120s';

do $accepted_first$
declare
  dest record;
  donor record;
  learner record;
  displaced record;
  seat integer;
  dest_accepted integer;
  changed integer := 0;
  cleared integer := 0;
  total_accepted_before integer;
  total_accepted_after integer;
  n integer;
  move_key text;
begin
  perform pg_advisory_xact_lock(hashtext('womate_canopy_mission_autopair')::bigint);
  perform pg_advisory_xact_lock(hashtext('womate_canopy_mission_regroup')::bigint);

  select count(*) into total_accepted_before from public.canopy_mission_group_members
    where invitation_status='accepted';

  for n in 1..100 loop
    dest := null;
    donor := null;
    learner := null;

    -- Prefer 4/5, then 3/5, etc. Never touch completed 5/5 groups.
    select g.id,g.name,count(m.id) filter(where m.invitation_status='accepted')::integer as accepted_count
      into dest
    from public.canopy_mission_groups g
    left join public.canopy_mission_group_members m on m.group_id=g.id
    where g.status in ('inviting','active') and g.submitted_at is null and g.verified_at is null
      and (select count(*) from public.canopy_mission_group_members a
           where a.group_id=g.id and a.invitation_status='accepted') between 1 and 4
    group by g.id,g.name,g.created_at
    order by count(m.id) filter(where m.invitation_status='accepted') desc,g.created_at,g.id
    limit 1;
    exit when dest.id is null;

    -- Draw from the least-complete UNSTARTED donor group. Do not break work or a custom mission.
    select g.id,count(m.id) filter(where m.invitation_status='accepted')::integer as accepted_count
      into donor
    from public.canopy_mission_groups g
    join public.canopy_mission_group_members m on m.group_id=g.id
    where g.id<>dest.id and g.status='inviting' and g.submitted_at is null and g.verified_at is null
      and g.mission_choice='standard' and g.name='Cross-country climate mission'
      and nullif(btrim(coalesce(g.custom_brief,'')),'') is null
      and nullif(btrim(coalesce(g.evidence_folder_url,'')),'') is null
      and not exists (select 1 from public.canopy_mission_reports r where r.group_id=g.id)
      and not exists (select 1 from public.canopy_mission_messages c where c.group_id=g.id)
      and (select count(*) from public.canopy_mission_group_members a
           where a.group_id=g.id and a.invitation_status='accepted') between 1 and 4
    group by g.id,g.created_at
    order by count(m.id) filter(where m.invitation_status='accepted') asc,g.created_at,g.id
    limit 1;
    exit when donor.id is null;

    select m.id,m.user_id,m.country into learner
    from public.canopy_mission_group_members m
    where m.group_id=donor.id and m.invitation_status='accepted'
      and not exists(select 1 from public.canopy_mission_group_members prior
                     where prior.group_id=dest.id and prior.user_id=m.user_id)
    order by case when exists (
        select 1 from public.canopy_mission_group_members other
        where other.group_id=dest.id and other.invitation_status='accepted'
          and lower(btrim(other.country))=lower(btrim(m.country))
      ) then 1 else 0 end,m.seat_no
    limit 1;
    exit when learner.id is null;

    -- Prefer a truly empty seat, otherwise release an UNACCEPTED invitation.
    select candidate into seat from generate_series(1,5) as candidate
    where not exists(select 1 from public.canopy_mission_group_members existing
                     where existing.group_id=dest.id and existing.seat_no=candidate
                       and existing.invitation_status='accepted')
    order by case when exists(
        select 1 from public.canopy_mission_group_members existing
        where existing.group_id=dest.id and existing.seat_no=candidate
      ) then 1 else 0 end,candidate
    limit 1;
    if seat is null then raise exception 'No safe seat in destination %',dest.id; end if;

    for displaced in select id,user_id from public.canopy_mission_group_members
                     where group_id=dest.id and seat_no=seat and invitation_status<>'accepted'
    loop
      insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
      values(displaced.user_id,'mission_regrouped','Your Mission invitation is being rematched',
        'Your unanswered Mission invitation has been reallocated to an already-accepted participant so that a committed team can start. You remain eligible to receive another invitation. Please check Canopy Missions.',
        '/canopy/opportunities','mission-accepted-first-displaced:'||displaced.id::text)
      on conflict(fingerprint) do nothing;
    end loop;
    delete from public.canopy_mission_group_members
      where group_id=dest.id and seat_no=seat and invitation_status<>'accepted';

    update public.canopy_mission_group_members
      set group_id=dest.id,seat_no=seat,mission_no=seat,invited_at=now(),responded_at=now()
      where id=learner.id and group_id=donor.id and invitation_status='accepted';
    if not found then raise exception 'Concurrent change to accepted learner %, rolled back',learner.user_id; end if;

    move_key := 'mission-accepted-first:'||learner.id::text||':'||dest.id::text;
    insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
    values(learner.user_id,'mission_regrouped','Your WOMATE Mission team has changed',
      'You have been placed with a more-complete Mission team. Your accepted status is preserved: you do NOT need to accept again. Open Canopy Missions to meet your current teammates, check your updated lead role and coordinate in the private team chat.',
      '/canopy/opportunities',move_key)
    on conflict(fingerprint) do nothing;

    insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
    select m.user_id,'mission_team_update','Your Mission team has changed',
      'WOMATE has consolidated accepted members into more-complete teams. Open Canopy Missions to check your current teammates and lead roles. Your own acceptance status has not changed.',
      '/canopy/opportunities',move_key||':team:'||m.user_id::text
    from public.canopy_mission_group_members m
    where m.group_id in (dest.id,donor.id) and m.invitation_status='accepted'
      and m.user_id<>learner.user_id
    on conflict(fingerprint) do nothing;

    select count(*) into dest_accepted from public.canopy_mission_group_members
      where group_id=dest.id and invitation_status='accepted';
    if dest_accepted=5 then
      update public.canopy_mission_groups set status='active',updated_at=now()
        where id=dest.id and status='inviting';
      insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
      select m.user_id,'mission_group_ready','Your five-person WOMATE Mission team is ready',
        'All five team members have accepted. Open Canopy Missions to meet your team and coordinate your shared climate mission.',
        '/canopy/opportunities','mission-accepted-first-ready:'||dest.id::text||':'||m.user_id::text
      from public.canopy_mission_group_members m
      where m.group_id=dest.id and m.invitation_status='accepted'
      on conflict(fingerprint) do nothing;
    end if;
    changed:=changed+1;
  end loop;

  -- Remove ONLY abandoned, unstarted, zero-accepted groups; invitees stay eligible.
  for donor in
    select g.id from public.canopy_mission_groups g
    where g.status='inviting' and g.submitted_at is null and g.verified_at is null
      and g.mission_choice='standard' and g.name='Cross-country climate mission'
      and nullif(btrim(coalesce(g.custom_brief,'')),'') is null
      and nullif(btrim(coalesce(g.evidence_folder_url,'')),'') is null
      and not exists(select 1 from public.canopy_mission_group_members a
                     where a.group_id=g.id and a.invitation_status='accepted')
      and not exists(select 1 from public.canopy_mission_reports r where r.group_id=g.id)
      and not exists(select 1 from public.canopy_mission_messages c where c.group_id=g.id)
  loop
    insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
    select m.user_id,'mission_regrouped','Your pending Mission invitation is being rematched',
      'WOMATE is consolidating Mission groups. Your unanswered invitation has been released. You remain eligible for another Mission invitation; please check Canopy Missions for updates.',
      '/canopy/opportunities','mission-accepted-first-empty:'||m.id::text
    from public.canopy_mission_group_members m
    where m.group_id=donor.id and m.invitation_status='invited'
    on conflict(fingerprint) do nothing;
    delete from public.canopy_mission_groups where id=donor.id;
    cleared:=cleared+1;
  end loop;

  select count(*) into total_accepted_after from public.canopy_mission_group_members
    where invitation_status='accepted';
  if total_accepted_before<>total_accepted_after then
    raise exception 'Accepted learner count changed (% -> %); transaction rolled back',
      total_accepted_before,total_accepted_after;
  end if;
  raise notice 'MISSION CONSOLIDATION: moved % accepted learners; cleared % safe zero-accepted groups; accepted learners preserved: %.',
    changed,cleared,total_accepted_after;
  raise notice 'Remaining groups by accepted count (0..5): %',(
    select jsonb_object_agg(accepted_count,number_of_groups) from (
      select accepted_count,count(*) as number_of_groups from (
        select g.id,count(m.id) filter(where m.invitation_status='accepted') as accepted_count
        from public.canopy_mission_groups g
        left join public.canopy_mission_group_members m on m.group_id=g.id
        group by g.id
      ) x group by accepted_count
    ) totals
  );
end $accepted_first$;
reset lock_timeout;
reset statement_timeout;
