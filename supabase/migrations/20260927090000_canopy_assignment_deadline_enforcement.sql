-- WOMATE CANOPY · enforce weekly submission + revision deadlines
-- 2026-09-27
-- First submissions close Sunday 23:59:59 GMT.
-- WOMATE-requested revisions close Wednesday 23:59:59 GMT.
-- Existing submissions and review history are preserved.

set lock_timeout = '8s';
set statement_timeout = '60s';

create or replace function public.canopy_guard_assignment_resubmission()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  prev public.canopy_assignment_submissions%rowtype;
  existing_attempts integer := 0;
  due_at timestamptz;
  revision_until timestamptz;
begin
  -- Preserve the isolated tester workflow.
  if exists (
    select 1
    from auth.users u
    where u.id = new.user_id
      and lower(coalesce(u.email,'')) = 'p.viewmultimedia@gmail.com'
  ) then
    return new;
  end if;

  -- Keep database deadlines aligned with the published 2026 cohort schedule.
  case new.week_key
    when 'module-01' then
      due_at := '2026-09-27 23:59:59+00'::timestamptz;
      revision_until := '2026-09-30 23:59:59+00'::timestamptz;
    when 'module-02' then
      due_at := '2026-10-04 23:59:59+00'::timestamptz;
      revision_until := '2026-10-07 23:59:59+00'::timestamptz;
    when 'module-03' then
      due_at := '2026-10-11 23:59:59+00'::timestamptz;
      revision_until := '2026-10-14 23:59:59+00'::timestamptz;
    when 'module-04' then
      due_at := '2026-10-18 23:59:59+00'::timestamptz;
      revision_until := '2026-10-21 23:59:59+00'::timestamptz;
    when 'module-05' then
      due_at := '2026-10-25 23:59:59+00'::timestamptz;
      revision_until := '2026-10-28 23:59:59+00'::timestamptz;
    else
      raise exception 'Unknown Canopy assignment week.';
  end case;

  -- Serialize inserts for the same learner/week so a double-click cannot
  -- consume more than one attempt.
  perform pg_advisory_xact_lock(
    hashtext(new.user_id::text),
    hashtext(coalesce(new.week_key,''))
  );

  select count(*)::integer
    into existing_attempts
  from public.canopy_assignment_submissions s
  where s.user_id = new.user_id
    and s.week_key = new.week_key;

  select *
    into prev
  from public.canopy_assignment_submissions s
  where s.user_id = new.user_id
    and s.week_key = new.week_key
  order by s.submitted_at desc, s.id desc
  limit 1;

  -- First attempt: Sunday deadline is absolute.
  if prev.id is null then
    if now() > due_at then
      raise exception 'The submission deadline for this module has passed. First submissions closed Sunday at 23:59 GMT.';
    end if;
    return new;
  end if;

  -- Maximum three attempts total.
  if existing_attempts >= 3 then
    raise exception 'All three assignment attempts have been used.';
  end if;

  -- A repeat attempt is available only after WOMATE explicitly requests
  -- a revision, and only until Wednesday 23:59:59 GMT.
  if prev.review_source = 'manual'
     and prev.assessment_status = 'revision_required' then
    if now() > revision_until then
      raise exception 'The revision window for this module has closed. Revisions closed Wednesday at 23:59 GMT.';
    end if;
    return new;
  end if;

  raise exception 'Your assignment is already submitted and is closed while WOMATE reviews it. Resubmission opens only when WOMATE requests a revision.';
end;
$$;

-- Keep the existing trigger name so no additional trigger is created.
drop trigger if exists aa_canopy_guard_assignment_resubmission
on public.canopy_assignment_submissions;

create trigger aa_canopy_guard_assignment_resubmission
before insert on public.canopy_assignment_submissions
for each row
execute function public.canopy_guard_assignment_resubmission();

reset lock_timeout;
reset statement_timeout;
