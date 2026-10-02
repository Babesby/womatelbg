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
      case when v_feedback is not null then ' ' || regexp_replace(v_feedback,'^\[CANOPY_REVISION:([a-z]+(?:,[a-z]+)*)\]\s*','','i') else ' Review the assignment instructions and submit your revision before the revision window closes.' end;
  elsif p_decision = 'completed' and now() < v_release_at then
    v_title := 'WOMATE assignment review completed';
    v_body := 'WOMATE has completed the review of your assignment. Your final score and remark will be available after the assignment grading window closes.';
  elsif p_decision = 'completed' then
    v_title := 'WOMATE assignment result available';
    v_body := 'Final WOMATE score: ' || p_score || '/100 - ' || v_band ||
      case when v_feedback is not null then '. ' || regexp_replace(v_feedback,'^\[CANOPY_REVISION:([a-z]+(?:,[a-z]+)*)\]\s*','','i') else '.' end;
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


-- WOMATE focused revisions: preserve all unselected components.
-- Prior one-part tags and [CANOPY_REVISION:all] remain compatible.
create or replace function public.canopy_preserve_unrequested_revision_parts()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare previous public.canopy_assignment_submissions%rowtype; selected text; requested text[];
begin
  select * into previous from public.canopy_assignment_submissions
  where user_id=new.user_id and week_key=new.week_key
  order by attempt_no desc,submitted_at desc,id desc limit 1;
  if previous.id is null or previous.review_source <> 'manual' or previous.assessment_status <> 'revision_required' then return new; end if;
  selected:=substring(coalesce(previous.manual_feedback,previous.final_feedback,'') from '\[CANOPY_REVISION:([a-z,]+)\]');
  if selected is null or selected='all' then return new; end if;
  requested:=string_to_array(selected,',');
  if not (requested <@ array['paragraph','practical','speaker']::text[]) or cardinality(requested)=0 then return new; end if;
  if not ('paragraph'=any(requested)) then new.paragraph_response:=previous.paragraph_response; end if;
  if not ('practical'=any(requested)) then new.canvas_link:=previous.canvas_link; end if;
  if not ('speaker'=any(requested)) then new.linkedin_link:=previous.linkedin_link; end if;
  return new;
end;$$;

-- Preserve existing data, including historical Perspective publications.
alter table public.womate_publications drop constraint if exists womate_publications_kind_check;
alter table public.womate_publications add constraint womate_publications_kind_check
check(kind in ('Research paper','Article','Policy brief','Case study','Perspective','Position paper','Editorial','Annual report','Blog','Other'));
grant usage on schema public to service_role;
grant select,insert,update on public.womate_publications to service_role;
grant select,insert,delete on public.womate_publication_rate_events to service_role;
grant usage,select on sequence public.womate_publication_rate_events_id_seq to service_role;
grant execute on function public.womate_publication_allow(text,text,int,int) to service_role;
