-- STAGED. DO NOT APPLY TO PRODUCTION BEFORE 2027 ADMIN/SPEAKER CONFIGURATION IS APPROVED.
-- Cohort 2 three-part assignment persistence, scoped independently to Africa C3 and Asia C1.
create table if not exists public.canopy_2027_assignment_drafts(
 cohort_key text not null references public.canopy_programme_cohorts(cohort_key) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 module_id text not null check(module_id ~ '^0[1-5]$'),
 paragraph_response text not null default '',
 evidence_url text not null default '',
 speaker_url text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key (cohort_key,user_id,module_id)
);
alter table public.canopy_2027_assignment_drafts enable row level security;
revoke all on public.canopy_2027_assignment_drafts from anon,public;
grant select,insert,update on public.canopy_2027_assignment_drafts to authenticated;
drop policy if exists "2027 drafts select own membership" on public.canopy_2027_assignment_drafts;
create policy "2027 drafts select own membership" on public.canopy_2027_assignment_drafts for select to authenticated
 using (user_id=(select auth.uid()) and public.canopy_27_member(cohort_key,(select auth.uid())));
drop policy if exists "2027 drafts insert own membership" on public.canopy_2027_assignment_drafts;
create policy "2027 drafts insert own membership" on public.canopy_2027_assignment_drafts for insert to authenticated
 with check (user_id=(select auth.uid()) and public.canopy_27_member(cohort_key,(select auth.uid())));
drop policy if exists "2027 drafts update own membership" on public.canopy_2027_assignment_drafts;
create policy "2027 drafts update own membership" on public.canopy_2027_assignment_drafts for update to authenticated
 using (user_id=(select auth.uid()) and public.canopy_27_member(cohort_key,(select auth.uid())))
 with check (user_id=(select auth.uid()) and public.canopy_27_member(cohort_key,(select auth.uid())));
create index if not exists canopy_2027_assignment_drafts_updated_idx on public.canopy_2027_assignment_drafts(cohort_key,updated_at desc);
alter table public.canopy_2027_submissions add column if not exists speaker_url text;

create or replace function public.canopy_27_get_assignment_drafts(p_cohort text)
returns jsonb language sql stable security invoker set search_path=public,auth,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object(
   'module_id',d.module_id,'paragraph_response',d.paragraph_response,
   'evidence_url',d.evidence_url,'speaker_url',d.speaker_url,
   'updated_at',d.updated_at) order by d.module_id),'[]'::jsonb)
 from public.canopy_2027_assignment_drafts d
 where d.cohort_key=p_cohort and d.user_id=(select auth.uid())
   and public.canopy_27_member(p_cohort,(select auth.uid()));
$$;
revoke all on function public.canopy_27_get_assignment_drafts(text) from public;
grant execute on function public.canopy_27_get_assignment_drafts(text) to authenticated;

create or replace function public.canopy_27_save_assignment_draft(
 p_cohort text,p_module text,p_paragraph text,p_evidence text default '',p_speaker text default ''
) returns timestamptz language plpgsql security invoker set search_path=public,auth,pg_temp as $$
declare updated timestamptz;
begin
 if auth.uid() is null or not public.canopy_27_member(p_cohort,auth.uid()) then raise exception 'Cohort membership required'; end if;
 if p_module !~ '^0[1-5]$' then raise exception 'Invalid module'; end if;
 if not exists(select 1 from public.canopy_programme_cohorts where cohort_key=p_cohort and cohort_year=2027) then raise exception 'Not a 2027 cohort'; end if;
 if length(coalesce(p_paragraph,''))>10000 then raise exception 'Draft exceeds 10000 characters'; end if;
 if length(coalesce(p_evidence,''))>1000 or length(coalesce(p_speaker,''))>1000 then raise exception 'Link too long'; end if;
 if btrim(coalesce(p_evidence,''))<>'' and p_evidence !~* '^https://[^[:space:]]+$' then raise exception 'Practical evidence requires an HTTPS link'; end if;
 if btrim(coalesce(p_speaker,''))<>'' and p_speaker !~* '^https://[^[:space:]]+$' then raise exception 'Speaker evidence requires an HTTPS link'; end if;
 insert into public.canopy_2027_assignment_drafts(cohort_key,user_id,module_id,paragraph_response,evidence_url,speaker_url)
 values(p_cohort,auth.uid(),p_module,coalesce(p_paragraph,''),coalesce(p_evidence,''),coalesce(p_speaker,''))
 on conflict(cohort_key,user_id,module_id) do update set
 paragraph_response=excluded.paragraph_response,evidence_url=excluded.evidence_url,
 speaker_url=excluded.speaker_url,updated_at=now()
 returning updated_at into updated;
 return updated;
end $$;
revoke all on function public.canopy_27_save_assignment_draft(text,text,text,text,text) from public;
grant execute on function public.canopy_27_save_assignment_draft(text,text,text,text,text) to authenticated;

create or replace function public.canopy_27_submit_assignment_v2(
 p_cohort text,p_module text,p_response text,p_evidence text,p_speaker text
) returns uuid language plpgsql security definer
 set search_path=public,auth,private,pg_temp as $$
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
 if now()>v_due_at then raise exception 'The submission deadline has passed'; end if;
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
end $$;
revoke all on function public.canopy_27_submit_assignment_v2(text,text,text,text,text) from public;
grant execute on function public.canopy_27_submit_assignment_v2(text,text,text,text,text) to authenticated;

-- Extend live/workspace JSON only after speaker_url has been added.
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
$function$

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
 'graduation_requirements',jsonb_build_object('lessons',10,'approved_assignments',3,'attendance',3,'selection_code',true),
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
$function$

CREATE OR REPLACE FUNCTION public.canopy_27_admin_review_assignment(p_id uuid, p_decision text, p_score integer, p_feedback text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare rec public.canopy_2027_submissions%rowtype;
begin
 if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then raise exception 'Admin only'; end if;
 if p_decision not in ('approved','needs_revision','rejected') or p_score not between 0 and 100 or length(btrim(coalesce(p_feedback,'')))<20 then raise exception 'Provide decision, score (0-100) and helpful feedback (20+ characters)'; end if;
 select * into rec from public.canopy_2027_submissions where id=p_id for update;
 if not found or rec.status<>'submitted' then raise exception 'Submission no longer awaiting review'; end if;
 update public.canopy_2027_submissions set status=p_decision,score=p_score,feedback=left(btrim(p_feedback),4000),reviewed_by=auth.uid(),reviewed_at=now() where id=p_id;
 insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
 values(rec.user_id,'assignment_review','Your She Leads assignment has feedback',
 'Module '||rec.module_id||' has been reviewed. Open your cohort assignments to read feedback and next steps.',
 '/canopy/assignments','cohort27-review:'||rec.id::text)
 on conflict(fingerprint) do update set body=excluded.body,read_at=null,created_at=now();
 return p_decision;
end $function$

