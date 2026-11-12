-- Expose confirmed 2027 weekly sessions; honor approved per-module grace periods without changing Cohort 2.
CREATE OR REPLACE FUNCTION public.canopy_27_my_workspace(p_cohort text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'private'
AS $function$
declare
  v_user uuid:=auth.uid();
  v_open_date date;
  v_graduation_date date;
begin
 if v_user is null or not public.canopy_27_member(p_cohort,v_user) then raise exception 'You are not an active member of this cohort'; end if;

 select
   nullif(c.delivery_rules->>'programme_open_date','')::date,
   nullif(c.delivery_rules->>'graduation_date','')::date
 into v_open_date,v_graduation_date
 from public.canopy_programme_cohorts c
 where c.cohort_key=p_cohort;

 return jsonb_build_object(
 'programme_open',case when v_open_date is null then false else current_date>=v_open_date end,
 'schedule',coalesce((select jsonb_build_object(
   'programme_open_date',c.delivery_rules->>'programme_open_date',
   'module_release_dates',coalesce(c.delivery_rules->'module_release_dates','{}'::jsonb),
   'live_sessions',coalesce(c.delivery_rules->'live_sessions','{}'::jsonb),
   'assignment_grace_dates',coalesce(c.delivery_rules->'assignment_grace_dates','{}'::jsonb),
   'speaker_unlock_dates',coalesce(c.delivery_rules->'speaker_unlock_dates','{}'::jsonb),
   'assignment_due_dates',coalesce(c.delivery_rules->'assignment_due_dates','{}'::jsonb),
   'graduation_date',c.delivery_rules->>'graduation_date'
 ) from public.canopy_programme_cohorts c where c.cohort_key=p_cohort),'{}'::jsonb),
 'open_modules',coalesce((select jsonb_agg(x.module_id order by x.module_id)
   from (values('01'),('02'),('03'),('04'),('05')) x(module_id)
   where private.canopy_27_module_open(p_cohort,x.module_id)),'[]'::jsonb),
 'lessons',coalesce((select jsonb_agg(lesson_id order by lesson_id) from public.canopy_2027_lesson_progress where cohort_key=p_cohort and user_id=v_user),'[]'::jsonb),
 'submissions',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'module_id',s.module_id,'attempt',s.attempt,'status',s.status,'score',s.score,'feedback',s.feedback,'response',s.response,'evidence_url',s.evidence_url,'speaker_url',s.speaker_url,'created_at',s.created_at) order by s.created_at desc)
 from public.canopy_2027_submissions s where s.cohort_key=p_cohort and s.user_id=v_user),'[]'::jsonb),
 'attendance',coalesce((select jsonb_agg(module_id order by module_id) from public.canopy_cohort_live_attendance where cohort_key=p_cohort and user_id=v_user and attended=true),'[]'::jsonb),
 'certificate_approved',coalesce((select eligibility_approved from public.canopy_2027_certificate_reviews where cohort_key=p_cohort and user_id=v_user),false),
 'certificate',coalesce((select jsonb_build_object('title',title,'drive_url',drive_url,'issued_at',issued_at) from public.canopy_certificates where cohort_key=p_cohort and user_id=v_user order by issued_at desc limit 1),'null'::jsonb));
end
$function$;
CREATE OR REPLACE FUNCTION public.canopy_27_submit_assignment_v2(p_cohort text, p_module text, p_response text, p_evidence text, p_speaker text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'private', 'pg_temp'
AS $function$
declare attempts integer; next_id uuid; v_rules jsonb; v_speaker_at timestamptz; v_due_at timestamptz;
begin
 if auth.uid() is null or not public.canopy_27_member(p_cohort,auth.uid()) then raise exception 'Cohort membership required'; end if;
 if p_module !~ '^0[1-5]$' then raise exception 'Invalid module'; end if;
 if not private.canopy_27_module_open(p_cohort,p_module) then raise exception 'This module is not yet open'; end if;
 select delivery_rules into v_rules from public.canopy_programme_cohorts
 where cohort_key=p_cohort and cohort_year=2027;
 if v_rules is null then raise exception 'Unknown 2027 cohort'; end if;
 -- Mirrors Cohort 2's published three-part workflow, not invented session timing.
 if nullif(v_rules->'speaker_unlock_dates'->>p_module,'') is null or
    nullif(v_rules->'assignment_due_dates'->>p_module,'') is null then
    raise exception 'The speaker challenge and submission deadline have not been published for this week';
 end if;
 v_speaker_at:=(v_rules->'speaker_unlock_dates'->>p_module)::timestamptz;
 v_due_at:=(v_rules->'assignment_due_dates'->>p_module)::timestamptz;
 if now()<v_speaker_at then raise exception 'Speaker challenge is not open yet'; end if;
 if now()>coalesce(nullif(v_rules->'assignment_grace_dates'->>p_module,'')::timestamptz,v_due_at) then raise exception 'The submission deadline and any approved grace period have passed'; end if;
 if array_length(regexp_split_to_array(btrim(coalesce(p_response,'')),'\s+'),1)<80
   or length(p_response)>10000 then raise exception 'The paragraph requires at least 80 words (maximum 10000 characters)'; end if;
 if p_evidence is null or btrim(p_evidence) !~* '^https://[^[:space:]]+$' or length(p_evidence)>1000 then
   raise exception 'Provide a viewable HTTPS link to your practical evidence';
 end if;
 if p_speaker is null or btrim(p_speaker) !~* '^https://[^[:space:]]+$' or length(p_speaker)>1000 then
   raise exception 'Provide a valid HTTPS link for your speaker challenge evidence';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_cohort||p_module,0));
 if exists(select 1 from public.canopy_2027_submissions
   where user_id=auth.uid() and cohort_key=p_cohort and module_id=p_module and status='approved') then
   raise exception 'This module has already been approved';
 end if;
 if exists(select 1 from public.canopy_2027_submissions
   where user_id=auth.uid() and cohort_key=p_cohort and module_id=p_module and status='submitted') then
   raise exception 'Your latest response is awaiting WOMATE review';
 end if;
 select count(*) into attempts from public.canopy_2027_submissions
 where user_id=auth.uid() and cohort_key=p_cohort and module_id=p_module;
 if attempts>=3 then raise exception 'Maximum of three assignment attempts reached; contact WOMATE'; end if;
 insert into public.canopy_2027_submissions(cohort_key,user_id,module_id,response,evidence_url,speaker_url,attempt)
 values(p_cohort,auth.uid(),p_module,btrim(p_response),btrim(p_evidence),btrim(p_speaker),attempts+1)
 returning id into next_id;
 return next_id;
end $function$;
