-- WOMATE CANOPY — ISOLATED TESTER MODE V2
-- Run once in Supabase SQL Editor AFTER creating/confirming:
-- p.viewmultimedia@gmail.com
--
-- The password is intentionally NOT stored here.
-- This SQL does not modify the ordinary participant assignment RPC,
-- cohort schedule, admin role, or participant enrolments.

begin;

create or replace function public.canopy_is_tester()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select lower(coalesce(auth.jwt()->>'email',''))='p.viewmultimedia@gmail.com';
$$;

revoke all on function public.canopy_is_tester() from public;
grant execute on function public.canopy_is_tester() to authenticated;

-- Create/update only this account's Canopy profile.
insert into public.canopy_profiles(user_id,full_name,country,role)
select u.id,'Canopy Tester','Ghana','tester'
from auth.users u
where lower(u.email)='p.viewmultimedia@gmail.com'
on conflict(user_id) do update
set full_name='Canopy Tester',
    role='tester';

-- Isolated tester-only submission path.
-- It deliberately does not call the ordinary participant submission function,
-- therefore participant dates, attempts and release windows remain untouched.
create or replace function public.canopy_tester_submit_weekly_assignment(
  p_week_key text,
  p_paragraph_response text,
  p_canvas_link text,
  p_linkedin_link text
)
returns setof public.canopy_assignment_submissions
language plpgsql
security definer
set search_path=public
as $$
declare
  n integer;
  wc integer;
  sc integer;
  band text;
  hint text;
  r public.canopy_assignment_submissions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;

  if not public.canopy_is_tester() then
    raise exception 'Tester access is restricted to the designated WOMATE tester account.';
  end if;

  if p_week_key not in ('module-01','module-02','module-03','module-04','module-05') then
    raise exception 'Assignment not found.';
  end if;

  wc:=coalesce(array_length(regexp_split_to_array(trim(coalesce(p_paragraph_response,'')),'\s+'),1),0);

  if wc<80 then
    raise exception 'Paragraph response needs at least 80 words for the tester grading flow.';
  end if;
  if coalesce(p_canvas_link,'') !~* '^https?://' then
    raise exception 'Add the viewable CanopyCanvas link.';
  end if;
  if coalesce(p_linkedin_link,'') !~* '^https?://' then
    raise exception 'Add the LinkedIn speaker-task link.';
  end if;

  -- Deterministic tester grading:
  -- paragraph depth 50 pts, Canvas evidence 25, speaker/LinkedIn evidence 25.
  sc:=
    (case
      when wc>=220 then 50
      when wc>=160 then 45
      when wc>=120 then 40
      when wc>=80 then 35
      else 0
    end)
    +25
    +25;

  band:=case
    when sc>=85 then 'Strong'
    when sc>=70 then 'Satisfactory'
    when sc>=55 then 'Developing'
    else 'Needs strengthening'
  end;

  hint:=case
    when sc>=85 then 'Strong test submission. The response is developed and both evidence links are present.'
    when sc>=70 then 'Satisfactory test submission. Add more depth or specificity to strengthen the written response.'
    else 'Strengthen the written response with clearer evidence, explanation and application.'
  end;

  select count(*) into n
  from public.canopy_assignment_submissions
  where user_id=auth.uid() and week_key=p_week_key;

  insert into public.canopy_assignment_submissions(
    user_id,week_key,attempt_no,paragraph_response,canvas_link,linkedin_link,
    status,auto_score,score_band,feedback_hint,release_at,submitted_at,
    assessment_status,review_source,automation_reviewed_at
  )
  values(
    auth.uid(),p_week_key,n+1,trim(p_paragraph_response),trim(p_canvas_link),trim(p_linkedin_link),
    case when sc>=70 then 'satisfactory' else 'revision_requested' end,
    sc,band,hint,now(),now(),
    case when sc>=70 then 'completed' else 'revision_required' end,
    'automation',now()
  )
  returning * into r;

  insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
  values(
    auth.uid(),
    'assignment_score',
    'Tester assignment score ready',
    'Immediate automated tester score: '||sc||'/100 · '||band||'. '||hint,
    '/canopy/assignments',
    'tester-score:'||r.id
  )
  on conflict(fingerprint) do nothing;

  return next r;
end;
$$;

revoke all on function public.canopy_tester_submit_weekly_assignment(text,text,text,text) from public;
grant execute on function public.canopy_tester_submit_weekly_assignment(text,text,text,text) to authenticated;

commit;

-- Verification: expected one row after the auth user exists.
select p.user_id,p.full_name,p.role,u.email
from public.canopy_profiles p
join auth.users u on u.id=p.user_id
where lower(u.email)='p.viewmultimedia@gmail.com';
