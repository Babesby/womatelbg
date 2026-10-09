-- WOMATE Canopy · Mission Operations + individual Mission Completed recognition
-- 2026-10-08
set lock_timeout='8s';
set statement_timeout='120s';
create extension if not exists pgcrypto;

create table if not exists public.canopy_mission_completions(
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.canopy_mission_groups(id) on delete cascade,
  user_id uuid not null,
  report_id uuid references public.canopy_mission_reports(id) on delete set null,
  status text not null default 'completed' check(status in('completed','revoked')),
  remark text,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(group_id,user_id)
);
create index if not exists canopy_mission_completions_user_idx on public.canopy_mission_completions(user_id,status,approved_at desc);
alter table public.canopy_mission_completions enable row level security;
revoke all on public.canopy_mission_completions from anon,authenticated;

create or replace function public.canopy_has_completed_mission(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path=public,auth
as $$
  select exists(
    select 1 from public.canopy_mission_completions c
    where c.user_id=p_user and c.status='completed'
  );
$$;
revoke all on function public.canopy_has_completed_mission(uuid) from public;

create or replace function public.canopy_get_my_mission_completion()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare item jsonb;
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  select to_jsonb(c) into item
  from public.canopy_mission_completions c
  where c.user_id=auth.uid() and c.status='completed'
  order by c.approved_at desc nulls last,c.created_at desc
  limit 1;
  return coalesce(item,'{}'::jsonb);
end;
$$;
revoke all on function public.canopy_get_my_mission_completion() from public;
grant execute on function public.canopy_get_my_mission_completion() to authenticated;

create or replace function public.canopy_admin_mission_groups()
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if not public.canopy_is_manager(auth.uid()) then raise exception 'Programme Manager access required.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id',g.id,'name',g.name,'mission_choice',g.mission_choice,'custom_brief',g.custom_brief,'status',g.status,
    'deadline_at',g.deadline_at,'evidence_folder_url',g.evidence_folder_url,'submitted_at',g.submitted_at,
    'verified_at',g.verified_at,'verification_remark',g.verification_remark,
    'members',(select coalesce(jsonb_agg(jsonb_build_object(
      'user_id',m.user_id,'name',coalesce(p.full_name,'Learner'),'country',m.country,
      'mission_no',m.mission_no,'status',m.invitation_status
    ) order by m.seat_no),'[]'::jsonb)
      from public.canopy_mission_group_members m
      left join public.canopy_profiles p on p.user_id=m.user_id
      where m.group_id=g.id and m.invitation_status<>'replaced'),
    'reports',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',r.id,'user_id',r.user_id,'mission_no',r.mission_no,'name',coalesce(p.full_name,'Learner'),
      'country',coalesce(p.country,''),'summary',r.summary,'proof_url',r.proof_url,
      'submitted_at',r.submitted_at,'updated_at',r.updated_at
    ) order by r.submitted_at desc),'[]'::jsonb)
      from public.canopy_mission_reports r
      left join public.canopy_profiles p on p.user_id=r.user_id
      where r.group_id=g.id),
    'completions',(select coalesce(jsonb_agg(to_jsonb(c) order by c.approved_at desc nulls last),'[]'::jsonb)
      from public.canopy_mission_completions c where c.group_id=g.id)
  ) order by
    case g.status when 'submitted' then 0 when 'active' then 1 when 'inviting' then 2 when 'verified' then 3 else 4 end,
    coalesce(g.submitted_at,g.updated_at,g.created_at) desc
  ) from public.canopy_mission_groups g),'[]'::jsonb);
end;
$$;
revoke all on function public.canopy_admin_mission_groups() from public;
grant execute on function public.canopy_admin_mission_groups() to authenticated;

create or replace function public.canopy_admin_review_mission_contributor(
  p_group uuid,p_user uuid,p_decision text,p_remark text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  decision text:=lower(trim(coalesce(p_decision,'')));
  report_row public.canopy_mission_reports%rowtype;
begin
  if not public.canopy_is_manager(auth.uid()) then raise exception 'Programme Manager access required.'; end if;
  if decision not in('completed','revoked') then raise exception 'Decision must be completed or revoked.'; end if;
  if not exists(select 1 from public.canopy_mission_group_members m where m.group_id=p_group and m.user_id=p_user and m.invitation_status='accepted')
    then raise exception 'This learner is not an accepted member of this Mission team.'; end if;

  select * into report_row from public.canopy_mission_reports
  where group_id=p_group and user_id=p_user
  order by updated_at desc,submitted_at desc limit 1;

  if decision='completed' and report_row.id is null then
    raise exception 'Review the learner''s individual Mission report before awarding Mission Completed.';
  end if;

  insert into public.canopy_mission_completions(group_id,user_id,report_id,status,remark,approved_by,approved_at,updated_at)
  values(p_group,p_user,report_row.id,decision,nullif(trim(coalesce(p_remark,'')),''),auth.uid(),case when decision='completed' then now() else null end,now())
  on conflict(group_id,user_id) do update
  set report_id=excluded.report_id,status=excluded.status,remark=excluded.remark,approved_by=excluded.approved_by,
      approved_at=excluded.approved_at,updated_at=now();

  insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
  values(
    p_user,
    'mission_completion',
    case when decision='completed' then 'Mission Completed · WOMATE verified' else 'Your Mission completion record was updated' end,
    case when decision='completed'
      then 'WOMATE reviewed your individual Mission contribution and approved it as Mission Completed. Your Impact Profile now carries the WOMATE-verified Mission Completed recognition. This recognition can be used as a priority signal for WOMATE opportunities and funding calls that require verified Mission experience.'
      else 'WOMATE updated your Mission completion record. The Mission Completed recognition is no longer active on your Impact Profile.'
    end || case when nullif(trim(coalesce(p_remark,'')),'') is not null then ' Note: '||trim(p_remark) else '' end,
    '/canopy/portfolio',
    'mission-contributor-review:'||p_group::text||':'||p_user::text||':'||decision
  )
  on conflict(fingerprint) do update
  set title=excluded.title,body=excluded.body,link=excluded.link,type=excluded.type,read_at=null;

  return public.canopy_admin_mission_groups();
end;
$$;
revoke all on function public.canopy_admin_review_mission_contributor(uuid,uuid,text,text) from public;
grant execute on function public.canopy_admin_review_mission_contributor(uuid,uuid,text,text) to authenticated;

-- Final team verification is evidence QA. It no longer implies every accepted member
-- automatically receives the individual Mission Completed recognition.
create or replace function public.canopy_admin_review_mission_group(p_group uuid,p_decision text,p_remark text default null)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
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
  select m.user_id,'mission_review',
    case when decision='verified' then 'Your team Mission evidence is WOMATE verified' else 'Your Mission team needs one more update' end,
    case when decision='verified'
      then 'WOMATE verified your team''s final Mission evidence. Individual Mission Completed recognition is awarded separately after WOMATE reviews each contributor''s individual report.'
      else 'WOMATE reviewed your group Mission and requested an update. Open your private Mission group to review the note and resubmit.'
    end || case when nullif(trim(p_remark),'') is not null then ' Note: '||trim(p_remark) else '' end,
    '/canopy/opportunities',
    'mission-review-v2:'||p_group::text||':'||m.user_id::text||':'||decision
  from public.canopy_mission_group_members m
  where m.group_id=p_group and m.invitation_status='accepted'
  on conflict(fingerprint) do update set body=excluded.body,title=excluded.title,link=excluded.link,read_at=null;
  return public.canopy_admin_mission_groups();
end;
$$;
revoke all on function public.canopy_admin_review_mission_group(uuid,text,text) from public;
grant execute on function public.canopy_admin_review_mission_group(uuid,text,text) to authenticated;

-- Existing verified Missions: preserve earned recognition only for accepted learners who
-- actually submitted an individual Mission report.
insert into public.canopy_mission_completions(group_id,user_id,report_id,status,remark,approved_by,approved_at)
select g.id,r.user_id,r.id,'completed','Backfilled from an already WOMATE-verified Mission with an individual report.',g.verified_by,coalesce(g.verified_at,r.submitted_at,now())
from public.canopy_mission_groups g
join public.canopy_mission_reports r on r.group_id=g.id
join public.canopy_mission_group_members m on m.group_id=g.id and m.user_id=r.user_id and m.invitation_status='accepted'
where g.status='verified'
on conflict(group_id,user_id) do nothing;

-- Mission-gated opportunities now use the person-level WOMATE Mission Completed signal.
create or replace function public.canopy_opportunity_matches(p_user uuid,p_opportunity uuid)
returns boolean language plpgsql stable security definer set search_path=public,auth as $$
declare
  o public.canopy_opportunities%rowtype;
  learner_country text;
  completed_modules integer:=0;
  spotlight_count integer:=0;
  mission_ok boolean:=false;
begin
  select * into o from public.canopy_opportunities where id=p_opportunity and published=true and archived=false;
  if o.id is null then return false; end if;
  select country into learner_country from public.canopy_profiles where user_id=p_user;
  with ranked as (
    select s.week_key,s.assessment_status,row_number() over(partition by s.week_key order by s.submitted_at desc,s.id desc) rn
    from public.canopy_assignment_submissions s where s.user_id=p_user
  ) select count(*) into completed_modules from ranked where rn=1 and assessment_status='completed';
  select count(*) into spotlight_count
  from public.canopy_spotlight_nominations n join public.canopy_assignment_submissions s on s.id=n.submission_id
  where s.user_id=p_user and n.status='featured';
  mission_ok:=public.canopy_has_completed_mission(p_user);
  return (o.global or nullif(trim(coalesce(o.country,'')),'') is null or lower(trim(o.country))=lower(trim(coalesce(learner_country,''))))
    and completed_modules>=coalesce(o.min_module_no,0)
    and (not o.requires_spotlight or spotlight_count>0)
    and (not o.requires_verified_mission or mission_ok);
end;
$$;
revoke all on function public.canopy_opportunity_matches(uuid,uuid) from public;

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
  mission_ok:=public.canopy_has_completed_mission(p_user);
  return (c.global or nullif(trim(coalesce(c.country,'')),'') is null or lower(trim(c.country))=lower(trim(coalesce(learner_country,''))))
    and completed_modules>=coalesce(c.min_module_no,0)
    and (not c.requires_spotlight or spotlight_count>0)
    and (not c.requires_verified_mission or mission_ok);
end;
$$;
revoke all on function public.canopy_funding_call_matches(uuid,uuid) from public;

reset lock_timeout;
reset statement_timeout;
