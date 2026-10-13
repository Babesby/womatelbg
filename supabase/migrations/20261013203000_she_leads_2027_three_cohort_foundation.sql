-- WOMATE She Leads 2027 multi-cohort foundation
-- Phase 1: introduce cohort-aware programme architecture without changing Cohort 2 behaviour.
-- Cohort 2 remains on the existing legacy runtime until later migration phases.

set lock_timeout='8s';
set statement_timeout='90s';

begin;

create table if not exists public.canopy_programmes (
  programme_key text primary key,
  name text not null,
  description text null,
  default_access_model text not null check (default_access_model in ('free','paid')),
  audience text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.canopy_programme_cohorts (
  cohort_key text primary key,
  programme_key text not null references public.canopy_programmes(programme_key) on update cascade on delete restrict,
  display_name text not null,
  cohort_number integer null check (cohort_number is null or cohort_number > 0),
  cohort_year integer not null check (cohort_year between 2026 and 2100),
  region text not null default 'Global',
  access_model text not null check (access_model in ('free','paid')),
  status text not null default 'planning' check (status in ('planning','applications','selection','active','closing','completed','archived')),
  starts_at timestamptz null,
  ends_at timestamptz null,
  timezone text null,
  capacity integer null check (capacity is null or capacity > 0),
  competitive_entry boolean not null default true,
  installments_allowed boolean not null default false,
  application_fee numeric(12,2) null check (application_fee is null or application_fee >= 0),
  tuition_amount numeric(12,2) null check (tuition_amount is null or tuition_amount >= 0),
  tuition_currency text null,
  audience_criteria jsonb not null default '{}'::jsonb,
  delivery_rules jsonb not null default '{}'::jsonb,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint canopy_cohorts_dates_check check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint canopy_cohorts_free_fee_check check (
    access_model='paid'
    or (
      coalesce(application_fee,0)=0
      and coalesce(tuition_amount,0)=0
    )
  )
);

create table if not exists public.canopy_cohort_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cohort_key text not null references public.canopy_programme_cohorts(cohort_key) on update cascade on delete restrict,
  status text not null default 'pending' check (status in ('pending','active','paused','completed','withdrawn','inactive')),
  source text not null default 'admin' check (source in ('legacy_backfill','application','selection','admin','payment')),
  joined_at timestamptz not null default now(),
  completed_at timestamptz null,
  withdrawn_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,cohort_key)
);

create table if not exists public.canopy_cohort_payment_plans (
  id uuid primary key default gen_random_uuid(),
  cohort_key text not null references public.canopy_programme_cohorts(cohort_key) on update cascade on delete restrict,
  plan_key text not null,
  name text not null,
  currency text not null,
  total_amount numeric(12,2) not null check (total_amount > 0),
  installment_count integer not null default 1 check (installment_count between 1 and 24),
  schedule jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','active','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(cohort_key,plan_key)
);

create table if not exists public.canopy_cohort_staff_assignments (
  id uuid primary key default gen_random_uuid(),
  cohort_key text not null references public.canopy_programme_cohorts(cohort_key) on update cascade on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  staff_role text not null check (staff_role in ('programme_lead','programme_coordinator','programme_operations','speaker_manager','mentor_lead','language_support')),
  region_scope text null,
  status text not null default 'planned' check (status in ('planned','invited','active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(cohort_key,user_id,staff_role)
);

create index if not exists canopy_cohorts_programme_year_idx
  on public.canopy_programme_cohorts(programme_key,cohort_year,status);
create index if not exists canopy_cohort_memberships_user_idx
  on public.canopy_cohort_memberships(user_id,status,cohort_key);
create index if not exists canopy_cohort_memberships_cohort_idx
  on public.canopy_cohort_memberships(cohort_key,status,user_id);
create index if not exists canopy_cohort_payment_plans_cohort_idx
  on public.canopy_cohort_payment_plans(cohort_key,status);
create index if not exists canopy_cohort_staff_cohort_idx
  on public.canopy_cohort_staff_assignments(cohort_key,status,staff_role);

alter table public.canopy_programmes enable row level security;
alter table public.canopy_programme_cohorts enable row level security;
alter table public.canopy_cohort_memberships enable row level security;
alter table public.canopy_cohort_payment_plans enable row level security;
alter table public.canopy_cohort_staff_assignments enable row level security;

drop policy if exists "canopy programmes admin read" on public.canopy_programmes;
create policy "canopy programmes admin read"
on public.canopy_programmes for select
to authenticated
using (public.canopy_is_womate_admin(auth.uid()));

drop policy if exists "canopy cohorts admin read" on public.canopy_programme_cohorts;
create policy "canopy cohorts admin read"
on public.canopy_programme_cohorts for select
to authenticated
using (public.canopy_is_womate_admin(auth.uid()));

drop policy if exists "canopy cohort memberships own or admin read" on public.canopy_cohort_memberships;
create policy "canopy cohort memberships own or admin read"
on public.canopy_cohort_memberships for select
to authenticated
using (user_id=auth.uid() or public.canopy_is_womate_admin(auth.uid()));

drop policy if exists "canopy payment plans admin read" on public.canopy_cohort_payment_plans;
create policy "canopy payment plans admin read"
on public.canopy_cohort_payment_plans for select
to authenticated
using (public.canopy_is_womate_admin(auth.uid()));

drop policy if exists "canopy cohort staff own or admin read" on public.canopy_cohort_staff_assignments;
create policy "canopy cohort staff own or admin read"
on public.canopy_cohort_staff_assignments for select
to authenticated
using (user_id=auth.uid() or public.canopy_is_womate_admin(auth.uid()));

grant select on public.canopy_programmes to authenticated;
grant select on public.canopy_programme_cohorts to authenticated;
grant select on public.canopy_cohort_memberships to authenticated;
grant select on public.canopy_cohort_payment_plans to authenticated;
grant select on public.canopy_cohort_staff_assignments to authenticated;

insert into public.canopy_programmes(programme_key,name,description,default_access_model,audience)
values
  ('she-leads-climate','She Leads Climate Mentorship','WOMATE flagship climate mentorship programme.','free','Undergraduates, early-career and emerging women climate leaders.'),
  ('she-leads-asia','She Leads Asia','WOMATE regional She Leads programme delivered with Asian leadership, speakers and context.','free','Undergraduates, recent graduates and emerging women leaders across Asia.'),
  ('she-leads-advanced','She Leads Advanced','Premium advanced leadership and professional development programme for experienced participants.','paid','Experienced professionals, with postgraduate and senior professional profiles prioritised.')
on conflict(programme_key) do update set
  name=excluded.name,
  description=excluded.description,
  default_access_model=excluded.default_access_model,
  audience=excluded.audience,
  updated_at=now();

insert into public.canopy_programme_cohorts(
  cohort_key,programme_key,display_name,cohort_number,cohort_year,region,access_model,status,
  competitive_entry,installments_allowed,audience_criteria,delivery_rules,notes
)
values
  (
    'she-leads-climate-c2-2026','she-leads-climate','She Leads Climate Mentorship · Cohort 2 · 2026',2,2026,'Global','free','active',
    true,false,
    '{"career_stage":["undergraduate","recent_graduate","early_career","emerging_leader"]}'::jsonb,
    '{"legacy_runtime":true,"protect_existing_behaviour":true}'::jsonb,
    'Existing 2026 cohort. This foundation does not change its current runtime, deadlines, submissions, reviews or learner experience.'
  ),
  (
    'she-leads-climate-c3-2027','she-leads-climate','She Leads Climate Mentorship · Cohort 3 · 2027',3,2027,'Global','free','planning',
    true,false,
    '{"career_stage":["undergraduate","recent_graduate","early_career","emerging_leader"]}'::jsonb,
    '{"curriculum_track":"standard","pricing":"free","dates":"to_be_confirmed"}'::jsonb,
    '2027 flagship free cohort.'
  ),
  (
    'she-leads-asia-c1-2027','she-leads-asia','She Leads Asia · Cohort 1 · 2027',1,2027,'Asia','free','planning',
    true,false,
    '{"career_stage":["undergraduate","recent_graduate","early_career","emerging_leader"],"region":"Asia"}'::jsonb,
    '{"curriculum_track":"asia","pricing":"free","regional_speakers":true,"regional_coordinators":true,"regional_examples":true,"language_support":"evaluate_if_low_cost","womate_role":"coordination_and_quality_assurance","dates":"to_be_confirmed"}'::jsonb,
    'First Asia cohort. Asian speakers, coordinators and regional context should lead delivery while WOMATE coordinates standards and systems.'
  ),
  (
    'she-leads-advanced-c1-2027','she-leads-advanced','She Leads Advanced · Cohort 1 · 2027',1,2027,'Global','paid','planning',
    true,true,
    '{"career_stage":["experienced_professional","senior_professional"],"education_focus":["masters","phd"],"exclude_primary_audience":["undergraduate","recent_graduate"],"equivalent_senior_experience_may_be_considered":true}'::jsonb,
    '{"curriculum_track":"advanced","premium_speakers":true,"distinct_assignments":true,"direct_feedback":true,"professional_outputs":true,"installments":true,"pricing":"to_be_confirmed","dates":"to_be_confirmed"}'::jsonb,
    'Paid premium cohort. Admission remains competitive; payment does not guarantee completion or certification.'
  )
on conflict(cohort_key) do update set
  programme_key=excluded.programme_key,
  display_name=excluded.display_name,
  cohort_number=excluded.cohort_number,
  cohort_year=excluded.cohort_year,
  region=excluded.region,
  access_model=excluded.access_model,
  competitive_entry=excluded.competitive_entry,
  installments_allowed=excluded.installments_allowed,
  audience_criteria=excluded.audience_criteria,
  delivery_rules=excluded.delivery_rules,
  notes=excluded.notes,
  updated_at=now();

-- Backfill current Cohort 2 membership as a parallel cohort identity.
-- This is additive only: no legacy enrolment row is updated or deleted.
insert into public.canopy_cohort_memberships(user_id,cohort_key,status,source,joined_at,metadata)
select
  e.user_id,
  'she-leads-climate-c2-2026',
  case
    when e.status='active' then 'active'
    when e.status='pending' then 'pending'
    when e.status='paused' then 'paused'
    else 'inactive'
  end,
  'legacy_backfill',
  coalesce(e.created_at,now()),
  jsonb_build_object('legacy_enrollment_status',e.status)
from public.canopy_enrollments e
join public.canopy_profiles p on p.user_id=e.user_id and p.role='learner'
on conflict(user_id,cohort_key) do nothing;

create or replace function public.canopy_my_cohorts()
returns table(
  cohort_key text,
  display_name text,
  programme_key text,
  cohort_year integer,
  region text,
  access_model text,
  cohort_status text,
  membership_status text
)
language sql
stable
security definer
set search_path=public,auth
as $$
  select
    c.cohort_key,
    c.display_name,
    c.programme_key,
    c.cohort_year,
    c.region,
    c.access_model,
    c.status,
    m.status
  from public.canopy_cohort_memberships m
  join public.canopy_programme_cohorts c on c.cohort_key=m.cohort_key
  where m.user_id=auth.uid()
  order by c.cohort_year desc,c.display_name;
$$;

revoke all on function public.canopy_my_cohorts() from public;
grant execute on function public.canopy_my_cohorts() to authenticated;

create or replace function public.canopy_admin_2027_portfolio()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'Only WOMATE Admin can view the 2027 portfolio.';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'cohort_key',c.cohort_key,
        'display_name',c.display_name,
        'programme_key',c.programme_key,
        'year',c.cohort_year,
        'region',c.region,
        'access_model',c.access_model,
        'status',c.status,
        'competitive_entry',c.competitive_entry,
        'installments_allowed',c.installments_allowed,
        'capacity',c.capacity,
        'starts_at',c.starts_at,
        'ends_at',c.ends_at,
        'audience_criteria',c.audience_criteria,
        'delivery_rules',c.delivery_rules
      )
      order by c.display_name
    )
    from public.canopy_programme_cohorts c
    where c.cohort_year=2027
  ),'[]'::jsonb);
end;
$$;

revoke all on function public.canopy_admin_2027_portfolio() from public;
grant execute on function public.canopy_admin_2027_portfolio() to authenticated;

-- Safety assertions: the architecture must contain exactly the three intended 2027 cohorts.
do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.canopy_programme_cohorts
  where cohort_key in (
    'she-leads-climate-c3-2027',
    'she-leads-asia-c1-2027',
    'she-leads-advanced-c1-2027'
  );

  if v_count<>3 then
    raise exception 'Postflight failed: expected all three 2027 cohort definitions, found %.',v_count;
  end if;

  if exists(
    select 1
    from public.canopy_programme_cohorts
    where cohort_key in ('she-leads-climate-c3-2027','she-leads-asia-c1-2027')
      and access_model<>'free'
  ) then
    raise exception 'Postflight failed: Cohort 3 and Asia must remain free.';
  end if;

  if not exists(
    select 1 from public.canopy_programme_cohorts
    where cohort_key='she-leads-advanced-c1-2027'
      and access_model='paid'
      and installments_allowed=true
  ) then
    raise exception 'Postflight failed: Advanced must be paid with installment support.';
  end if;
end;
$$;

commit;

reset lock_timeout;
reset statement_timeout;
