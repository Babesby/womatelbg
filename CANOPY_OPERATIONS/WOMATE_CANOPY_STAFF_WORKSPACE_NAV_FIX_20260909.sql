-- WOMATE CANOPY · FULL TEAM WORKSPACE DATA
-- 9 September 2026 · NAV/RPC FIX
-- Additive / idempotent. No new auth model and no participant schedule changes.
-- Provides richer read-only workspace data for real staff roles and Admin Preview.

begin;

create or replace function public.canopy_staff_workspace_data()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  staff_role text;
  module_scope text;
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;

  select m.role,m.module_id into staff_role,module_scope
  from public.canopy_staff_memberships m
  where m.user_id=auth.uid() and m.status='active';

  if not found or staff_role not in ('programme_manager','programme_operations','module_coordinator','learning_fellow') then
    raise exception 'This account does not have an active Canopy delivery-team workspace.';
  end if;

  return jsonb_build_object(
    'role',staff_role,
    'module_id',module_scope,
    'counts',jsonb_build_object(
      'learners',(select count(*) from public.canopy_profiles p where p.role='learner'),
      'active_access',(select count(*) from public.canopy_enrollments e where e.status='active'),
      'submissions',(select count(*) from public.canopy_assignment_submissions s where module_scope is null or s.week_key=module_scope),
      'needs_attention',(select count(*) from public.canopy_assignment_submissions s where (module_scope is null or s.week_key=module_scope) and s.assessment_status='needs_manual_review'),
      'revision_required',(select count(*) from public.canopy_assignment_submissions s where (module_scope is null or s.week_key=module_scope) and s.assessment_status='revision_required'),
      'completed',(select count(*) from public.canopy_assignment_submissions s where (module_scope is null or s.week_key=module_scope) and s.assessment_status='completed')
    ),
    'learners',coalesce((
      select jsonb_agg(x order by x->>'full_name')
      from(
        select jsonb_build_object(
          'user_id',p.user_id,
          'full_name',coalesce(p.full_name,'Learner'),
          'country',p.country,
          'enrollment_status',coalesce(e.status,'waiting'),
          'submission_count',(
            select count(*) from public.canopy_assignment_submissions s
            where s.user_id=p.user_id and (module_scope is null or s.week_key=module_scope)
          )
        ) x
        from public.canopy_profiles p
        left join public.canopy_enrollments e on e.user_id=p.user_id
        where p.role='learner'
          and (
            module_scope is null
            or exists(select 1 from public.canopy_assignment_submissions s where s.user_id=p.user_id and s.week_key=module_scope)
          )
        limit 500
      ) q
    ),'[]'::jsonb),
    'recent_submissions',coalesce((
      select jsonb_agg(row_data order by submitted_at desc)
      from(
        select jsonb_build_object(
          'id',s.id,
          'week_key',s.week_key,
          'module_label',replace(initcap(replace(s.week_key,'-',' ')),'Module ','Module '),
          'attempt_no',s.attempt_no,
          'submitted_at',s.submitted_at,
          'learner_name',coalesce(p.full_name,'Learner'),
          'country',p.country,
          'score',coalesce(s.final_score,s.auto_score),
          'score_band',s.score_band,
          'assessment_status',s.assessment_status,
          'paragraph_excerpt',left(coalesce(s.paragraph_response,''),360),
          'canvas_link',s.canvas_link,
          'linkedin_link',s.linkedin_link
        ) row_data,s.submitted_at
        from public.canopy_assignment_submissions s
        left join public.canopy_profiles p on p.user_id=s.user_id
        where module_scope is null or s.week_key=module_scope
        order by s.submitted_at desc
        limit 120
      ) q
    ),'[]'::jsonb),
    'communications',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',a.id,'action_type',a.action_type,'subject',a.subject,'message',a.message,
        'status',a.status,'created_at',a.created_at,'learner_name',coalesce(p.full_name,'Learner')
      ) order by a.created_at desc)
      from public.canopy_manager_actions a
      left join public.canopy_profiles p on p.user_id=a.learner_id
      where a.action_type in ('warning','feedback','reminder')
        and (
          module_scope is null
          or exists(select 1 from public.canopy_assignment_submissions s where s.user_id=a.learner_id and s.week_key=module_scope)
        )
    ),'[]'::jsonb),
    'complaints',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',a.id,'subject',a.subject,'message',a.message,'status',a.status,
        'created_at',a.created_at,'learner_name',coalesce(p.full_name,'Learner')
      ) order by a.created_at desc)
      from public.canopy_manager_actions a
      left join public.canopy_profiles p on p.user_id=a.learner_id
      where a.action_type='complaint'
        and (
          module_scope is null
          or exists(select 1 from public.canopy_assignment_submissions s where s.user_id=a.learner_id and s.week_key=module_scope)
        )
    ),'[]'::jsonb),
    'spotlights',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',n.id,'submission_id',n.submission_id,'module_id',n.module_id,
        'category',n.category,'note',n.note,'status',n.status,'created_at',n.created_at,
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

revoke all on function public.canopy_staff_workspace_data() from public;
grant execute on function public.canopy_staff_workspace_data() to authenticated;

create or replace function public.canopy_admin_preview_staff_workspace(
  p_role text,
  p_module_id text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path=public,auth
as $$
declare
  module_scope text;
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'Only WOMATE Admin can use team workspace preview.';
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
    if p_module_id is not null then raise exception 'Programme-wide roles cannot be module-bound.'; end if;
    module_scope:=null;
  end if;

  insert into public.canopy_team_audit_log(actor_user_id,action,detail)
  values(auth.uid(),'admin_full_workspace_preview',jsonb_build_object('preview_role',p_role,'module_id',module_scope));

  return jsonb_build_object(
    'role',p_role,
    'module_id',module_scope,
    'preview',true,
    'counts',jsonb_build_object(
      'learners',(select count(*) from public.canopy_profiles p where p.role='learner'),
      'active_access',(select count(*) from public.canopy_enrollments e where e.status='active'),
      'submissions',(select count(*) from public.canopy_assignment_submissions s where module_scope is null or s.week_key=module_scope),
      'needs_attention',(select count(*) from public.canopy_assignment_submissions s where (module_scope is null or s.week_key=module_scope) and s.assessment_status='needs_manual_review'),
      'revision_required',(select count(*) from public.canopy_assignment_submissions s where (module_scope is null or s.week_key=module_scope) and s.assessment_status='revision_required'),
      'completed',(select count(*) from public.canopy_assignment_submissions s where (module_scope is null or s.week_key=module_scope) and s.assessment_status='completed')
    ),
    'learners',coalesce((
      select jsonb_agg(x order by x->>'full_name')
      from(
        select jsonb_build_object(
          'user_id',p.user_id,'full_name',coalesce(p.full_name,'Learner'),'country',p.country,
          'enrollment_status',coalesce(e.status,'waiting'),
          'submission_count',(select count(*) from public.canopy_assignment_submissions s where s.user_id=p.user_id and (module_scope is null or s.week_key=module_scope))
        ) x
        from public.canopy_profiles p
        left join public.canopy_enrollments e on e.user_id=p.user_id
        where p.role='learner'
          and (module_scope is null or exists(select 1 from public.canopy_assignment_submissions s where s.user_id=p.user_id and s.week_key=module_scope))
        limit 500
      ) q
    ),'[]'::jsonb),
    'recent_submissions',coalesce((
      select jsonb_agg(row_data order by submitted_at desc)
      from(
        select jsonb_build_object(
          'id',s.id,'week_key',s.week_key,
          'module_label',replace(initcap(replace(s.week_key,'-',' ')),'Module ','Module '),
          'attempt_no',s.attempt_no,'submitted_at',s.submitted_at,
          'learner_name',coalesce(p.full_name,'Learner'),'country',p.country,
          'score',coalesce(s.final_score,s.auto_score),'score_band',s.score_band,
          'assessment_status',s.assessment_status,
          'paragraph_excerpt',left(coalesce(s.paragraph_response,''),360),
          'canvas_link',s.canvas_link,'linkedin_link',s.linkedin_link
        ) row_data,s.submitted_at
        from public.canopy_assignment_submissions s
        left join public.canopy_profiles p on p.user_id=s.user_id
        where module_scope is null or s.week_key=module_scope
        order by s.submitted_at desc limit 120
      ) q
    ),'[]'::jsonb),
    'communications',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',a.id,'action_type',a.action_type,'subject',a.subject,'message',a.message,
        'status',a.status,'created_at',a.created_at,'learner_name',coalesce(p.full_name,'Learner')
      ) order by a.created_at desc)
      from public.canopy_manager_actions a
      left join public.canopy_profiles p on p.user_id=a.learner_id
      where a.action_type in ('warning','feedback','reminder')
        and (module_scope is null or exists(select 1 from public.canopy_assignment_submissions s where s.user_id=a.learner_id and s.week_key=module_scope))
    ),'[]'::jsonb),
    'complaints',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',a.id,'subject',a.subject,'message',a.message,'status',a.status,
        'created_at',a.created_at,'learner_name',coalesce(p.full_name,'Learner')
      ) order by a.created_at desc)
      from public.canopy_manager_actions a
      left join public.canopy_profiles p on p.user_id=a.learner_id
      where a.action_type='complaint'
        and (module_scope is null or exists(select 1 from public.canopy_assignment_submissions s where s.user_id=a.learner_id and s.week_key=module_scope))
    ),'[]'::jsonb),
    'spotlights',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',n.id,'submission_id',n.submission_id,'module_id',n.module_id,
        'category',n.category,'note',n.note,'status',n.status,'created_at',n.created_at,
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

revoke all on function public.canopy_admin_preview_staff_workspace(text,text) from public;
grant execute on function public.canopy_admin_preview_staff_workspace(text,text) to authenticated;

commit;
