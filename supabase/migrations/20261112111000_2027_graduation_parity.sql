-- Cohort 2 graduation parity: 2027-specific criteria and reflection wall.
-- No edits to 2026 tables, programme results or historical approval records.
create table if not exists public.canopy_graduation_2027_reflections(
 cohort_key text not null references public.canopy_programme_cohorts(cohort_key),
 user_id uuid not null references auth.users(id),
 display_name text not null,
 reflection text not null,
 moderation text not null default 'pending' check(moderation in ('pending','approved','rejected')),
 reviewer_id uuid,
 reviewed_at timestamptz,
 created_at timestamptz default now(),
 updated_at timestamptz default now(),
 primary key(cohort_key,user_id)
);
alter table public.canopy_graduation_2027_reflections enable row level security;
revoke all on public.canopy_graduation_2027_reflections from anon,authenticated,public;

-- These requirements come from the stored 2027 cohort delivery rules, not sample placeholders.
create or replace function public.canopy_27_admin_approve_certificate(p_cohort text, p_user uuid, p_approve boolean,p_note text)
returns jsonb language plpgsql security definer set search_path=public,auth,private,pg_temp as $$
declare l int; a int; att int; has_code boolean; rules jsonb; rl int; ra int; rt int;
begin
 if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then raise exception 'Admin only'; end if;
 select delivery_rules into rules from public.canopy_programme_cohorts where cohort_key=p_cohort and cohort_year=2027;
 if rules is null or p_cohort not in ('she-leads-climate-c3-2027','she-leads-asia-c1-2027') or
    not public.canopy_27_member(p_cohort,p_user) then raise exception 'Learner not in selected 2027 cohort'; end if;
 rl:=coalesce((rules->>'certificate_required_lessons')::int,20);
 ra:=coalesce((rules->>'certificate_required_assignments')::int,5);
 rt:=coalesce((rules->>'certificate_required_live_attendance')::int,5);
 select count(*) into l from public.canopy_2027_lesson_progress where cohort_key=p_cohort and user_id=p_user;
 select count(distinct module_id) into a from public.canopy_2027_submissions where cohort_key=p_cohort and user_id=p_user and status='approved';
 select count(distinct module_id) into att from public.canopy_cohort_live_attendance where cohort_key=p_cohort and user_id=p_user and attended=true;
 has_code:=private.canopy_27_has_selection_code(p_cohort,p_user);
 if p_approve and (l<rl or a<ra or att<rt or not has_code) then
 raise exception 'Requirements not met: %/% lessons, %/% approved assignments, %/% attended sessions and verified selection code required',l,rl,a,ra,att,rt; end if;
 if length(btrim(coalesce(p_note,'')))<12 then raise exception 'Record a 12+ character review note'; end if;
 insert into public.canopy_2027_certificate_reviews(cohort_key,user_id,eligibility_approved,review_note,reviewed_by,reviewed_at)
 values(p_cohort,p_user,p_approve,left(btrim(p_note),2000),auth.uid(),now())
 on conflict(cohort_key,user_id) do update set eligibility_approved=excluded.eligibility_approved,review_note=excluded.review_note,reviewed_by=excluded.reviewed_by,reviewed_at=now();
 return jsonb_build_object('approved',p_approve,'lessons',l,'assignments',a,'attendance',att,'selection_code',has_code);
end $$;
revoke all on function public.canopy_27_admin_approve_certificate(text,uuid,boolean,text) from public,anon;
grant execute on function public.canopy_27_admin_approve_certificate(text,uuid,boolean,text) to authenticated;

create or replace function public.canopy_27_graduation_view(p_cohort text)
returns jsonb language plpgsql security definer set search_path=public,auth,private,pg_temp as $$
declare me uuid:=auth.uid(); approved boolean; cert_url text; released date; rules jsonb;
begin
 if me is null or not public.canopy_27_member(p_cohort,me) then raise exception 'Cohort access required'; end if;
 select delivery_rules into rules from public.canopy_programme_cohorts where cohort_key=p_cohort and cohort_year=2027;
 if rules is null then raise exception 'Invalid 2027 cohort'; end if;
 released:=(rules->>'graduation_date')::date;
 select eligibility_approved into approved from public.canopy_2027_certificate_reviews
 where cohort_key=p_cohort and user_id=me;
 select c.drive_url into cert_url from public.canopy_certificates c where c.cohort_key=p_cohort and c.user_id=me order by issued_at desc limit 1;
 return jsonb_build_object(
 'graduation_date',released,'approved',coalesce(approved,false),
 'can_enter',coalesce(approved,false) and cert_url is not null and current_date>=released,
 'certificate_url',cert_url,
 'reflections',coalesce((select jsonb_agg(jsonb_build_object('display_name',display_name,'reflection',reflection,'created_at',created_at) order by created_at desc)
 from public.canopy_graduation_2027_reflections
 where cohort_key=p_cohort and moderation='approved'),'[]'::jsonb)
 );
end $$;
revoke all on function public.canopy_27_graduation_view(text) from public,anon;
grant execute on function public.canopy_27_graduation_view(text) to authenticated;

create or replace function public.canopy_27_graduation_reflect(p_cohort text,p_name text,p_reflection text)
returns boolean language plpgsql security definer set search_path=public,auth,private,pg_temp as $$
declare me uuid:=auth.uid(); info jsonb;
begin
 info:=public.canopy_27_graduation_view(p_cohort);
 if not coalesce((info->>'can_enter')::boolean,false) then raise exception 'Graduation access is not yet available'; end if;
 if length(btrim(coalesce(p_name,''))) not between 2 and 100
 or length(btrim(coalesce(p_reflection,''))) not between 30 and 1200 then
 raise exception 'Provide a name and reflection between 30 and 1200 characters'; end if;
 insert into public.canopy_graduation_2027_reflections(cohort_key,user_id,display_name,reflection)
 values(p_cohort,me,btrim(p_name),btrim(p_reflection))
 on conflict(cohort_key,user_id) do update set display_name=excluded.display_name,
 reflection=excluded.reflection,moderation='pending',reviewer_id=null,reviewed_at=null,updated_at=now();
 return true;
end $$;
revoke all on function public.canopy_27_graduation_reflect(text,text,text) from public,anon;
grant execute on function public.canopy_27_graduation_reflect(text,text,text) to authenticated;

create or replace function public.canopy_27_admin_graduation_reflections(p_cohort text)
returns jsonb language plpgsql stable security definer set search_path=public,auth,private,pg_temp as $$
begin
 if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then raise exception 'Admin only'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',user_id,'display_name',display_name,
 'reflection',reflection,'state',moderation,'created_at',created_at) order by created_at desc)
 from public.canopy_graduation_2027_reflections where cohort_key=p_cohort),'[]'::jsonb);
end $$;
revoke all on function public.canopy_27_admin_graduation_reflections(text) from public,anon;
grant execute on function public.canopy_27_admin_graduation_reflections(text) to authenticated;

create or replace function public.canopy_27_admin_moderate_graduation_reflection(
 p_cohort text,p_user uuid,p_state text)
returns boolean language plpgsql security definer set search_path=public,auth,private,pg_temp as $$
begin
 if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then raise exception 'Admin only'; end if;
 if p_state not in ('pending','approved','rejected') then raise exception 'Invalid decision'; end if;
 update public.canopy_graduation_2027_reflections set moderation=p_state,reviewed_at=now(),reviewer_id=auth.uid()
 where cohort_key=p_cohort and user_id=p_user;
 return found;
end $$;
revoke all on function public.canopy_27_admin_moderate_graduation_reflection(text,uuid,text) from public,anon;
grant execute on function public.canopy_27_admin_moderate_graduation_reflection(text,uuid,text) to authenticated;
