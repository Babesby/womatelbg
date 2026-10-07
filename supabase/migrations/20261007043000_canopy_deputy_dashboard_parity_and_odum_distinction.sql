-- WOMATE Canopy - Deputy dashboard parity + Odum Module 02 distinction
-- 2026-10-07
-- Safe/idempotent. No new tables.

begin;

create or replace function public.canopy_deputy_review_complaint_data()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  staff_role text;
begin
  if auth.uid() is null then raise exception 'Sign in to continue.'; end if;
  staff_role := public.canopy_staff_role(auth.uid());
  if coalesce(staff_role,'') <> 'programme_operations' then
    raise exception 'Deputy Programme Manager access required.';
  end if;

  return jsonb_build_object(
    'role','programme_operations',
    'module_id',null,
    'counts',jsonb_build_object(
      'learners',(select count(*) from public.canopy_profiles p where p.role='learner'),
      'active_access',(select count(*) from public.canopy_enrollments e join public.canopy_profiles p on p.user_id=e.user_id where p.role='learner' and e.status='active'),
      'submissions',(select count(*) from (select distinct on (s.user_id,s.week_key) s.id from public.canopy_assignment_submissions s order by s.user_id,s.week_key,coalesce(s.attempt_no,1) desc,s.submitted_at desc,s.id desc) q),
      'needs_attention',(select count(*) from (select distinct on (s.user_id,s.week_key) s.assessment_status from public.canopy_assignment_submissions s order by s.user_id,s.week_key,coalesce(s.attempt_no,1) desc,s.submitted_at desc,s.id desc) q where q.assessment_status in ('auto_reviewed','needs_manual_review')),
      'revision_required',(select count(*) from (select distinct on (s.user_id,s.week_key) s.assessment_status from public.canopy_assignment_submissions s order by s.user_id,s.week_key,coalesce(s.attempt_no,1) desc,s.submitted_at desc,s.id desc) q where q.assessment_status='revision_required'),
      'completed',(select count(*) from (select distinct on (s.user_id,s.week_key) s.assessment_status from public.canopy_assignment_submissions s order by s.user_id,s.week_key,coalesce(s.attempt_no,1) desc,s.submitted_at desc,s.id desc) q where q.assessment_status='completed'),
      'open_complaints',(select count(*) from public.canopy_manager_actions where action_type='complaint' and status='open'),
      'open_actions',(select count(*) from public.canopy_manager_actions where status='open'),
      'certificates',(select count(*) from public.canopy_certificates)
    ),
    'learners',coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id',p.user_id,
        'full_name',coalesce(p.full_name,'Learner'),
        'country',p.country,
        'enrollment_status',coalesce(e.status,'waiting')
      ) order by p.full_name)
      from public.canopy_profiles p
      left join public.canopy_enrollments e on e.user_id=p.user_id
      where p.role='learner'
    ),'[]'::jsonb),
    'recent_submissions',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',x.id,'user_id',x.user_id,'learner_id',x.user_id,'week_key',x.week_key,
        'module_label',replace(initcap(replace(x.week_key,'-',' ')),'Module ','Module '),
        'attempt_no',coalesce(x.attempt_no,1),'submitted_at',x.submitted_at,
        'learner_name',coalesce(p.full_name,'Learner'),'learner_email',u.email,'email',u.email,
        'score',coalesce(x.final_score,x.auto_score),'auto_score',x.auto_score,
        'review_source',x.review_source,'score_band',x.score_band,'assessment_status',x.assessment_status,
        'paragraph_response',coalesce(x.paragraph_response,''),'paragraph_excerpt',left(coalesce(x.paragraph_response,''),360),
        'final_feedback',x.final_feedback,'canvas_link',x.canvas_link,'linkedin_link',x.linkedin_link
      ) order by x.submitted_at desc)
      from (
        select distinct on (s.user_id,s.week_key) s.*
        from public.canopy_assignment_submissions s
        order by s.user_id,s.week_key,coalesce(s.attempt_no,1) desc,s.submitted_at desc,s.id desc
      ) x
      left join public.canopy_profiles p on p.user_id=x.user_id
      left join auth.users u on u.id=x.user_id
    ),'[]'::jsonb),
    'communications','[]'::jsonb,
    'complaints',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',a.id,'subject',a.subject,'message',a.message,'status',a.status,
        'response_message',a.response_message,'created_at',a.created_at,
        'learner_name',coalesce(p.full_name,'Learner')
      ) order by a.created_at desc)
      from public.canopy_manager_actions a
      left join public.canopy_profiles p on p.user_id=a.learner_id
      where a.action_type='complaint'
    ),'[]'::jsonb),
    'certificates','[]'::jsonb,
    'team_members','[]'::jsonb,
    'spotlights','[]'::jsonb
  );
end;
$$;

revoke all on function public.canopy_deputy_review_complaint_data() from public;
grant execute on function public.canopy_deputy_review_complaint_data() to authenticated;

-- Separate from the weekly Top 5: recognise Odum Ifeoluwa's Module 02 work
-- without creating a sixth Spotlight selection.
with odum as (
  select p.user_id
  from public.canopy_profiles p
  where lower(trim(coalesce(p.full_name,'')))='odum ifeoluwa'
  limit 1
)
insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
select
  user_id,
  'assignment_distinction',
  'WOMATE Applied Climate Justice Distinction · Module 02',
  'Assignment of the Week. WOMATE recognises your outstanding applied response for turning Gender & Climate Justice into practical, locally grounded climate action — centring women''s knowledge, leadership, time and participation in mangrove restoration. Keep building on this standard.',
  '/canopy/assignments',
  'module02-applied-climate-justice-distinction:'||user_id::text
from odum
on conflict(fingerprint) do nothing;

commit;
