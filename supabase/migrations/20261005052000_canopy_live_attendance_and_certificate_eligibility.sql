-- WOMATE Canopy - live attendance + certificate eligibility
-- 2026-10-05
begin;

create table if not exists public.canopy_live_attendance (
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null check (module_id in ('module-01','module-02','module-03','module-04','module-05')),
  attended boolean not null default true,
  marked_by uuid references auth.users(id) on delete set null,
  marked_at timestamptz not null default now(),
  primary key (user_id,module_id)
);

alter table public.canopy_live_attendance enable row level security;
revoke all on table public.canopy_live_attendance from anon;
revoke all on table public.canopy_live_attendance from authenticated;

create or replace function public.canopy_attendance_can_manage()
returns boolean
language sql
stable
security definer
set search_path=public,auth
as $$
  select auth.uid() is not null and (
    public.canopy_is_womate_admin(auth.uid())
    or coalesce(public.canopy_staff_role(auth.uid()),'') in ('programme_manager','programme_operations')
  );
$$;
revoke all on function public.canopy_attendance_can_manage() from public;
grant execute on function public.canopy_attendance_can_manage() to authenticated;

create or replace function public.canopy_attendance_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
begin
  if not public.canopy_attendance_can_manage() then
    raise exception 'Attendance access is limited to WOMATE Admin, Programme Manager and Deputy Programme Manager.';
  end if;
  return jsonb_build_object(
    'learners',coalesce((
      select jsonb_agg(jsonb_build_object('user_id',p.user_id,'full_name',coalesce(p.full_name,'Learner'),'country',p.country) order by p.full_name)
      from public.canopy_profiles p where p.role='learner'
    ),'[]'::jsonb),
    'attendance',coalesce((
      select jsonb_agg(jsonb_build_object('user_id',a.user_id,'module_id',a.module_id,'attended',a.attended,'marked_at',a.marked_at))
      from public.canopy_live_attendance a
      join public.canopy_profiles p on p.user_id=a.user_id and p.role='learner'
    ),'[]'::jsonb)
  );
end;
$$;
revoke all on function public.canopy_attendance_dashboard() from public;
grant execute on function public.canopy_attendance_dashboard() to authenticated;

create or replace function public.canopy_set_live_attendance(p_user_id uuid,p_module_id text,p_attended boolean)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if not public.canopy_attendance_can_manage() then
    raise exception 'Attendance updates are limited to WOMATE Admin, Programme Manager and Deputy Programme Manager.';
  end if;
  if p_module_id not in ('module-01','module-02','module-03','module-04','module-05') then
    raise exception 'Choose a valid module.';
  end if;
  if not exists(select 1 from public.canopy_profiles where user_id=p_user_id and role='learner') then
    raise exception 'Learner not found.';
  end if;
  insert into public.canopy_live_attendance(user_id,module_id,attended,marked_by,marked_at)
  values(p_user_id,p_module_id,coalesce(p_attended,false),auth.uid(),now())
  on conflict(user_id,module_id) do update
    set attended=excluded.attended,marked_by=excluded.marked_by,marked_at=excluded.marked_at;
  return jsonb_build_object('ok',true,'user_id',p_user_id,'module_id',p_module_id,'attended',coalesce(p_attended,false));
end;
$$;
revoke all on function public.canopy_set_live_attendance(uuid,text,boolean) from public;
grant execute on function public.canopy_set_live_attendance(uuid,text,boolean) to authenticated;

create or replace function public.canopy_certificate_eligibility(p_user_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  target uuid := coalesce(p_user_id,auth.uid());
  can_manage boolean := false;
  lesson_done integer := 0;
  assignments_submitted integer := 0;
  attendance_count integer := 0;
  climate_note boolean := false;
begin
  if auth.uid() is null then raise exception 'Sign in to continue.'; end if;
  can_manage := public.canopy_attendance_can_manage();
  if target is distinct from auth.uid() and not can_manage then
    raise exception 'You can only view your own completion status.';
  end if;
  if not exists(select 1 from public.canopy_profiles where user_id=target and role in ('learner','tester')) then
    raise exception 'Learner not found.';
  end if;
  select count(distinct lesson_id)::int into lesson_done from public.canopy_lesson_progress where user_id=target and completed=true;
  select count(distinct week_key)::int into assignments_submitted from public.canopy_assignment_submissions where user_id=target and week_key in ('module-01','module-02','module-03','module-04','module-05');
  select exists(select 1 from public.canopy_assignment_submissions where user_id=target and week_key='module-05') into climate_note;
  select count(*)::int into attendance_count from public.canopy_live_attendance where user_id=target and attended=true;
  return jsonb_build_object(
    'user_id',target,
    'lesson_done',coalesce(lesson_done,0),'total_lessons',20,
    'assignments_submitted',coalesce(assignments_submitted,0),'total_assignments',5,
    'climate_action_note',coalesce(climate_note,false),
    'attendance_count',coalesce(attendance_count,0),'total_attendance',5
  );
end;
$$;
revoke all on function public.canopy_certificate_eligibility(uuid) from public;
grant execute on function public.canopy_certificate_eligibility(uuid) to authenticated;

commit;
