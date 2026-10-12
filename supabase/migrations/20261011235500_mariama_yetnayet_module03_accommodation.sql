set lock_timeout='8s';
set statement_timeout='120s';

alter table public.canopy_assignment_submissions
  add column if not exists practical_waived boolean not null default false,
  add column if not exists impact_hide_practical boolean not null default false,
  add column if not exists optional_evidence_until timestamptz null;

create or replace function public.canopy_submit_accommodated_optional_evidence(
  p_week_key text,p_canvas_link text default null,p_linkedin_link text default null
)
returns setof public.canopy_assignment_submissions
language plpgsql security definer set search_path=public,auth
as $$
declare
  r public.canopy_assignment_submissions%rowtype;
  v_canvas text:=nullif(trim(coalesce(p_canvas_link,'')),'');
  v_social text:=nullif(trim(coalesce(p_linkedin_link,'')),'');
begin
  if auth.uid() is null then raise exception 'Sign in to continue.'; end if;
  select * into r
  from public.canopy_assignment_submissions s
  where s.user_id=auth.uid() and s.week_key=p_week_key
    and s.practical_waived=true and s.review_source='manual'
    and s.assessment_status='completed'
  order by coalesce(s.attempt_no,1) desc,s.submitted_at desc nulls last,s.id desc
  limit 1 for update;

  if not found then raise exception 'No WOMATE-approved optional-evidence accommodation is active for this assignment.'; end if;
  if r.optional_evidence_until is null or now()>r.optional_evidence_until then raise exception 'The optional evidence grace period has closed.'; end if;
  if v_canvas is null and v_social is null then raise exception 'Add at least one optional evidence link.'; end if;

  if v_canvas is not null and v_canvas !~* '^https://(drive\.google\.com|docs\.google\.com|onedrive\.live\.com|1drv\.ms|[^/]+\.sharepoint\.com)/'
  then raise exception 'Use a viewable Google Drive, Google Docs, OneDrive or SharePoint link for optional practical evidence.'; end if;

  if v_social is not null and v_social !~* '^https://([^/]+\.)?(linkedin\.com|x\.com|twitter\.com|instagram\.com|facebook\.com|threads\.net|tiktok\.com|youtube\.com|youtu\.be|bsky\.app)/'
  then raise exception 'Use a public LinkedIn, X/Twitter, Instagram, Facebook, Threads, TikTok, YouTube or Bluesky link.'; end if;

  update public.canopy_assignment_submissions
  set canvas_link=coalesce(v_canvas,canvas_link),
      linkedin_link=coalesce(v_social,linkedin_link)
  where id=r.id;

  update public.canopy_assignment_submissions
  set status='satisfactory',assessment_status='completed',final_score=100,
      manual_score=100,score_band='Strong',review_source='manual',
      manual_decision='completed',practical_waived=true,impact_hide_practical=true
  where id=r.id returning * into r;

  return next r;
end;
$$;

revoke all on function public.canopy_submit_accommodated_optional_evidence(text,text,text) from public;
grant execute on function public.canopy_submit_accommodated_optional_evidence(text,text,text) to authenticated;

do $$
declare
  v_mariama uuid; v_yetnayet uuid; v_actor uuid; v_submission uuid; v_attempt integer;
  v_mc integer; v_yc integer; v_y_users integer; v_y_match_count integer;
  v_y_resolution text;
  v_mf text:='WOMATE has approved an individual accommodation for Module 03. Your consistency, effort and communication throughout the programme are recognised. This module is manually completed at 100/100. No further practical submission is required. Please take the time you need and keep moving forward when you are able. We are proud of the commitment you have shown.';
  v_yf text:='WOMATE has approved a team-related accommodation for Module 03 after Mariama contacted us. Your consistency and strong participation across Modules 01 and 02 are recognised. This module is manually completed at 100/100. The Climate Voice-Off practical is not required for this completion. If you wish, you may still add the Voice-Off or your public speaker/social link during the extended grace period. Keep going, your consistent work matters.';
  v_mm text:='Thank you for keeping WOMATE informed. We have approved an individual accommodation for Module 03 and manually completed your Module 03 assignment at 100/100. You do not need to complete or resubmit the Climate Voice-Off practical. The explanatory practical link you submitted will remain available to WOMATE for review but will not appear on your Impact Profile. Your public speaker/social evidence can still appear there. Please take the time you need, and know that we value the commitment you have continued to show.';
  v_ym text:='Mariama reached out to WOMATE about the circumstances affecting your team assignment. We have approved a Module 03 accommodation and manually completed your Module 03 assignment at 100/100. You do not need to submit the Climate Voice-Off practical to keep this completion. If you would still like to complete the Voice-Off, you may optionally add it during the extended grace period through 14 October 2026 at 23:59 GMT. If you have completed your public speaker/social post, you may add that link as well. For Module 03, only your public speaker/social link will be shown on your Impact Profile. Your consistent work across Modules 01 and 02 has been noticed. Keep going.';
begin
  select count(*) into v_mc
  from public.canopy_profiles
  where lower(regexp_replace(trim(coalesce(full_name,'')),'\s+',' ','g'))='mariama mubanatu kamara';

  select count(*),count(distinct user_id)
  into v_yc,v_y_users
  from public.canopy_profiles
  where lower(regexp_replace(trim(coalesce(full_name,'')),'\s+',' ','g'))='yetnayet altaye';

  if v_mc<>1 then
    raise exception 'Preflight failed: expected exactly one Mariama Mubanatu Kamara profile, found %.',v_mc;
  end if;

  select user_id into v_mariama
  from public.canopy_profiles
  where lower(regexp_replace(trim(coalesce(full_name,'')),'\s+',' ','g'))='mariama mubanatu kamara'
  order by user_id::text
  limit 1;

  if v_y_users=1 then
    select distinct user_id into v_yetnayet
    from public.canopy_profiles
    where lower(regexp_replace(trim(coalesce(full_name,'')),'\s+',' ','g'))='yetnayet altaye'
    limit 1;
    v_y_resolution:='single distinct Yetnayet Altaye account';
  elsif v_y_users>1 then
    with c as (
      select distinct p.user_id
      from public.canopy_profiles p
      where lower(regexp_replace(trim(coalesce(p.full_name,'')),'\s+',' ','g'))='yetnayet altaye'
        and exists(select 1 from public.canopy_assignment_submissions s where s.user_id=p.user_id and s.week_key='module-01')
        and exists(select 1 from public.canopy_assignment_submissions s where s.user_id=p.user_id and s.week_key='module-02')
        and exists(select 1 from public.canopy_assignment_drafts d where d.user_id=p.user_id and d.week_key='module-03')
    )
    select count(*) into v_y_match_count from c;

    if v_y_match_count=1 then
      with c as (
        select distinct p.user_id
        from public.canopy_profiles p
        where lower(regexp_replace(trim(coalesce(p.full_name,'')),'\s+',' ','g'))='yetnayet altaye'
          and exists(select 1 from public.canopy_assignment_submissions s where s.user_id=p.user_id and s.week_key='module-01')
          and exists(select 1 from public.canopy_assignment_submissions s where s.user_id=p.user_id and s.week_key='module-02')
          and exists(select 1 from public.canopy_assignment_drafts d where d.user_id=p.user_id and d.week_key='module-03')
      )
      select user_id into v_yetnayet from c limit 1;
      v_y_resolution:='Module 01 + Module 02 history + Module 03 saved draft';
    else
      with c as (
        select distinct p.user_id
        from public.canopy_profiles p
        where lower(regexp_replace(trim(coalesce(p.full_name,'')),'\s+',' ','g'))='yetnayet altaye'
          and exists(select 1 from public.canopy_assignment_submissions s where s.user_id=p.user_id and s.week_key='module-01')
          and exists(select 1 from public.canopy_assignment_submissions s where s.user_id=p.user_id and s.week_key='module-02')
      )
      select count(*) into v_y_match_count from c;

      if v_y_match_count=1 then
        with c as (
          select distinct p.user_id
          from public.canopy_profiles p
          where lower(regexp_replace(trim(coalesce(p.full_name,'')),'\s+',' ','g'))='yetnayet altaye'
            and exists(select 1 from public.canopy_assignment_submissions s where s.user_id=p.user_id and s.week_key='module-01')
            and exists(select 1 from public.canopy_assignment_submissions s where s.user_id=p.user_id and s.week_key='module-02')
        )
        select user_id into v_yetnayet from c limit 1;
        v_y_resolution:='unique Module 01 + Module 02 submission history';
      else
        with c as (
          select distinct p.user_id
          from public.canopy_profiles p
          where lower(regexp_replace(trim(coalesce(p.full_name,'')),'\s+',' ','g'))='yetnayet altaye'
            and lower(trim(coalesce(p.country,'')))='ethiopia'
            and exists(select 1 from public.canopy_enrollments e where e.user_id=p.user_id and e.status='active')
            and (
              exists(select 1 from public.canopy_assignment_submissions s where s.user_id=p.user_id and s.week_key in('module-01','module-02'))
              or exists(select 1 from public.canopy_assignment_drafts d where d.user_id=p.user_id and d.week_key='module-03')
            )
        )
        select count(*) into v_y_match_count from c;

        if v_y_match_count=1 then
          with c as (
            select distinct p.user_id
            from public.canopy_profiles p
            where lower(regexp_replace(trim(coalesce(p.full_name,'')),'\s+',' ','g'))='yetnayet altaye'
              and lower(trim(coalesce(p.country,'')))='ethiopia'
              and exists(select 1 from public.canopy_enrollments e where e.user_id=p.user_id and e.status='active')
              and (
                exists(select 1 from public.canopy_assignment_submissions s where s.user_id=p.user_id and s.week_key in('module-01','module-02'))
                or exists(select 1 from public.canopy_assignment_drafts d where d.user_id=p.user_id and d.week_key='module-03')
              )
          )
          select user_id into v_yetnayet from c limit 1;
          v_y_resolution:='unique active Ethiopia learner with Canopy assignment activity';
        else
          raise exception 'Safety stop: duplicate Yetnayet Altaye accounts remain ambiguous after checking Module 01/02 submissions, Module 03 draft, active enrolment and Ethiopia profile. No learner was changed.';
        end if;
      end if;
    end if;
  else
    raise exception 'Preflight failed: no Yetnayet Altaye profile exists. No learner was changed.';
  end if;

  if v_yetnayet is null then
    raise exception 'Safety stop: Yetnayet learner resolution returned no user. No learner was changed.';
  end if;

  select x.user_id into v_actor from (
    select p.user_id,1 pr from public.canopy_profiles p where p.role='admin'
    union all select p.user_id,2 from public.canopy_profiles p where p.role='manager'
    union all select m.user_id,3 from public.canopy_staff_memberships m where m.status='active' and m.role='programme_manager'
  ) x order by x.pr limit 1;
  if v_actor is null then raise exception 'Preflight failed: no authorised WOMATE Admin/Manager account found.'; end if;

  -- Targeted administrative accommodation: the learner-facing first-submission
  -- deadline trigger must not block WOMATE from recording this approved Module 03
  -- exception. Disable ONLY that guard for this transaction and restore it below.
  if exists(
    select 1 from pg_trigger
    where tgrelid='public.canopy_assignment_submissions'::regclass
      and tgname='aa_canopy_guard_assignment_resubmission'
      and not tgisinternal
  ) then
    execute 'alter table public.canopy_assignment_submissions disable trigger aa_canopy_guard_assignment_resubmission';
  end if;

  if not exists(select 1 from public.canopy_assignment_submissions where user_id=v_mariama and week_key='module-03') then
    select coalesce(max(attempt_no),0)+1 into v_attempt from public.canopy_assignment_submissions where user_id=v_mariama and week_key='module-03';
    insert into public.canopy_assignment_submissions(
      user_id,week_key,attempt_no,paragraph_response,canvas_link,linkedin_link,
      status,auto_score,score_band,feedback_hint,release_at,submitted_at,
      assessment_status,review_source,automation_reviewed_at,final_score,final_feedback,
      manual_score,manual_feedback,manual_decision,reviewed_by,reviewed_at,
      practical_waived,impact_hide_practical,optional_evidence_until
    )
    select v_mariama,'module-03',v_attempt,coalesce(d.paragraph_response,''),'',coalesce(d.linkedin_link,''),
      'satisfactory',100,'Strong',v_mf,now(),now(),'completed','manual',now(),100,v_mf,
      100,v_mf,'completed',v_actor,now(),true,true,null
    from (select 1) z left join public.canopy_assignment_drafts d on d.user_id=v_mariama and d.week_key='module-03';
  end if;

  if not exists(select 1 from public.canopy_assignment_submissions where user_id=v_yetnayet and week_key='module-03') then
    select coalesce(max(attempt_no),0)+1 into v_attempt from public.canopy_assignment_submissions where user_id=v_yetnayet and week_key='module-03';
    insert into public.canopy_assignment_submissions(
      user_id,week_key,attempt_no,paragraph_response,canvas_link,linkedin_link,
      status,auto_score,score_band,feedback_hint,release_at,submitted_at,
      assessment_status,review_source,automation_reviewed_at,final_score,final_feedback,
      manual_score,manual_feedback,manual_decision,reviewed_by,reviewed_at,
      practical_waived,impact_hide_practical,optional_evidence_until
    )
    select v_yetnayet,'module-03',v_attempt,coalesce(d.paragraph_response,''),'',coalesce(d.linkedin_link,''),
      'satisfactory',100,'Strong',v_yf,now(),now(),'completed','manual',now(),100,v_yf,
      100,v_yf,'completed',v_actor,now(),true,true,'2026-10-14T23:59:59Z'::timestamptz
    from (select 1) z left join public.canopy_assignment_drafts d on d.user_id=v_yetnayet and d.week_key='module-03';
  end if;

  if exists(
    select 1 from pg_trigger
    where tgrelid='public.canopy_assignment_submissions'::regclass
      and tgname='aa_canopy_guard_assignment_resubmission'
      and not tgisinternal
  ) then
    execute 'alter table public.canopy_assignment_submissions enable trigger aa_canopy_guard_assignment_resubmission';
  end if;

  select id into v_submission from public.canopy_assignment_submissions
  where user_id=v_mariama and week_key='module-03'
  order by coalesce(attempt_no,1) desc,submitted_at desc nulls last,id desc limit 1;

  update public.canopy_assignment_submissions
  set status='satisfactory',assessment_status='completed',final_score=100,manual_score=100,
      score_band='Strong',final_feedback=v_mf,manual_feedback=v_mf,manual_decision='completed',
      review_source='manual',reviewed_by=v_actor,reviewed_at=now(),
      release_at=least(coalesce(release_at,now()),now()),
      practical_waived=true,impact_hide_practical=true,optional_evidence_until=null
  where id=v_submission;

  insert into public.canopy_team_audit_log(actor_user_id,action,target_user_id,detail)
  values(v_actor,'assignment_manual_review_saved',v_mariama,
    jsonb_build_object('submission_id',v_submission,'week_key','module-03','score',100,'decision','completed','accommodation','practical_waived','impact_hide_practical',true));

  select id into v_submission from public.canopy_assignment_submissions
  where user_id=v_yetnayet and week_key='module-03'
  order by coalesce(attempt_no,1) desc,submitted_at desc nulls last,id desc limit 1;

  update public.canopy_assignment_submissions
  set status='satisfactory',assessment_status='completed',final_score=100,manual_score=100,
      score_band='Strong',final_feedback=v_yf,manual_feedback=v_yf,manual_decision='completed',
      review_source='manual',reviewed_by=v_actor,reviewed_at=now(),
      release_at=least(coalesce(release_at,now()),now()),
      practical_waived=true,impact_hide_practical=true,
      optional_evidence_until='2026-10-14T23:59:59Z'::timestamptz
  where id=v_submission;

  insert into public.canopy_team_audit_log(actor_user_id,action,target_user_id,detail)
  values(v_actor,'assignment_manual_review_saved',v_yetnayet,
    jsonb_build_object(
      'submission_id',v_submission,
      'week_key','module-03',
      'score',100,
      'decision','completed',
      'accommodation','practical_waived',
      'impact_hide_practical',true,
      'identity_resolution',v_y_resolution
    ));

  -- Do not insert a second direct notification here.
  -- The existing canopy_manager_action_notify trigger sends exactly one
  -- learner notification when the feedback communication below is inserted.

  if not exists(select 1 from public.canopy_manager_actions where learner_id=v_mariama and action_type='feedback' and subject='Module 03 accommodation and completion') then
    insert into public.canopy_manager_actions(learner_id,action_type,subject,message,status,created_by,resolved_at)
    values(v_mariama,'feedback','Module 03 accommodation and completion',v_mm,'resolved',v_actor,now());
  end if;

  if not exists(select 1 from public.canopy_manager_actions where learner_id=v_yetnayet and action_type='feedback' and subject='Module 03 accommodation and completion') then
    insert into public.canopy_manager_actions(learner_id,action_type,subject,message,status,created_by,resolved_at)
    values(v_yetnayet,'feedback','Module 03 accommodation and completion',v_ym,'resolved',v_actor,now());
  end if;

  if (select count(*) from (
    select distinct on (s.user_id) s.*
    from public.canopy_assignment_submissions s
    where s.user_id in(v_mariama,v_yetnayet) and s.week_key='module-03'
    order by s.user_id,coalesce(s.attempt_no,1) desc,s.submitted_at desc nulls last,s.id desc
  ) q where q.review_source='manual' and q.assessment_status='completed'
      and q.final_score=100 and q.practical_waived=true and q.impact_hide_practical=true)<>2
  then raise exception 'Postflight failed: Module 03 accommodation completion did not persist for both learners.'; end if;
end;
$$;

reset lock_timeout;
reset statement_timeout;
