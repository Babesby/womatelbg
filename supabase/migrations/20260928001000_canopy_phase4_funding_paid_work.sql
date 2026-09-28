-- WOMATE Canopy Phase 4: microgrants, sponsored challenges and paid climate work
set lock_timeout='8s';
set statement_timeout='90s';
create extension if not exists pgcrypto;

create table if not exists public.canopy_funding_calls(
  id uuid primary key default gen_random_uuid(),
  title text not null,
  sponsor text not null,
  call_type text not null check(call_type in ('microgrant','sponsored_challenge','paid_mission')),
  summary text not null,
  deliverable text not null,
  amount_text text,
  url text,
  country text,
  global boolean not null default false,
  participation_mode text not null default 'individual' check(participation_mode in ('individual','group','either')),
  deadline_at timestamptz,
  min_module_no integer not null default 1 check(min_module_no between 0 and 5),
  requires_spotlight boolean not null default false,
  requires_verified_mission boolean not null default false,
  slots integer not null default 1 check(slots between 1 and 10000),
  featured boolean not null default false,
  published boolean not null default false,
  archived boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index if not exists canopy_funding_calls_live_idx on public.canopy_funding_calls(published,archived,deadline_at);

create table if not exists public.canopy_funding_applications(
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.canopy_funding_calls(id) on delete cascade,
  user_id uuid not null,
  pitch text not null,
  plan text not null,
  evidence_url text,
  status text not null default 'submitted' check(status in ('submitted','shortlisted','selected','not_selected','completed','withdrawn')),
  admin_remark text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  unique(call_id,user_id)
);
create index if not exists canopy_funding_applications_call_idx on public.canopy_funding_applications(call_id,status,created_at desc);
create index if not exists canopy_funding_applications_user_idx on public.canopy_funding_applications(user_id,created_at desc);

alter table public.canopy_funding_calls enable row level security;
alter table public.canopy_funding_applications enable row level security;
revoke all on public.canopy_funding_calls,public.canopy_funding_applications from anon,authenticated;

create or replace function public.canopy_funding_call_matches(p_user uuid,p_call uuid)
returns boolean language plpgsql stable security definer set search_path=public,auth as $$
declare
  c public.canopy_funding_calls%rowtype;
  learner_country text;
  completed_modules integer:=0;
  spotlight_count integer:=0;
  mission_ok boolean:=false;
begin
  select * into c from public.canopy_funding_calls where id=p_call and published=true and archived=false;
  if c.id is null then return false; end if;
  if c.deadline_at is not null and c.deadline_at<=now() then return false; end if;
  select country into learner_country from public.canopy_profiles where user_id=p_user;
  with ranked as (
    select s.week_key,s.assessment_status,row_number() over(partition by s.week_key order by s.submitted_at desc,s.id desc) rn
    from public.canopy_assignment_submissions s where s.user_id=p_user
  ) select count(*) into completed_modules from ranked where rn=1 and assessment_status='completed';
  select count(*) into spotlight_count
  from public.canopy_spotlight_nominations n join public.canopy_assignment_submissions s on s.id=n.submission_id
  where s.user_id=p_user and n.status='featured';
  select exists(
    select 1 from public.canopy_mission_group_members m join public.canopy_mission_groups g on g.id=m.group_id
    where m.user_id=p_user and m.invitation_status='accepted' and g.status='verified'
  ) into mission_ok;
  return (c.global or nullif(trim(coalesce(c.country,'')),'') is null or lower(trim(c.country))=lower(trim(coalesce(learner_country,''))))
    and completed_modules>=coalesce(c.min_module_no,0)
    and (not c.requires_spotlight or spotlight_count>0)
    and (not c.requires_verified_mission or mission_ok);
end;$$;
revoke all on function public.canopy_funding_call_matches(uuid,uuid) from public;

create or replace function public.canopy_get_my_funding_calls()
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare items jsonb;
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  select coalesce(jsonb_agg(
    to_jsonb(c) || jsonb_build_object(
      'matched',public.canopy_funding_call_matches(auth.uid(),c.id),
      'application',(select to_jsonb(a) from public.canopy_funding_applications a where a.call_id=c.id and a.user_id=auth.uid())
    ) order by c.featured desc,coalesce(c.deadline_at,'9999-12-31'::timestamptz),c.created_at desc
  ),'[]'::jsonb)
  into items
  from public.canopy_funding_calls c
  where c.published=true and c.archived=false and (c.deadline_at is null or c.deadline_at>now());
  return jsonb_build_object('calls',items);
end;$$;
revoke all on function public.canopy_get_my_funding_calls() from public;
grant execute on function public.canopy_get_my_funding_calls() to authenticated;

create or replace function public.canopy_submit_funding_application(p_call uuid,p_pitch text,p_plan text,p_evidence_url text default null)
returns public.canopy_funding_applications language plpgsql security definer set search_path=public,auth as $$
declare saved public.canopy_funding_applications%rowtype; prior public.canopy_funding_applications%rowtype;
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  if not public.canopy_funding_call_matches(auth.uid(),p_call) then raise exception 'Your current Canopy record does not meet this call''s eligibility.'; end if;
  if char_length(trim(coalesce(p_pitch,'')))<40 then raise exception 'Tell WOMATE a little more about why you are a strong fit.'; end if;
  if char_length(trim(coalesce(p_plan,'')))<40 then raise exception 'Add a practical plan for what you would do or deliver.'; end if;
  if nullif(trim(coalesce(p_evidence_url,'')),'') is not null and trim(p_evidence_url) !~* '^https?://' then raise exception 'Use a valid evidence link beginning with http:// or https://.'; end if;
  select * into prior from public.canopy_funding_applications where call_id=p_call and user_id=auth.uid();
  if prior.id is not null and prior.status not in ('submitted','withdrawn') then raise exception 'This application is already under WOMATE review and can no longer be edited.'; end if;
  insert into public.canopy_funding_applications(call_id,user_id,pitch,plan,evidence_url,status,updated_at)
  values(p_call,auth.uid(),trim(p_pitch),trim(p_plan),nullif(trim(coalesce(p_evidence_url,'')),''),'submitted',now())
  on conflict(call_id,user_id) do update set pitch=excluded.pitch,plan=excluded.plan,evidence_url=excluded.evidence_url,status='submitted',admin_remark=null,updated_at=now(),reviewed_at=null,reviewed_by=null
  returning * into saved;
  return saved;
end;$$;
revoke all on function public.canopy_submit_funding_application(uuid,text,text,text) from public;
grant execute on function public.canopy_submit_funding_application(uuid,text,text,text) to authenticated;

create or replace function public.canopy_withdraw_funding_application(p_call uuid)
returns void language plpgsql security definer set search_path=public,auth as $$
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  update public.canopy_funding_applications set status='withdrawn',updated_at=now()
  where call_id=p_call and user_id=auth.uid() and status='submitted';
end;$$;
revoke all on function public.canopy_withdraw_funding_application(uuid) from public;
grant execute on function public.canopy_withdraw_funding_application(uuid) to authenticated;

create or replace function public.canopy_admin_funding_calls()
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare items jsonb;
begin
  if not public.canopy_is_manager(auth.uid()) then raise exception 'Manager access required.'; end if;
  select coalesce(jsonb_agg(to_jsonb(q) order by q.archived,q.published desc,q.featured desc,q.created_at desc),'[]'::jsonb) into items
  from (
    select c.*,(select count(*) from public.canopy_funding_applications a where a.call_id=c.id and a.status<>'withdrawn') application_count
    from public.canopy_funding_calls c
  ) q;
  return items;
end;$$;
revoke all on function public.canopy_admin_funding_calls() from public;
grant execute on function public.canopy_admin_funding_calls() to authenticated;

create or replace function public.canopy_admin_save_funding_call(
  p_id uuid,p_title text,p_sponsor text,p_type text,p_summary text,p_deliverable text,p_amount_text text,p_url text,p_country text,p_global boolean,p_participation_mode text,p_deadline_at timestamptz,p_min_module_no integer,p_requires_spotlight boolean,p_requires_verified_mission boolean,p_slots integer,p_featured boolean,p_published boolean
) returns public.canopy_funding_calls language plpgsql security definer set search_path=public,auth as $$
declare saved public.canopy_funding_calls%rowtype; clean_type text:=lower(trim(coalesce(p_type,''))); clean_mode text:=lower(trim(coalesce(p_participation_mode,'')));
begin
  if not public.canopy_is_manager(auth.uid()) then raise exception 'Manager access required.'; end if;
  if clean_type not in ('microgrant','sponsored_challenge','paid_mission') then raise exception 'Choose a valid funding call type.'; end if;
  if clean_mode not in ('individual','group','either') then clean_mode:='individual'; end if;
  if char_length(trim(coalesce(p_title,'')))<3 then raise exception 'Add a title.'; end if;
  if char_length(trim(coalesce(p_sponsor,'')))<2 then raise exception 'Add the sponsor or organisation.'; end if;
  if char_length(trim(coalesce(p_summary,'')))<20 then raise exception 'Add a useful summary.'; end if;
  if char_length(trim(coalesce(p_deliverable,'')))<15 then raise exception 'Describe the expected deliverable.'; end if;
  if nullif(trim(coalesce(p_url,'')),'') is not null and trim(p_url) !~* '^https?://' then raise exception 'Use a valid external brief URL.'; end if;
  if p_id is null then
    insert into public.canopy_funding_calls(title,sponsor,call_type,summary,deliverable,amount_text,url,country,global,participation_mode,deadline_at,min_module_no,requires_spotlight,requires_verified_mission,slots,featured,published,published_at,created_by)
    values(trim(p_title),trim(p_sponsor),clean_type,trim(p_summary),trim(p_deliverable),nullif(trim(coalesce(p_amount_text,'')),''),nullif(trim(coalesce(p_url,'')),''),nullif(trim(coalesce(p_country,'')),''),coalesce(p_global,false),clean_mode,p_deadline_at,greatest(0,least(5,coalesce(p_min_module_no,1))),coalesce(p_requires_spotlight,false),coalesce(p_requires_verified_mission,false),greatest(1,least(10000,coalesce(p_slots,1))),coalesce(p_featured,false),coalesce(p_published,false),case when coalesce(p_published,false) then now() else null end,auth.uid()) returning * into saved;
  else
    update public.canopy_funding_calls set title=trim(p_title),sponsor=trim(p_sponsor),call_type=clean_type,summary=trim(p_summary),deliverable=trim(p_deliverable),amount_text=nullif(trim(coalesce(p_amount_text,'')),''),url=nullif(trim(coalesce(p_url,'')),''),country=nullif(trim(coalesce(p_country,'')),''),global=coalesce(p_global,false),participation_mode=clean_mode,deadline_at=p_deadline_at,min_module_no=greatest(0,least(5,coalesce(p_min_module_no,1))),requires_spotlight=coalesce(p_requires_spotlight,false),requires_verified_mission=coalesce(p_requires_verified_mission,false),slots=greatest(1,least(10000,coalesce(p_slots,1))),featured=coalesce(p_featured,false),published=coalesce(p_published,false),published_at=case when coalesce(p_published,false) and published_at is null then now() when not coalesce(p_published,false) then null else published_at end,updated_at=now()
    where id=p_id returning * into saved;
    if saved.id is null then raise exception 'Funding call not found.'; end if;
  end if;
  return saved;
end;$$;
revoke all on function public.canopy_admin_save_funding_call(uuid,text,text,text,text,text,text,text,text,boolean,text,timestamptz,integer,boolean,boolean,integer,boolean,boolean) from public;
grant execute on function public.canopy_admin_save_funding_call(uuid,text,text,text,text,text,text,text,text,boolean,text,timestamptz,integer,boolean,boolean,integer,boolean,boolean) to authenticated;

create or replace function public.canopy_admin_funding_applications(p_call uuid)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare items jsonb;
begin
  if not public.canopy_is_manager(auth.uid()) then raise exception 'Manager access required.'; end if;
  select coalesce(jsonb_agg(to_jsonb(q) order by case q.status when 'selected' then 1 when 'shortlisted' then 2 when 'submitted' then 3 when 'completed' then 4 else 5 end,q.created_at),'[]'::jsonb) into items
  from (
    select a.*,p.full_name,p.country,u.email
    from public.canopy_funding_applications a
    left join public.canopy_profiles p on p.user_id=a.user_id
    left join auth.users u on u.id=a.user_id
    where a.call_id=p_call and a.status<>'withdrawn'
  ) q;
  return items;
end;$$;
revoke all on function public.canopy_admin_funding_applications(uuid) from public;
grant execute on function public.canopy_admin_funding_applications(uuid) to authenticated;

create or replace function public.canopy_admin_update_funding_application(p_application uuid,p_status text,p_remark text default null)
returns void language plpgsql security definer set search_path=public,auth as $$
declare a public.canopy_funding_applications%rowtype; c public.canopy_funding_calls%rowtype; clean_status text:=lower(trim(coalesce(p_status,''))); note_title text; note_body text;
begin
  if not public.canopy_is_manager(auth.uid()) then raise exception 'Manager access required.'; end if;
  if clean_status not in ('submitted','shortlisted','selected','not_selected','completed') then raise exception 'Invalid application status.'; end if;
  select * into a from public.canopy_funding_applications where id=p_application;
  if a.id is null then raise exception 'Application not found.'; end if;
  select * into c from public.canopy_funding_calls where id=a.call_id;
  if clean_status='selected' and (select count(*) from public.canopy_funding_applications x where x.call_id=a.call_id and x.id<>a.id and x.status in ('selected','completed'))>=c.slots then raise exception 'All available places for this call are already filled.'; end if;
  update public.canopy_funding_applications set status=clean_status,admin_remark=nullif(trim(coalesce(p_remark,'')),''),updated_at=now(),reviewed_at=now(),reviewed_by=auth.uid() where id=p_application returning * into a;
  note_title:=case clean_status when 'shortlisted' then 'You have been shortlisted' when 'selected' then 'You have been selected' when 'not_selected' then 'Funding application update' when 'completed' then 'Funded work completed' else 'Funding application updated' end;
  note_body:=case clean_status
    when 'shortlisted' then c.title||': WOMATE has shortlisted your application. Check the funding area for your latest status.'
    when 'selected' then c.title||': WOMATE has selected your application. Check the funding area and follow the next instructions from the team.'
    when 'not_selected' then c.title||': WOMATE has completed this review. Check the funding area for your status and any note from the team.'
    when 'completed' then c.title||': WOMATE has marked this funded work complete.'
    else c.title||': your application status has been updated.' end;
  insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
  values(a.user_id,'funding_application',note_title,note_body,'/canopy/funding','funding-application:'||a.id::text||':'||clean_status)
  on conflict(fingerprint) do update set title=excluded.title,body=excluded.body,link=excluded.link,type=excluded.type,read_at=null;
end;$$;
revoke all on function public.canopy_admin_update_funding_application(uuid,text,text) from public;
grant execute on function public.canopy_admin_update_funding_application(uuid,text,text) to authenticated;

create or replace function public.canopy_admin_notify_funding_call(p_call uuid)
returns integer language plpgsql security definer set search_path=public,auth as $$
declare r record; sent integer:=0; c public.canopy_funding_calls%rowtype;
begin
  if not public.canopy_is_manager(auth.uid()) then raise exception 'Manager access required.'; end if;
  select * into c from public.canopy_funding_calls where id=p_call and published=true and archived=false;
  if c.id is null then raise exception 'Publish the call before notifying learners.'; end if;
  for r in select p.user_id from public.canopy_profiles p where p.role='learner' and public.canopy_funding_call_matches(p.user_id,p_call)
  loop
    insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
    values(r.user_id,'funding_call','A funded Canopy opportunity may fit you',c.title||' from '||c.sponsor||' is open and your current Canopy record meets the eligibility set for this call.','/canopy/funding','funding-call:'||p_call::text||':'||r.user_id::text)
    on conflict(fingerprint) do update set title=excluded.title,body=excluded.body,link=excluded.link,type=excluded.type,read_at=null;
    sent:=sent+1;
  end loop;
  return sent;
end;$$;
revoke all on function public.canopy_admin_notify_funding_call(uuid) from public;
grant execute on function public.canopy_admin_notify_funding_call(uuid) to authenticated;
