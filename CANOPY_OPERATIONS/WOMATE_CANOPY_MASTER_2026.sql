-- WOMATE CANOPY — CONSOLIDATED LEARNER + OPERATIONS MASTER SQL
-- She Leads Climate Mentorship · Cohort 2 · 2026
-- Generated 6 Sep 2026
-- Run this WHOLE file once in Supabase SQL Editor against the existing base Canopy schema.
-- Safe design: one transaction; any error rolls back this run.
-- IMPORTANT: deleting old SQL Editor queries does not undo database changes already applied.
-- This master is designed to tolerate previously-applied portions.

begin;

create extension if not exists pgcrypto;

-- Normalize manual-review RPC signature before recreating it later.
drop function if exists public.canopy_manager_review_assignment(uuid,integer,text,text);
drop function if exists public.canopy_manager_review_assignment(uuid,numeric,text,text);
drop function if exists public.canopy_manager_review_assignment(text,integer,text,text);
drop function if exists public.canopy_manager_review_assignment(text,numeric,text,text);

-- ============================================================
-- WOMATE CANOPY
-- Automated assignment review + manual grading
-- + learner notifications
-- ============================================================


-- ============================================================
-- 1. EXTEND WEEKLY ASSIGNMENT SUBMISSIONS
-- ============================================================

alter table public.canopy_assignment_submissions
  add column if not exists assessment_status text not null default 'awaiting_automation',
  add column if not exists final_score integer,
  add column if not exists final_feedback text,
  add column if not exists review_source text,
  add column if not exists automation_reviewed_at timestamptz,
  add column if not exists manual_score integer,
  add column if not exists manual_feedback text,
  add column if not exists manual_decision text,
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamptz;


-- ============================================================
-- 2. MANAGER / ADMIN PERMISSION HELPER
-- ============================================================

create or replace function public.canopy_is_manager(
  p_user uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.canopy_profiles
    where user_id = p_user
      and role in ('manager', 'admin')
  );
$$;


-- ============================================================
-- 3. AUTOMATED FORMATIVE BASELINE SCORING
-- ============================================================

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


  -- Speaker / LinkedIn evidence: 20 points
  if trim(coalesce(p_linkedin, '')) ~*
    '^https?://([^/]*\.)?linkedin\.com/'
  then
    v_score := v_score + 20;
  end if;


  return least(100, greatest(0, v_score));

end;
$$;


-- ============================================================
-- 4. SCORE BAND
-- ============================================================

create or replace function public.canopy_score_band(
  p_score integer
)
returns text
language sql
immutable
as $$
  select case
    when p_score >= 85 then 'Strong'
    when p_score >= 70 then 'Satisfactory'
    when p_score >= 55 then 'Developing'
    else 'Needs strengthening'
  end;
$$;


-- ============================================================
-- 5. AUTOMATED FEEDBACK
-- ============================================================

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
    '^https?://([^/]*\.)?linkedin\.com/'
  then
    return
      'Your speaker-task LinkedIn evidence needs to be checked or replaced with a valid LinkedIn post link.';
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


-- ============================================================
-- 6. AUTOMATIC ASSESSMENT TRIGGER
-- Every new assignment/revision is assessed automatically.
-- ============================================================

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
      '^https?://([^/]*\.)?linkedin\.com/'

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


drop trigger if exists canopy_assignment_auto_assess
on public.canopy_assignment_submissions;


create trigger canopy_assignment_auto_assess
before insert or update of
  paragraph_response,
  canvas_link,
  linkedin_link
on public.canopy_assignment_submissions
for each row
execute function public.canopy_prepare_assignment_assessment();


-- ============================================================
-- 7. BACKFILL ALL EXISTING SUBMISSIONS
-- ============================================================

update public.canopy_assignment_submissions s
set

  auto_score =
    public.canopy_assignment_auto_score(
      s.paragraph_response,
      s.canvas_link,
      s.linkedin_link
    ),

  score_band =
    public.canopy_score_band(
      public.canopy_assignment_auto_score(
        s.paragraph_response,
        s.canvas_link,
        s.linkedin_link
      )
    ),

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
    public.canopy_assignment_auto_score(
      s.paragraph_response,
      s.canvas_link,
      s.linkedin_link
    ),

  final_feedback =
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

  review_source = 'automated',

  automation_reviewed_at =
    coalesce(s.automation_reviewed_at, now()),

  assessment_status =
    case

      when
        length(trim(coalesce(s.paragraph_response, ''))) < 60

        or trim(coalesce(s.canvas_link, '')) !~*
          '^https?://'

        or trim(coalesce(s.linkedin_link, '')) !~*
          '^https?://([^/]*\.)?linkedin\.com/'

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

where s.manual_score is null
  and not exists (select 1 from auth.users u where u.id=s.user_id and lower(coalesce(u.email,''))='p.viewmultimedia@gmail.com');


-- ============================================================
-- 8. REPLACE EXISTING AUTOMATION REFRESH RPC
-- Existing function has a different return type, so it must
-- be dropped before being recreated.
-- ============================================================

drop function if exists public.canopy_refresh_learning_automation();


create function public.canopy_refresh_learning_automation()
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
            '^https?://([^/]*\.)?linkedin\.com/'

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


-- ============================================================
-- 9. MANAGER ACCESS TO CURRENT WEEKLY SUBMISSIONS
-- ============================================================

create or replace function public.canopy_manager_weekly_submissions()
returns setof public.canopy_assignment_submissions
language plpgsql
security definer
set search_path = public
as $$
begin

  if not public.canopy_is_manager(auth.uid()) then

    raise exception 'Manager access required'
      using errcode = '42501';

  end if;


  return query

  select s.*
  from public.canopy_assignment_submissions s
  order by s.submitted_at desc;

end;
$$;


-- ============================================================
-- 11. MANAGER WARNING / FEEDBACK / REMINDER
-- -> REAL LEARNER NOTIFICATION
-- ============================================================

create or replace function public.canopy_manager_action_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  if new.action_type in (
    'warning',
    'feedback',
    'reminder'
  ) then


    if not exists (

      select 1
      from public.canopy_notifications
      where fingerprint =
        'manager-action:' || new.id::text

    ) then


      insert into public.canopy_notifications (
        user_id,
        type,
        title,
        body,
        link,
        fingerprint
      )
      values (

        new.learner_id,

        new.action_type,

        new.subject,

        coalesce(
          nullif(
            trim(coalesce(new.message, '')),
            ''
          ),

          case

            when new.action_type = 'warning'
            then 'WOMATE has sent you a programme warning.'

            when new.action_type = 'feedback'
            then 'WOMATE has sent you feedback.'

            else
              'WOMATE has sent you a reminder.'

          end
        ),

        '/canopy/notifications',

        'manager-action:' || new.id::text

      );

    end if;

  end if;


  return new;

end;
$$;


drop trigger if exists canopy_manager_action_notify
on public.canopy_manager_actions;


create trigger canopy_manager_action_notify
after insert
on public.canopy_manager_actions
for each row
execute function public.canopy_manager_action_notification();


-- ============================================================
-- 12. RPC PERMISSIONS
-- ============================================================

grant execute
on function public.canopy_is_manager(uuid)
to authenticated;


grant execute
on function public.canopy_refresh_learning_automation()
to authenticated;


grant execute
on function public.canopy_manager_weekly_submissions()
to authenticated;


-- Manual-review RPC is recreated later in this master migration after the
-- expanded team-role authorization helpers exist. Its EXECUTE grant is applied
-- immediately after that final definition.

-- WOMATE CANOPY · LAUNCH HARDENING UPDATE · SEPTEMBER 2026
-- Safe follow-up for the current Canopy database.
-- Purpose:
-- 1) allow learners to submit complaints for themselves;
-- 2) notify WOMATE managers/admins when a learner submits a complaint;
-- 3) let WOMATE respond and resolve complaints, with learner notification;
-- 4) make certificate issuance write to the real canopy_certificates table;
-- 5) notify learners when a certificate is issued;
-- 6) strengthen indexes/grants used by the launch UI.
--
-- Run this ONCE in Supabase SQL Editor after the previously successful
-- assignment-review / notification migration. It is idempotent and can be
-- re-run if needed.

-- ---------------------------------------------------------------------------
-- MANAGER CHECK
-- ---------------------------------------------------------------------------
create or replace function public.canopy_is_manager(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1
    from public.canopy_profiles p
    where p.user_id=p_user
      and p.role in ('manager','admin')
  );
$$;

grant execute on function public.canopy_is_manager(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- COMPLAINT RESPONSE FIELDS
-- ---------------------------------------------------------------------------
alter table public.canopy_manager_actions
  add column if not exists response_message text,
  add column if not exists responded_by uuid references auth.users(id),
  add column if not exists responded_at timestamptz;

-- Learners may read actions addressed to themselves; WOMATE staff may read all.
alter table public.canopy_manager_actions enable row level security;

drop policy if exists "canopy manager actions read" on public.canopy_manager_actions;
create policy "canopy manager actions read"
on public.canopy_manager_actions for select
to authenticated
using (learner_id=auth.uid() or public.canopy_is_manager(auth.uid()));

-- A learner may create ONLY an open complaint for themselves.
-- Managers/admins keep normal action creation rights.
drop policy if exists "canopy manager actions insert" on public.canopy_manager_actions;
create policy "canopy manager actions insert"
on public.canopy_manager_actions for insert
to authenticated
with check (
  public.canopy_is_manager(auth.uid())
  or (
    learner_id=auth.uid()
    and created_by=auth.uid()
    and action_type='complaint'
    and status='open'
    and certificate_code is null
    and resolved_at is null
  )
);

-- Only WOMATE managers/admins may update or resolve operational records.
drop policy if exists "canopy manager actions update" on public.canopy_manager_actions;
create policy "canopy manager actions update"
on public.canopy_manager_actions for update
to authenticated
using (public.canopy_is_manager(auth.uid()))
with check (public.canopy_is_manager(auth.uid()));

grant select,insert,update on public.canopy_manager_actions to authenticated;

-- ---------------------------------------------------------------------------
-- COMPLAINT NOTIFICATIONS
-- ---------------------------------------------------------------------------
create or replace function public.canopy_notify_complaint_event()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if tg_op='INSERT'
     and new.action_type='complaint'
     and new.learner_id=new.created_by then

    insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
    select
      p.user_id,
      'learner_complaint',
      'New learner complaint',
      coalesce(nullif(new.subject,''),'A learner submitted a new Canopy complaint.'),
      '/canopy/manage/complaints',
      'complaint-admin:'||new.id::text||':'||p.user_id::text
    from public.canopy_profiles p
    where p.role in ('manager','admin')
    on conflict(fingerprint) do nothing;

  elsif tg_op='UPDATE'
        and new.action_type='complaint'
        and old.status is distinct from new.status
        and new.status in ('resolved','closed') then

    insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
    values(
      new.learner_id,
      'complaint_response',
      'WOMATE responded to your complaint',
      case
        when nullif(trim(coalesce(new.response_message,'')),'') is not null
          then new.response_message
        else 'Your Canopy complaint has been reviewed and resolved by WOMATE.'
      end,
      '/canopy/help',
      'complaint-response:'||new.id::text||':'||new.status
    )
    on conflict(fingerprint) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists canopy_complaint_event_notification on public.canopy_manager_actions;
create trigger canopy_complaint_event_notification
after insert or update on public.canopy_manager_actions
for each row execute function public.canopy_notify_complaint_event();

-- ---------------------------------------------------------------------------
-- REAL CERTIFICATE ISSUANCE
-- ---------------------------------------------------------------------------
alter table public.canopy_certificates enable row level security;

drop policy if exists "canopy certificates read" on public.canopy_certificates;
create policy "canopy certificates read"
on public.canopy_certificates for select
to authenticated
using (user_id=auth.uid() or public.canopy_is_manager(auth.uid()));

-- Direct writes are restricted to managers/admins. The launch UI uses the RPC
-- below, but this policy also keeps the table safe for future manager tooling.
drop policy if exists "canopy certificates manager insert" on public.canopy_certificates;
create policy "canopy certificates manager insert"
on public.canopy_certificates for insert
to authenticated
with check (public.canopy_is_manager(auth.uid()));

drop policy if exists "canopy certificates manager update" on public.canopy_certificates;
create policy "canopy certificates manager update"
on public.canopy_certificates for update
to authenticated
using (public.canopy_is_manager(auth.uid()))
with check (public.canopy_is_manager(auth.uid()));

grant select,insert,update on public.canopy_certificates to authenticated;

-- Drop first to avoid PostgreSQL return-type conflicts if an earlier test
-- version of this RPC exists.
drop function if exists public.canopy_manager_issue_certificate(uuid,text);
create function public.canopy_manager_issue_certificate(p_user_id uuid,p_drive_url text)
returns setof public.canopy_certificates
language plpgsql
security definer
set search_path=public
as $$
declare
  v_url text:=trim(coalesce(p_drive_url,''));
begin
  if auth.uid() is null or not public.canopy_is_manager(auth.uid()) then
    raise exception 'Manager access required.';
  end if;
  if not exists(select 1 from public.canopy_profiles where user_id=p_user_id and role='learner') then
    raise exception 'Learner not found.';
  end if;
  if v_url !~* '^https://(drive|docs)\.google\.com/' then
    raise exception 'Add a viewable Google Drive certificate link.';
  end if;

  return query
  insert into public.canopy_certificates(
    user_id,course_slug,cohort_name,title,drive_url,issued_at,issued_by
  ) values(
    p_user_id,
    'she-leads',
    'Cohort 2 · 2026',
    'She Leads Climate Mentorship · Cohort 2 · 2026',
    v_url,
    now(),
    auth.uid()
  )
  on conflict(user_id,course_slug,cohort_name)
  do update set
    drive_url=excluded.drive_url,
    issued_at=excluded.issued_at,
    issued_by=excluded.issued_by,
    title=excluded.title
  returning *;

  insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
  values(
    p_user_id,
    'certificate_issued',
    'Your She Leads certificate is ready',
    'WOMATE has issued your She Leads Climate Mentorship · Cohort 2 · 2026 completion certificate.',
    '/canopy/certificate',
    'certificate:'||p_user_id::text||':she-leads:cohort-2-2026'
  )
  on conflict(fingerprint) do update set
    title=excluded.title,
    body=excluded.body,
    link=excluded.link,
    read_at=null,
    created_at=now();
end;
$$;

grant execute on function public.canopy_manager_issue_certificate(uuid,text) to authenticated;

-- ---------------------------------------------------------------------------
-- INDEXES USED BY MANAGER + LEARNER WORKFLOWS
-- ---------------------------------------------------------------------------
create index if not exists canopy_manager_actions_complaints_idx
  on public.canopy_manager_actions(action_type,status,created_at desc);
create index if not exists canopy_notifications_user_unread_idx
  on public.canopy_notifications(user_id,read_at,created_at desc);
create index if not exists canopy_assignment_submissions_user_week_idx
  on public.canopy_assignment_submissions(user_id,week_key,submitted_at desc);
create index if not exists canopy_certificates_user_idx
  on public.canopy_certificates(user_id,issued_at desc);

-- ---------------------------------------------------------------------------
-- POST-RUN HEALTH CHECK
-- ---------------------------------------------------------------------------
select
  (select count(*) from public.canopy_profiles where role='learner') as learners,
  (select count(*) from public.canopy_enrollments where status='pending') as pending_access,
  (select count(*) from public.canopy_enrollments where status='active') as active_access,
  (select count(*) from public.canopy_assignment_submissions) as assignment_attempts,
  (select count(*) from public.canopy_manager_actions where action_type='complaint' and status='open') as open_complaints,
  (select count(*) from public.canopy_notifications where read_at is null) as unread_notifications,
  (select count(*) from public.canopy_certificates) as certificates_issued;

-- WOMATE CANOPY — FULL LEARNER + OPERATIONS READY
-- She Leads Climate Mentorship · Cohort 2 · 2026
-- Run ONCE in the WOMATE Supabase SQL Editor after the existing Canopy schema.
--
-- Adds a persistent role-based delivery-team system without changing participant
-- passwords, learner scheduling, tester isolation, or existing learner accounts.
--
-- Roles created by Team Access Codes:
--   programme_manager      = Programme & Monitoring Manager
--   programme_operations   = Programme Operations Deputy
--   module_coordinator     = Learning Experience Coordinator (module-bound)
--   learning_fellow        = Learning Experience Fellow (module-bound)
--
-- Full admin/legacy manager access remains controlled by canopy_profiles.role.
-- The isolated tester remains p.viewmultimedia@gmail.com and cannot activate a staff code.

create table if not exists public.canopy_team_access_codes(
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  code_hint text not null,
  role text not null check(role in ('programme_manager','programme_operations','module_coordinator','learning_fellow')),
  module_id text null check(module_id is null or module_id in ('module-01','module-02','module-03','module-04','module-05')),
  expires_at timestamptz not null,
  max_uses integer not null default 1 check(max_uses>=1),
  used_count integer not null default 0 check(used_count>=0),
  status text not null default 'active' check(status in ('active','used','revoked','expired')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  last_used_at timestamptz null,
  revoked_by uuid null references auth.users(id) on delete set null,
  revoked_at timestamptz null,
  constraint canopy_team_access_module_scope_check check(
    (role in ('programme_manager','programme_operations') and module_id is null)
    or
    (role in ('module_coordinator','learning_fellow') and module_id is not null)
  )
);

create index if not exists canopy_team_access_codes_status_idx on public.canopy_team_access_codes(status,expires_at);

create table if not exists public.canopy_staff_memberships(
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check(role in ('programme_manager','programme_operations','module_coordinator','learning_fellow')),
  module_id text null check(module_id is null or module_id in ('module-01','module-02','module-03','module-04','module-05')),
  status text not null default 'active' check(status in ('active','inactive')),
  activated_by_code uuid null references public.canopy_team_access_codes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canopy_staff_membership_module_scope_check check(
    (role in ('programme_manager','programme_operations') and module_id is null)
    or
    (role in ('module_coordinator','learning_fellow') and module_id is not null)
  )
);

create index if not exists canopy_staff_memberships_role_idx on public.canopy_staff_memberships(role,status,module_id);

create table if not exists public.canopy_team_audit_log(
  id bigint generated always as identity primary key,
  actor_user_id uuid null references auth.users(id) on delete set null,
  action text not null,
  target_user_id uuid null references auth.users(id) on delete set null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists canopy_team_audit_created_idx on public.canopy_team_audit_log(created_at desc);

create table if not exists public.canopy_spotlight_nominations(
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.canopy_assignment_submissions(id) on delete cascade,
  module_id text not null check(module_id in ('module-01','module-02','module-03','module-04','module-05')),
  category text not null check(category in ('strongest_insight','canopycanvas','local_application','emerging_leadership','policy_idea','other')),
  note text null check(note is null or char_length(note)<=600),
  nominated_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'nominated' check(status in ('nominated','shortlisted','featured','declined')),
  decided_by uuid null references auth.users(id) on delete set null,
  decided_at timestamptz null,
  created_at timestamptz not null default now(),
  unique(submission_id,nominated_by,category)
);

create index if not exists canopy_spotlight_module_idx on public.canopy_spotlight_nominations(module_id,status,created_at desc);

alter table public.canopy_team_access_codes enable row level security;
alter table public.canopy_staff_memberships enable row level security;
alter table public.canopy_team_audit_log enable row level security;
alter table public.canopy_spotlight_nominations enable row level security;

-- No direct table policies are created deliberately. Access occurs only through
-- the SECURITY DEFINER functions below, which apply role and module boundaries.

create or replace function public.canopy_is_womate_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1
    from public.canopy_profiles p
    where p.user_id=p_user_id
      and p.role='admin'
  );
$$;

create or replace function public.canopy_staff_role(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path=public
as $$
  select m.role
  from public.canopy_staff_memberships m
  where m.user_id=p_user_id and m.status='active'
  limit 1;
$$;

-- Keep existing Canopy manager RPCs working for Larona's Programme Manager role.
create or replace function public.canopy_is_manager(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select public.canopy_is_womate_admin(p_user)
      or exists(
        select 1 from public.canopy_profiles p
        where p.user_id=p_user and p.role='manager'
      )
      or exists(
        select 1 from public.canopy_staff_memberships m
        where m.user_id=p_user
          and m.status='active'
          and m.role='programme_manager'
      );
$$;

revoke all on function public.canopy_is_womate_admin(uuid) from public;
revoke all on function public.canopy_staff_role(uuid) from public;
revoke all on function public.canopy_is_manager(uuid) from public;
grant execute on function public.canopy_is_womate_admin(uuid) to authenticated;
grant execute on function public.canopy_staff_role(uuid) to authenticated;
grant execute on function public.canopy_is_manager(uuid) to authenticated;

create or replace function public.canopy_current_staff_access()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  r public.canopy_staff_memberships%rowtype;
begin
  if auth.uid() is null then return null; end if;
  select * into r from public.canopy_staff_memberships where user_id=auth.uid() and status='active';
  if not found then return null; end if;
  return jsonb_build_object(
    'user_id',r.user_id,
    'role',r.role,
    'module_id',r.module_id,
    'status',r.status,
    'created_at',r.created_at,
    'updated_at',r.updated_at
  );
end;
$$;
revoke all on function public.canopy_current_staff_access() from public;
grant execute on function public.canopy_current_staff_access() to authenticated;

create or replace function public.canopy_generate_team_access_code(
  p_role text,
  p_module_id text default null,
  p_expires_at timestamptz default null
)
returns table(id uuid,access_code text,role text,module_id text,expires_at timestamptz)
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  raw text;
  exp timestamptz:=coalesce(p_expires_at,now()+interval '14 days');
  rid uuid;
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'Only a WOMATE administrator can create Team Access Codes.';
  end if;
  if p_role not in ('programme_manager','programme_operations','module_coordinator','learning_fellow') then
    raise exception 'Unsupported Canopy staff role.';
  end if;
  if p_role in ('module_coordinator','learning_fellow') and (p_module_id is null or p_module_id not in ('module-01','module-02','module-03','module-04','module-05')) then
    raise exception 'This role requires a valid module assignment.';
  end if;
  if p_role in ('programme_manager','programme_operations') and p_module_id is not null then
    raise exception 'Programme-wide roles cannot be bound to one module.';
  end if;
  if exp<=now() then raise exception 'Expiry must be in the future.'; end if;

  raw:='SL2-'||upper(substr(encode(gen_random_bytes(12),'hex'),1,6))||'-'||upper(substr(encode(gen_random_bytes(12),'hex'),1,6))||'-'||upper(substr(encode(gen_random_bytes(12),'hex'),1,6))||'-'||upper(substr(encode(gen_random_bytes(12),'hex'),1,6));
  insert into public.canopy_team_access_codes(code_hash,code_hint,role,module_id,expires_at,created_by)
  values(encode(digest(upper(trim(raw)),'sha256'),'hex'),'••••-'||right(raw,6),p_role,p_module_id,exp,auth.uid())
  returning canopy_team_access_codes.id into rid;

  insert into public.canopy_team_audit_log(actor_user_id,action,detail)
  values(auth.uid(),'team_access_code_created',jsonb_build_object('code_id',rid,'role',p_role,'module_id',p_module_id,'expires_at',exp));

  return query select rid,raw,p_role,p_module_id,exp;
end;
$$;
revoke all on function public.canopy_generate_team_access_code(text,text,timestamptz) from public;
grant execute on function public.canopy_generate_team_access_code(text,text,timestamptz) to authenticated;

create or replace function public.canopy_generate_standard_team_pack(p_expires_at timestamptz default null)
returns table(access_code text,role text,module_id text,expires_at timestamptz)
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  exp timestamptz:=coalesce(p_expires_at,now()+interval '14 days');
  raw text;
  rid uuid;
  mod text;
  i integer;
  staff_role text;
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'Only a WOMATE administrator can generate the Cohort 2 team pack.';
  end if;
  if exp<=now() then raise exception 'Expiry must be in the future.'; end if;

  foreach staff_role in array array['programme_manager','programme_operations'] loop
    raw:='SL2-'||upper(substr(encode(gen_random_bytes(12),'hex'),1,6))||'-'||upper(substr(encode(gen_random_bytes(12),'hex'),1,6))||'-'||upper(substr(encode(gen_random_bytes(12),'hex'),1,6))||'-'||upper(substr(encode(gen_random_bytes(12),'hex'),1,6));
    insert into public.canopy_team_access_codes(code_hash,code_hint,role,module_id,expires_at,created_by)
    values(encode(digest(upper(trim(raw)),'sha256'),'hex'),'••••-'||right(raw,6),staff_role,null,exp,auth.uid()) returning id into rid;
    access_code:=raw;role:=staff_role;module_id:=null;expires_at:=exp;return next;
  end loop;

  foreach mod in array array['module-01','module-02','module-03','module-04','module-05'] loop
    -- One coordinator per module.
    raw:='SL2-'||upper(substr(encode(gen_random_bytes(12),'hex'),1,6))||'-'||upper(substr(encode(gen_random_bytes(12),'hex'),1,6))||'-'||upper(substr(encode(gen_random_bytes(12),'hex'),1,6))||'-'||upper(substr(encode(gen_random_bytes(12),'hex'),1,6));
    insert into public.canopy_team_access_codes(code_hash,code_hint,role,module_id,expires_at,created_by)
    values(encode(digest(upper(trim(raw)),'sha256'),'hex'),'••••-'||right(raw,6),'module_coordinator',mod,exp,auth.uid()) returning id into rid;
    access_code:=raw;role:='module_coordinator';module_id:=mod;expires_at:=exp;return next;

    -- Three Learning Experience Fellows per module.
    for i in 1..3 loop
      raw:='SL2-'||upper(substr(encode(gen_random_bytes(12),'hex'),1,6))||'-'||upper(substr(encode(gen_random_bytes(12),'hex'),1,6))||'-'||upper(substr(encode(gen_random_bytes(12),'hex'),1,6))||'-'||upper(substr(encode(gen_random_bytes(12),'hex'),1,6));
      insert into public.canopy_team_access_codes(code_hash,code_hint,role,module_id,expires_at,created_by)
      values(encode(digest(upper(trim(raw)),'sha256'),'hex'),'••••-'||right(raw,6),'learning_fellow',mod,exp,auth.uid()) returning id into rid;
      access_code:=raw;role:='learning_fellow';module_id:=mod;expires_at:=exp;return next;
    end loop;
  end loop;

  insert into public.canopy_team_audit_log(actor_user_id,action,detail)
  values(auth.uid(),'standard_team_pack_generated',jsonb_build_object('count',22,'expires_at',exp));
end;
$$;
revoke all on function public.canopy_generate_standard_team_pack(timestamptz) from public;
grant execute on function public.canopy_generate_standard_team_pack(timestamptz) to authenticated;

create or replace function public.canopy_activate_team_access(p_code text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  c public.canopy_team_access_codes%rowtype;
  normalized text:=upper(trim(coalesce(p_code,'')));
  email_value text:=lower(coalesce(auth.jwt()->>'email',''));
begin
  if auth.uid() is null then raise exception 'Sign in before activating WOMATE team access.'; end if;
  if email_value='p.viewmultimedia@gmail.com' then
    raise exception 'The isolated Canopy tester account cannot be converted into a staff account.';
  end if;
  if normalized='' then raise exception 'Enter your WOMATE Team Access Code.'; end if;

  select * into c
  from public.canopy_team_access_codes
  where code_hash=encode(digest(normalized,'sha256'),'hex')
  for update;

  if not found then raise exception 'This Team Access Code is invalid.'; end if;
  if c.status='revoked' then raise exception 'This Team Access Code was revoked.'; end if;
  if c.expires_at<=now() then
    update public.canopy_team_access_codes set status='expired' where id=c.id;
    raise exception 'This Team Access Code has expired. Ask WOMATE for a fresh code.';
  end if;
  if c.status<>'active' or c.used_count>=c.max_uses then raise exception 'This Team Access Code has already been used.'; end if;

  insert into public.canopy_staff_memberships(user_id,role,module_id,status,activated_by_code,created_at,updated_at)
  values(auth.uid(),c.role,c.module_id,'active',c.id,now(),now())
  on conflict(user_id) do update
  set role=excluded.role,module_id=excluded.module_id,status='active',activated_by_code=excluded.activated_by_code,updated_at=now();

  update public.canopy_team_access_codes
  set used_count=used_count+1,last_used_at=now(),status=case when used_count+1>=max_uses then 'used' else 'active' end
  where id=c.id;

  insert into public.canopy_team_audit_log(actor_user_id,action,target_user_id,detail)
  values(auth.uid(),'team_access_activated',auth.uid(),jsonb_build_object('code_id',c.id,'role',c.role,'module_id',c.module_id));

  return jsonb_build_object('user_id',auth.uid(),'role',c.role,'module_id',c.module_id,'status','active');
end;
$$;
revoke all on function public.canopy_activate_team_access(text) from public;
grant execute on function public.canopy_activate_team_access(text) to authenticated;

create or replace function public.canopy_list_team_access()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'Only a WOMATE administrator can view Team Access.';
  end if;
  return jsonb_build_object(
    'codes',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',c.id,'code_hint',c.code_hint,'role',c.role,'module_id',c.module_id,
        'expires_at',c.expires_at,
        'status',case when c.status='active' and c.expires_at<=now() then 'expired' else c.status end,
        'used_count',c.used_count,'created_at',c.created_at
      ) order by c.created_at desc)
      from public.canopy_team_access_codes c
    ),'[]'::jsonb),
    'members',coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id',m.user_id,'role',m.role,'module_id',m.module_id,'status',m.status,
        'full_name',p.full_name,'country',p.country,'email',u.email,
        'created_at',m.created_at,'updated_at',m.updated_at
      ) order by m.created_at desc)
      from public.canopy_staff_memberships m
      left join public.canopy_profiles p on p.user_id=m.user_id
      left join auth.users u on u.id=m.user_id
    ),'[]'::jsonb)
  );
end;
$$;
revoke all on function public.canopy_list_team_access() from public;
grant execute on function public.canopy_list_team_access() to authenticated;

create or replace function public.canopy_revoke_team_access_code(p_code_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then raise exception 'Only a WOMATE administrator can revoke access codes.'; end if;
  update public.canopy_team_access_codes
  set status='revoked',revoked_by=auth.uid(),revoked_at=now()
  where id=p_code_id and status='active';
  if not found then raise exception 'This code is not active or was not found.'; end if;
  insert into public.canopy_team_audit_log(actor_user_id,action,detail) values(auth.uid(),'team_access_code_revoked',jsonb_build_object('code_id',p_code_id));
  return jsonb_build_object('id',p_code_id,'status','revoked');
end;
$$;
revoke all on function public.canopy_revoke_team_access_code(uuid) from public;
grant execute on function public.canopy_revoke_team_access_code(uuid) to authenticated;

create or replace function public.canopy_set_staff_membership_status(p_user_id uuid,p_status text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare r public.canopy_staff_memberships%rowtype;
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then raise exception 'Only a WOMATE administrator can change staff access.'; end if;
  if p_status not in ('active','inactive') then raise exception 'Unsupported staff status.'; end if;
  update public.canopy_staff_memberships set status=p_status,updated_at=now() where user_id=p_user_id returning * into r;
  if not found then raise exception 'Staff membership not found.'; end if;
  insert into public.canopy_team_audit_log(actor_user_id,action,target_user_id,detail)
  values(auth.uid(),'staff_membership_status_changed',p_user_id,jsonb_build_object('status',p_status,'role',r.role,'module_id',r.module_id));
  return jsonb_build_object('user_id',r.user_id,'role',r.role,'module_id',r.module_id,'status',r.status);
end;
$$;
revoke all on function public.canopy_set_staff_membership_status(uuid,text) from public;
grant execute on function public.canopy_set_staff_membership_status(uuid,text) to authenticated;

create or replace function public.canopy_staff_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  staff_role text;
  module_scope text;
  learner_count integer:=0;
  active_count integer:=0;
  submission_count integer:=0;
  attention_count integer:=0;
  revision_count integer:=0;
  completed_count integer:=0;
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  select role,module_id into staff_role,module_scope
  from public.canopy_staff_memberships
  where user_id=auth.uid() and status='active';
  if not found or staff_role not in ('programme_manager','programme_operations','module_coordinator','learning_fellow') then
    raise exception 'This account does not have a delivery-team dashboard.';
  end if;

  select count(*) into learner_count from public.canopy_profiles where role='learner';
  select count(*) into active_count from public.canopy_enrollments where status='active';
  select count(*) into submission_count from public.canopy_assignment_submissions s where module_scope is null or s.week_key=module_scope;
  select count(*) into attention_count from public.canopy_assignment_submissions s where (module_scope is null or s.week_key=module_scope) and s.assessment_status='needs_manual_review';
  select count(*) into revision_count from public.canopy_assignment_submissions s where (module_scope is null or s.week_key=module_scope) and s.assessment_status='revision_required';
  select count(*) into completed_count from public.canopy_assignment_submissions s where (module_scope is null or s.week_key=module_scope) and s.assessment_status='completed';

  return jsonb_build_object(
    'role',staff_role,
    'module_id',module_scope,
    'counts',jsonb_build_object(
      'learners',learner_count,
      'active_access',active_count,
      'submissions',submission_count,
      'needs_attention',attention_count,
      'revision_required',revision_count,
      'completed',completed_count
    ),
    'recent_submissions',coalesce((
      select jsonb_agg(row_data order by submitted_at desc)
      from(
        select jsonb_build_object(
          'id',s.id,'week_key',s.week_key,'module_label',replace(initcap(replace(s.week_key,'-',' ')),'Module ','Module '),
          'attempt_no',s.attempt_no,'submitted_at',s.submitted_at,
          'learner_name',coalesce(p.full_name,'Learner'),'country',p.country,
          'score',coalesce(s.final_score,s.auto_score),'score_band',s.score_band,
          'assessment_status',s.assessment_status,
          'paragraph_excerpt',left(coalesce(s.paragraph_response,''),320),
          'canvas_link',s.canvas_link
        ) as row_data,s.submitted_at
        from public.canopy_assignment_submissions s
        left join public.canopy_profiles p on p.user_id=s.user_id
        where module_scope is null or s.week_key=module_scope
        order by s.submitted_at desc
        limit 60
      ) q
    ),'[]'::jsonb),
    'spotlights',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',n.id,'submission_id',n.submission_id,'module_id',n.module_id,'category',n.category,
        'note',n.note,'status',n.status,'created_at',n.created_at,
        'learner_name',coalesce(p.full_name,'Learner')
      ) order by n.created_at desc)
      from public.canopy_spotlight_nominations n
      join public.canopy_assignment_submissions s on s.id=n.submission_id
      left join public.canopy_profiles p on p.user_id=s.user_id
      where module_scope is null or n.module_id=module_scope
    ),'[]'::jsonb)
  );
end;
$$;
revoke all on function public.canopy_staff_dashboard() from public;
grant execute on function public.canopy_staff_dashboard() to authenticated;

create or replace function public.canopy_nominate_spotlight(p_submission_id uuid,p_category text,p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  staff_role text;
  module_scope text;
  submission_module text;
  rid uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  select role,module_id into staff_role,module_scope from public.canopy_staff_memberships where user_id=auth.uid() and status='active';
  if coalesce(staff_role,'') not in ('programme_manager','programme_operations','module_coordinator','learning_fellow') and not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'This account cannot nominate Canopy Spotlight work.';
  end if;
  if p_category not in ('strongest_insight','canopycanvas','local_application','emerging_leadership','policy_idea','other') then raise exception 'Unsupported Spotlight category.'; end if;
  select week_key into submission_module from public.canopy_assignment_submissions where id=p_submission_id;
  if not found then raise exception 'Submission not found.'; end if;
  if module_scope is not null and submission_module<>module_scope then raise exception 'This submission is outside your assigned module.'; end if;

  insert into public.canopy_spotlight_nominations(submission_id,module_id,category,note,nominated_by)
  values(p_submission_id,submission_module,p_category,nullif(trim(coalesce(p_note,'')),''),auth.uid())
  on conflict(submission_id,nominated_by,category) do update set note=excluded.note,status='nominated',created_at=now()
  returning id into rid;
  insert into public.canopy_team_audit_log(actor_user_id,action,detail) values(auth.uid(),'spotlight_nominated',jsonb_build_object('nomination_id',rid,'submission_id',p_submission_id,'module_id',submission_module,'category',p_category));
  return jsonb_build_object('id',rid,'status','nominated');
end;
$$;
revoke all on function public.canopy_nominate_spotlight(uuid,text,text) from public;
grant execute on function public.canopy_nominate_spotlight(uuid,text,text) to authenticated;

create or replace function public.canopy_update_spotlight_status(p_nomination_id uuid,p_status text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  staff_role text;
  r public.canopy_spotlight_nominations%rowtype;
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  staff_role:=public.canopy_staff_role(auth.uid());
  if p_status not in ('shortlisted','featured','declined') then raise exception 'Unsupported Spotlight status.'; end if;
  if staff_role='programme_operations' and p_status<>'shortlisted' then raise exception 'The Operations Deputy may shortlist; final feature decisions belong to the Programme Manager/WOMATE.'; end if;
  if not public.canopy_is_womate_admin(auth.uid()) and coalesce(staff_role,'') not in ('programme_manager','programme_operations') then raise exception 'This account cannot make Spotlight decisions.'; end if;
  update public.canopy_spotlight_nominations
  set status=p_status,decided_by=auth.uid(),decided_at=now()
  where id=p_nomination_id returning * into r;
  if not found then raise exception 'Spotlight nomination not found.'; end if;
  insert into public.canopy_team_audit_log(actor_user_id,action,detail) values(auth.uid(),'spotlight_status_changed',jsonb_build_object('nomination_id',r.id,'status',p_status));
  return jsonb_build_object('id',r.id,'status',r.status);
end;
$$;
revoke all on function public.canopy_update_spotlight_status(uuid,text) from public;
grant execute on function public.canopy_update_spotlight_status(uuid,text) to authenticated;

-- ---------------------------------------------------------------------------
-- MANUAL REVIEW PERSISTENCE FIX
-- Correctly separates submission status from assessment status for every
-- participant and tester submission. Programme Manager is authorised through
-- canopy_is_manager() above; Deputy/Coordinator/Fellow cannot finalise scores.
-- ---------------------------------------------------------------------------

drop function if exists public.canopy_manager_review_assignment(uuid,integer,text,text);
drop function if exists public.canopy_manager_review_assignment(uuid,numeric,text,text);
drop function if exists public.canopy_manager_review_assignment(text,integer,text,text);
drop function if exists public.canopy_manager_review_assignment(text,numeric,text,text);

create function public.canopy_manager_review_assignment(
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
begin
  if auth.uid() is null or not public.canopy_is_manager(auth.uid()) then raise exception 'Only an authorised WOMATE Programme Manager can review assignments.'; end if;
  if p_score is null or p_score<0 or p_score>100 then raise exception 'Final score must be between 0 and 100.'; end if;
  if p_decision not in ('completed','revision_required','needs_manual_review') then raise exception 'Unsupported review decision.'; end if;

  select * into r from public.canopy_assignment_submissions where id=p_submission_id for update;
  if not found then raise exception 'Assignment submission not found.'; end if;

  v_status:=case when p_decision='completed' then 'satisfactory' when p_decision='revision_required' then 'revision_requested' else r.status end;
  v_band:=case when p_score>=85 then 'Strong' when p_score>=70 then 'Satisfactory' when p_score>=55 then 'Developing' else 'Needs strengthening' end;

  update public.canopy_assignment_submissions
  set status=v_status,assessment_status=p_decision,final_score=p_score,
      final_feedback=coalesce(v_feedback,feedback_hint,''),score_band=v_band,
      review_source='manual'
  where id=p_submission_id returning * into r;

  if p_decision='completed' then
    v_title:='WOMATE assignment review complete';
    v_body:='Final WOMATE score: '||p_score||'/100 · '||v_band||case when v_feedback is not null then '. '||v_feedback else '.' end;
  elsif p_decision='revision_required' then
    v_title:='Assignment revision required';
    v_body:='WOMATE review: '||p_score||'/100 · '||v_band||'. Revision required.'||case when v_feedback is not null then ' '||v_feedback else '' end;
  else
    v_title:='Assignment review in progress';
    v_body:='WOMATE has marked this submission for further manual review. Current reviewed score: '||p_score||'/100 · '||v_band||case when v_feedback is not null then '. '||v_feedback else '.' end;
  end if;

  insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
  values(r.user_id,'assignment_score',v_title,v_body,'/canopy/assignments','assignment-review:'||r.id::text)
  on conflict(fingerprint) do update set title=excluded.title,body=excluded.body,link=excluded.link,type=excluded.type,read_at=null;

  insert into public.canopy_team_audit_log(actor_user_id,action,target_user_id,detail)
  values(auth.uid(),'assignment_manual_review_saved',r.user_id,jsonb_build_object('submission_id',r.id,'score',p_score,'decision',p_decision));

  return next r;
end;
$$;
revoke all on function public.canopy_manager_review_assignment(uuid,integer,text,text) from public;
grant execute on function public.canopy_manager_review_assignment(uuid,integer,text,text) to authenticated;

-- Keep tester score notifications synchronised with the actual stored score.
create or replace function public.canopy_sync_tester_assignment_score_notification()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_score integer;
  v_band text;
  v_feedback text;
begin
  v_score:=coalesce(new.final_score,new.auto_score);
  if v_score is null then return new; end if;
  v_band:=coalesce(new.score_band,case when v_score>=85 then 'Strong' when v_score>=70 then 'Satisfactory' when v_score>=55 then 'Developing' else 'Needs strengthening' end);
  v_feedback:=coalesce(new.final_feedback,new.feedback_hint,'');

  update public.canopy_notifications
  set title=case when new.review_source='manual' then 'WOMATE assignment review complete' else 'Tester assignment score ready' end,
      body=case when new.review_source='manual'
        then 'Final WOMATE score: '||v_score||'/100 · '||v_band||case when nullif(trim(v_feedback),'') is not null then '. '||v_feedback else '.' end
        else 'Immediate automated tester score: '||v_score||'/100 · '||v_band||case when nullif(trim(v_feedback),'') is not null then '. '||v_feedback else '.' end end,
      read_at=null
  where fingerprint='tester-score:'||new.id::text;
  return new;
end;
$$;

drop trigger if exists canopy_sync_tester_assignment_score_notification on public.canopy_assignment_submissions;
create trigger canopy_sync_tester_assignment_score_notification
after update of auto_score,final_score,score_band,feedback_hint,final_feedback,review_source,assessment_status
on public.canopy_assignment_submissions
for each row execute function public.canopy_sync_tester_assignment_score_notification();

-- Reconcile already-created tester notifications immediately.
update public.canopy_notifications n
set title=case when s.review_source='manual' then 'WOMATE assignment review complete' else 'Tester assignment score ready' end,
    body=case when s.review_source='manual'
      then 'Final WOMATE score: '||coalesce(s.final_score,s.auto_score)::text||'/100 · '||coalesce(s.score_band,'')||case when nullif(trim(coalesce(s.final_feedback,s.feedback_hint,'')),'') is not null then '. '||coalesce(s.final_feedback,s.feedback_hint,'') else '.' end
      else 'Immediate automated tester score: '||coalesce(s.final_score,s.auto_score)::text||'/100 · '||coalesce(s.score_band,'')||case when nullif(trim(coalesce(s.final_feedback,s.feedback_hint,'')),'') is not null then '. '||coalesce(s.final_feedback,s.feedback_hint,'') else '.' end end,
    read_at=null
from public.canopy_assignment_submissions s
where n.fingerprint='tester-score:'||s.id::text
  and coalesce(s.final_score,s.auto_score) is not null;

-- ---------------------------------------------------------------------------
-- WOMATE ADMIN ROLE PREVIEW
-- Lets a real WOMATE Admin test each staff dashboard without consuming a
-- single-use code or impersonating the staff member. Preview is audit logged.
-- ---------------------------------------------------------------------------
create or replace function public.canopy_admin_preview_staff_dashboard(
  p_role text,
  p_module_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  module_scope text;
  learner_count integer:=0;
  active_count integer:=0;
  submission_count integer:=0;
  attention_count integer:=0;
  revision_count integer:=0;
  completed_count integer:=0;
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'Only WOMATE Admin can use dashboard preview.';
  end if;
  if p_role not in ('programme_manager','programme_operations','module_coordinator','learning_fellow') then
    raise exception 'Unsupported preview role.';
  end if;
  if p_role in ('module_coordinator','learning_fellow') then
    if p_module_id is null or p_module_id not in ('module-01','module-02','module-03','module-04','module-05') then
      raise exception 'Choose a valid module for Coordinator/Fellow preview.';
    end if;
    module_scope:=p_module_id;
  else
    if p_module_id is not null then raise exception 'This role is programme-wide and cannot be module-bound.'; end if;
    module_scope:=null;
  end if;

  insert into public.canopy_team_audit_log(actor_user_id,action,detail)
  values(auth.uid(),'admin_dashboard_preview',jsonb_build_object('preview_role',p_role,'module_id',module_scope));

  select count(*) into learner_count from public.canopy_profiles where role='learner';
  select count(*) into active_count from public.canopy_enrollments where status='active';
  select count(*) into submission_count from public.canopy_assignment_submissions s where module_scope is null or s.week_key=module_scope;
  select count(*) into attention_count from public.canopy_assignment_submissions s where (module_scope is null or s.week_key=module_scope) and s.assessment_status='needs_manual_review';
  select count(*) into revision_count from public.canopy_assignment_submissions s where (module_scope is null or s.week_key=module_scope) and s.assessment_status='revision_required';
  select count(*) into completed_count from public.canopy_assignment_submissions s where (module_scope is null or s.week_key=module_scope) and s.assessment_status='completed';

  return jsonb_build_object(
    'role',p_role,'module_id',module_scope,'preview',true,
    'counts',jsonb_build_object('learners',learner_count,'active_access',active_count,'submissions',submission_count,'needs_attention',attention_count,'revision_required',revision_count,'completed',completed_count),
    'recent_submissions',coalesce((select jsonb_agg(row_data order by submitted_at desc) from(
      select jsonb_build_object('id',s.id,'week_key',s.week_key,'module_label',replace(initcap(replace(s.week_key,'-',' ')),'Module ','Module '),'attempt_no',s.attempt_no,'submitted_at',s.submitted_at,'learner_name',coalesce(p.full_name,'Learner'),'country',p.country,'score',coalesce(s.final_score,s.auto_score),'score_band',s.score_band,'assessment_status',s.assessment_status,'paragraph_excerpt',left(coalesce(s.paragraph_response,''),320),'canvas_link',s.canvas_link) row_data,s.submitted_at
      from public.canopy_assignment_submissions s left join public.canopy_profiles p on p.user_id=s.user_id
      where module_scope is null or s.week_key=module_scope order by s.submitted_at desc limit 60
    ) q),'[]'::jsonb),
    'spotlights',coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'submission_id',n.submission_id,'module_id',n.module_id,'category',n.category,'note',n.note,'status',n.status,'created_at',n.created_at,'learner_name',coalesce(p.full_name,'Learner')) order by n.created_at desc)
      from public.canopy_spotlight_nominations n join public.canopy_assignment_submissions s on s.id=n.submission_id left join public.canopy_profiles p on p.user_id=s.user_id
      where module_scope is null or n.module_id=module_scope),'[]'::jsonb)
  );
end;
$$;
revoke all on function public.canopy_admin_preview_staff_dashboard(text,text) from public;
grant execute on function public.canopy_admin_preview_staff_dashboard(text,text) to authenticated;

-- Verification — these should run without exposing any full access code.
select role,module_id,status,count(*)
from public.canopy_staff_memberships
group by role,module_id,status
order by role,module_id;

select status,role,module_id,count(*)
from public.canopy_team_access_codes
group by status,role,module_id
order by role,module_id,status;

-- ============================================================
-- ISOLATED TESTER MODE V2
-- ============================================================
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

-- Allow the complete Canopy role model before assigning the isolated tester.
-- Staff authorization still comes from canopy_staff_memberships; these extra
-- values simply keep the profile table compatible with the platform roles.
alter table public.canopy_profiles
  drop constraint if exists canopy_profiles_role_check;

alter table public.canopy_profiles
  add constraint canopy_profiles_role_check
  check (role in (
    'learner',
    'manager',
    'admin',
    'tester',
    'programme_manager',
    'programme_operations',
    'module_coordinator',
    'learning_fellow'
  ));

insert into public.canopy_profiles(user_id,full_name,country,role)
select u.id,'Canopy Tester','Ghana','tester'
from auth.users u
where lower(u.email)='p.viewmultimedia@gmail.com'
on conflict(user_id) do update
set full_name='Canopy Tester', role='tester';

create or replace function public.canopy_tester_submit_weekly_assignment(
  p_week_key text,
  p_paragraph_response text,
  p_canvas_link text,
  p_linkedin_link text
)
returns setof public.canopy_assignment_submissions
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  n integer;
  wc integer;
  sc integer;
  band text;
  hint text;
  r public.canopy_assignment_submissions%rowtype;
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  if not public.canopy_is_tester() then raise exception 'Tester access is restricted to the designated WOMATE tester account.'; end if;
  if p_week_key not in ('module-01','module-02','module-03','module-04','module-05') then raise exception 'Assignment not found.'; end if;

  wc:=coalesce(array_length(regexp_split_to_array(trim(coalesce(p_paragraph_response,'')),'\\s+'),1),0);
  if wc<80 then raise exception 'Paragraph response needs at least 80 words for the tester grading flow.'; end if;
  if coalesce(p_canvas_link,'') !~* '^https?://' then raise exception 'Add the viewable CanopyCanvas link.'; end if;
  if coalesce(p_linkedin_link,'') !~* '^https?://' then raise exception 'Add the LinkedIn speaker-task link.'; end if;

  sc:=(case when wc>=220 then 50 when wc>=160 then 45 when wc>=120 then 40 when wc>=80 then 35 else 0 end)+25+25;
  band:=case when sc>=85 then 'Strong' when sc>=70 then 'Satisfactory' when sc>=55 then 'Developing' else 'Needs strengthening' end;
  hint:=case when sc>=85 then 'Strong test submission. The response is developed and both evidence links are present.' when sc>=70 then 'Satisfactory test submission. Add more depth or specificity to strengthen the written response.' else 'Strengthen the written response with clearer evidence, explanation and application.' end;

  select count(*) into n from public.canopy_assignment_submissions where user_id=auth.uid() and week_key=p_week_key;

  insert into public.canopy_assignment_submissions(
    user_id,week_key,attempt_no,paragraph_response,canvas_link,linkedin_link,
    status,auto_score,score_band,feedback_hint,release_at,submitted_at,
    assessment_status,review_source,automation_reviewed_at,final_score,final_feedback
  ) values(
    auth.uid(),p_week_key,n+1,trim(p_paragraph_response),trim(p_canvas_link),trim(p_linkedin_link),
    case when sc>=70 then 'satisfactory' else 'revision_requested' end,
    sc,band,hint,now(),now(),
    case when sc>=70 then 'completed' else 'revision_required' end,
    'automation',now(),sc,hint
  ) returning * into r;

  insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
  values(auth.uid(),'assignment_score','Tester assignment score ready','Immediate automated tester score: '||sc||'/100 · '||band||'. '||hint,'/canopy/assignments','tester-score:'||r.id)
  on conflict(fingerprint) do update set title=excluded.title,body=excluded.body,link=excluded.link,type=excluded.type,read_at=null;

  return next r;
end;
$$;
revoke all on function public.canopy_tester_submit_weekly_assignment(text,text,text,text) from public;
grant execute on function public.canopy_tester_submit_weekly_assignment(text,text,text,text) to authenticated;

-- ============================================================
-- FINAL HEALTH CHECK
-- ============================================================
select
  (select count(*) from public.canopy_profiles where role='learner') as learners,
  (select count(*) from public.canopy_profiles where role='tester') as testers,
  (select count(*) from public.canopy_staff_memberships where status='active') as active_staff,
  (select count(*) from public.canopy_team_access_codes where status='active') as unused_active_codes,
  (select count(*) from public.canopy_assignment_submissions) as assignment_attempts,
  (select count(*) from public.canopy_manager_actions where action_type='complaint' and status='open') as open_complaints,
  (select count(*) from public.canopy_notifications where read_at is null) as unread_notifications,
  (select count(*) from public.canopy_certificates) as certificates_issued;

commit;
