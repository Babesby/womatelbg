-- WOMATE CANOPY · submission lock + targeted admin communications + selected learner
-- 26 September 2026
-- Rerunnable. Additive except for replacing the assignment resubmission guard trigger.

set lock_timeout = '8s';
set statement_timeout = '120s';

-- ============================================================
-- 1. AFTER FIRST SUBMISSION, KEEP THE FORM CLOSED.
--    A new attempt is allowed only after a WOMATE MANUAL review
--    explicitly marks the latest attempt revision_required.
-- ============================================================

create or replace function public.canopy_guard_assignment_resubmission()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  prev public.canopy_assignment_submissions%rowtype;
begin
  -- Preserve the isolated tester workflow.
  if exists (
    select 1 from auth.users u
    where u.id=new.user_id
      and lower(coalesce(u.email,''))='p.viewmultimedia@gmail.com'
  ) then
    return new;
  end if;

  -- Serialize submits for the same learner/week so a double click cannot
  -- consume multiple attempts before the first transaction finishes.
  perform pg_advisory_xact_lock(
    hashtext(new.user_id::text),
    hashtext(coalesce(new.week_key,''))
  );

  select * into prev
  from public.canopy_assignment_submissions s
  where s.user_id=new.user_id
    and s.week_key=new.week_key
  order by s.submitted_at desc, s.id desc
  limit 1;

  if prev.id is null then
    return new;
  end if;

  if prev.review_source='manual'
     and prev.assessment_status='revision_required' then
    return new;
  end if;

  raise exception 'Your assignment is already submitted and is closed while WOMATE reviews it. Resubmission opens only when WOMATE requests a revision.';
end;
$$;

-- Retire the narrower old closure trigger if it exists.
drop trigger if exists canopy_block_resubmit_after_manual_completion
on public.canopy_assignment_submissions;

drop trigger if exists aa_canopy_guard_assignment_resubmission
on public.canopy_assignment_submissions;

create trigger aa_canopy_guard_assignment_resubmission
before insert on public.canopy_assignment_submissions
for each row
execute function public.canopy_guard_assignment_resubmission();

-- ============================================================
-- 2. WOMATE ADMIN TARGETED / BULK COMMUNICATIONS.
--    Existing canopy_manager_action_notify trigger creates each learner's
--    individual Canopy notification after these rows are inserted.
-- ============================================================

create or replace function public.canopy_admin_send_bulk_communication(
  p_action_type text,
  p_subject text,
  p_message text default '',
  p_audience text default 'all',
  p_week_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  sent_count integer := 0;
  clean_week text := nullif(trim(coalesce(p_week_key,'')),'');
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'Only WOMATE Admin can send bulk learner communications.';
  end if;

  if p_action_type not in ('warning','feedback','reminder') then
    raise exception 'Choose warning, feedback or reminder.';
  end if;

  if nullif(trim(coalesce(p_subject,'')),'') is null then
    raise exception 'Subject is required.';
  end if;

  if p_audience not in ('all','spotlighted','not_submitted','revision_required','completed') then
    raise exception 'Unknown learner audience.';
  end if;

  if clean_week is not null
     and clean_week not in ('module-01','module-02','module-03','module-04','module-05') then
    raise exception 'Unknown module.';
  end if;

  if p_audience='not_submitted' and clean_week is null then
    raise exception 'Choose a module for the not-submitted audience.';
  end if;

  with eligible as (
    select p.user_id
    from public.canopy_profiles p
    where p.role='learner'
      and not exists (
        select 1
        from public.canopy_learner_withdrawals w
        where w.user_id=p.user_id and w.active=true
      )
  ),
  ranked as (
    select s.*,
           row_number() over(
             partition by s.user_id,s.week_key
             order by s.submitted_at desc,s.id desc
           ) as rn
    from public.canopy_assignment_submissions s
    where clean_week is null or s.week_key=clean_week
  ),
  recipients as (
    select e.user_id
    from eligible e
    where p_audience='all'

    union

    select distinct e.user_id
    from eligible e
    join public.canopy_assignment_submissions s on s.user_id=e.user_id
    join public.canopy_spotlight_nominations n on n.submission_id=s.id
    where p_audience='spotlighted'
      and n.status='featured'
      and (clean_week is null or n.module_id=clean_week)

    union

    select e.user_id
    from eligible e
    where p_audience='not_submitted'
      and not exists (
        select 1 from public.canopy_assignment_submissions s
        where s.user_id=e.user_id and s.week_key=clean_week
      )

    union

    select distinct e.user_id
    from eligible e
    join ranked r on r.user_id=e.user_id and r.rn=1
    where p_audience='revision_required'
      and r.assessment_status='revision_required'

    union

    select distinct e.user_id
    from eligible e
    join ranked r on r.user_id=e.user_id and r.rn=1
    where p_audience='completed'
      and r.assessment_status='completed'
  ),
  inserted as (
    insert into public.canopy_manager_actions(
      learner_id,action_type,subject,message,status,created_by
    )
    select
      r.user_id,
      p_action_type,
      trim(p_subject),
      nullif(trim(coalesce(p_message,'')),''),
      'open',
      auth.uid()
    from recipients r
    returning id
  )
  select count(*) into sent_count from inserted;

  return jsonb_build_object(
    'sent',sent_count,
    'audience',p_audience,
    'week_key',clean_week
  );
end;
$$;

revoke all on function public.canopy_admin_send_bulk_communication(text,text,text,text,text) from public;
grant execute on function public.canopy_admin_send_bulk_communication(text,text,text,text,text) to authenticated;

-- ============================================================
-- 3. ADD UMEH MIRACLE TO THE PUBLIC SELECTED DIRECTORY,
--    but only if this email has a real Canopy submission.
-- ============================================================

do $$
declare
  v_user uuid;
  v_admin uuid;
  v_country text;
  v_country_code text;
  v_rank integer;
  v_code text;
begin
  select u.id into v_user
  from auth.users u
  where lower(coalesce(u.email,''))='miracleumeh2002@gmail.com'
  limit 1;

  if v_user is null then
    raise exception 'Umeh Miracle account was not found for miracleumeh2002@gmail.com.';
  end if;

  if not exists (
    select 1 from public.canopy_assignment_submissions s
    where s.user_id=v_user
  ) then
    raise exception 'Umeh Miracle has no Canopy assignment submission yet; selected-directory row was not added.';
  end if;

  select nullif(trim(p.country),'') into v_country
  from public.canopy_profiles p
  where p.user_id=v_user
  limit 1;

  v_country := coalesce(v_country,'Africa (not specified)');
  v_country_code := case lower(v_country)
    when 'nigeria' then 'NG' when 'ghana' then 'GH' when 'kenya' then 'KE'
    when 'uganda' then 'UG' when 'malawi' then 'MW' when 'zambia' then 'ZM'
    when 'zimbabwe' then 'ZW' when 'tanzania' then 'TZ' when 'rwanda' then 'RW'
    when 'south africa' then 'ZA' when 'botswana' then 'BW' when 'lesotho' then 'LS'
    when 'liberia' then 'LR' when 'sierra leone' then 'SL' when 'sudan' then 'SD'
    when 'south sudan' then 'SS' else 'AF' end;

  select p.user_id into v_admin
  from public.canopy_profiles p
  where p.role='admin'
  limit 1;

  if exists (
    select 1 from public.womate_selected_card_invites i
    where lower(i.email)='miracleumeh2002@gmail.com'
      and i.programme_slug='she-leads-2026'
      and i.status='active'
  ) then
    update public.womate_selected_card_invites
    set full_name='Umeh Miracle',
        country_name=coalesce(country_name,v_country),
        country_code=coalesce(country_code,v_country_code)
    where lower(email)='miracleumeh2002@gmail.com'
      and programme_slug='she-leads-2026'
      and status='active';
  else
    select coalesce(max(selection_rank),0)+1 into v_rank
    from public.womate_selected_card_invites
    where programme_slug='she-leads-2026' and status='active';

    v_code := upper(substr(md5(random()::text||clock_timestamp()::text||v_user::text),1,10));

    insert into public.womate_selected_card_invites(
      email,full_name,programme_slug,programme_name,cohort_label,
      code_hash,code_hint,public_code,country_code,country_name,selection_rank,
      status,created_by
    ) values (
      'miracleumeh2002@gmail.com','Umeh Miracle','she-leads-2026',
      'She Leads Climate Mentorship Programme','Cohort 2 · 2026',
      md5(v_code),right(v_code,4),v_code,v_country_code,v_country,v_rank,
      'active',coalesce(v_admin,v_user)
    );
  end if;
end;
$$;

reset lock_timeout;
reset statement_timeout;
