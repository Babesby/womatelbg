-- Cohort 2 weekly speaker, live session and applied assignment progression in each 2027 cohort.
-- Publishing is administrator-controlled. No speaker artworks or times are assumed.
create or replace function public.canopy_27_admin_publish_module_schedule(
 p_cohort text,p_module text,p_live timestamptz,p_speaker_unlock timestamptz,
 p_due timestamptz,p_speaker_name text,p_speaker_role text,p_live_url text,p_poster text default null,
 p_grace timestamptz default null)
returns boolean language plpgsql security definer set search_path=public,auth,private,pg_temp as $$
declare rules jsonb; release_at date; graduation date;
begin
 if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then raise exception 'WOMATE admin only'; end if;
 if p_cohort not in ('she-leads-climate-c3-2027','she-leads-asia-c1-2027')
 or p_module not in ('01','02','03','04','05') then raise exception 'Unsupported cohort or module'; end if;
 select delivery_rules into rules from public.canopy_programme_cohorts where cohort_key=p_cohort and cohort_year=2027 for update;
 if rules is null then raise exception 'Cohort not configured'; end if;
 release_at:=nullif(rules->'module_release_dates'->>p_module,'')::date;
 graduation:=nullif(rules->>'graduation_date','')::date;
 if release_at is null or graduation is null then raise exception 'Module schedule is not configured'; end if;
 if p_live is null or p_speaker_unlock is null or p_due is null
 or p_live::date<release_at or p_due<p_speaker_unlock or p_speaker_unlock<p_live
 or p_due::date>graduation+interval '7 days'
 or (p_grace is not null and (p_grace<p_due or p_grace::date>graduation+interval '14 days')) then
   raise exception 'Live session, speaker release, deadline or optional grace is inconsistent with published module dates'; end if;
 if length(btrim(coalesce(p_speaker_name,''))) not between 2 and 160 or
 length(btrim(coalesce(p_speaker_role,'')))>240 then raise exception 'Speaker name is required'; end if;
 if p_live_url !~* '^https://[^[:space:]]+$' or length(p_live_url)>1000 then raise exception 'Provide an HTTPS live-session URL'; end if;
 if nullif(p_poster,'') is not null and (p_poster !~* '^https://[^[:space:]]+$' or length(p_poster)>1000) then raise exception 'Speaker artwork must be an HTTPS image URL'; end if;
 rules:=jsonb_set(rules,array['live_sessions',p_module],
 jsonb_build_object('module_id',p_module,'starts_at',to_char(p_live at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),
 'speaker_name',btrim(p_speaker_name),'speaker_role',btrim(coalesce(p_speaker_role,'')),
 'url',btrim(p_live_url),'poster',nullif(btrim(coalesce(p_poster,'')),'')),true);
 rules:=jsonb_set(rules,array['speaker_unlock_dates',p_module],to_jsonb(to_char(p_speaker_unlock at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')),true);
 rules:=jsonb_set(rules,array['assignment_due_dates',p_module],to_jsonb(to_char(p_due at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')),true);
 if p_grace is not null then
   rules:=jsonb_set(rules,array['assignment_grace_dates',p_module],to_jsonb(to_char(p_grace at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')),true);
 else
   rules:=rules #- array['assignment_grace_dates',p_module];
 end if;
 update public.canopy_programme_cohorts set delivery_rules=rules where cohort_key=p_cohort;
 return true;
end $$;
revoke all on function public.canopy_27_admin_publish_module_schedule(text,text,timestamptz,timestamptz,timestamptz,text,text,text,text,timestamptz) from public,anon;
grant execute on function public.canopy_27_admin_publish_module_schedule(text,text,timestamptz,timestamptz,timestamptz,text,text,text,text,timestamptz) to authenticated;

create or replace function public.canopy_27_module_schedule(p_cohort text)
returns jsonb language plpgsql stable security definer set search_path=public,auth,private,pg_temp as $$
declare rules jsonb;
begin
 if auth.uid() is null or
 (not public.canopy_is_womate_admin(auth.uid()) and not public.canopy_27_member(p_cohort,auth.uid())) then
 raise exception 'Cohort membership or WOMATE admin access required'; end if;
 select delivery_rules into rules from public.canopy_programme_cohorts where cohort_key=p_cohort and cohort_year=2027;
 if rules is null then raise exception 'Not a 2027 cohort'; end if;
 return jsonb_build_object('module_release_dates',coalesce(rules->'module_release_dates','{}'::jsonb),
 'live_sessions',coalesce(rules->'live_sessions','{}'::jsonb),
 'speaker_unlock_dates',coalesce(rules->'speaker_unlock_dates','{}'::jsonb),
 'assignment_due_dates',coalesce(rules->'assignment_due_dates','{}'::jsonb),
 'assignment_grace_dates',coalesce(rules->'assignment_grace_dates','{}'::jsonb));
end $$;
revoke all on function public.canopy_27_module_schedule(text) from public,anon;
grant execute on function public.canopy_27_module_schedule(text) to authenticated;
