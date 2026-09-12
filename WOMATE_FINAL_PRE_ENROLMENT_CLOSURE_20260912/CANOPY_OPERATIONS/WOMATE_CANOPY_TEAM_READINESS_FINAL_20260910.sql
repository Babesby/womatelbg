-- WOMATE CANOPY · TEAM READINESS FINAL · 10 SEP 2026
-- Canonical consolidated team-readiness SQL. Rerunnable and replaces prior team-readiness hotfix SQL.
begin;

create or replace function public.canopy_staff_workspace_data() returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare staff_role text; module_scope text;
begin
 if auth.uid() is null then raise exception 'Sign in to continue.'; end if;
 select m.role,m.module_id into staff_role,module_scope from public.canopy_staff_memberships m where m.user_id=auth.uid() and m.status='active';
 if not found then raise exception 'Your Canopy team access is not active.'; end if;
 return jsonb_build_object(
  'role',staff_role,'module_id',module_scope,
  'counts',jsonb_build_object(
   'learners',(select count(*) from public.canopy_profiles where role='learner'),
   'active_access',(select count(*) from public.canopy_enrollments where course_slug='she-leads' and status='active'),
   'submissions',(select count(*) from public.canopy_assignment_submissions s where module_scope is null or s.week_key=module_scope),
   'needs_attention',(select count(*) from public.canopy_assignment_submissions s where (module_scope is null or s.week_key=module_scope) and s.assessment_status='needs_manual_review'),
   'revision_required',(select count(*) from public.canopy_assignment_submissions s where (module_scope is null or s.week_key=module_scope) and s.assessment_status='revision_required'),
   'completed',(select count(*) from public.canopy_assignment_submissions s where (module_scope is null or s.week_key=module_scope) and s.assessment_status='completed'),
   'open_complaints',(select count(*) from public.canopy_manager_actions where action_type='complaint' and status='open'),
   'certificates',(select count(*) from public.canopy_certificates)
  ),
  'learners',coalesce((select jsonb_agg(jsonb_build_object('user_id',p.user_id,'full_name',coalesce(p.full_name,'Learner'),'country',p.country,'enrollment_status',coalesce((select e.status from public.canopy_enrollments e where e.user_id=p.user_id and e.course_slug='she-leads' order by e.created_at desc limit 1),'waiting'),'submission_count',(select count(*) from public.canopy_assignment_submissions s where s.user_id=p.user_id and (module_scope is null or s.week_key=module_scope))) order by p.full_name) from public.canopy_profiles p where p.role='learner'),'[]'::jsonb),
  'recent_submissions',coalesce((select jsonb_agg(x order by x->>'submitted_at' desc) from(select jsonb_build_object('id',s.id,'learner_id',s.user_id,'week_key',s.week_key,'module_label',replace(initcap(replace(s.week_key,'-',' ')),'Module ','Module '),'submitted_at',s.submitted_at,'learner_name',coalesce(p.full_name,'Learner'),'score',coalesce(s.final_score,s.auto_score),'score_band',s.score_band,'assessment_status',s.assessment_status,'paragraph_response',coalesce(s.paragraph_response,''),'paragraph_excerpt',left(coalesce(s.paragraph_response,''),360),'final_feedback',s.final_feedback,'canvas_link',s.canvas_link,'linkedin_link',s.linkedin_link) x from public.canopy_assignment_submissions s left join public.canopy_profiles p on p.user_id=s.user_id where module_scope is null or s.week_key=module_scope order by s.submitted_at desc limit 150) q),'[]'::jsonb),
  'communications',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'action_type',a.action_type,'subject',a.subject,'message',a.message,'status',a.status,'created_at',a.created_at,'learner_name',coalesce(p.full_name,'Learner')) order by a.created_at desc) from public.canopy_manager_actions a left join public.canopy_profiles p on p.user_id=a.learner_id where a.action_type in ('warning','feedback','reminder')),'[]'::jsonb),
  'complaints',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'subject',a.subject,'message',a.message,'status',a.status,'response_message',a.response_message,'created_at',a.created_at,'learner_name',coalesce(p.full_name,'Learner')) order by a.created_at desc) from public.canopy_manager_actions a left join public.canopy_profiles p on p.user_id=a.learner_id where a.action_type='complaint'),'[]'::jsonb),
  'certificates',case when staff_role='programme_manager' then coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'drive_url',c.drive_url,'issued_at',c.issued_at,'learner_name',coalesce(p.full_name,'Learner')) order by c.issued_at desc) from public.canopy_certificates c left join public.canopy_profiles p on p.user_id=c.user_id),'[]'::jsonb) else '[]'::jsonb end,
  'team_members',case when staff_role='programme_manager' then coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'role',m.role,'module_id',m.module_id,'status',m.status,'full_name',p.full_name) order by m.role,m.module_id,p.full_name) from public.canopy_staff_memberships m left join public.canopy_profiles p on p.user_id=m.user_id),'[]'::jsonb) else '[]'::jsonb end,
  'spotlights',coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'submission_id',n.submission_id,'module_id',n.module_id,'category',n.category,'note',n.note,'status',n.status,'learner_name',coalesce(p.full_name,'Learner')) order by n.created_at desc) from public.canopy_spotlight_nominations n join public.canopy_assignment_submissions s on s.id=n.submission_id left join public.canopy_profiles p on p.user_id=s.user_id where module_scope is null or n.module_id=module_scope),'[]'::jsonb)
 );
end;$$;
revoke all on function public.canopy_staff_workspace_data() from public; grant execute on function public.canopy_staff_workspace_data() to authenticated;

-- Preview gets the same data shape without changing the Admin account.
create or replace function public.canopy_admin_preview_staff_workspace(p_role text,p_module_id text default null) returns jsonb language plpgsql volatile security definer set search_path=public,auth as $$
declare module_scope text; payload jsonb;
begin
 if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then raise exception 'Admin access required.'; end if;
 if p_role not in ('programme_manager','programme_operations','module_coordinator','learning_fellow') then raise exception 'Choose a valid team role.'; end if;
 if p_role in ('module_coordinator','learning_fellow') then if p_module_id is null or p_module_id not in ('module-01','module-02','module-03','module-04','module-05') then raise exception 'Choose a module.'; end if; module_scope:=p_module_id; else module_scope:=null; end if;
 insert into public.canopy_team_audit_log(actor_user_id,action,detail) values(auth.uid(),'admin_full_workspace_preview',jsonb_build_object('preview_role',p_role,'module_id',module_scope));
 -- Build the preview directly, matching staff workspace fields.
 return jsonb_build_object(
  'role',p_role,'module_id',module_scope,'preview',true,
  'counts',jsonb_build_object('learners',(select count(*) from public.canopy_profiles where role='learner'),'active_access',(select count(*) from public.canopy_enrollments where course_slug='she-leads' and status='active'),'submissions',(select count(*) from public.canopy_assignment_submissions s where module_scope is null or s.week_key=module_scope),'needs_attention',(select count(*) from public.canopy_assignment_submissions s where (module_scope is null or s.week_key=module_scope) and s.assessment_status='needs_manual_review'),'revision_required',(select count(*) from public.canopy_assignment_submissions s where (module_scope is null or s.week_key=module_scope) and s.assessment_status='revision_required'),'completed',(select count(*) from public.canopy_assignment_submissions s where (module_scope is null or s.week_key=module_scope) and s.assessment_status='completed'),'open_complaints',(select count(*) from public.canopy_manager_actions where action_type='complaint' and status='open'),'certificates',(select count(*) from public.canopy_certificates)),
  'learners',coalesce((select jsonb_agg(jsonb_build_object('user_id',p.user_id,'full_name',coalesce(p.full_name,'Learner'),'country',p.country,'enrollment_status',coalesce((select e.status from public.canopy_enrollments e where e.user_id=p.user_id and e.course_slug='she-leads' order by e.created_at desc limit 1),'waiting'),'submission_count',(select count(*) from public.canopy_assignment_submissions s where s.user_id=p.user_id and (module_scope is null or s.week_key=module_scope))) order by p.full_name) from public.canopy_profiles p where p.role='learner'),'[]'::jsonb),
  'recent_submissions',coalesce((select jsonb_agg(x order by x->>'submitted_at' desc) from(select jsonb_build_object('id',s.id,'learner_id',s.user_id,'week_key',s.week_key,'module_label',replace(initcap(replace(s.week_key,'-',' ')),'Module ','Module '),'submitted_at',s.submitted_at,'learner_name',coalesce(p.full_name,'Learner'),'score',coalesce(s.final_score,s.auto_score),'score_band',s.score_band,'assessment_status',s.assessment_status,'paragraph_response',coalesce(s.paragraph_response,''),'paragraph_excerpt',left(coalesce(s.paragraph_response,''),360),'final_feedback',s.final_feedback,'canvas_link',s.canvas_link,'linkedin_link',s.linkedin_link) x from public.canopy_assignment_submissions s left join public.canopy_profiles p on p.user_id=s.user_id where module_scope is null or s.week_key=module_scope order by s.submitted_at desc limit 150) q),'[]'::jsonb),
  'communications',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'action_type',a.action_type,'subject',a.subject,'message',a.message,'status',a.status,'learner_name',coalesce(p.full_name,'Learner')) order by a.created_at desc) from public.canopy_manager_actions a left join public.canopy_profiles p on p.user_id=a.learner_id where a.action_type in ('warning','feedback','reminder')),'[]'::jsonb),
  'complaints',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'subject',a.subject,'message',a.message,'status',a.status,'response_message',a.response_message,'learner_name',coalesce(p.full_name,'Learner')) order by a.created_at desc) from public.canopy_manager_actions a left join public.canopy_profiles p on p.user_id=a.learner_id where a.action_type='complaint'),'[]'::jsonb),
  'certificates',case when p_role='programme_manager' then coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'drive_url',c.drive_url,'issued_at',c.issued_at,'learner_name',coalesce(p.full_name,'Learner')) order by c.issued_at desc) from public.canopy_certificates c left join public.canopy_profiles p on p.user_id=c.user_id),'[]'::jsonb) else '[]'::jsonb end,
  'team_members',case when p_role='programme_manager' then coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'role',m.role,'module_id',m.module_id,'status',m.status,'full_name',p.full_name) order by m.role,m.module_id,p.full_name) from public.canopy_staff_memberships m left join public.canopy_profiles p on p.user_id=m.user_id),'[]'::jsonb) else '[]'::jsonb end,
  'spotlights',coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'submission_id',n.submission_id,'module_id',n.module_id,'category',n.category,'note',n.note,'status',n.status,'learner_name',coalesce(p.full_name,'Learner')) order by n.created_at desc) from public.canopy_spotlight_nominations n join public.canopy_assignment_submissions s on s.id=n.submission_id left join public.canopy_profiles p on p.user_id=s.user_id where module_scope is null or n.module_id=module_scope),'[]'::jsonb)
 );
end;$$;
revoke all on function public.canopy_admin_preview_staff_workspace(text,text) from public; grant execute on function public.canopy_admin_preview_staff_workspace(text,text) to authenticated;

create or replace function public.canopy_programme_manager_set_learner_access(p_user_id uuid,p_status text) returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare r text; cid uuid; eid uuid;
begin
 r:=public.canopy_staff_role(auth.uid()); if auth.uid() is null or (not public.canopy_is_womate_admin(auth.uid()) and r<>'programme_manager') then raise exception 'This action is not available for your role.'; end if;
 if p_status not in ('active','paused') then raise exception 'Choose active or paused.'; end if;
 if not exists(select 1 from public.canopy_profiles where user_id=p_user_id and role='learner') then raise exception 'Learner not found.'; end if;
 select id into eid from public.canopy_enrollments where user_id=p_user_id and course_slug='she-leads' order by created_at desc limit 1;
 if eid is null then select id into cid from public.canopy_cohorts where course_slug='she-leads' and name='Cohort 2 · 2026' order by created_at desc limit 1; if cid is null then raise exception 'She Leads Cohort 2 is unavailable.'; end if; insert into public.canopy_enrollments(user_id,cohort_id,course_slug,status) values(p_user_id,cid,'she-leads',p_status); else update public.canopy_enrollments set status=p_status where id=eid; end if;
 return jsonb_build_object('user_id',p_user_id,'status',p_status);
end;$$;
revoke all on function public.canopy_programme_manager_set_learner_access(uuid,text) from public; grant execute on function public.canopy_programme_manager_set_learner_access(uuid,text) to authenticated;

create or replace function public.canopy_staff_send_communication(p_learner_id uuid,p_type text,p_subject text,p_message text) returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare r text; mid text; rid uuid;
begin
 select role,module_id into r,mid from public.canopy_staff_memberships where user_id=auth.uid() and status='active';
 if r='programme_manager' then if p_type not in ('warning','feedback','reminder') then raise exception 'Choose a valid message type.'; end if; elsif r in ('programme_operations','module_coordinator') then if p_type not in ('feedback','reminder') then raise exception 'Choose feedback or reminder.'; end if; else raise exception 'This action is not available for your role.'; end if;
 if trim(coalesce(p_subject,''))='' or trim(coalesce(p_message,''))='' then raise exception 'Add a subject and message.'; end if;
 if not exists(select 1 from public.canopy_profiles where user_id=p_learner_id and role='learner') then raise exception 'Learner not found.'; end if;
 insert into public.canopy_manager_actions(learner_id,action_type,subject,message,status,created_by) values(p_learner_id,p_type,trim(p_subject),trim(p_message),'open',auth.uid()) returning id into rid;
 return jsonb_build_object('id',rid,'status','sent');
end;$$;
revoke all on function public.canopy_staff_send_communication(uuid,text,text,text) from public; grant execute on function public.canopy_staff_send_communication(uuid,text,text,text) to authenticated;

create or replace function public.canopy_staff_resolve_complaint(p_complaint_id uuid,p_response text,p_status text default 'resolved') returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare r text; uid uuid;
begin
 r:=public.canopy_staff_role(auth.uid()); if auth.uid() is null or (not public.canopy_is_womate_admin(auth.uid()) and r not in ('programme_manager','programme_operations')) then raise exception 'This action is not available for your role.'; end if;
 if p_status not in ('resolved','closed') then raise exception 'Choose a valid status.'; end if; if trim(coalesce(p_response,''))='' then raise exception 'Add a response.'; end if;
 update public.canopy_manager_actions set response_message=trim(p_response),responded_by=auth.uid(),responded_at=now(),status=p_status,resolved_at=now() where id=p_complaint_id and action_type='complaint' returning learner_id into uid;
 if uid is null then raise exception 'Complaint not found.'; end if;
 return jsonb_build_object('id',p_complaint_id,'status',p_status);
end;$$;
revoke all on function public.canopy_staff_resolve_complaint(uuid,text,text) from public; grant execute on function public.canopy_staff_resolve_complaint(uuid,text,text) to authenticated;


-- ---------------------------------------------------------------------------
-- AUTH USER DELETION SAFETY
-- Preserve Canopy operational history without blocking deletion of Auth users.
-- Historical actor references become NULL when the corresponding auth user is deleted.
-- ---------------------------------------------------------------------------

alter table public.canopy_team_access_codes
  drop constraint if exists canopy_team_access_codes_created_by_fkey;

alter table public.canopy_team_access_codes
  alter column created_by drop not null;

alter table public.canopy_team_access_codes
  add constraint canopy_team_access_codes_created_by_fkey
  foreign key (created_by)
  references auth.users(id)
  on delete set null;

alter table public.canopy_spotlight_nominations
  drop constraint if exists canopy_spotlight_nominations_nominated_by_fkey;

alter table public.canopy_spotlight_nominations
  alter column nominated_by drop not null;

alter table public.canopy_spotlight_nominations
  add constraint canopy_spotlight_nominations_nominated_by_fkey
  foreign key (nominated_by)
  references auth.users(id)
  on delete set null;

alter table public.canopy_staff_memberships
  drop constraint if exists canopy_staff_memberships_user_id_fkey;

alter table public.canopy_staff_memberships
  add constraint canopy_staff_memberships_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete cascade;

alter table public.canopy_team_audit_log
  drop constraint if exists canopy_team_audit_log_actor_user_id_fkey;

alter table public.canopy_team_audit_log
  add constraint canopy_team_audit_log_actor_user_id_fkey
  foreign key (actor_user_id)
  references auth.users(id)
  on delete set null;

alter table public.canopy_team_audit_log
  drop constraint if exists canopy_team_audit_log_target_user_id_fkey;

alter table public.canopy_team_audit_log
  add constraint canopy_team_audit_log_target_user_id_fkey
  foreign key (target_user_id)
  references auth.users(id)
  on delete set null;

create or replace function public.canopy_auth_user_delete_blockers()
returns table(
  table_schema text,
  table_name text,
  column_name text,
  constraint_name text,
  delete_rule text
)
language sql
stable
security definer
set search_path=public,information_schema
as $$
  select
    tc.table_schema::text,
    tc.table_name::text,
    kcu.column_name::text,
    tc.constraint_name::text,
    rc.delete_rule::text
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name=kcu.constraint_name
   and tc.table_schema=kcu.table_schema
  join information_schema.referential_constraints rc
    on tc.constraint_name=rc.constraint_name
   and tc.constraint_schema=rc.constraint_schema
  join information_schema.constraint_column_usage ccu
    on rc.unique_constraint_name=ccu.constraint_name
   and rc.unique_constraint_schema=ccu.constraint_schema
  where tc.constraint_type='FOREIGN KEY'
    and ccu.table_schema='auth'
    and ccu.table_name='users'
    and rc.delete_rule not in ('CASCADE','SET NULL')
  order by tc.table_schema,tc.table_name,kcu.column_name;
$$;

revoke all on function public.canopy_auth_user_delete_blockers() from public;
grant execute on function public.canopy_auth_user_delete_blockers() to authenticated;


-- ---------------------------------------------------------------------------
-- TEAM ACCESS ACTIVATION · SAFE RETRY / ALREADY-ACTIVATED ACCOUNT
-- Keeps Team Access Codes single-use while allowing the SAME authenticated
-- user to revisit Canopy after that code has already activated their account.
-- ---------------------------------------------------------------------------

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
  existing_role text;
  existing_module text;
  existing_status text;
begin
  if auth.uid() is null then
    raise exception 'Sign in to continue.';
  end if;

  if email_value='p.viewmultimedia@gmail.com' then
    raise exception 'This account is reserved for testing.';
  end if;

  if normalized='' then
    raise exception 'Enter your WOMATE Team Access Code.';
  end if;

  select * into c
  from public.canopy_team_access_codes
  where code_hash=md5(normalized)
  for update;

  if not found then
    raise exception 'This Team Access Code is invalid.';
  end if;

  -- Safe browser/session retry:
  -- if this exact code already activated this exact user and membership
  -- is still active, return that membership instead of failing.
  select m.role,m.module_id,m.status
  into existing_role,existing_module,existing_status
  from public.canopy_staff_memberships m
  where m.user_id=auth.uid()
    and m.activated_by_code=c.id
  limit 1;

  if found and existing_status='active' then
    return jsonb_build_object(
      'user_id',auth.uid(),
      'role',existing_role,
      'module_id',existing_module,
      'status','active',
      'already_activated',true
    );
  end if;

  if c.status='revoked' then
    raise exception 'This Team Access Code was revoked.';
  end if;

  if c.expires_at<=now() then
    update public.canopy_team_access_codes
    set status='expired'
    where id=c.id;

    raise exception 'This Team Access Code has expired. Ask WOMATE for a fresh code.';
  end if;

  if c.status<>'active' or c.used_count>=c.max_uses then
    raise exception 'This Team Access Code has already been used.';
  end if;

  insert into public.canopy_staff_memberships(
    user_id,
    role,
    module_id,
    status,
    activated_by_code,
    created_at,
    updated_at
  )
  values(
    auth.uid(),
    c.role,
    c.module_id,
    'active',
    c.id,
    now(),
    now()
  )
  on conflict(user_id) do update
  set role=excluded.role,
      module_id=excluded.module_id,
      status='active',
      activated_by_code=excluded.activated_by_code,
      updated_at=now();

  update public.canopy_team_access_codes
  set used_count=used_count+1,
      last_used_at=now(),
      status=case
        when used_count+1>=max_uses then 'used'
        else 'active'
      end
  where id=c.id;

  insert into public.canopy_team_audit_log(
    actor_user_id,
    action,
    target_user_id,
    detail
  )
  values(
    auth.uid(),
    'team_access_activated',
    auth.uid(),
    jsonb_build_object(
      'code_id',c.id,
      'role',c.role,
      'module_id',c.module_id
    )
  );

  return jsonb_build_object(
    'user_id',auth.uid(),
    'role',c.role,
    'module_id',c.module_id,
    'status','active'
  );
end;
$$;

revoke all on function public.canopy_activate_team_access(text) from public;
grant execute on function public.canopy_activate_team_access(text) to authenticated;

commit;
