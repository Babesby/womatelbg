-- Broader speaker evidence and focused revision preservation.
create or replace function public.canopy_assignment_auto_score(
  p_paragraph text,
  p_canvas text,
  p_linkedin text
)
returns integer
language plpgsql
immutable
as $$
declare
  v_text text := trim(coalesce(p_paragraph, ''));
  v_score integer := 0;
begin

  -- Paragraph development: maximum 50 points
  if length(v_text) >= 250 then
    v_score := v_score + 50;

  elsif length(v_text) >= 160 then
    v_score := v_score + 43;

  elsif length(v_text) >= 100 then
    v_score := v_score + 34;

  elsif length(v_text) >= 60 then
    v_score := v_score + 24;

  elsif length(v_text) > 0 then
    v_score := v_score + 12;
  end if;


  -- Climate / module relevance: maximum 10 points
  if v_text ~*
    '\m(climate|adaptation|mitigation|resilience|justice|gender|policy|governance|advocacy|leadership|community|evidence|action)\M'
  then
    v_score := v_score + 10;
  end if;


  -- CanopyCanvas evidence: 20 points
  if trim(coalesce(p_canvas, '')) ~* '^https?://'
  then
    v_score := v_score + 20;
  end if;


  -- Speaker social-post evidence: 20 points
  if trim(coalesce(p_linkedin, '')) ~*
    '^https?://(([^/]*\.)?(linkedin\.com|twitter\.com|x\.com|facebook\.com|instagram\.com|tiktok\.com)|lnkd\.in|t\.co|fb\.watch)/'
  then
    v_score := v_score + 20;
  end if;


  return least(100, greatest(0, v_score));

end;
$$;

create or replace function public.canopy_auto_feedback(
  p_paragraph text,
  p_canvas text,
  p_linkedin text,
  p_score integer
)
returns text
language plpgsql
immutable
as $$
begin

  if length(trim(coalesce(p_paragraph, ''))) < 100 then
    return
      'Strengthen the paragraph with a clearer explanation, evidence and connection to the module.';
  end if;


  if trim(coalesce(p_canvas, '')) !~* '^https?://' then
    return
      'Your CanopyCanvas evidence link needs to be checked or replaced with a working shared link.';
  end if;


  if trim(coalesce(p_linkedin, '')) !~*
    '^https?://(([^/]*\.)?(linkedin\.com|twitter\.com|x\.com|facebook\.com|instagram\.com|tiktok\.com)|lnkd\.in|t\.co|fb\.watch)/'
  then
    return
      'Your speaker-task post link needs to be checked or replaced with a valid LinkedIn, X, Facebook, TikTok or Instagram link.';
  end if;


  if p_score < 70 then

    return
      'Your submission needs strengthening before completion. Review the module and improve the weaker areas.';

  elsif p_score < 85 then

    return
      'Good foundation. Add greater specificity, evidence and connection between the learning and your proposed action.';

  else

    return
      'Strong baseline submission. WOMATE may still review the work before the final programme decision.';

  end if;

end;
$$;

create or replace function public.canopy_prepare_assignment_assessment()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_score integer;
begin

  -- The designated isolated tester uses its own deterministic grading RPC.
  if exists (select 1 from auth.users u where u.id=new.user_id and lower(coalesce(u.email,''))='p.viewmultimedia@gmail.com') then
    return new;
  end if;

  v_score :=
    public.canopy_assignment_auto_score(
      new.paragraph_response,
      new.canvas_link,
      new.linkedin_link
    );


  new.auto_score := v_score;

  new.score_band :=
    public.canopy_score_band(v_score);

  new.feedback_hint :=
    public.canopy_auto_feedback(
      new.paragraph_response,
      new.canvas_link,
      new.linkedin_link,
      v_score
    );

  new.automation_reviewed_at := now();


  if
    length(trim(coalesce(new.paragraph_response, ''))) < 60

    or trim(coalesce(new.canvas_link, '')) !~*
      '^https?://'

    or trim(coalesce(new.linkedin_link, '')) !~*
      '^https?://(([^/]*\.)?(linkedin\.com|twitter\.com|x\.com|facebook\.com|instagram\.com|tiktok\.com)|lnkd\.in|t\.co|fb\.watch)/'

  then

    new.assessment_status := 'needs_manual_review';

  elsif v_score < 70 then

    new.assessment_status := 'revision_required';

  else

    new.assessment_status := 'auto_reviewed';

  end if;


  new.final_score := v_score;

  new.final_feedback := new.feedback_hint;

  new.review_source := 'automated';


  -- New/revised work clears any previous human override.
  new.manual_score := null;

  new.manual_feedback := null;

  new.manual_decision := null;

  new.reviewed_by := null;

  new.reviewed_at := null;


  return new;

end;
$$;

create or replace function public.canopy_refresh_learning_automation()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin

  update public.canopy_assignment_submissions s
  set

    auto_score =
      public.canopy_assignment_auto_score(
        s.paragraph_response,
        s.canvas_link,
        s.linkedin_link
      ),

    score_band =
      case

        when
          s.review_source = 'manual'
          and s.final_score is not null

        then public.canopy_score_band(s.final_score)


        else
          public.canopy_score_band(
            public.canopy_assignment_auto_score(
              s.paragraph_response,
              s.canvas_link,
              s.linkedin_link
            )
          )

      end,

    feedback_hint =
      public.canopy_auto_feedback(
        s.paragraph_response,
        s.canvas_link,
        s.linkedin_link,
        public.canopy_assignment_auto_score(
          s.paragraph_response,
          s.canvas_link,
          s.linkedin_link
        )
      ),

    final_score =
      case

        when s.review_source = 'manual'
        then s.final_score

        else
          public.canopy_assignment_auto_score(
            s.paragraph_response,
            s.canvas_link,
            s.linkedin_link
          )

      end,

    final_feedback =
      case

        when s.review_source = 'manual'
        then s.final_feedback

        else
          public.canopy_auto_feedback(
            s.paragraph_response,
            s.canvas_link,
            s.linkedin_link,
            public.canopy_assignment_auto_score(
              s.paragraph_response,
              s.canvas_link,
              s.linkedin_link
            )
          )

      end,

    review_source =
      case

        when s.review_source = 'manual'
        then 'manual'

        else 'automated'

      end,

    automation_reviewed_at = now(),

    assessment_status =
      case

        when s.review_source = 'manual'
        then s.assessment_status


        when
          length(trim(coalesce(s.paragraph_response, ''))) < 60

          or trim(coalesce(s.canvas_link, '')) !~*
            '^https?://'

          or trim(coalesce(s.linkedin_link, '')) !~*
            '^https?://(([^/]*\.)?(linkedin\.com|twitter\.com|x\.com|facebook\.com|instagram\.com|tiktok\.com)|lnkd\.in|t\.co|fb\.watch)/'

        then 'needs_manual_review'


        when
          public.canopy_assignment_auto_score(
            s.paragraph_response,
            s.canvas_link,
            s.linkedin_link
          ) < 70

        then 'revision_required'


        else 'auto_reviewed'

      end

  where
    (public.canopy_is_manager(auth.uid()) or s.user_id = auth.uid())
    and not exists (select 1 from auth.users u where u.id=s.user_id and lower(coalesce(u.email,''))='p.viewmultimedia@gmail.com');


  get diagnostics v_count = row_count;


  return v_count;

end;
$$;

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
      case when v_feedback is not null then ' ' || regexp_replace(v_feedback,'^\[CANOPY_REVISION:(paragraph|practical|speaker|all)\]\s*','','i') else ' Review the assignment instructions and submit your revision before the revision window closes.' end;
  elsif p_decision = 'completed' and now() < v_release_at then
    v_title := 'WOMATE assignment review completed';
    v_body := 'WOMATE has completed the review of your assignment. Your final score and remark will be available after the assignment grading window closes.';
  elsif p_decision = 'completed' then
    v_title := 'WOMATE assignment result available';
    v_body := 'Final WOMATE score: ' || p_score || '/100 - ' || v_band ||
      case when v_feedback is not null then '. ' || regexp_replace(v_feedback,'^\[CANOPY_REVISION:(paragraph|practical|speaker|all)\]\s*','','i') else '.' end;
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

create or replace function public.canopy_preserve_unrequested_revision_parts()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare previous public.canopy_assignment_submissions%rowtype; part text;
begin
  select * into previous from public.canopy_assignment_submissions
  where user_id=new.user_id and week_key=new.week_key
  order by attempt_no desc,submitted_at desc,id desc limit 1;
  if previous.id is null or previous.review_source <> 'manual' or previous.assessment_status <> 'revision_required' then return new; end if;
  part:=substring(coalesce(previous.manual_feedback,previous.final_feedback,'') from '\[CANOPY_REVISION:(paragraph|practical|speaker|all)\]');
  if part is null or part='all' then return new; end if;
  if part<>'paragraph' then new.paragraph_response:=previous.paragraph_response; end if;
  if part<>'practical' then new.canvas_link:=previous.canvas_link; end if;
  if part<>'speaker' then new.linkedin_link:=previous.linkedin_link; end if;
  return new;
end;$$;
drop trigger if exists ab_canopy_preserve_unrequested_revision_parts on public.canopy_assignment_submissions;
create trigger ab_canopy_preserve_unrequested_revision_parts before insert on public.canopy_assignment_submissions
for each row execute function public.canopy_preserve_unrequested_revision_parts();

-- Explicit service-role grants repair installations where REST access was omitted.
grant usage on schema public to service_role;
grant select,insert,update on public.womate_publications to service_role;
grant select,insert,delete on public.womate_publication_rate_events to service_role;
grant usage,select on sequence public.womate_publication_rate_events_id_seq to service_role;
grant execute on function public.womate_publication_allow(text,text,int,int) to service_role;
notify pgrst,'reload schema';
