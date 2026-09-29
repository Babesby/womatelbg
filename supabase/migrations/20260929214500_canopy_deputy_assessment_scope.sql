-- WOMATE Canopy - Deputy assessment/complaints scope + mission acceptance filters
-- Generated 2026-09-29. Keeps manager-only capabilities isolated.

begin;

create or replace function public.canopy_deputy_review_complaint_data()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  staff_role text;
begin
  if auth.uid() is null then raise exception 'Sign in to continue.'; end if;
  staff_role := public.canopy_staff_role(auth.uid());
  if coalesce(staff_role,'') <> 'programme_operations' then
    raise exception 'Deputy Programme Manager access required.';
  end if;

  return jsonb_build_object(
    'role','programme_operations',
    'module_id',null,
    'counts',jsonb_build_object(
      'learners',0,
      'active_access',0,
      'submissions',(select count(*) from (select distinct on (s.user_id,s.week_key) s.id from public.canopy_assignment_submissions s order by s.user_id,s.week_key,coalesce(s.attempt_no,1) desc,s.submitted_at desc,s.id desc) q),
      'needs_attention',(select count(*) from (select distinct on (s.user_id,s.week_key) s.assessment_status from public.canopy_assignment_submissions s order by s.user_id,s.week_key,coalesce(s.attempt_no,1) desc,s.submitted_at desc,s.id desc) q where q.assessment_status in ('auto_reviewed','needs_manual_review')),
      'revision_required',(select count(*) from (select distinct on (s.user_id,s.week_key) s.assessment_status from public.canopy_assignment_submissions s order by s.user_id,s.week_key,coalesce(s.attempt_no,1) desc,s.submitted_at desc,s.id desc) q where q.assessment_status='revision_required'),
      'completed',(select count(*) from (select distinct on (s.user_id,s.week_key) s.assessment_status from public.canopy_assignment_submissions s order by s.user_id,s.week_key,coalesce(s.attempt_no,1) desc,s.submitted_at desc,s.id desc) q where q.assessment_status='completed'),
      'open_complaints',(select count(*) from public.canopy_manager_actions where action_type='complaint' and status='open'),
      'certificates',0
    ),
    'learners','[]'::jsonb,
    'recent_submissions',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',x.id,
        'user_id',x.user_id,
        'learner_id',x.user_id,
        'week_key',x.week_key,
        'module_label',replace(initcap(replace(x.week_key,'-',' ')),'Module ','Module '),
        'attempt_no',coalesce(x.attempt_no,1),
        'submitted_at',x.submitted_at,
        'learner_name',coalesce(p.full_name,'Learner'),
        'learner_email',u.email,
        'email',u.email,
        'score',coalesce(x.final_score,x.auto_score),
        'auto_score',x.auto_score,
        'review_source',x.review_source,
        'score_band',x.score_band,
        'assessment_status',x.assessment_status,
        'paragraph_response',coalesce(x.paragraph_response,''),
        'paragraph_excerpt',left(coalesce(x.paragraph_response,''),360),
        'final_feedback',x.final_feedback,
        'canvas_link',x.canvas_link,
        'linkedin_link',x.linkedin_link
      ) order by x.submitted_at desc)
      from (
        select distinct on (s.user_id,s.week_key) s.*
        from public.canopy_assignment_submissions s
        order by s.user_id,s.week_key,coalesce(s.attempt_no,1) desc,s.submitted_at desc,s.id desc
      ) x
      left join public.canopy_profiles p on p.user_id=x.user_id
      left join auth.users u on u.id=x.user_id
    ),'[]'::jsonb),
    'communications','[]'::jsonb,
    'complaints',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',a.id,
        'subject',a.subject,
        'message',a.message,
        'status',a.status,
        'response_message',a.response_message,
        'created_at',a.created_at,
        'learner_name',coalesce(p.full_name,'Learner')
      ) order by a.created_at desc)
      from public.canopy_manager_actions a
      left join public.canopy_profiles p on p.user_id=a.learner_id
      where a.action_type='complaint'
    ),'[]'::jsonb),
    'certificates','[]'::jsonb,
    'team_members','[]'::jsonb,
    'spotlights','[]'::jsonb
  );
end;
$$;

revoke all on function public.canopy_deputy_review_complaint_data() from public;
grant execute on function public.canopy_deputy_review_complaint_data() to authenticated;

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
  if auth.uid() is null or (not public.canopy_is_manager(auth.uid()) and coalesce(public.canopy_staff_role(auth.uid()),'') <> 'programme_operations') then
    raise exception 'Only an authorised WOMATE Programme Manager or Deputy Programme Manager can review assignments.';
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


commit;
