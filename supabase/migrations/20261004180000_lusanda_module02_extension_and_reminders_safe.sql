-- Lusanda-only Module 02 deadline exception, without replacing current guard logic.
set lock_timeout='8s';
set statement_timeout='120s';
do $womate_lusanda$
declare
  total int;
  definition text;
  amended text;
  marker text := '-- womate_lusanda_module02_exception_20261004';
begin
  select count(*) into total from public.canopy_profiles
  where role='learner' and lower(btrim(full_name))='lusanda majikijela';
  if total <> 1 then
    raise exception 'Lusanda must match exactly one learner; found %. No changes applied.',total;
  end if;
  select pg_get_functiondef('public.canopy_guard_assignment_resubmission()'::regprocedure)
    into definition;
  if definition is null or position('due_at' in definition)=0
    or position('end case;' in lower(definition))=0 then
    raise exception 'Current submission guard is not compatible; no changes applied.';
  end if;
  if position(marker in definition)=0 then
    if (length(lower(definition))-length(replace(lower(definition),'end case;','')))/length('end case;') <> 1 then
      raise exception 'Unexpected submission guard structure; no changes applied.';
    end if;
    amended:=replace(definition,'end case;',
      'end case;'||chr(10)||'  '||marker||chr(10)||
      '  if new.week_key = ''module-02'' and new.user_id = (select user_id from public.canopy_profiles where role = ''learner'' and lower(btrim(full_name)) = ''lusanda majikijela'') then'||chr(10)||
      '    due_at := ''2026-10-05 23:59:59+00''::timestamptz;'||chr(10)||
      '  end if;');
    if amended=definition then raise exception 'Guard update failed without changes.';end if;
    execute amended;
  end if;
end $womate_lusanda$;

-- Individual extension: one learner, one module, no global deadline changes.
insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
select p.user_id,'reminder','Approved: Module 02 extension to Monday',
'Dear Lusanda, thank you for updating WOMATE. We hope you feel better soon. Your Module 02 first-submission deadline has been extended for your account only to Monday 5 October 2026 at 11:59 PM GMT. Please submit all required parts by then. If you experience an access problem, use Canopy Help to contact our team. Take care. WOMATE Team.',
'/canopy/assignments','womate:lusanda:module02:extension:20261005:'||p.user_id::text
from public.canopy_profiles p
where p.role='learner' and lower(trim(p.full_name))='lusanda majikijela'
and now()<='2026-10-05 23:59:59+00'::timestamptz
and not exists(select 1 from public.canopy_notifications n where n.fingerprint='womate:lusanda:module02:extension:20261005:'||p.user_id::text);

-- Sunday first-submission reminder, only if still before the standard deadline.
insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
select p.user_id,'reminder','Module 02 first-submission deadline: Sunday',
'Dear learner, Module 02 (Gender & Climate Justice) first submissions close Sunday 4 October 2026 at 11:59 PM GMT. Please finish and submit the required parts before the deadline. Check that your practical Google Drive link is viewable and your speaker-challenge social-post link opens correctly. Saving a draft is not the same as submitting. Thank you for your dedication. WOMATE Team.',
'/canopy/assignments','womate:module02:first-deadline:20261004:'||p.user_id::text
from public.canopy_profiles p join auth.users u on u.id=p.user_id
where now()<='2026-10-04 23:59:59+00'::timestamptz
and p.role='learner' and lower(trim(p.full_name))<>'lusanda majikijela'
and lower(coalesce(u.email,''))<>'p.viewmultimedia@gmail.com'
and not exists(select 1 from public.canopy_learner_withdrawals w where w.user_id=p.user_id and w.active=true)
and not exists(select 1 from public.canopy_assignment_submissions s where s.user_id=p.user_id and s.week_key='module-02')
and not exists(select 1 from public.canopy_notifications n where n.fingerprint='womate:module02:first-deadline:20261004:'||p.user_id::text);

-- Wednesday revision reminder, latest attempt only and only while revision is actionable.
with latest as (
 select s.user_id,s.review_source,s.assessment_status,s.attempt_no,
 row_number() over(partition by s.user_id,s.week_key order by s.attempt_no desc,s.submitted_at desc,s.id desc) rn
 from public.canopy_assignment_submissions s where s.week_key='module-02'
)
insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
select p.user_id,'reminder','Module 02 revision deadline: Wednesday',
'Dear learner, WOMATE has marked your latest Module 02 attempt Revision required. Please review your feedback and resubmit only the parts requested by your reviewer by Wednesday 7 October 2026 at 11:59 PM GMT. Confirm that updated links can be opened without access requests. Thank you for making the corrections. WOMATE Team.',
'/canopy/assignments','womate:module02:revision-deadline:20261007:'||p.user_id::text
from public.canopy_profiles p join latest l on l.user_id=p.user_id and l.rn=1
join auth.users u on u.id=p.user_id
where now()<='2026-10-07 23:59:59+00'::timestamptz
and p.role='learner' and l.review_source='manual' and l.assessment_status='revision_required' and coalesce(l.attempt_no,1)<3
and lower(coalesce(u.email,''))<>'p.viewmultimedia@gmail.com'
and not exists(select 1 from public.canopy_learner_withdrawals w where w.user_id=p.user_id and w.active=true)
and not exists(select 1 from public.canopy_notifications n where n.fingerprint='womate:module02:revision-deadline:20261007:'||p.user_id::text);

-- Appreciate each manually completed module independently; final-score release remains governed by existing schedule.
with latest as (
 select s.user_id,s.week_key,s.review_source,s.assessment_status,
 row_number() over(partition by s.user_id,s.week_key order by s.attempt_no desc,s.submitted_at desc,s.id desc) rn
 from public.canopy_assignment_submissions s where s.week_key in ('module-01','module-02')
)
insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
select p.user_id,'announcement',
case when l.week_key='module-01' then 'Well done on completing Module 01!' else 'Well done on completing Module 02!' end,
case when l.week_key='module-01' then
'Dear learner, congratulations on having your Module 01 assignment manually marked Completed! Thank you for the time, effort and commitment you have brought to She Leads. You can check your Canopy assignment for your final result once its applicable release deadline has passed. Keep bringing that same energy to the next module. WOMATE Team.'
else
'Dear learner, congratulations on having your Module 02 assignment manually marked Completed! We appreciate your thoughtful work and commitment to She Leads. Please check Canopy after the applicable deadline for your final result. Keep learning, connecting and leading. WOMATE Team.' end,
'/canopy/assignments','womate:completed:appreciation:20261004:'||l.week_key||':'||p.user_id::text
from public.canopy_profiles p join latest l on l.user_id=p.user_id and l.rn=1
join auth.users u on u.id=p.user_id
where p.role='learner' and l.review_source='manual' and l.assessment_status='completed'
and lower(coalesce(u.email,''))<>'p.viewmultimedia@gmail.com'
and not exists(select 1 from public.canopy_learner_withdrawals w where w.user_id=p.user_id and w.active=true)
and not exists(select 1 from public.canopy_notifications n where n.fingerprint='womate:completed:appreciation:20261004:'||l.week_key||':'||p.user_id::text);

reset lock_timeout;
reset statement_timeout;
