-- WOMATE CANOPY · hold learner-facing final grades until the applicable deadline
-- 2026-09-27
-- Internal/manual grading remains immediate for staff.
-- Learners do not receive a numeric score/grade notification before release_at.
-- First-attempt final results release after Sunday 23:59:59 GMT.
-- Revision-attempt final results release after Wednesday 23:59:59 GMT.
-- Revision-required notices remain immediate, but expose only actionable feedback, not the score.

set lock_timeout = '8s';
set statement_timeout = '60s';

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
  v_feedback text:=nullif(trim(coalesce(p_feedback,'')),'');
  v_first_due timestamptz;
  v_revision_due timestamptz;
  v_release_at timestamptz;
begin
  if auth.uid() is null or not public.canopy_is_manager(auth.uid()) then
    raise exception 'Only an authorised WOMATE Programme Manager can review assignments.';
  end if;
  if p_score is null or p_score<0 or p_score>100 then
    raise exception 'Final score must be between 0 and 100.';
  end if;
  if p_decision not in ('completed','revision_required','needs_manual_review') then
    raise exception 'Unsupported review decision.';
  end if;

  select * into r
  from public.canopy_assignment_submissions
  where id=p_submission_id
  for update;

  if not found then raise exception 'Assignment submission not found.'; end if;

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
      -- Preserve compatibility if another module is introduced before its
      -- schedule migration lands. Never make an existing release later by accident.
      v_first_due := coalesce(r.release_at, now());
      v_revision_due := coalesce(r.release_at, now());
  end case;

  -- Any revision workflow stays private until the revision window closes.
  -- A first-attempt completion is held only until the normal Sunday deadline.
  if p_decision='revision_required' or coalesce(r.attempt_no,1)>1 then
    v_release_at := v_revision_due;
  else
    v_release_at := v_first_due;
  end if;

  -- Never move an already-scheduled result release backwards.
  if r.release_at is not null and r.release_at > v_release_at then
    v_release_at := r.release_at;
  end if;

  v_status:=case
    when p_decision='completed' then 'satisfactory'
    when p_decision='revision_required' then 'revision_requested'
    else r.status
  end;
  v_band:=case
    when p_score>=85 then 'Strong'
    when p_score>=70 then 'Satisfactory'
    when p_score>=55 then 'Developing'
    else 'Needs strengthening'
  end;

  update public.canopy_assignment_submissions
  set status=v_status,
      assessment_status=p_decision,
      final_score=p_score,
      final_feedback=coalesce(v_feedback,feedback_hint,''),
      score_band=v_band,
      review_source='manual',
      release_at=v_release_at
  where id=p_submission_id
  returning * into r;

  if p_decision='revision_required' then
    v_title:='Assignment revision required';
    v_body:='WOMATE has requested a revision. Your score is not released yet.' ||
      case when v_feedback is not null then ' '||v_feedback else ' Review the assignment instructions and submit your revision before the revision window closes.' end;
  elsif p_decision='completed' and now() < v_release_at then
    v_title:='WOMATE assignment review completed';
    v_body:='WOMATE has completed the review of your assignment. Your final score and remark will be available after the assignment grading window closes.';
  elsif p_decision='completed' then
    v_title:='WOMATE assignment result available';
    v_body:='Final WOMATE score: '||p_score||'/100 · '||v_band||
      case when v_feedback is not null then '. '||v_feedback else '.' end;
  else
    v_title:='Assignment review in progress';
    v_body:='WOMATE has marked this submission for further manual review. No final score has been released yet.';
  end if;

  insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
  values(r.user_id,'assignment_score',v_title,v_body,'/canopy/assignments','assignment-review:'||r.id::text)
  on conflict(fingerprint) do update
  set title=excluded.title,
      body=excluded.body,
      link=excluded.link,
      type=excluded.type,
      read_at=null;

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

-- Sanitize still-visible early grade notifications already created for
-- submissions whose learner-facing result release is still in the future.
update public.canopy_notifications n
set title='WOMATE assignment review completed',
    body='WOMATE has completed the review of your assignment. Your final score and remark will be available after the assignment grading window closes.'
from public.canopy_assignment_submissions s
where n.user_id=s.user_id
  and n.fingerprint='assignment-review:'||s.id::text
  and s.assessment_status='completed'
  and s.release_at is not null
  and s.release_at>now();

-- Remove numeric-score leakage from open revision notifications while keeping
-- the actual reviewer feedback learners need in order to revise.
update public.canopy_notifications n
set title='Assignment revision required',
    body='WOMATE has requested a revision. Your score is not released yet.' ||
      case
        when nullif(trim(coalesce(s.final_feedback,'')),'') is not null
          then ' '||trim(s.final_feedback)
        else ' Review the assignment instructions and submit your revision before the revision window closes.'
      end
from public.canopy_assignment_submissions s
where n.user_id=s.user_id
  and n.fingerprint='assignment-review:'||s.id::text
  and s.assessment_status='revision_required'
  and s.release_at is not null
  and s.release_at>now();

reset lock_timeout;
reset statement_timeout;
