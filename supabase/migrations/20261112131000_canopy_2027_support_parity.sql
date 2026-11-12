-- Carry Cohort 2's warnings, feedback, reminders, complaints and inactivity review to 2027.
-- Uses the *same* canopy_manager_actions audit table and notification triggers.
create or replace function public.canopy_27_support_view(p_cohort text)
returns jsonb language plpgsql security definer set search_path=public,auth,private,pg_temp as $$
declare admin boolean:=coalesce(public.canopy_is_womate_admin(auth.uid()),false);
begin
 if p_cohort not in ('she-leads-climate-c3-2027','she-leads-asia-c1-2027') then raise exception 'Unsupported cohort'; end if;
 if not admin and not private.canopy_27_mission_member(p_cohort,auth.uid()) then
   raise exception 'You do not belong to this cohort'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
 'id',a.id,'learner_id',a.learner_id,'learner_name',p.full_name,
 'subject',a.subject,'message',a.message,'action_type',a.action_type,
 'status',a.status,'created_at',a.created_at,'response_message',a.response_message,
 'responded_at',a.responded_at) order by a.created_at desc)
 from public.canopy_manager_actions a
 left join public.canopy_profiles p on p.user_id=a.learner_id
 where a.cohort_key=p_cohort and (admin or a.learner_id=auth.uid())),'[]'::jsonb);
end $$;
revoke all on function public.canopy_27_support_view(text) from public,anon;
grant execute on function public.canopy_27_support_view(text) to authenticated;

create or replace function public.canopy_27_submit_complaint(p_cohort text,p_subject text,p_message text)
returns uuid language plpgsql security definer set search_path=public,auth,private,pg_temp as $$
declare ident uuid;
begin
 if not private.canopy_27_mission_member(p_cohort,auth.uid()) then raise exception 'Active cohort membership required'; end if;
 if length(btrim(coalesce(p_subject,''))) not between 8 and 130
 or length(btrim(coalesce(p_message,''))) not between 20 and 4000 then raise exception 'Provide a descriptive subject and message'; end if;
 insert into public.canopy_manager_actions(cohort_key,learner_id,action_type,subject,message,status,created_by)
 values(p_cohort,auth.uid(),'complaint',btrim(p_subject),btrim(p_message),'open',auth.uid()) returning id into ident;
 return ident;
end $$;
revoke all on function public.canopy_27_submit_complaint(text,text,text) from public,anon;
grant execute on function public.canopy_27_submit_complaint(text,text,text) to authenticated;

create or replace function public.canopy_27_admin_send_action(
 p_cohort text,p_user uuid,p_kind text,p_subject text,p_message text)
returns uuid language plpgsql security definer set search_path=public,auth,private,pg_temp as $$
declare ident uuid;
begin
 if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then raise exception 'WOMATE admin only'; end if;
 if p_cohort not in ('she-leads-climate-c3-2027','she-leads-asia-c1-2027')
 or not exists(select 1 from public.canopy_cohort_memberships where cohort_key=p_cohort and user_id=p_user and status in ('active','pending')) then
   raise exception 'Select an enrolled learner in this 2027 cohort'; end if;
 if p_kind not in ('warning','feedback','reminder')
 or length(btrim(coalesce(p_subject,''))) not between 8 and 130
 or length(btrim(coalesce(p_message,''))) not between 15 and 4000 then
   raise exception 'Choose an action and write a complete subject and message'; end if;
 insert into public.canopy_manager_actions(cohort_key,learner_id,action_type,subject,message,status,created_by)
 values(p_cohort,p_user,p_kind,btrim(p_subject),btrim(p_message),'open',auth.uid()) returning id into ident;
 return ident;
end $$;
revoke all on function public.canopy_27_admin_send_action(text,uuid,text,text,text) from public,anon;
grant execute on function public.canopy_27_admin_send_action(text,uuid,text,text,text) to authenticated;

create or replace function public.canopy_27_admin_reply_complaint(p_cohort text,p_id uuid,p_reply text,p_resolved boolean)
returns boolean language plpgsql security definer set search_path=public,auth,private,pg_temp as $$
declare recipient uuid;
begin
 if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then raise exception 'WOMATE admin only'; end if;
 if length(btrim(coalesce(p_reply,''))) not between 15 and 3000 then raise exception 'A meaningful response is required'; end if;
 update public.canopy_manager_actions
 set response_message=btrim(p_reply),responded_by=auth.uid(),responded_at=now(),
 status=case when p_resolved then 'resolved' else 'open' end,
 resolved_at=case when p_resolved then now() else null end
 where id=p_id and cohort_key=p_cohort and action_type='complaint' returning learner_id into recipient;
 if recipient is null then raise exception 'Complaint not found for selected cohort'; end if;
 insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
 values(recipient,'complaint_response',
 'WOMATE has responded to your support request',btrim(p_reply),'/canopy/help',
 '2027-complaint-reply:'||p_id::text)
 on conflict(fingerprint) do update set body=excluded.body,read_at=null,cleared_at=null;
 return true;
end $$;
revoke all on function public.canopy_27_admin_reply_complaint(text,uuid,text,boolean) from public,anon;
grant execute on function public.canopy_27_admin_reply_complaint(text,uuid,text,boolean) to authenticated;

create or replace function public.canopy_27_admin_inactivity(p_cohort text,p_days integer default 14)
returns jsonb language plpgsql stable security definer set search_path=public,auth,private,pg_temp as $$
begin
 if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then raise exception 'WOMATE admin only'; end if;
 if p_cohort not in ('she-leads-climate-c3-2027','she-leads-asia-c1-2027') or p_days not between 1 and 90 then raise exception 'Invalid filter'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',x.user_id,'name',x.name,'country',x.country,
 'last_activity',x.last_activity,'days_inactive',x.days_inactive,'lessons',x.lessons,'submissions',x.submissions,
 'status',x.status) order by x.days_inactive desc)
 from (select m.user_id,p.full_name as name,p.country,m.status,
 greatest(coalesce((select max(l.completed_at) from public.canopy_2027_lesson_progress l where l.cohort_key=m.cohort_key and l.user_id=m.user_id),m.joined_at),
 coalesce((select max(s.created_at) from public.canopy_2027_submissions s where s.cohort_key=m.cohort_key and s.user_id=m.user_id),m.joined_at),
 m.joined_at) as last_activity,
 floor(extract(epoch from now()-greatest(coalesce((select max(l.completed_at) from public.canopy_2027_lesson_progress l where l.cohort_key=m.cohort_key and l.user_id=m.user_id),m.joined_at),
 coalesce((select max(s.created_at) from public.canopy_2027_submissions s where s.cohort_key=m.cohort_key and s.user_id=m.user_id),m.joined_at),m.joined_at))/86400)::int as days_inactive,
 (select count(*) from public.canopy_2027_lesson_progress l where l.cohort_key=m.cohort_key and l.user_id=m.user_id) as lessons,
 (select count(*) from public.canopy_2027_submissions s where s.cohort_key=m.cohort_key and s.user_id=m.user_id) as submissions
 from public.canopy_cohort_memberships m join public.canopy_profiles p on p.user_id=m.user_id
 where m.cohort_key=p_cohort and m.status='active') x
 where x.days_inactive>=p_days),'[]'::jsonb);
end $$;
revoke all on function public.canopy_27_admin_inactivity(text,integer) from public,anon;
grant execute on function public.canopy_27_admin_inactivity(text,integer) to authenticated;
