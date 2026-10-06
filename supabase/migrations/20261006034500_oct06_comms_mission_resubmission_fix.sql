-- WOMATE Canopy - Oct 06 learner communications, mission check-in and resubmission repair
set lock_timeout='8s';
set statement_timeout='120s';

-- 1) Appreciation for learners whose latest Module 01/02 review is manually Completed.
with latest as (
  select distinct on (s.user_id,s.week_key)
    s.*
  from public.canopy_assignment_submissions s
  where s.week_key in ('module-01','module-02')
  order by s.user_id,s.week_key,s.attempt_no desc,s.submitted_at desc
),
eligible as (
  select distinct user_id
  from latest
  where review_source='manual'
    and assessment_status='completed'
)
insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
select
  e.user_id,
  'completed_appreciation_music',
  'We see your effort - keep going',
  'Your effort has not gone unnoticed. As you learn, act and take initiative for your community and the environment, we see you stepping into the role of a Mother of Nature - someone choosing to care, lead and act. Take a moment to celebrate your progress with "African Woman" by Becca. Keep going; every thoughtful action matters. WOMATE Team.',
  'https://youtu.be/XnDdJkoEyAk?si=v9nhrOekJ6aafIRR',
  'oct06-completed-appreciation:'||e.user_id::text
from eligible e
on conflict(fingerprint) do nothing;

-- 2) Submitted but not yet manually reviewed.
with latest as (
  select distinct on (s.user_id,s.week_key)
    s.*
  from public.canopy_assignment_submissions s
  where s.week_key in ('module-01','module-02')
  order by s.user_id,s.week_key,s.attempt_no desc,s.submitted_at desc
),
eligible as (
  select distinct user_id
  from latest
  where coalesce(review_source,'') <> 'manual'
     or coalesce(assessment_status,'') in ('','needs_manual_review','submitted','pending')
)
insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
select
  e.user_id,
  'assignment_review_reassurance',
  'Your submission is safely received',
  'Your assignment has been received and is awaiting WOMATE manual review. Please do not worry if your final result is not visible yet. We are working through the reviews and expect to release outstanding Module 01 and Module 02 results before Wednesday, 7 October 2026. You do not need to submit again unless WOMATE specifically requests a revision.',
  '/canopy/assignments',
  'oct06-review-reassurance:'||e.user_id::text
from eligible e
on conflict(fingerprint) do nothing;

-- 3) Learners missing Module 01 or Module 02, and learners with a current WOMATE revision request.
with learner_ids as (
  select p.user_id
  from public.canopy_profiles p
  where p.role='learner'
),
latest as (
  select distinct on (s.user_id,s.week_key)
    s.*
  from public.canopy_assignment_submissions s
  where s.week_key in ('module-01','module-02')
  order by s.user_id,s.week_key,s.attempt_no desc,s.submitted_at desc
),
needs_grace as (
  select l.user_id
  from learner_ids l
  where not exists (
      select 1 from public.canopy_assignment_submissions s
      where s.user_id=l.user_id and s.week_key='module-01'
    )
     or not exists (
      select 1 from public.canopy_assignment_submissions s
      where s.user_id=l.user_id and s.week_key='module-02'
    )
     or exists (
       select 1 from latest x
       where x.user_id=l.user_id
         and x.review_source='manual'
         and x.assessment_status='revision_required'
     )
)
insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
select
  n.user_id,
  'assignment_grace_window',
  '48-hour Module 01/02 grace window next week',
  'WOMATE will open a 48-hour grace period from Monday, 12 October 2026 at 00:00 GMT to Tuesday, 13 October 2026 at 23:59 GMT. This is for outstanding Module 01 or Module 02 first submissions and eligible WOMATE-requested revisions. If this applies to you, use the window to complete your work carefully. The normal three-attempt limit still applies. Keep going - one missed deadline does not erase the work you have already put in.',
  '/canopy/assignments',
  'oct06-module12-grace:'||n.user_id::text
from needs_grace n
on conflict(fingerprint) do nothing;

-- 4) Mission participant progress check-in.
insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
select distinct
  m.user_id,
  'mission_progress_checkin',
  'How is your WOMATE Mission going?',
  'We are checking in on your Mission progress. Please open your Mission space, review your team progress and keep communicating with your group. If you have any complaint, blocker or challenge, use the new Mission check-in box and send it directly to WOMATE so we can see it in Admin and help resolve it. Keep showing up for one another - steady progress is still progress.',
  '/canopy/opportunities',
  'oct06-mission-checkin:'||m.user_id::text
from public.canopy_mission_group_members m
where m.invitation_status='accepted'
on conflict(fingerprint) do nothing;

-- 5) Notify learners currently asked to revise that the link/resubmission issue has been fixed.
with latest as (
  select distinct on (s.user_id,s.week_key)
    s.*
  from public.canopy_assignment_submissions s
  where s.week_key in ('module-01','module-02')
  order by s.user_id,s.week_key,s.attempt_no desc,s.submitted_at desc
)
insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
select
  l.user_id,
  'revision_resubmission_fix',
  'Revision resubmission issue fixed - please try again',
  'We have fixed the practical-link resubmission issue. If WOMATE requested a revision, please try again from Assignments. Your practical link can now be a standard Google Drive or Google Docs link, a OneDrive link, a 1drv.ms share link, or a SharePoint link. Unchanged assignment parts will carry forward from your previous attempt so you can focus on the part you were asked to correct. If you still experience a problem, use Canopy Help and send us the exact error.',
  '/canopy/assignments',
  'oct06-revision-link-fix:'||l.user_id::text||':'||l.week_key
from latest l
where l.review_source='manual'
  and l.assessment_status='revision_required'
  and l.attempt_no < 3
on conflict(fingerprint) do nothing;

-- 6) Deadline guard: preserve normal schedule, Lusanda exception, and add the approved 48-hour Module 01/02 grace window.
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
  grace_open boolean := false;
  learner_name text;
begin
  if exists (
    select 1 from auth.users u
    where u.id=new.user_id
      and lower(coalesce(u.email,''))='p.viewmultimedia@gmail.com'
  ) then
    return new;
  end if;

  case new.week_key
    when 'module-01' then
      due_at := '2026-09-27 23:59:59+00'::timestamptz;
      revision_until := '2026-09-30 23:59:59+00'::timestamptz;
    when 'module-02' then
      due_at := '2026-10-04 23:59:59+00'::timestamptz;
      revision_until := '2026-10-07 23:59:59+00'::timestamptz;
      select lower(trim(coalesce(p.full_name,''))) into learner_name
      from public.canopy_profiles p where p.user_id=new.user_id;
      if learner_name='lusanda majikijela' then
        due_at := '2026-10-05 23:59:59+00'::timestamptz;
      end if;
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

  grace_open :=
    new.week_key in ('module-01','module-02')
    and now() >= '2026-10-12 00:00:00+00'::timestamptz
    and now() <= '2026-10-13 23:59:59+00'::timestamptz;

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
    if now()>due_at and not grace_open then
      raise exception 'The first-submission deadline for this module has passed. The approved Module 01/02 grace window opens 12 October 2026 where applicable.';
    end if;
    return new;
  end if;

  if existing_attempts>=3 then
    raise exception 'All three assignment attempts have been used.';
  end if;

  if prev.review_source='manual' and prev.assessment_status='revision_required' then
    if now()>revision_until and not grace_open then
      raise exception 'The normal revision window has closed. The approved Module 01/02 grace window opens 12 October 2026 where applicable.';
    end if;
    return new;
  end if;

  raise exception 'Your assignment is already submitted and is closed while WOMATE reviews it. Resubmission opens only when WOMATE requests a revision.';
end;
$$;

drop trigger if exists aa_canopy_guard_assignment_resubmission on public.canopy_assignment_submissions;
create trigger aa_canopy_guard_assignment_resubmission
before insert on public.canopy_assignment_submissions
for each row execute function public.canopy_guard_assignment_resubmission();

reset lock_timeout;
reset statement_timeout;
