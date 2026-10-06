-- WOMATE Canopy: Cecilia Module 02 exception + hard future-module locks
set lock_timeout='8s';
set statement_timeout='120s';

-- Notify Cecilia about her individual Module 02 opening.
with cecilia as (
  select user_id
  from public.canopy_profiles
  where lower(trim(coalesce(full_name,'')))='cecilia serwaa nkansah'
)
insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
select
  user_id,
  'module02_individual_access',
  'Module 02 reopened for you',
  'Your Module 02 first-submission access has been reopened through Wednesday, 7 October 2026 at 11:59 PM GMT. Please complete and submit all required parts before the window closes. If you experience any difficulty, use Canopy Help immediately so WOMATE can assist.',
  '/canopy/assignments',
  'cecilia-module02-reopen-20261006:'||user_id::text
from cecilia
on conflict(fingerprint) do nothing;

-- Submission guard:
-- - Cecilia can make a first Module 02 submission through 7 Oct 23:59 GMT.
-- - Module 04 and Module 05 can NEVER be submitted before their scheduled opening.
-- - Preserve the existing Module 01/02 grace window and normal revision logic.
create or replace function public.canopy_guard_assignment_resubmission()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  prev public.canopy_assignment_submissions%rowtype;
  existing_attempts integer := 0;
  due_at timestamptz;
  revision_until timestamptz;
  opens_at timestamptz;
  grace_open boolean := false;
  learner_name text;
begin
  -- Tester remains isolated from normal timing gates.
  if exists (
    select 1 from auth.users u
    where u.id=new.user_id
      and lower(coalesce(u.email,''))='p.viewmultimedia@gmail.com'
  ) then
    return new;
  end if;

  select lower(trim(coalesce(p.full_name,'')))
    into learner_name
  from public.canopy_profiles p
  where p.user_id=new.user_id;

  case new.week_key
    when 'module-01' then
      opens_at := '2026-09-21 00:00:00+00'::timestamptz;
      due_at := '2026-09-27 23:59:59+00'::timestamptz;
      revision_until := '2026-09-30 23:59:59+00'::timestamptz;

    when 'module-02' then
      opens_at := '2026-09-28 00:00:00+00'::timestamptz;
      due_at := '2026-10-04 23:59:59+00'::timestamptz;
      revision_until := '2026-10-07 23:59:59+00'::timestamptz;

      -- Existing Lusanda exception remains preserved.
      if learner_name='lusanda majikijela' then
        due_at := greatest(due_at,'2026-10-05 23:59:59+00'::timestamptz);
      end if;

      -- Cecilia individual first-submission access.
      if learner_name='cecilia serwaa nkansah' then
        due_at := greatest(due_at,'2026-10-07 23:59:59+00'::timestamptz);
      end if;

    when 'module-03' then
      opens_at := '2026-10-05 00:00:00+00'::timestamptz;
      due_at := '2026-10-11 23:59:59+00'::timestamptz;
      revision_until := '2026-10-14 23:59:59+00'::timestamptz;

    when 'module-04' then
      opens_at := '2026-10-12 00:00:00+00'::timestamptz;
      due_at := '2026-10-18 23:59:59+00'::timestamptz;
      revision_until := '2026-10-21 23:59:59+00'::timestamptz;

    when 'module-05' then
      opens_at := '2026-10-19 00:00:00+00'::timestamptz;
      due_at := '2026-10-25 23:59:59+00'::timestamptz;
      revision_until := '2026-10-28 23:59:59+00'::timestamptz;

    else
      raise exception 'Unknown Canopy assignment week.';
  end case;

  -- Absolute future-module protection. UI mistakes or stale clients cannot bypass this.
  if now() < opens_at then
    raise exception 'This module is still locked and has not opened for the cohort.';
  end if;

  grace_open :=
    new.week_key in ('module-01','module-02')
    and now() >= '2026-10-12 00:00:00+00'::timestamptz
    and now() <= '2026-10-13 23:59:59+00'::timestamptz;

  perform pg_advisory_xact_lock(hashtext(new.user_id::text),hashtext(coalesce(new.week_key,'')));

  select count(*)::integer
    into existing_attempts
  from public.canopy_assignment_submissions s
  where s.user_id=new.user_id
    and s.week_key=new.week_key;

  select *
    into prev
  from public.canopy_assignment_submissions s
  where s.user_id=new.user_id
    and s.week_key=new.week_key
  order by s.submitted_at desc,s.id desc
  limit 1;

  if prev.id is null then
    if now()>due_at and not grace_open then
      raise exception 'The first-submission deadline for this module has passed.';
    end if;
    return new;
  end if;

  if existing_attempts>=3 then
    raise exception 'All three assignment attempts have been used.';
  end if;

  if prev.review_source='manual'
     and prev.assessment_status='revision_required' then
    if now()>revision_until and not grace_open then
      raise exception 'The revision window for this module has closed.';
    end if;
    return new;
  end if;

  raise exception 'Your assignment is already submitted and is closed while WOMATE reviews it. Resubmission opens only when WOMATE requests a revision.';
end;
$$;

drop trigger if exists aa_canopy_guard_assignment_resubmission
on public.canopy_assignment_submissions;

create trigger aa_canopy_guard_assignment_resubmission
before insert on public.canopy_assignment_submissions
for each row execute function public.canopy_guard_assignment_resubmission();

reset lock_timeout;
reset statement_timeout;
