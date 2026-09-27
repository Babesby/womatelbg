-- WOMATE Canopy Â· Module 01 deadline + revision reminders Â· 2026-09-27
-- One-off, idempotent learner notifications. No UI or grading logic changes.

-- A. Learners with no Module 01 submission yet.
insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
select
  p.user_id,
  'reminder',
  'Module 01 submission closes tonight',
  'Your first Module 01 submission closes today, Sunday 27 September 2026 at 11:59 PM GMT. Once this deadline passes, a first submission cannot be made. Complete all required parts before the deadline. For the Speaker Challenge, you may submit either a LinkedIn or X/Twitter post. Before submitting, open your social-post link to confirm it works and check that your CanopyCanvas Google Drive link gives WOMATE permission to view the work without requesting access.',
  '/canopy/assignments',
  'womate:module-01:first-deadline:20260927:' || p.user_id::text
from public.canopy_profiles p
join auth.users u on u.id=p.user_id
where p.role='learner'
  and lower(coalesce(u.email,'')) <> 'p.viewmultimedia@gmail.com'
  and not exists (
    select 1 from public.canopy_learner_withdrawals w
    where w.user_id=p.user_id and w.active=true
  )
  and not exists (
    select 1 from public.canopy_assignment_submissions s
    where s.user_id=p.user_id and s.week_key='module-01'
  )
  and not exists (
    select 1 from public.canopy_notifications n
    where n.fingerprint='womate:module-01:first-deadline:20260927:' || p.user_id::text
  );

-- B. Learners whose latest/current Module 01 attempt is Revision required.
with ranked as (
  select
    s.user_id,
    s.assessment_status,
    row_number() over(
      partition by s.user_id,s.week_key
      order by s.attempt_no desc,s.submitted_at desc,s.id desc
    ) as rn
  from public.canopy_assignment_submissions s
  where s.week_key='module-01'
)
insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
select
  p.user_id,
  'reminder',
  'Module 01 revision due Wednesday',
  'Your latest Module 01 submission requires revision. You have until Wednesday 30 September 2026 at 11:59 PM GMT to make the requested changes and resubmit. Please review the feedback carefully. Cross-check that your LinkedIn or X/Twitter link opens correctly and contains the required Speaker Challenge post. Also confirm that your CanopyCanvas Google Drive link gives WOMATE permission to view the work without requesting access before you resubmit.',
  '/canopy/assignments',
  'womate:module-01:revision-deadline:20260930:' || p.user_id::text
from public.canopy_profiles p
join auth.users u on u.id=p.user_id
join ranked r on r.user_id=p.user_id and r.rn=1
where p.role='learner'
  and r.assessment_status='revision_required'
  and lower(coalesce(u.email,'')) <> 'p.viewmultimedia@gmail.com'
  and not exists (
    select 1 from public.canopy_learner_withdrawals w
    where w.user_id=p.user_id and w.active=true
  )
  and not exists (
    select 1 from public.canopy_notifications n
    where n.fingerprint='womate:module-01:revision-deadline:20260930:' || p.user_id::text
  );