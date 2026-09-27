-- WOMATE Canopy Phase 2: optional cross-country group missions
-- Eligibility: latest Module 01 attempt must be manually Completed.
-- Five learners from five different countries where a full group is possible.
-- Invitation is optional; accepting commits the learner to the group mission.
-- Mission deadline: Friday of Module 05, 23 October 2026 23:59 GMT.

set lock_timeout='8s';
set statement_timeout='90s';
create extension if not exists pgcrypto;

create table if not exists public.canopy_mission_groups(
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Cross-country climate mission',
  mission_choice text not null default 'standard' check(mission_choice in ('standard','custom')),
  custom_brief text,
  status text not null default 'inviting' check(status in ('inviting','active','submitted','verified')),
  evidence_folder_url text,
  submitted_at timestamptz,
  verified_at timestamptz,
  verified_by uuid,
  verification_remark text,
  deadline_at timestamptz not null default '2026-10-23 23:59:59+00'::timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.canopy_mission_group_members(
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.canopy_mission_groups(id) on delete cascade,
  user_id uuid not null,
  country text not null,
  seat_no integer not null check(seat_no between 1 and 5),
  mission_no integer not null check(mission_no between 1 and 5),
  invitation_status text not null default 'invited' check(invitation_status in ('invited','accepted','declined','replaced')),
  invited_at timestamptz not null default now(),
  responded_at timestamptz,
  unique(group_id,seat_no),
  unique(group_id,user_id)
);
create index if not exists canopy_mission_members_user_idx on public.canopy_mission_group_members(user_id,invitation_status);

create table if not exists public.canopy_mission_messages(
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.canopy_mission_groups(id) on delete cascade,
  user_id uuid not null,
  body text not null check(char_length(body) between 1 and 1200),
  created_at timestamptz not null default now()
);
create index if not exists canopy_mission_messages_group_idx on public.canopy_mission_messages(group_id,created_at);

create table if not exists public.canopy_mission_reports(
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.canopy_mission_groups(id) on delete cascade,
  user_id uuid not null,
  mission_no integer not null check(mission_no between 1 and 5),
  summary text not null check(char_length(summary) between 20 and 3000),
  proof_url text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(group_id,user_id),
  unique(group_id,mission_no)
);

alter table public.canopy_mission_groups enable row level security;
alter table public.canopy_mission_group_members enable row level security;
alter table public.canopy_mission_messages enable row level security;
alter table public.canopy_mission_reports enable row level security;

revoke all on public.canopy_mission_groups, public.canopy_mission_group_members, public.canopy_mission_messages, public.canopy_mission_reports from anon, authenticated;

create or replace function public.canopy_module1_mission_eligible(p_user uuid)
returns boolean language sql stable security definer set search_path=public,auth as $$
  with latest as (
    select s.assessment_status,s.review_source
    from public.canopy_assignment_submissions s
    where s.user_id=p_user and s.week_key='module-01'
    order by s.submitted_at desc,s.id desc limit 1
  )
  select exists(select 1 from latest where assessment_status='completed' and review_source='manual')
    and exists(select 1 from public.canopy_profiles p where p.user_id=p_user and p.role='learner' and nullif(trim(coalesce(p.country,'')),'') is not null);
$$;
revoke all on function public.canopy_module1_mission_eligible(uuid) from public;
grant execute on function public.canopy_module1_mission_eligible(uuid) to authenticated;

create or replace function public.canopy_notify_mission_invite(p_group uuid,p_user uuid)
returns void language plpgsql security definer set search_path=public,auth as $$
begin
  insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
  values(p_user,'mission_invite','A cross-country Canopy Mission is waiting for you',
    'You have been randomly matched into an optional five-woman cross-country mission group. Participation is optional. If you accept, you are committing to collaborate with your team and complete the shared mission by Friday of Module 05. Open Canopy to Accept or Decline.',
    '/canopy/opportunities','mission-invite:'||p_group::text||':'||p_user::text)
  on conflict(fingerprint) do update set title=excluded.title,body=excluded.body,link=excluded.link,type=excluded.type,read_at=null;
end;$$;
revoke all on function public.canopy_notify_mission_invite(uuid,uuid) from public;

create or replace function public.canopy_try_form_mission_groups()
returns integer language plpgsql security definer set search_path=public,auth as $$
declare
  formed integer:=0;
  g uuid;
  rec record;
  seat integer;
  picked integer;
begin
  loop
    select count(*) into picked from (
      select distinct lower(trim(p.country)) c
      from public.canopy_profiles p
      where p.role='learner'
        and public.canopy_module1_mission_eligible(p.user_id)
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

create or replace function public.canopy_refill_mission_seat(p_group uuid,p_seat integer,p_mission integer)
returns boolean language plpgsql security definer set search_path=public,auth as $$
declare rec record;
begin
  select p.user_id,p.country into rec
  from public.canopy_profiles p
  where p.role='learner'
    and public.canopy_module1_mission_eligible(p.user_id)
    and not exists(select 1 from public.canopy_mission_group_members x where x.user_id=p.user_id)
    and not exists(select 1 from public.canopy_mission_group_members x where x.group_id=p_group and x.invitation_status in('invited','accepted') and lower(trim(x.country))=lower(trim(p.country)))
  order by random() limit 1;
  if rec.user_id is null then return false; end if;
  insert into public.canopy_mission_group_members(group_id,user_id,country,seat_no,mission_no)
  values(p_group,rec.user_id,rec.country,p_seat,p_mission);
  perform public.canopy_notify_mission_invite(p_group,rec.user_id);
  return true;
end;$$;
revoke all on function public.canopy_refill_mission_seat(uuid,integer,integer) from public;

create or replace function public.canopy_get_my_mission_hub()
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare
  m public.canopy_mission_group_members%rowtype;
  g public.canopy_mission_groups%rowtype;
  eligible boolean:=false;
  result jsonb;
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  eligible:=public.canopy_module1_mission_eligible(auth.uid());
  select * into m from public.canopy_mission_group_members where user_id=auth.uid() order by invited_at desc limit 1;
  if m.id is null then return jsonb_build_object('eligible',eligible,'state',case when eligible then 'waiting' else 'locked' end); end if;
  select * into g from public.canopy_mission_groups where id=m.group_id;
  result:=jsonb_build_object(
    'eligible',eligible,'state',m.invitation_status,'member',to_jsonb(m),'group',to_jsonb(g),
    'members',case when m.invitation_status='accepted' then coalesce((select jsonb_agg(jsonb_build_object('user_id',x.user_id,'name',coalesce(p.full_name,'Learner'),'country',x.country,'seat_no',x.seat_no,'mission_no',x.mission_no,'status',x.invitation_status) order by x.seat_no) from public.canopy_mission_group_members x left join public.canopy_profiles p on p.user_id=x.user_id where x.group_id=m.group_id and x.invitation_status in('invited','accepted')),'[]'::jsonb) else '[]'::jsonb end,
    'messages',case when m.invitation_status='accepted' then coalesce((select jsonb_agg(z order by z.created_at) from (select msg.id,msg.body,msg.created_at,msg.user_id,coalesce(p.full_name,'Learner') sender_name from public.canopy_mission_messages msg left join public.canopy_profiles p on p.user_id=msg.user_id where msg.group_id=m.group_id order by msg.created_at desc limit 80) z),'[]'::jsonb) else '[]'::jsonb end,
    'reports',case when m.invitation_status='accepted' then coalesce((select jsonb_agg(jsonb_build_object('user_id',r.user_id,'mission_no',r.mission_no,'summary',r.summary,'proof_url',r.proof_url,'submitted_at',r.submitted_at,'name',coalesce(p.full_name,'Learner')) order by r.mission_no) from public.canopy_mission_reports r left join public.canopy_profiles p on p.user_id=r.user_id where r.group_id=m.group_id),'[]'::jsonb) else '[]'::jsonb end
  );
  return result;
end;$$;
revoke all on function public.canopy_get_my_mission_hub() from public;
grant execute on function public.canopy_get_my_mission_hub() to authenticated;

create or replace function public.canopy_respond_mission_invite(p_accept boolean)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare m public.canopy_mission_group_members%rowtype; accepted_count integer; replacement boolean;
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  select * into m from public.canopy_mission_group_members where user_id=auth.uid() and invitation_status='invited' order by invited_at desc limit 1 for update;
  if m.id is null then raise exception 'No active mission invitation was found.'; end if;
  if p_accept then
    update public.canopy_mission_group_members set invitation_status='accepted',responded_at=now() where id=m.id;
    select count(*) into accepted_count from public.canopy_mission_group_members where group_id=m.group_id and invitation_status='accepted';
    if accepted_count=5 then
      update public.canopy_mission_groups set status='active',updated_at=now() where id=m.group_id;
      insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
      select user_id,'mission_group_ready','Your Canopy Mission team is ready','All five members have accepted. Open your private mission group, meet your team and begin planning together.','/canopy/opportunities','mission-ready:'||m.group_id::text||':'||user_id::text
      from public.canopy_mission_group_members where group_id=m.group_id and invitation_status='accepted'
      on conflict(fingerprint) do nothing;
    end if;
  else
    update public.canopy_mission_group_members set invitation_status='declined',responded_at=now() where id=m.id;
    replacement:=public.canopy_refill_mission_seat(m.group_id,m.seat_no,m.mission_no);
  end if;
  return public.canopy_get_my_mission_hub();
end;$$;
revoke all on function public.canopy_respond_mission_invite(boolean) from public;
grant execute on function public.canopy_respond_mission_invite(boolean) to authenticated;

create or replace function public.canopy_send_mission_message(p_body text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare gid uuid; clean text:=trim(coalesce(p_body,''));
begin
  if char_length(clean)<1 or char_length(clean)>1200 then raise exception 'Message must be between 1 and 1200 characters.'; end if;
  select group_id into gid from public.canopy_mission_group_members where user_id=auth.uid() and invitation_status='accepted' order by invited_at desc limit 1;
  if gid is null then raise exception 'Accept your mission invitation before using the private group chat.'; end if;
  insert into public.canopy_mission_messages(group_id,user_id,body) values(gid,auth.uid(),clean);
  return public.canopy_get_my_mission_hub();
end;$$;
revoke all on function public.canopy_send_mission_message(text) from public;
grant execute on function public.canopy_send_mission_message(text) to authenticated;

create or replace function public.canopy_update_mission_group(p_name text,p_choice text,p_custom_brief text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare gid uuid; clean_name text:=left(trim(coalesce(p_name,'')),100); choice text:=lower(coalesce(p_choice,'standard'));
begin
  select group_id into gid from public.canopy_mission_group_members where user_id=auth.uid() and invitation_status='accepted' order by invited_at desc limit 1;
  if gid is null then raise exception 'Mission group access is required.'; end if;
  if choice not in('standard','custom') then raise exception 'Choose standard or custom mission.'; end if;
  if clean_name='' then clean_name:='Cross-country climate mission'; end if;
  if choice='custom' and char_length(trim(coalesce(p_custom_brief,'')))<20 then raise exception 'Describe your custom mission in at least 20 characters.'; end if;
  update public.canopy_mission_groups set name=clean_name,mission_choice=choice,custom_brief=case when choice='custom' then left(trim(p_custom_brief),1200) else null end,updated_at=now() where id=gid and status in('inviting','active');
  return public.canopy_get_my_mission_hub();
end;$$;
revoke all on function public.canopy_update_mission_group(text,text,text) from public;
grant execute on function public.canopy_update_mission_group(text,text,text) to authenticated;

create or replace function public.canopy_submit_mission_report(p_summary text,p_proof_url text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare m public.canopy_mission_group_members%rowtype; clean text:=trim(coalesce(p_summary,''));
begin
  select * into m from public.canopy_mission_group_members where user_id=auth.uid() and invitation_status='accepted' order by invited_at desc limit 1;
  if m.id is null then raise exception 'Mission group access is required.'; end if;
  if now()>(select deadline_at from public.canopy_mission_groups where id=m.group_id) then raise exception 'The group mission submission window has closed.'; end if;
  if char_length(clean)<20 then raise exception 'Add a short report of at least 20 characters.'; end if;
  if coalesce(trim(p_proof_url),'')<>'' and trim(p_proof_url)!~* '^https?://' then raise exception 'Proof link must be a valid web link.'; end if;
  insert into public.canopy_mission_reports(group_id,user_id,mission_no,summary,proof_url)
  values(m.group_id,auth.uid(),m.mission_no,clean,nullif(trim(p_proof_url),''))
  on conflict(group_id,user_id) do update set summary=excluded.summary,proof_url=excluded.proof_url,updated_at=now();
  return public.canopy_get_my_mission_hub();
end;$$;
revoke all on function public.canopy_submit_mission_report(text,text) from public;
grant execute on function public.canopy_submit_mission_report(text,text) to authenticated;

create or replace function public.canopy_submit_mission_group(p_folder_url text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare gid uuid; accepted_count integer; report_count integer; deadline timestamptz;
begin
  select group_id into gid from public.canopy_mission_group_members where user_id=auth.uid() and invitation_status='accepted' order by invited_at desc limit 1;
  if gid is null then raise exception 'Mission group access is required.'; end if;
  select deadline_at into deadline from public.canopy_mission_groups where id=gid;
  if now()>deadline then raise exception 'The group mission submission window has closed.'; end if;
  if coalesce(trim(p_folder_url),'')!~* '^https?://' then raise exception 'Add the shared mission evidence folder link.'; end if;
  select count(*) into accepted_count from public.canopy_mission_group_members where group_id=gid and invitation_status='accepted';
  select count(distinct mission_no) into report_count from public.canopy_mission_reports where group_id=gid;
  if accepted_count<>5 then raise exception 'All five mission members must accept before the group can submit.'; end if;
  if report_count<>5 then raise exception 'All five mission leads must submit their report before the group can submit.'; end if;
  update public.canopy_mission_groups set evidence_folder_url=trim(p_folder_url),status='submitted',submitted_at=now(),updated_at=now() where id=gid;
  insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
  select p.user_id,'mission_admin','Mission group ready for WOMATE verification','A cross-country Canopy Mission group has submitted its complete evidence folder for verification.','/canopy/manage/missions','mission-admin:'||gid::text||':'||p.user_id::text
  from public.canopy_profiles p where p.role in('manager','admin')
  on conflict(fingerprint) do nothing;
  return public.canopy_get_my_mission_hub();
end;$$;
revoke all on function public.canopy_submit_mission_group(text) from public;
grant execute on function public.canopy_submit_mission_group(text) to authenticated;

create or replace function public.canopy_admin_mission_groups()
returns jsonb language plpgsql security definer set search_path=public,auth as $$
begin
  if not public.canopy_is_manager(auth.uid()) then raise exception 'Programme Manager access required.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id',g.id,'name',g.name,'mission_choice',g.mission_choice,'custom_brief',g.custom_brief,'status',g.status,'deadline_at',g.deadline_at,'evidence_folder_url',g.evidence_folder_url,'submitted_at',g.submitted_at,'verified_at',g.verified_at,'verification_remark',g.verification_remark,
    'members',(select coalesce(jsonb_agg(jsonb_build_object('user_id',m.user_id,'name',coalesce(p.full_name,'Learner'),'country',m.country,'mission_no',m.mission_no,'status',m.invitation_status) order by m.seat_no),'[]'::jsonb) from public.canopy_mission_group_members m left join public.canopy_profiles p on p.user_id=m.user_id where m.group_id=g.id and m.invitation_status<>'replaced'),
    'reports',(select coalesce(jsonb_agg(jsonb_build_object('mission_no',r.mission_no,'name',coalesce(p.full_name,'Learner'),'summary',r.summary,'proof_url',r.proof_url) order by r.mission_no),'[]'::jsonb) from public.canopy_mission_reports r left join public.canopy_profiles p on p.user_id=r.user_id where r.group_id=g.id)
  ) order by g.created_at desc) from public.canopy_mission_groups g),'[]'::jsonb);
end;$$;
revoke all on function public.canopy_admin_mission_groups() from public;
grant execute on function public.canopy_admin_mission_groups() to authenticated;

create or replace function public.canopy_admin_review_mission_group(p_group uuid,p_decision text,p_remark text default null)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare decision text:=lower(coalesce(p_decision,''));
begin
  if not public.canopy_is_manager(auth.uid()) then raise exception 'Programme Manager access required.'; end if;
  if decision not in('verified','revision_required') then raise exception 'Decision must be verified or revision_required.'; end if;
  if decision='verified' then
    update public.canopy_mission_groups set status='verified',verified_at=now(),verified_by=auth.uid(),verification_remark=nullif(trim(p_remark),''),updated_at=now() where id=p_group and status='submitted';
  else
    update public.canopy_mission_groups set status='active',verified_at=null,verified_by=auth.uid(),verification_remark=nullif(trim(p_remark),''),updated_at=now() where id=p_group and status='submitted';
  end if;
  insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
  select m.user_id,'mission_review',case when decision='verified' then 'Your cross-country mission is WOMATE verified' else 'Your mission group needs one more update' end,
    case when decision='verified' then 'WOMATE has verified your group mission. The verified mission record is now available in your Canopy Impact Profile.' else 'WOMATE reviewed your group mission and requested an update. Open your private mission group to review the note and resubmit.' end || case when nullif(trim(p_remark),'') is not null then ' Note: '||trim(p_remark) else '' end,
    case when decision='verified' then '/canopy/portfolio' else '/canopy/opportunities' end,
    'mission-review:'||p_group::text||':'||m.user_id::text||':'||decision
  from public.canopy_mission_group_members m where m.group_id=p_group and m.invitation_status='accepted'
  on conflict(fingerprint) do update set body=excluded.body,title=excluded.title,link=excluded.link,read_at=null;
  return public.canopy_admin_mission_groups();
end;$$;
revoke all on function public.canopy_admin_review_mission_group(uuid,text,text) from public;
grant execute on function public.canopy_admin_review_mission_group(uuid,text,text) to authenticated;

-- Backfill and randomly form full five-country groups from learners already eligible.
select public.canopy_try_form_mission_groups();

reset lock_timeout;
reset statement_timeout;