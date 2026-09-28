-- WOMATE Canopy production follow-up
-- 1. Fix country/profile-triggered mission auto-pairing and backfill waiting learners.
-- 2. Release Module 01 latest manually-completed results now that the first deadline has passed.
-- 3. Keep revision-required learners in the revision flow until they are manually completed.

set lock_timeout = '8s';
set statement_timeout = '120s';

create or replace function public.canopy_autopair_after_profile_country_change()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_changed boolean := false;
begin
  if tg_op = 'INSERT' then
    v_changed := true;
  else
    v_changed := old.country is distinct from new.country
      or old.role is distinct from new.role;
  end if;

  if v_changed
     and new.role = 'learner'
     and nullif(trim(coalesce(new.country,'')),'') is not null
     and public.canopy_module1_mission_eligible(new.user_id)
     and not exists (
       select 1 from public.canopy_mission_exclusions e where e.user_id = new.user_id
     )
     and not exists (
       select 1 from public.canopy_mission_group_members m where m.user_id = new.user_id
     ) then
    perform public.canopy_try_form_mission_groups();
  end if;

  return new;
end;
$$;

revoke all on function public.canopy_autopair_after_profile_country_change() from public;

drop trigger if exists canopy_autopair_after_profile_country_change_trg on public.canopy_profiles;
create trigger canopy_autopair_after_profile_country_change_trg
after insert or update of country,role on public.canopy_profiles
for each row
execute function public.canopy_autopair_after_profile_country_change();

-- Retry all currently waiting eligible learners immediately.
select public.canopy_try_form_mission_groups();

-- Latest manually completed Module 01 attempts are final now that the first
-- submission deadline has passed. Older attempts remain untouched for audit.
with ranked as (
  select
    s.id,
    row_number() over (
      partition by s.user_id,s.week_key
      order by coalesce(s.attempt_no,1) desc, s.submitted_at desc nulls last, s.id desc
    ) as rn
  from public.canopy_assignment_submissions s
  where s.week_key = 'module-01'
), final_rows as (
  select s.id
  from public.canopy_assignment_submissions s
  join ranked r on r.id = s.id and r.rn = 1
  where s.review_source = 'manual'
    and s.assessment_status = 'completed'
    and s.final_score is not null
)
update public.canopy_assignment_submissions s
set status = 'satisfactory',
    assessment_status = 'completed',
    release_at = least(coalesce(s.release_at,now()),now())
from final_rows f
where s.id = f.id;

-- Replace any stale revision/review notification for those final latest rows
-- with the released final score and remark. Fingerprints prevent duplicates.
insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
select
  s.user_id,
  'assignment_score',
  'WOMATE assignment result available',
  'Final WOMATE score: ' || s.final_score::text || '/100' ||
    case when nullif(trim(coalesce(s.score_band,'')),'') is not null then ' - ' || trim(s.score_band) else '' end ||
    case when nullif(trim(coalesce(s.final_feedback,'')),'') is not null then '. ' || trim(s.final_feedback) else '.' end,
  '/canopy/assignments',
  'assignment-review:' || s.id::text
from public.canopy_assignment_submissions s
join (
  select id
  from (
    select
      x.id,
      x.review_source,
      x.assessment_status,
      x.final_score,
      row_number() over (
        partition by x.user_id,x.week_key
        order by coalesce(x.attempt_no,1) desc, x.submitted_at desc nulls last, x.id desc
      ) as rn
    from public.canopy_assignment_submissions x
    where x.week_key = 'module-01'
  ) q
  where q.rn = 1
    and q.review_source = 'manual'
    and q.assessment_status = 'completed'
    and q.final_score is not null
) f on f.id = s.id
on conflict(fingerprint) do update
set title = excluded.title,
    body = excluded.body,
    link = excluded.link,
    type = excluded.type,
    read_at = null;

-- Keep the manager review RPC aligned with the released-deadline rule:
-- revision-required remains open to Wednesday, but a manual Completed decision
-- made after the first submission deadline releases immediately.
create or replace function public.canopy_manager_review_assignment(
  p_submission_id uuid,
  p_score integer,
  p_feedback text,
  p_decision text
)
returns setof public.canopy_assignment_submissions
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  r public.canopy_assignment_submissions%rowtype;
  v_status text;
  v_band text;
  v_title text;
  v_body text;
  v_feedback text := nullif(trim(coalesce(p_feedback,'')),'');
  v_first_due timestamptz;
  v_revision_due timestamptz;
  v_release_at timestamptz;
begin
  if auth.uid() is null or not public.canopy_is_manager(auth.uid()) then
    raise exception 'Only an authorised WOMATE Programme Manager can review assignments.';
  end if;
  if p_score is null or p_score < 0 or p_score > 100 then
    raise exception 'Final score must be between 0 and 100.';
  end if;
  if p_decision not in ('completed','revision_required','needs_manual_review') then
    raise exception 'Unsupported review decision.';
  end if;

  select * into r
  from public.canopy_assignment_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Assignment submission not found.';
  end if;

  case r.week_key
    when 'module-01' then
      v_first_due := '2026-09-27 23:59:59+00'::timestamptz;
      v_revision_due := '2026-09-30 23:59:59+00'::timestamptz;
    when 'module-02' then
      v_first_due := '2026-10-04 23:59:59+00'::timestamptz;
      v_revision_due := '2026-10-07 23:59:59+00'::timestamptz;
    when 'module-03' then
      v_first_due := '2026-10-11 23:59:59+00'::timestamptz;
      v_revision_due := '2026-10-14 23:59:59+00'::timestamptz;
    when 'module-04' then
      v_first_due := '2026-10-18 23:59:59+00'::timestamptz;
      v_revision_due := '2026-10-21 23:59:59+00'::timestamptz;
    when 'module-05' then
      v_first_due := '2026-10-25 23:59:59+00'::timestamptz;
      v_revision_due := '2026-10-28 23:59:59+00'::timestamptz;
    else
      v_first_due := coalesce(r.release_at,now());
      v_revision_due := coalesce(r.release_at,now());
  end case;

  if p_decision = 'revision_required' then
    v_release_at := v_revision_due;
  elsif p_decision = 'completed' and now() >= v_first_due then
    v_release_at := now();
  elsif coalesce(r.attempt_no,1) > 1 then
    v_release_at := v_revision_due;
  else
    v_release_at := v_first_due;
  end if;

  -- Do not move a not-yet-due hold backwards except when WOMATE has explicitly
  -- completed the work after the first deadline, which is final by this rule.
  if not (p_decision = 'completed' and now() >= v_first_due)
     and r.release_at is not null
     and r.release_at > v_release_at then
    v_release_at := r.release_at;
  end if;

  v_status := case
    when p_decision = 'completed' then 'satisfactory'
    when p_decision = 'revision_required' then 'revision_requested'
    else r.status
  end;

  v_band := case
    when p_score >= 85 then 'Strong'
    when p_score >= 70 then 'Satisfactory'
    when p_score >= 55 then 'Developing'
    else 'Needs strengthening'
  end;

  update public.canopy_assignment_submissions
  set status = v_status,
      assessment_status = p_decision,
      final_score = p_score,
      final_feedback = coalesce(v_feedback,feedback_hint,''),
      score_band = v_band,
      review_source = 'manual',
      release_at = v_release_at
  where id = p_submission_id
  returning * into r;

  if p_decision = 'revision_required' then
    v_title := 'Assignment revision required';
    v_body := 'WOMATE has requested a revision. Your score is not released yet.' ||
      case when v_feedback is not null then ' ' || v_feedback else ' Review the assignment instructions and submit your revision before the revision window closes.' end;
  elsif p_decision = 'completed' and now() < v_release_at then
    v_title := 'WOMATE assignment review completed';
    v_body := 'WOMATE has completed the review of your assignment. Your final score and remark will be available after the assignment grading window closes.';
  elsif p_decision = 'completed' then
    v_title := 'WOMATE assignment result available';
    v_body := 'Final WOMATE score: ' || p_score || '/100 - ' || v_band ||
      case when v_feedback is not null then '. ' || v_feedback else '.' end;
  else
    v_title := 'Assignment review in progress';
    v_body := 'WOMATE has marked this submission for further manual review. No final score has been released yet.';
  end if;

  insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
  values(r.user_id,'assignment_score',v_title,v_body,'/canopy/assignments','assignment-review:' || r.id::text)
  on conflict(fingerprint) do update
  set title = excluded.title,
      body = excluded.body,
      link = excluded.link,
      type = excluded.type,
      read_at = null;

  insert into public.canopy_team_audit_log(actor_user_id,action,target_user_id,detail)
  values(
    auth.uid(),
    'assignment_manual_review_saved',
    r.user_id,
    jsonb_build_object(
      'submission_id',r.id,
      'score',p_score,
      'decision',p_decision,
      'learner_release_at',v_release_at
    )
  );

  return next r;
end;
$$;

revoke all on function public.canopy_manager_review_assignment(uuid,integer,text,text) from public;
grant execute on function public.canopy_manager_review_assignment(uuid,integer,text,text) to authenticated;

reset lock_timeout;
reset statement_timeout;