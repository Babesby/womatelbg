-- WOMATE Canopy final grace windows for outstanding Module 01-03 submissions.
-- Module 01 + 02: 48 hours, 12 Oct 2026 12:00 GMT -> 14 Oct 2026 12:00 GMT.
-- Module 03: 24 hours, 12 Oct 2026 12:00 GMT -> 13 Oct 2026 12:00 GMT.

set lock_timeout='8s';
set statement_timeout='120s';

create or replace function public.canopy_guard_assignment_resubmission()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  prev public.canopy_assignment_submissions%rowtype;
  existing_attempts integer:=0;
  due_at timestamptz;
  revision_until timestamptz;
  final_grace_start timestamptz;
  final_grace_end timestamptz;
  revision_final_grace boolean:=false;
begin
  if exists(
    select 1 from auth.users u
    where u.id=new.user_id
      and lower(coalesce(u.email,''))='p.viewmultimedia@gmail.com'
  ) then
    return new;
  end if;

  case new.week_key
    when 'module-01' then
      due_at:='2026-09-27 23:59:59+00'::timestamptz;
      revision_until:='2026-09-30 23:59:59+00'::timestamptz;
      final_grace_start:='2026-10-12 12:00:00+00'::timestamptz;
      final_grace_end:='2026-10-14 12:00:00+00'::timestamptz;
      revision_final_grace:=true;
    when 'module-02' then
      due_at:='2026-10-04 23:59:59+00'::timestamptz;
      revision_until:='2026-10-07 23:59:59+00'::timestamptz;
      final_grace_start:='2026-10-12 12:00:00+00'::timestamptz;
      final_grace_end:='2026-10-14 12:00:00+00'::timestamptz;
      revision_final_grace:=true;
    when 'module-03' then
      due_at:='2026-10-11 23:59:59+00'::timestamptz;
      revision_until:='2026-10-14 23:59:59+00'::timestamptz;
      final_grace_start:='2026-10-12 12:00:00+00'::timestamptz;
      final_grace_end:='2026-10-13 12:00:00+00'::timestamptz;
    when 'module-04' then
      due_at:='2026-10-18 23:59:59+00'::timestamptz;
      revision_until:='2026-10-21 23:59:59+00'::timestamptz;
    when 'module-05' then
      due_at:='2026-10-25 23:59:59+00'::timestamptz;
      revision_until:='2026-10-28 23:59:59+00'::timestamptz;
    else
      raise exception 'Unknown Canopy assignment week.';
  end case;

  perform pg_advisory_xact_lock(hashtext(new.user_id::text),hashtext(coalesce(new.week_key,'')));

  select count(*)::integer into existing_attempts
  from public.canopy_assignment_submissions s
  where s.user_id=new.user_id and s.week_key=new.week_key;

  select * into prev
  from public.canopy_assignment_submissions s
  where s.user_id=new.user_id and s.week_key=new.week_key
  order by s.submitted_at desc,s.id desc
  limit 1;

  if prev.id is null then
    if now()<=due_at then return new; end if;
    if final_grace_start is not null and now()>=final_grace_start and now()<=final_grace_end then
      return new;
    end if;
    if final_grace_start is not null and now()<final_grace_start then
      raise exception 'The normal submission deadline has passed. Your final grace window has not opened yet.';
    end if;
    raise exception 'The final grace period for this module has ended. No further grace period is available.';
  end if;

  if existing_attempts>=3 then
    raise exception 'All three assignment attempts have been used.';
  end if;

  if prev.review_source='manual' and prev.assessment_status='revision_required' then
    if now()<=revision_until then return new; end if;
    if revision_final_grace
       and final_grace_start is not null
       and now()>=final_grace_start
       and now()<=final_grace_end then
      return new;
    end if;
    raise exception 'The revision window for this module has closed.';
  end if;

  raise exception 'Your assignment is already submitted and is closed while WOMATE reviews it. Resubmission opens only when WOMATE requests a revision.';
end;
$$;

drop trigger if exists aa_canopy_guard_assignment_resubmission
on public.canopy_assignment_submissions;

create trigger aa_canopy_guard_assignment_resubmission
before insert on public.canopy_assignment_submissions
for each row
execute function public.canopy_guard_assignment_resubmission();

with eligible as (
  select distinct p.user_id
  from public.canopy_profiles p
  where p.role='learner'
    and exists(
      select 1 from public.canopy_enrollments e
      where e.user_id=p.user_id and e.status='active'
    )
    and not exists(
      select 1 from public.canopy_learner_withdrawals w
      where w.user_id=p.user_id and w.active=true
    )
),
missing as (
  select
    e.user_id,
    array_remove(array[
      case when not exists(select 1 from public.canopy_assignment_submissions s where s.user_id=e.user_id and s.week_key='module-01') then 'Module 01' end,
      case when not exists(select 1 from public.canopy_assignment_submissions s where s.user_id=e.user_id and s.week_key='module-02') then 'Module 02' end,
      case when not exists(select 1 from public.canopy_assignment_submissions s where s.user_id=e.user_id and s.week_key='module-03') then 'Module 03' end
    ],null) as missing_modules
  from eligible e
),
recipients as (
  select user_id,missing_modules
  from missing
  where cardinality(missing_modules)>0
)
insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
select
  r.user_id,
  'assignment_grace',
  'FINAL grace period for outstanding Modules 01-03',
  case when now()<'2026-10-12 12:00:00+00'::timestamptz
    then 'You still have an outstanding first submission in: '||array_to_string(r.missing_modules,', ')||'. Your FINAL grace windows begin today at 12:00 GMT. Modules 01 and 02: 48 hours, from 12 October 12:00 GMT to 14 October 12:00 GMT. Module 03: 24 hours, from 12 October 12:00 GMT to 13 October 12:00 GMT. Submit all required assignment parts before the applicable deadline. There will be NO further grace period after these windows.'
    else 'You still have an outstanding first submission in: '||array_to_string(r.missing_modules,', ')||'. Your FINAL grace windows are now open. Modules 01 and 02: 48 hours, closing 14 October at 12:00 GMT. Module 03: 24 hours, closing 13 October at 12:00 GMT. Submit all required assignment parts before the applicable deadline. There will be NO further grace period after these windows.'
  end,
  '/canopy/assignments',
  'final-grace-m01-m03-20261012:'||r.user_id::text
from recipients r
on conflict(fingerprint) do update
set title=excluded.title,
    body=excluded.body,
    link=excluded.link,
    type=excluded.type,
    read_at=null,
    created_at=now();

notify pgrst,'reload schema';

reset lock_timeout;
reset statement_timeout;
