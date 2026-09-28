-- WOMATE Canopy production hardening: talent privacy/reliability + mission auto-pair safety.
set lock_timeout='8s';
set statement_timeout='90s';

-- ---------------------------------------------------------------------------
-- TALENT NETWORK: make the reader truly read-only, enforce learner-only access,
-- reduce repeated per-profile scans, and prevent collaboration-request races.
-- ---------------------------------------------------------------------------

with ranked as (
  select id,
         row_number() over (
           partition by requester_id, recipient_id
           order by created_at asc, id asc
         ) as rn
  from public.canopy_collaboration_requests
  where status='pending'
)
delete from public.canopy_collaboration_requests r
using ranked d
where r.id=d.id and d.rn>1;

create unique index if not exists canopy_collab_one_pending_pair_idx
  on public.canopy_collaboration_requests(requester_id,recipient_id)
  where status='pending';

create or replace function public.canopy_get_talent_network()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  own public.canopy_talent_settings%rowtype;
  result jsonb;
  completed integer:=0;
  alum boolean:=false;
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  if not exists(select 1 from public.canopy_profiles p where p.user_id=auth.uid() and p.role='learner') then
    raise exception 'Learner access required.';
  end if;

  select * into own from public.canopy_talent_settings where user_id=auth.uid();
  completed:=public.canopy_talent_completed_modules(auth.uid());
  alum:=completed>=5;

  with latest as (
    select s.user_id,s.week_key,s.assessment_status,
           row_number() over(partition by s.user_id,s.week_key order by s.submitted_at desc,s.id desc) rn
    from public.canopy_assignment_submissions s
  ), completed_by_user as (
    select p.user_id,count(l.week_key)::integer completed_modules
    from public.canopy_profiles p
    left join latest l on l.user_id=p.user_id and l.rn=1 and l.assessment_status='completed'
    where p.role='learner'
    group by p.user_id
  ), spotlight_by_user as (
    select s.user_id,count(*)::integer spotlight_count
    from public.canopy_spotlight_nominations n
    join public.canopy_assignment_submissions s on s.id=n.submission_id
    where n.status='featured'
    group by s.user_id
  ), mission_by_user as (
    select distinct m.user_id
    from public.canopy_mission_group_members m
    join public.canopy_mission_groups g on g.id=m.group_id
    where m.invitation_status='accepted' and g.status='verified'
  ), directory_rows as (
    select p.user_id,p.full_name,p.country,t.headline,t.climate_interests,t.collaboration_open,
           (t.mentor_available and coalesce(c.completed_modules,0)>=5) mentor_available,
           coalesce(c.completed_modules,0) completed_modules,
           (coalesce(c.completed_modules,0)>=5) alumni,
           coalesce(s.spotlight_count,0) spotlight_count,
           (m.user_id is not null) verified_mission
    from public.canopy_profiles p
    join public.canopy_talent_settings t on t.user_id=p.user_id
    left join completed_by_user c on c.user_id=p.user_id
    left join spotlight_by_user s on s.user_id=p.user_id
    left join mission_by_user m on m.user_id=p.user_id
    where p.role='learner'
      and t.discoverable=true
      and coalesce(c.completed_modules,0)>=1
      and p.user_id<>auth.uid()
  )
  select jsonb_build_object(
    'me',jsonb_build_object(
      'discoverable',coalesce(own.discoverable,false),
      'mentor_available',coalesce(own.mentor_available,false) and alum,
      'collaboration_open',coalesce(own.collaboration_open,false),
      'headline',own.headline,
      'climate_interests',coalesce(own.climate_interests,'{}'::text[]),
      'completed_modules',completed,
      'alumni',alum
    ),
    'directory',coalesce((select jsonb_agg(to_jsonb(q) order by q.alumni desc,q.full_name) from directory_rows q),'[]'::jsonb),
    'incoming',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',r.id,'requester_id',r.requester_id,'requester_name',p.full_name,
        'requester_country',p.country,'message',r.message,'created_at',r.created_at
      ) order by r.created_at desc)
      from public.canopy_collaboration_requests r
      join public.canopy_profiles p on p.user_id=r.requester_id
      where r.recipient_id=auth.uid() and r.status='pending'
    ),'[]'::jsonb),
    'outgoing',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',r.id,'recipient_id',r.recipient_id,'recipient_name',p.full_name,
        'status',r.status,'message',r.message,'created_at',r.created_at
      ) order by r.created_at desc)
      from public.canopy_collaboration_requests r
      join public.canopy_profiles p on p.user_id=r.recipient_id
      where r.requester_id=auth.uid()
    ),'[]'::jsonb)
  ) into result;

  return result;
end;$$;
revoke all on function public.canopy_get_talent_network() from public;
grant execute on function public.canopy_get_talent_network() to authenticated;

create or replace function public.canopy_save_talent_settings(
  p_discoverable boolean,
  p_mentor_available boolean,
  p_collaboration_open boolean,
  p_headline text,
  p_interests text[]
)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
declare completed integer;
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  if not exists(select 1 from public.canopy_profiles p where p.user_id=auth.uid() and p.role='learner') then
    raise exception 'Learner access required.';
  end if;
  completed:=public.canopy_talent_completed_modules(auth.uid());
  if coalesce(p_discoverable,false) and completed<1 then
    raise exception 'Complete at least one Canopy module before joining the verified talent network.';
  end if;

  insert into public.canopy_talent_settings(
    user_id,discoverable,mentor_available,collaboration_open,headline,climate_interests,updated_at
  ) values(
    auth.uid(),coalesce(p_discoverable,false),coalesce(p_mentor_available,false) and completed>=5,
    coalesce(p_collaboration_open,false),nullif(left(trim(coalesce(p_headline,'')),120),''),
    coalesce(p_interests,'{}'),now()
  )
  on conflict(user_id) do update set
    discoverable=excluded.discoverable,
    mentor_available=excluded.mentor_available,
    collaboration_open=excluded.collaboration_open,
    headline=excluded.headline,
    climate_interests=excluded.climate_interests,
    updated_at=now();
end;$$;
revoke all on function public.canopy_save_talent_settings(boolean,boolean,boolean,text,text[]) from public;
grant execute on function public.canopy_save_talent_settings(boolean,boolean,boolean,text,text[]) to authenticated;

create or replace function public.canopy_send_collaboration_request(p_recipient uuid,p_message text)
returns uuid
language plpgsql
security definer
set search_path=public,auth
as $$
declare rid uuid; clean text:=trim(coalesce(p_message,'')); completed integer;
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  if not exists(select 1 from public.canopy_profiles p where p.user_id=auth.uid() and p.role='learner') then
    raise exception 'Learner access required.';
  end if;
  completed:=public.canopy_talent_completed_modules(auth.uid());
  if completed<1 then raise exception 'Complete at least one Canopy module before sending collaboration requests.'; end if;
  if p_recipient=auth.uid() then raise exception 'You cannot request collaboration with yourself.'; end if;
  if length(clean)<5 then raise exception 'Add a short collaboration note.'; end if;
  if length(clean)>600 then raise exception 'Keep the collaboration note under 600 characters.'; end if;
  if not exists(
    select 1
    from public.canopy_talent_settings t
    join public.canopy_profiles p on p.user_id=t.user_id and p.role='learner'
    where t.user_id=p_recipient and t.discoverable=true and t.collaboration_open=true
      and public.canopy_talent_completed_modules(t.user_id)>=1
  ) then raise exception 'This participant is not accepting collaboration requests.'; end if;
  if (select count(*) from public.canopy_collaboration_requests
      where requester_id=auth.uid() and created_at>now()-interval '24 hours')>=12 then
    raise exception 'You have reached today''s collaboration-request limit. Please try again later.';
  end if;

  insert into public.canopy_collaboration_requests(requester_id,recipient_id,message)
  values(auth.uid(),p_recipient,clean)
  on conflict (requester_id,recipient_id) where status='pending' do nothing
  returning id into rid;
  if rid is null then raise exception 'You already have a pending request with this participant.'; end if;

  insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
  select p_recipient,'collaboration_request','New Canopy collaboration request',
         coalesce(p.full_name,'A Canopy participant')||' would like to collaborate with you.',
         '/canopy/talent','talent-collab:'||rid::text
  from public.canopy_profiles p where p.user_id=auth.uid()
  on conflict(fingerprint) do nothing;
  return rid;
end;$$;
revoke all on function public.canopy_send_collaboration_request(uuid,text) from public;
grant execute on function public.canopy_send_collaboration_request(uuid,text) to authenticated;

create or replace function public.canopy_respond_collaboration_request(p_request uuid,p_accept boolean)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
declare r public.canopy_collaboration_requests%rowtype; clean text;
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  if not exists(select 1 from public.canopy_profiles p where p.user_id=auth.uid() and p.role='learner') then
    raise exception 'Learner access required.';
  end if;
  select * into r from public.canopy_collaboration_requests
  where id=p_request and recipient_id=auth.uid() and status='pending' for update;
  if r.id is null then raise exception 'Collaboration request unavailable.'; end if;
  clean:=case when coalesce(p_accept,false) then 'accepted' else 'declined' end;
  update public.canopy_collaboration_requests set status=clean,responded_at=now() where id=r.id;
  insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
  values(
    r.requester_id,'collaboration_response',
    case when clean='accepted' then 'Collaboration request accepted' else 'Collaboration request update' end,
    case when clean='accepted' then 'Your Canopy collaboration request was accepted. Continue coordinating through Canopy and any mutually agreed channels.' else 'Your Canopy collaboration request was declined.' end,
    '/canopy/talent','talent-collab-response:'||r.id::text
  )
  on conflict(fingerprint) do update set title=excluded.title,body=excluded.body,read_at=null,created_at=now();
end;$$;
revoke all on function public.canopy_respond_collaboration_request(uuid,boolean) from public;
grant execute on function public.canopy_respond_collaboration_request(uuid,boolean) to authenticated;

create or replace function public.canopy_admin_talent_network()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
begin
  if not public.canopy_is_manager(auth.uid()) then raise exception 'Manager access required.'; end if;
  return jsonb_build_object(
    'discoverable_count',(select count(*) from public.canopy_talent_settings t where t.discoverable=true and public.canopy_talent_completed_modules(t.user_id)>=1),
    'rows',coalesce((
      with latest as (
        select s.user_id,s.week_key,s.assessment_status,
               row_number() over(partition by s.user_id,s.week_key order by s.submitted_at desc,s.id desc) rn
        from public.canopy_assignment_submissions s
      ), completed_by_user as (
        select p.user_id,count(l.week_key)::integer completed_modules
        from public.canopy_profiles p
        left join latest l on l.user_id=p.user_id and l.rn=1 and l.assessment_status='completed'
        where p.role='learner'
        group by p.user_id
      ), spotlight_by_user as (
        select s.user_id,count(*)::integer spotlight_count
        from public.canopy_spotlight_nominations n
        join public.canopy_assignment_submissions s on s.id=n.submission_id
        where n.status='featured'
        group by s.user_id
      ), mission_by_user as (
        select distinct m.user_id
        from public.canopy_mission_group_members m
        join public.canopy_mission_groups g on g.id=m.group_id
        where m.invitation_status='accepted' and g.status='verified'
      )
      select jsonb_agg(to_jsonb(q) order by q.discoverable desc,q.full_name)
      from (
        select p.user_id,p.full_name,p.country,coalesce(t.discoverable,false) discoverable,
               coalesce(t.mentor_available,false) and coalesce(c.completed_modules,0)>=5 mentor_available,
               coalesce(t.collaboration_open,false) collaboration_open,t.headline,t.climate_interests,
               coalesce(c.completed_modules,0) completed_modules,
               coalesce(c.completed_modules,0)>=5 alumni,
               coalesce(s.spotlight_count,0) spotlight_count,
               (m.user_id is not null) verified_mission
        from public.canopy_profiles p
        left join public.canopy_talent_settings t on t.user_id=p.user_id
        left join completed_by_user c on c.user_id=p.user_id
        left join spotlight_by_user s on s.user_id=p.user_id
        left join mission_by_user m on m.user_id=p.user_id
        where p.role='learner'
      ) q
    ),'[]'::jsonb)
  );
end;$$;
revoke all on function public.canopy_admin_talent_network() from public;
grant execute on function public.canopy_admin_talent_network() to authenticated;

create or replace function public.canopy_admin_set_talent_visibility(p_user uuid,p_discoverable boolean,p_remark text)
returns void
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if not public.canopy_is_manager(auth.uid()) then raise exception 'Manager access required.'; end if;
  if not exists(select 1 from public.canopy_profiles p where p.user_id=p_user and p.role='learner') then
    raise exception 'Learner profile not found.';
  end if;
  if coalesce(p_discoverable,false) and public.canopy_talent_completed_modules(p_user)<1 then
    raise exception 'A learner must complete at least one Canopy module before becoming discoverable.';
  end if;
  insert into public.canopy_talent_settings(user_id,discoverable,moderation_note,updated_at)
  values(p_user,coalesce(p_discoverable,false),nullif(trim(coalesce(p_remark,'')),''),now())
  on conflict(user_id) do update set
    discoverable=excluded.discoverable,
    moderation_note=excluded.moderation_note,
    updated_at=now();
  insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
  values(
    p_user,'talent_visibility','Canopy talent profile visibility updated',
    case when p_discoverable then 'WOMATE has restored your talent profile visibility.' else 'WOMATE has hidden your talent profile from the participant directory. Your private Canopy data is unchanged.' end,
    '/canopy/talent','talent-visibility:'||p_user::text
  )
  on conflict(fingerprint) do update set body=excluded.body,read_at=null,created_at=now();
end;$$;
revoke all on function public.canopy_admin_set_talent_visibility(uuid,boolean,text) from public;
grant execute on function public.canopy_admin_set_talent_visibility(uuid,boolean,text) to authenticated;

-- ---------------------------------------------------------------------------
-- MISSION GROUPS: keep private helper RPCs private and serialize auto-pairing
-- so simultaneous Module 01 completions cannot race into duplicate groups.
-- ---------------------------------------------------------------------------

revoke execute on function public.canopy_module1_mission_eligible(uuid) from authenticated;

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
begin
  perform pg_advisory_xact_lock(hashtext('womate_canopy_mission_autopair')::bigint);

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

create or replace function public.canopy_autopair_after_module1_completed()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if new.week_key='module-01'
     and new.assessment_status='completed'
     and new.review_source='manual' then
    if tg_op='INSERT' then
      perform public.canopy_try_form_mission_groups();
    elsif old.assessment_status is distinct from new.assessment_status
       or old.review_source is distinct from new.review_source then
      perform public.canopy_try_form_mission_groups();
    end if;
  end if;
  return new;
end;$$;

-- Pick up any currently waiting eligible learners after the serialized pairing fix.
select public.canopy_try_form_mission_groups();

reset lock_timeout;
reset statement_timeout;
