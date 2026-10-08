-- WOMATE Canopy · Active-team Mission consolidation + non-blocking submission
-- 2026-10-08
-- Goals:
--   * Never auto-accept an invited learner.
--   * Consolidate currently accepted learners from incomplete groups into up to two 5/5 teams.
--   * Preserve the total number of accepted learners.
--   * Keep remaining accepted learners active.
--   * Allow active contributors to submit evidence without inactive teammates blocking them.
--   * Notify current Mission participants with contribution guidance.
set lock_timeout='8s';
set statement_timeout='120s';

create or replace function public.canopy_clean_mission_drive_url(p_value text, p_required boolean default false)
returns text
language plpgsql
immutable
set search_path=public
as $$
declare
  raw text:=trim(coalesce(p_value,''));
  candidate text;
begin
  if raw='' then
    if p_required then raise exception 'Add the shared mission evidence link.'; end if;
    return null;
  end if;
  candidate:=substring(raw from '(?i)https?://[^[:space:]<>"'']+');
  if candidate is null then
    candidate:=regexp_replace(raw,'^[[:space:]("\[<{]+|[[:space:])"\]}>.,;:]+$','','g');
    if candidate ~* '^(www\.)?(drive|docs)\.google\.com/' then
      candidate:='https://'||regexp_replace(candidate,'^www\.','','i');
    end if;
  end if;
  candidate:=regexp_replace(candidate,'[[:space:])\]}>.,;:]+$','','g');
  if candidate !~* '^https?://(www\.)?(drive|docs)\.google\.com(/|$)' then
    if p_required then raise exception 'Paste a Google Drive or Google Docs share link for the final mission evidence.';
    else raise exception 'Proof link must be a Google Drive or Google Docs share link, or leave it blank.';
    end if;
  end if;
  return candidate;
end;
$$;

do $active_mission_consolidation$
declare
  total_before integer;
  total_after integer;
  pool_total integer;
  target_full integer;
  full_created integer:=0;
  destination record;
  donor record;
  candidate record;
  displaced record;
  open_seat integer;
  dest_count integer;
  remaining_dest uuid;
  remaining_count integer;
  move_key text;
  safety integer:=0;
begin
  perform pg_advisory_xact_lock(hashtext('womate_canopy_mission_autopair')::bigint);
  perform pg_advisory_xact_lock(hashtext('womate_canopy_mission_regroup')::bigint);

  select count(*) into total_before
  from public.canopy_mission_group_members
  where invitation_status='accepted';

  create temporary table womate_oct08_mission_pool on commit drop as
  select g.id as group_id
  from public.canopy_mission_groups g
  where g.status in('inviting','active')
    and g.submitted_at is null
    and g.verified_at is null
    and (select count(*) from public.canopy_mission_group_members m
         where m.group_id=g.id and m.invitation_status='accepted') between 0 and 4;

  select count(*) into pool_total
  from public.canopy_mission_group_members m
  join womate_oct08_mission_pool p on p.group_id=m.group_id
  where m.invitation_status='accepted';

  target_full:=least(2,floor(pool_total/5.0)::integer);

  while full_created<target_full loop
    safety:=safety+1;
    if safety>30 then raise exception 'Mission consolidation safety limit reached; transaction rolled back.'; end if;

    destination:=null;
    select g.id,
           count(m.id) filter(where m.invitation_status='accepted')::integer accepted_count
      into destination
    from public.canopy_mission_groups g
    join womate_oct08_mission_pool p on p.group_id=g.id
    left join public.canopy_mission_group_members m on m.group_id=g.id
    where g.status in('inviting','active')
      and g.submitted_at is null and g.verified_at is null
    group by g.id,g.created_at
    having count(m.id) filter(where m.invitation_status='accepted') between 1 and 4
    order by count(m.id) filter(where m.invitation_status='accepted') desc,g.created_at,g.id
    limit 1;

    if destination.id is null then exit; end if;

    loop
      select count(*) into dest_count
      from public.canopy_mission_group_members
      where group_id=destination.id and invitation_status='accepted';
      exit when dest_count>=5;

      donor:=null;
      select g.id,
             count(m.id) filter(where m.invitation_status='accepted')::integer accepted_count
        into donor
      from public.canopy_mission_groups g
      join womate_oct08_mission_pool p on p.group_id=g.id
      left join public.canopy_mission_group_members m on m.group_id=g.id
      where g.id<>destination.id
        and g.status in('inviting','active')
        and g.submitted_at is null and g.verified_at is null
      group by g.id,g.created_at
      having count(m.id) filter(where m.invitation_status='accepted') between 1 and 4
      order by count(m.id) filter(where m.invitation_status='accepted') asc,g.created_at,g.id
      limit 1;

      if donor.id is null then exit; end if;

      open_seat:=null;
      select seat into open_seat
      from generate_series(1,5) seat
      where not exists(
        select 1 from public.canopy_mission_group_members m
        where m.group_id=destination.id
          and m.seat_no=seat
          and m.invitation_status='accepted'
      )
      and not exists(
        select 1 from public.canopy_mission_reports r
        where r.group_id=destination.id and r.mission_no=seat
      )
      order by seat
      limit 1;

      if open_seat is null then
        raise exception 'No safe open destination seat in Mission group %; transaction rolled back.',destination.id;
      end if;

      candidate:=null;
      select m.id,m.user_id,m.group_id,m.country,m.seat_no,m.mission_no
        into candidate
      from public.canopy_mission_group_members m
      where m.group_id=donor.id
        and m.invitation_status='accepted'
        and not exists(
          select 1 from public.canopy_mission_group_members x
          where x.group_id=destination.id and x.user_id=m.user_id
        )
      order by
        case when exists(select 1 from public.canopy_mission_reports r
                         where r.group_id=m.group_id and r.user_id=m.user_id) then 0 else 1 end,
        m.responded_at nulls last,m.seat_no
      limit 1;

      if candidate.id is null then exit; end if;

      for displaced in
        select id,user_id
        from public.canopy_mission_group_members
        where group_id=destination.id
          and seat_no=open_seat
          and invitation_status<>'accepted'
      loop
        insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
        values(
          displaced.user_id,
          'mission_regrouped',
          'Your WOMATE Mission seat has been released',
          'WOMATE is consolidating participants who have already accepted their Mission commitment. Your unanswered invitation has not been accepted on your behalf. Participation remains optional, and you do not need to take any action unless you want to join a future Mission opportunity.',
          '/canopy/opportunities',
          'mission-oct08-released:'||displaced.id::text
        )
        on conflict(fingerprint) do update
          set title=excluded.title,body=excluded.body,link=excluded.link,type=excluded.type,read_at=null;
      end loop;

      delete from public.canopy_mission_group_members
      where group_id=destination.id
        and seat_no=open_seat
        and invitation_status<>'accepted';

      -- Carry the learner's own submitted report forward into the new team/role.
      update public.canopy_mission_reports
      set group_id=destination.id,
          mission_no=open_seat,
          updated_at=now()
      where group_id=candidate.group_id
        and user_id=candidate.user_id;

      update public.canopy_mission_group_members
      set group_id=destination.id,
          seat_no=open_seat,
          mission_no=open_seat,
          invited_at=now(),
          responded_at=coalesce(responded_at,now())
      where id=candidate.id
        and group_id=candidate.group_id
        and invitation_status='accepted';

      if not found then
        raise exception 'Accepted Mission participant changed during consolidation; transaction rolled back.';
      end if;

      move_key:='mission-oct08-active:'||candidate.id::text||':'||destination.id::text;

      insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
      values(
        candidate.user_id,
        'mission_regrouped',
        'Your active WOMATE Mission team has been consolidated',
        'Your accepted Mission place has been moved into a more-complete active team. You do not need to accept again. Open Canopy Missions to see your current teammates and lead role. Any report you already submitted has been carried with you.',
        '/canopy/opportunities',
        move_key||':moved'
      )
      on conflict(fingerprint) do update
        set title=excluded.title,body=excluded.body,link=excluded.link,type=excluded.type,read_at=null;

      insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
      select m.user_id,
             'mission_team_update',
             'Your WOMATE Mission team has been updated',
             'WOMATE is consolidating participants who have already accepted so active learners can move forward. Open Canopy Missions to see your current team. Your accepted status has not changed.',
             '/canopy/opportunities',
             move_key||':team:'||m.user_id::text
      from public.canopy_mission_group_members m
      where m.group_id in(destination.id,candidate.group_id)
        and m.invitation_status='accepted'
        and m.user_id<>candidate.user_id
      on conflict(fingerprint) do update
        set title=excluded.title,body=excluded.body,link=excluded.link,type=excluded.type,read_at=null;
    end loop;

    select count(*) into dest_count
    from public.canopy_mission_group_members
    where group_id=destination.id and invitation_status='accepted';

    if dest_count=5 then
      update public.canopy_mission_groups
      set status='active',updated_at=now()
      where id=destination.id;

      insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
      select m.user_id,
             'mission_group_ready',
             'Your five-person WOMATE Mission team is ready',
             'Your team now has five accepted participants. Please move forward with your own Mission parts and findings, coordinate with the active members, and build the shared evidence folder.',
             '/canopy/opportunities',
             'mission-oct08-ready:'||destination.id::text||':'||m.user_id::text
      from public.canopy_mission_group_members m
      where m.group_id=destination.id and m.invitation_status='accepted'
      on conflict(fingerprint) do update
        set title=excluded.title,body=excluded.body,link=excluded.link,type=excluded.type,read_at=null;

      full_created:=full_created+1;
    else
      exit;
    end if;
  end loop;

  -- Consolidate any accepted learners left in the original incomplete pool into
  -- one remaining active group where possible. This does not force a 5/5 team.
  select g.id into remaining_dest
  from public.canopy_mission_groups g
  join womate_oct08_mission_pool p on p.group_id=g.id
  where g.status in('inviting','active')
    and g.submitted_at is null and g.verified_at is null
    and (select count(*) from public.canopy_mission_group_members m
         where m.group_id=g.id and m.invitation_status='accepted') between 1 and 4
  order by (select count(*) from public.canopy_mission_group_members m
            where m.group_id=g.id and m.invitation_status='accepted') desc,
           g.created_at,g.id
  limit 1;

  if remaining_dest is not null then
    update public.canopy_mission_groups set status='active',updated_at=now()
    where id=remaining_dest and status='inviting';
  end if;

  select count(*) into total_after
  from public.canopy_mission_group_members
  where invitation_status='accepted';

  if total_before<>total_after then
    raise exception 'Accepted learner count changed during Mission consolidation (% -> %); transaction rolled back.',
      total_before,total_after;
  end if;

  raise notice 'WOMATE Mission consolidation: accepted pool %, complete 5/5 groups formed %, accepted learners preserved %.',
    pool_total,full_created,total_after;
end
$active_mission_consolidation$;

-- Active contributors may submit a shared Mission folder without being blocked by
-- unanswered or inactive team members. At least one accepted participant report is required.
create or replace function public.canopy_submit_mission_group(p_folder_url text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  gid uuid;
  accepted_count integer;
  report_count integer;
  deadline timestamptz;
  clean_folder text;
begin
  select group_id into gid
  from public.canopy_mission_group_members
  where user_id=auth.uid() and invitation_status='accepted'
  order by invited_at desc
  limit 1;

  if gid is null then raise exception 'Mission group access is required.'; end if;

  select deadline_at into deadline
  from public.canopy_mission_groups
  where id=gid;

  if now()>deadline then raise exception 'The group mission submission window has closed.'; end if;

  clean_folder:=public.canopy_clean_mission_drive_url(p_folder_url,true);

  select count(*) into accepted_count
  from public.canopy_mission_group_members
  where group_id=gid and invitation_status='accepted';

  select count(distinct mission_no) into report_count
  from public.canopy_mission_reports
  where group_id=gid;

  if accepted_count<1 then raise exception 'At least one accepted Mission participant is required.'; end if;
  if report_count<1 then raise exception 'Submit at least one active participant Mission report before sending the shared evidence.'; end if;

  update public.canopy_mission_groups
  set evidence_folder_url=clean_folder,
      status='submitted',
      submitted_at=now(),
      updated_at=now()
  where id=gid
    and status in('inviting','active');

  if not found then
    raise exception 'This Mission has already been submitted or verified.';
  end if;

  insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
  select p.user_id,
         'mission_admin',
         'Mission evidence ready for WOMATE verification',
         'A Canopy Mission team has submitted its active contributors'' evidence folder for WOMATE verification. Review the reports and contribution record, including any listed non-contributors.',
         '/canopy/manage/missions',
         'mission-admin-active:'||gid::text||':'||p.user_id::text
  from public.canopy_profiles p
  where p.role in('manager','admin')
  on conflict(fingerprint) do update
    set title=excluded.title,body=excluded.body,link=excluded.link,type=excluded.type,read_at=null;

  return public.canopy_get_my_mission_hub();
end;
$$;

revoke all on function public.canopy_submit_mission_group(text) from public;
grant execute on function public.canopy_submit_mission_group(text) to authenticated;

-- Guidance to every current Mission participant. No unanswered invitation is accepted here.
insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
select distinct
  m.user_id,
  'mission_active_team_guidance',
  'Keep your WOMATE Mission moving',
  'If some teammates are not responding or are not actively contributing, do not pressure them and do not wait indefinitely. Work with the members who are active. Complete your own Mission part, submit your report and findings, and add the team evidence to the shared folder. In that folder, include a short factual contribution note listing who contributed and which listed team members did not contribute, without blame.

A completed and verifiable Mission can strengthen your consideration for future WOMATE funded projects, priority opportunities and upcoming programme surprises. This is consideration, not a guarantee of funding or selection.

If you have not accepted a Mission invitation, participation remains optional. WOMATE Team.',
  '/canopy/opportunities',
  'mission-active-guidance-oct08:'||m.user_id::text
from public.canopy_mission_group_members m
join public.canopy_mission_groups g on g.id=m.group_id
where m.invitation_status in('accepted','invited')
  and g.status in('inviting','active')
on conflict(fingerprint) do update
set title=excluded.title,
    body=excluded.body,
    link=excluded.link,
    type=excluded.type,
    read_at=null;

reset lock_timeout;
reset statement_timeout;
