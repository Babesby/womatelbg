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

begin;

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

commit;

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
