-- Bring 2027 certificate issuance and admin reporting to the same official per-cohort completion thresholds.
CREATE OR REPLACE FUNCTION public.canopy_27_admin_issue_certificate(p_cohort text, p_user uuid, p_url text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'private'
AS $function$
declare v_id uuid; cohort_label text; lessons int; approved int; attendance int; has_code boolean; rules jsonb; rl int; ra int; rt int;
begin
 if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then raise exception 'Admin only'; end if;
 if p_cohort not in ('she-leads-climate-c3-2027','she-leads-asia-c1-2027') then raise exception 'Unsupported cohort'; end if;
 if p_url !~* '^https://(drive|docs)[.]google[.]com/' or length(p_url)>1000 then raise exception 'Use a valid Google Drive certificate link'; end if;
 if not exists(select 1 from public.canopy_2027_certificate_reviews where cohort_key=p_cohort and user_id=p_user and eligibility_approved=true) then raise exception 'Eligibility approval required'; end if;
 if not public.canopy_27_member(p_cohort,p_user) then raise exception 'Learner must remain active in their cohort'; end if;
 select count(*) into lessons from public.canopy_2027_lesson_progress where cohort_key=p_cohort and user_id=p_user;
 select count(distinct module_id) into approved from public.canopy_2027_submissions where cohort_key=p_cohort and user_id=p_user and status='approved';
 select count(*) into attendance from public.canopy_cohort_live_attendance where cohort_key=p_cohort and user_id=p_user and attended=true;
 has_code:=private.canopy_27_has_selection_code(p_cohort,p_user);
 select delivery_rules into rules from public.canopy_programme_cohorts where cohort_key=p_cohort and cohort_year=2027;
 rl:=coalesce((rules->>'certificate_required_lessons')::int,20);
 ra:=coalesce((rules->>'certificate_required_assignments')::int,5);
 rt:=coalesce((rules->>'certificate_required_live_attendance')::int,5);
 if lessons<rl or approved<ra or attendance<rt or not has_code then raise exception 'Graduation requirements are no longer met; recheck lessons, assignments, attendance and selection code'; end if;
 select display_name into cohort_label from public.canopy_programme_cohorts where cohort_key=p_cohort;
 if cohort_label is null then raise exception 'Cohort not found'; end if;
 insert into public.canopy_certificates(user_id,course_slug,cohort_name,cohort_key,title,drive_url,issued_by)
 values(p_user,'she-leads',cohort_label,p_cohort,cohort_label||' · Certificate of Completion',p_url,auth.uid())
 on conflict(user_id,course_slug,cohort_name) do update set drive_url=excluded.drive_url,issued_at=now(),issued_by=auth.uid(),title=excluded.title
 returning id into v_id;
 insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
 values(p_user,'certificate_issued','Your She Leads certificate is ready',cohort_label||' certificate is now available.','/canopy/certificate','certificate:'||p_cohort||':'||p_user::text)
 on conflict(fingerprint) do update set body=excluded.body,read_at=null,created_at=now();
 return v_id;
end
$function$;

CREATE OR REPLACE FUNCTION public.canopy_27_admin_workspace(p_cohort text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'private'
AS $function$
begin
 if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then raise exception 'Admin only'; end if;
 if p_cohort not in ('she-leads-climate-c3-2027','she-leads-asia-c1-2027') then raise exception 'Unsupported cohort'; end if;
 return jsonb_build_object(
 'graduation_requirements',(select jsonb_build_object(
 'lessons',coalesce((delivery_rules->>'certificate_required_lessons')::int,20),
 'approved_assignments',coalesce((delivery_rules->>'certificate_required_assignments')::int,5),
 'attendance',coalesce((delivery_rules->>'certificate_required_live_attendance')::int,5),
 'selection_code',true) from public.canopy_programme_cohorts where cohort_key=p_cohort),
 'members',coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'status',m.status,'name',p.full_name,'country',p.country) order by p.full_name)
 from public.canopy_cohort_memberships m join public.canopy_profiles p on p.user_id=m.user_id where m.cohort_key=p_cohort),'[]'::jsonb),
 'submissions',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'user_id',s.user_id,'name',p.full_name,'module_id',s.module_id,'response',s.response,'evidence_url',s.evidence_url,'speaker_url',s.speaker_url,'attempt',s.attempt,'status',s.status,'score',s.score,'feedback',s.feedback,'created_at',s.created_at) order by s.created_at desc)
 from public.canopy_2027_submissions s join public.canopy_profiles p on p.user_id=s.user_id where s.cohort_key=p_cohort),'[]'::jsonb),
 'progress',coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'name',p.full_name,
 'lessons',(select count(*) from public.canopy_2027_lesson_progress l where l.cohort_key=m.cohort_key and l.user_id=m.user_id),
 'approved_assignments',(select count(distinct module_id) from public.canopy_2027_submissions s where s.cohort_key=m.cohort_key and s.user_id=m.user_id and s.status='approved'),
 'attendance',(select count(*) from public.canopy_cohort_live_attendance a where a.cohort_key=m.cohort_key and a.user_id=m.user_id and a.attended=true),
 'selection_code',private.canopy_27_has_selection_code(m.cohort_key,m.user_id),
 'approved_certificate',coalesce((select eligibility_approved from public.canopy_2027_certificate_reviews c where c.cohort_key=m.cohort_key and c.user_id=m.user_id),false),
 'certificate_url',(select drive_url from public.canopy_certificates c where c.cohort_key=m.cohort_key and c.user_id=m.user_id order by issued_at desc limit 1)) order by p.full_name)
 from public.canopy_cohort_memberships m join public.canopy_profiles p on p.user_id=m.user_id where m.cohort_key=p_cohort),'[]'::jsonb));
end
$function$;

