-- WOMATE Canopy · deep learner UX support + admin-only learner withdrawal · 24 September 2026
-- Rerunnable and additive. Preserves learner records and existing Spotlight workflow.

-- Featured Spotlight feed: learner-facing read of items already featured by WOMATE.
create or replace function public.canopy_get_featured_spotlights(p_limit integer default 8)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  safe_limit integer := greatest(1,least(coalesce(p_limit,8),12));
  result jsonb;
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  select coalesce(jsonb_agg(item order by featured_at desc),'[]'::jsonb)
  into result
  from (
    select coalesce(n.decided_at,n.created_at) as featured_at,
      jsonb_build_object(
        'id',n.id,
        'module_id',n.module_id,
        'category',n.category,
        'note',n.note,
        'featured_at',coalesce(n.decided_at,n.created_at),
        'learner_name',coalesce(nullif(trim(p.full_name),''),'She Leads fellow'),
        'artifact_url',nullif(trim(s.canvas_link),'')
      ) as item
    from public.canopy_spotlight_nominations n
    join public.canopy_assignment_submissions s on s.id=n.submission_id
    left join public.canopy_profiles p on p.user_id=s.user_id
    where n.status='featured'
    order by coalesce(n.decided_at,n.created_at) desc
    limit safe_limit
  ) q;
  return result;
end;
$$;
revoke all on function public.canopy_get_featured_spotlights(integer) from public;
grant execute on function public.canopy_get_featured_spotlights(integer) to authenticated;

-- Withdrawal record is separate from enrolment so history is retained.
create table if not exists public.canopy_learner_withdrawals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  reason text,
  withdrawn_at timestamptz not null default now(),
  withdrawn_by uuid references auth.users(id),
  restored_at timestamptz,
  restored_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.canopy_learner_withdrawals enable row level security;
revoke all on table public.canopy_learner_withdrawals from anon, authenticated;

create or replace function public.canopy_get_own_withdrawal_status()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare r public.canopy_learner_withdrawals%rowtype;
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  select * into r from public.canopy_learner_withdrawals where user_id=auth.uid();
  if r.user_id is null then return jsonb_build_object('active',false); end if;
  return jsonb_build_object('active',r.active,'reason',r.reason,'withdrawn_at',r.withdrawn_at,'restored_at',r.restored_at);
end;
$$;
revoke all on function public.canopy_get_own_withdrawal_status() from public;
grant execute on function public.canopy_get_own_withdrawal_status() to authenticated;

-- WOMATE Admin and Programme Manager may see the status; only Admin can mutate it.
create or replace function public.canopy_admin_list_withdrawals()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare result jsonb; r text;
begin
  r:=public.canopy_staff_role(auth.uid());
  if auth.uid() is null or (not public.canopy_is_womate_admin(auth.uid()) and r<>'programme_manager') then
    raise exception 'This action is not available for your role.';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id',w.user_id,'active',w.active,'reason',w.reason,
    'withdrawn_at',w.withdrawn_at,'withdrawn_by',w.withdrawn_by,
    'restored_at',w.restored_at,'restored_by',w.restored_by
  ) order by w.withdrawn_at desc),'[]'::jsonb)
  into result
  from public.canopy_learner_withdrawals w
  where w.active=true;
  return result;
end;
$$;
revoke all on function public.canopy_admin_list_withdrawals() from public;
grant execute on function public.canopy_admin_list_withdrawals() to authenticated;

create or replace function public.canopy_admin_withdraw_learner(p_user_id uuid,p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'Only WOMATE Admin can withdraw a learner.';
  end if;
  if not exists(select 1 from public.canopy_profiles where user_id=p_user_id and role='learner') then
    raise exception 'Learner not found.';
  end if;
  insert into public.canopy_learner_withdrawals(user_id,active,reason,withdrawn_at,withdrawn_by,restored_at,restored_by,updated_at)
  values(p_user_id,true,nullif(trim(coalesce(p_reason,'')),''),now(),auth.uid(),null,null,now())
  on conflict(user_id) do update set
    active=true,reason=excluded.reason,withdrawn_at=now(),withdrawn_by=auth.uid(),restored_at=null,restored_by=null,updated_at=now();
  update public.canopy_enrollments set status='paused'
  where user_id=p_user_id and course_slug='she-leads' and status<>'paused';
  return jsonb_build_object('user_id',p_user_id,'active',true,'status','withdrawn');
end;
$$;
revoke all on function public.canopy_admin_withdraw_learner(uuid,text) from public;
grant execute on function public.canopy_admin_withdraw_learner(uuid,text) to authenticated;

create or replace function public.canopy_admin_restore_learner(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'Only WOMATE Admin can restore a withdrawn learner.';
  end if;
  update public.canopy_learner_withdrawals
  set active=false,restored_at=now(),restored_by=auth.uid(),updated_at=now()
  where user_id=p_user_id;
  return jsonb_build_object('user_id',p_user_id,'active',false,'status','restored');
end;
$$;
revoke all on function public.canopy_admin_restore_learner(uuid) from public;
grant execute on function public.canopy_admin_restore_learner(uuid) to authenticated;

-- Single access path for WOMATE Admin / Programme Manager.
-- A withdrawn learner cannot be reactivated until WOMATE Admin restores eligibility.
create or replace function public.canopy_programme_manager_set_learner_access(p_user_id uuid,p_status text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare r text; cid uuid; eid uuid;
begin
  r:=public.canopy_staff_role(auth.uid());
  if auth.uid() is null or (not public.canopy_is_womate_admin(auth.uid()) and r<>'programme_manager') then
    raise exception 'This action is not available for your role.';
  end if;
  if p_status not in ('active','paused') then raise exception 'Choose active or paused.'; end if;
  if not exists(select 1 from public.canopy_profiles where user_id=p_user_id and role='learner') then raise exception 'Learner not found.'; end if;
  if p_status='active' and exists(select 1 from public.canopy_learner_withdrawals where user_id=p_user_id and active=true) then
    raise exception 'This learner was withdrawn by WOMATE Admin. Admin must restore eligibility before access can be activated.';
  end if;
  select id into eid from public.canopy_enrollments where user_id=p_user_id and course_slug='she-leads' order by created_at desc limit 1;
  if eid is null then
    select id into cid from public.canopy_cohorts where course_slug='she-leads' and name='Cohort 2 · 2026' order by created_at desc limit 1;
    if cid is null then raise exception 'She Leads Cohort 2 is unavailable.'; end if;
    insert into public.canopy_enrollments(user_id,cohort_id,course_slug,status) values(p_user_id,cid,'she-leads',p_status);
  else
    update public.canopy_enrollments set status=p_status where id=eid;
  end if;
  return jsonb_build_object('user_id',p_user_id,'status',p_status);
end;
$$;
revoke all on function public.canopy_programme_manager_set_learner_access(uuid,text) from public;
grant execute on function public.canopy_programme_manager_set_learner_access(uuid,text) to authenticated;
