-- Cohort 2 graduate registry invariant:
-- "Baseline met" is cumulative once verified/reserved/issued and must never
-- be lower than certificate IDs reserved or certificates issued.

create or replace function public.womate_admin_prospective_graduates_2026()
returns jsonb
language plpgsql
stable security definer
set search_path to 'public','auth'
as $function$
declare output jsonb;
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'WOMATE admin access required';
  end if;

  with active as (
    select distinct e.user_id,p.full_name,p.country,u.email
    from public.canopy_enrollments e
    join public.canopy_profiles p on p.user_id=e.user_id and p.role='learner'
    join auth.users u on u.id=e.user_id
    where e.status='active' and e.course_slug='she-leads'
  ), lesson as (
    select user_id,count(distinct lesson_id) filter(where completed=true)::integer lessons
    from public.canopy_lesson_progress
    group by user_id
  ), assignments as (
    select user_id,
      count(distinct week_key) filter(
        where review_source='manual'
          and assessment_status='completed'
          and coalesce(final_score,0)>0
      )::integer approved,
      count(distinct week_key)::integer submitted
    from public.canopy_assignment_submissions
    where week_key in ('module-01','module-02','module-03','module-04','module-05')
    group by user_id
  ), attendance as (
    select user_id,count(distinct module_id) filter(where attended=true)::integer sessions
    from public.canopy_live_attendance
    group by user_id
  ), code as (
    select lower(btrim(email)) email,
      bool_or(programme_slug='she-leads-2026' or cohort_label='Cohort 2 · 2026') generated
    from public.womate_selected_card_invites
    group by lower(btrim(email))
  ), base as (
    select a.user_id,a.full_name,a.country,coalesce(l.lessons,0) as lessons,
      coalesce(s.approved,0) as assignments_completed,
      coalesce(s.submitted,0) as assignments_submitted,
      coalesce(t.sessions,0) as attendance,
      coalesce(c.generated,false) as selection_code,
      (
        coalesce(l.lessons,0)>=10
        and coalesce(s.approved,0)>=3
        and coalesce(t.sessions,0)>=3
        and coalesce(c.generated,false)
      ) as baseline_met,
      coalesce(
        (select cred.credential_code
         from public.womate_certificate_credentials cred
         where cred.recipient_id=a.user_id
         order by cred.issued_at desc
         limit 1),
        (select res.credential_code
         from public.womate_c2_certificate_id_reservations res
         where res.user_id=a.user_id)
      ) as credential_id,
      coalesce(
        (select cred.status
         from public.womate_certificate_credentials cred
         where cred.recipient_id=a.user_id
         order by cred.issued_at desc
         limit 1),
        (select 'reserved'::text
         from public.womate_c2_certificate_id_reservations res
         where res.user_id=a.user_id)
      ) as credential_status
    from active a
    left join lesson l on l.user_id=a.user_id
    left join assignments s on s.user_id=a.user_id
    left join attendance t on t.user_id=a.user_id
    left join code c on c.email=lower(btrim(a.email))
  ), ranked as (
    select row_number() over(
      order by baseline_met desc,assignments_completed desc,lessons desc,attendance desc,full_name asc,user_id asc
    )::integer as rank,
      user_id,coalesce(full_name,'Unnamed learner') as full_name,coalesce(country,'') as country,
      lessons,assignments_completed,assignments_submitted,attendance,selection_code,
      baseline_met,credential_id,credential_status
    from base
  ), historical_baseline as (
    select user_id from base where baseline_met
    union
    select user_id from public.womate_c2_certificate_id_reservations
    union
    select recipient_id as user_id
    from public.womate_certificate_credentials
    where status in ('issued','revoked')
  )
  select jsonb_build_object(
    'as_of',now(),
    'criteria',jsonb_build_object(
      'lessons_min',10,
      'reviewed_assignments_min',3,
      'attendance_min',3,
      'requires_generated_selection_code',true
    ),
    'total',(select count(*) from ranked),
    'active_baseline_count',(select count(*) from ranked where baseline_met),
    'baseline_count',(select count(distinct user_id) from historical_baseline),
    'reserved_count',(select count(distinct user_id) from public.womate_c2_certificate_id_reservations),
    'issued_count',(select count(distinct recipient_id) from public.womate_certificate_credentials where status='issued'),
    'revoked_count',(select count(distinct recipient_id) from public.womate_certificate_credentials where status='revoked'),
    'latest_credential_id',(
      select r.credential_code
      from public.womate_c2_certificate_id_reservations r
      order by r.serial_no desc
      limit 1
    ),
    'latest_serial',(select max(serial_no) from public.womate_c2_certificate_id_reservations),
    'rows',coalesce((select jsonb_agg(to_jsonb(r) order by r.rank) from ranked r),'[]'::jsonb)
  ) into output;

  return output;
end;
$function$;

do $$
declare
  v_reserved integer;
  v_issued integer;
  v_historical integer;
begin
  select count(distinct user_id) into v_reserved
  from public.womate_c2_certificate_id_reservations;

  select count(distinct recipient_id) into v_issued
  from public.womate_certificate_credentials
  where status='issued';

  with historical as (
    select user_id from public.womate_c2_certificate_id_reservations
    union
    select recipient_id from public.womate_certificate_credentials where status in ('issued','revoked')
  )
  select count(distinct user_id) into v_historical from historical;

  if v_historical < v_reserved or v_historical < v_issued then
    raise exception 'Cumulative baseline invariant violated';
  end if;
end $$;
