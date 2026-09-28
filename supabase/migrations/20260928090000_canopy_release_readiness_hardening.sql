-- WOMATE Canopy release-readiness hardening pass 3.
-- Tightens participant RPC role checks and locks mission/funding state transitions.
set lock_timeout='8s';
set statement_timeout='90s';

create or replace function public.canopy_submit_mission_report(p_summary text,p_proof_url text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare
  m public.canopy_mission_group_members%rowtype;
  g public.canopy_mission_groups%rowtype;
  clean text:=trim(coalesce(p_summary,''));
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  select * into m from public.canopy_mission_group_members where user_id=auth.uid() and invitation_status='accepted' order by invited_at desc limit 1;
  if m.id is null then raise exception 'Mission group access is required.'; end if;
  select * into g from public.canopy_mission_groups where id=m.group_id for update;
  if g.id is null then raise exception 'Mission group not found.'; end if;
  if g.status<>'active' then
    if g.status='submitted' then raise exception 'This mission has already been submitted for WOMATE verification.'; end if;
    if g.status='verified' then raise exception 'This mission is already WOMATE verified and is closed for editing.'; end if;
    raise exception 'The mission group is not ready for reports yet.';
  end if;
  if now()>g.deadline_at then raise exception 'The group mission submission window has closed.'; end if;
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
declare
  m public.canopy_mission_group_members%rowtype;
  g public.canopy_mission_groups%rowtype;
  accepted_count integer;
  report_count integer;
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  select * into m from public.canopy_mission_group_members where user_id=auth.uid() and invitation_status='accepted' order by invited_at desc limit 1;
  if m.id is null then raise exception 'Mission group access is required.'; end if;
  select * into g from public.canopy_mission_groups where id=m.group_id for update;
  if g.id is null then raise exception 'Mission group not found.'; end if;
  if g.status<>'active' then
    if g.status='submitted' then raise exception 'This mission is already awaiting WOMATE verification.'; end if;
    if g.status='verified' then raise exception 'This mission is already WOMATE verified.'; end if;
    raise exception 'The mission group is not ready for final submission.';
  end if;
  if now()>g.deadline_at then raise exception 'The group mission submission window has closed.'; end if;
  if coalesce(trim(p_folder_url),'')!~* '^https?://' then raise exception 'Add the shared mission evidence folder link.'; end if;
  select count(*) into accepted_count from public.canopy_mission_group_members where group_id=g.id and invitation_status='accepted';
  select count(distinct mission_no) into report_count from public.canopy_mission_reports where group_id=g.id;
  if accepted_count<>5 then raise exception 'All five mission members must accept before the group can submit.'; end if;
  if report_count<>5 then raise exception 'All five mission leads must submit their report before the group can submit.'; end if;
  update public.canopy_mission_groups
     set evidence_folder_url=trim(p_folder_url),status='submitted',submitted_at=now(),updated_at=now()
   where id=g.id and status='active';
  if not found then raise exception 'Mission state changed while you were submitting. Refresh and try again.'; end if;
  insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
  select p.user_id,'mission_admin','Mission group ready for WOMATE verification','A cross-country Canopy Mission group has submitted its complete evidence folder for verification.','/canopy/manage/missions','mission-admin:'||g.id::text||':'||p.user_id::text
  from public.canopy_profiles p where p.role in('manager','admin')
  on conflict(fingerprint) do update set title=excluded.title,body=excluded.body,link=excluded.link,type=excluded.type,read_at=null;
  return public.canopy_get_my_mission_hub();
end;$$;
revoke all on function public.canopy_submit_mission_group(text) from public;
grant execute on function public.canopy_submit_mission_group(text) to authenticated;

create or replace function public.canopy_admin_review_mission_group(p_group uuid,p_decision text,p_remark text default null)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare
  decision text:=lower(coalesce(p_decision,''));
  g public.canopy_mission_groups%rowtype;
begin
  if not public.canopy_is_manager(auth.uid()) then raise exception 'Programme Manager access required.'; end if;
  if decision not in('verified','revision_required') then raise exception 'Decision must be verified or revision_required.'; end if;
  select * into g from public.canopy_mission_groups where id=p_group for update;
  if g.id is null then raise exception 'Mission group not found.'; end if;
  if g.status<>'submitted' then raise exception 'Only a submitted mission group can be reviewed.'; end if;
  if decision='verified' then
    update public.canopy_mission_groups set status='verified',verified_at=now(),verified_by=auth.uid(),verification_remark=nullif(trim(p_remark),''),updated_at=now() where id=p_group;
  else
    update public.canopy_mission_groups set status='active',verified_at=null,verified_by=auth.uid(),verification_remark=nullif(trim(p_remark),''),updated_at=now() where id=p_group;
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

create or replace function public.canopy_get_my_opportunities()
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare learner_country text; completed_modules integer:=0; spotlight_count integer:=0; mission_ok boolean:=false; items jsonb;
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  if not exists(select 1 from public.canopy_profiles p where p.user_id=auth.uid() and p.role='learner') then raise exception 'Learner access required.'; end if;
  select country into learner_country from public.canopy_profiles where user_id=auth.uid();
  with ranked as (select s.week_key,s.assessment_status,row_number() over(partition by s.week_key order by s.submitted_at desc,s.id desc) rn from public.canopy_assignment_submissions s where s.user_id=auth.uid())
  select count(*) into completed_modules from ranked where rn=1 and assessment_status='completed';
  select count(*) into spotlight_count from public.canopy_spotlight_nominations n join public.canopy_assignment_submissions s on s.id=n.submission_id where s.user_id=auth.uid() and n.status='featured';
  select exists(select 1 from public.canopy_mission_group_members m join public.canopy_mission_groups g on g.id=m.group_id where m.user_id=auth.uid() and m.invitation_status='accepted' and g.status='verified') into mission_ok;
  select coalesce(jsonb_agg(to_jsonb(q) order by q.matched desc,q.featured desc,coalesce(q.deadline_at,'9999-12-31'::timestamptz),q.created_at desc),'[]'::jsonb) into items
  from (select o.*,public.canopy_opportunity_matches(auth.uid(),o.id) matched,exists(select 1 from public.canopy_opportunity_saves s where s.opportunity_id=o.id and s.user_id=auth.uid()) saved from public.canopy_opportunities o where o.published=true and o.archived=false and (o.deadline_at is null or o.deadline_at>now())) q;
  return jsonb_build_object('country',learner_country,'completed_modules',completed_modules,'spotlight_count',spotlight_count,'verified_mission',mission_ok,'opportunities',items);
end;$$;
revoke all on function public.canopy_get_my_opportunities() from public;
grant execute on function public.canopy_get_my_opportunities() to authenticated;

create or replace function public.canopy_toggle_opportunity_save(p_opportunity uuid)
returns boolean language plpgsql security definer set search_path=public,auth as $$
declare exists_now boolean;
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  if not exists(select 1 from public.canopy_profiles p where p.user_id=auth.uid() and p.role='learner') then raise exception 'Learner access required.'; end if;
  if not exists(select 1 from public.canopy_opportunities where id=p_opportunity and published=true and archived=false and (deadline_at is null or deadline_at>now())) then raise exception 'Opportunity unavailable.'; end if;
  select exists(select 1 from public.canopy_opportunity_saves where opportunity_id=p_opportunity and user_id=auth.uid()) into exists_now;
  if exists_now then delete from public.canopy_opportunity_saves where opportunity_id=p_opportunity and user_id=auth.uid(); return false;
  else insert into public.canopy_opportunity_saves(opportunity_id,user_id) values(p_opportunity,auth.uid()) on conflict do nothing; return true; end if;
end;$$;
revoke all on function public.canopy_toggle_opportunity_save(uuid) from public;
grant execute on function public.canopy_toggle_opportunity_save(uuid) to authenticated;

create or replace function public.canopy_get_my_funding_calls()
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare items jsonb;
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  if not exists(select 1 from public.canopy_profiles p where p.user_id=auth.uid() and p.role='learner') then raise exception 'Learner access required.'; end if;
  select coalesce(jsonb_agg(to_jsonb(c) || jsonb_build_object('matched',public.canopy_funding_call_matches(auth.uid(),c.id),'application',(select to_jsonb(a) from public.canopy_funding_applications a where a.call_id=c.id and a.user_id=auth.uid())) order by c.featured desc,coalesce(c.deadline_at,'9999-12-31'::timestamptz),c.created_at desc),'[]'::jsonb)
  into items from public.canopy_funding_calls c where c.published=true and c.archived=false and (c.deadline_at is null or c.deadline_at>now());
  return jsonb_build_object('calls',items);
end;$$;
revoke all on function public.canopy_get_my_funding_calls() from public;
grant execute on function public.canopy_get_my_funding_calls() to authenticated;

create or replace function public.canopy_submit_funding_application(p_call uuid,p_pitch text,p_plan text,p_evidence_url text default null)
returns public.canopy_funding_applications language plpgsql security definer set search_path=public,auth as $$
declare saved public.canopy_funding_applications%rowtype; prior public.canopy_funding_applications%rowtype;
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  if not exists(select 1 from public.canopy_profiles p where p.user_id=auth.uid() and p.role='learner') then raise exception 'Learner access required.'; end if;
  if not public.canopy_funding_call_matches(auth.uid(),p_call) then raise exception 'Your current Canopy record does not meet this call''s eligibility.'; end if;
  if char_length(trim(coalesce(p_pitch,'')))<40 then raise exception 'Tell WOMATE a little more about why you are a strong fit.'; end if;
  if char_length(trim(coalesce(p_plan,'')))<40 then raise exception 'Add a practical plan for what you would do or deliver.'; end if;
  if nullif(trim(coalesce(p_evidence_url,'')),'') is not null and trim(p_evidence_url)!~* '^https?://' then raise exception 'Use a valid evidence link beginning with http:// or https://.'; end if;
  select * into prior from public.canopy_funding_applications where call_id=p_call and user_id=auth.uid() for update;
  if prior.id is not null and prior.status not in('submitted','withdrawn') then raise exception 'This application is already under WOMATE review and can no longer be edited.'; end if;
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
  if not exists(select 1 from public.canopy_profiles p where p.user_id=auth.uid() and p.role='learner') then raise exception 'Learner access required.'; end if;
  update public.canopy_funding_applications set status='withdrawn',updated_at=now() where call_id=p_call and user_id=auth.uid() and status='submitted';
end;$$;
revoke all on function public.canopy_withdraw_funding_application(uuid) from public;
grant execute on function public.canopy_withdraw_funding_application(uuid) to authenticated;

create or replace function public.canopy_admin_update_funding_application(p_application uuid,p_status text,p_remark text default null)
returns void language plpgsql security definer set search_path=public,auth as $$
declare a public.canopy_funding_applications%rowtype; c public.canopy_funding_calls%rowtype; clean_status text:=lower(trim(coalesce(p_status,''))); note_title text; note_body text;
begin
  if not public.canopy_is_manager(auth.uid()) then raise exception 'Manager access required.'; end if;
  if clean_status not in('submitted','shortlisted','selected','not_selected','completed') then raise exception 'Invalid application status.'; end if;
  select * into a from public.canopy_funding_applications where id=p_application for update;
  if a.id is null then raise exception 'Application not found.'; end if;
  select * into c from public.canopy_funding_calls where id=a.call_id for update;
  if c.id is null then raise exception 'Funding call not found.'; end if;
  if a.status='completed' and clean_status<>'completed' then raise exception 'Completed funded work is closed and cannot be moved back to review.'; end if;
  if clean_status='selected' and (select count(*) from public.canopy_funding_applications x where x.call_id=a.call_id and x.id<>a.id and x.status in('selected','completed'))>=c.slots then raise exception 'All available places for this call are already filled.'; end if;
  update public.canopy_funding_applications set status=clean_status,admin_remark=nullif(trim(coalesce(p_remark,'')),''),updated_at=now(),reviewed_at=now(),reviewed_by=auth.uid() where id=p_application returning * into a;
  note_title:=case clean_status when 'shortlisted' then 'You have been shortlisted' when 'selected' then 'You have been selected' when 'not_selected' then 'Funding application update' when 'completed' then 'Funded work completed' else 'Funding application updated' end;
  note_body:=case clean_status when 'shortlisted' then c.title||': WOMATE has shortlisted your application. Check the funding area for your latest status.' when 'selected' then c.title||': WOMATE has selected your application. Check the funding area and follow the next instructions from the team.' when 'not_selected' then c.title||': WOMATE has completed this review. Check the funding area for your status and any note from the team.' when 'completed' then c.title||': WOMATE has marked this funded work complete.' else c.title||': your application status has been updated.' end;
  insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
  values(a.user_id,'funding_application',note_title,note_body,'/canopy/funding','funding-application:'||a.id::text||':'||clean_status)
  on conflict(fingerprint) do update set title=excluded.title,body=excluded.body,link=excluded.link,type=excluded.type,read_at=null;
end;$$;
revoke all on function public.canopy_admin_update_funding_application(uuid,text,text) from public;
grant execute on function public.canopy_admin_update_funding_application(uuid,text,text) to authenticated;

reset lock_timeout;
reset statement_timeout;
