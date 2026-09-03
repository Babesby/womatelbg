-- WOMATE CANOPY · Supabase schema
-- Run once in Supabase SQL Editor. Review in a staging project before production.

create extension if not exists pgcrypto;

create table if not exists public.canopy_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  country text,
  role text not null default 'learner' check (role in ('learner','volunteer','manager','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.canopy_courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  level text default 'Foundational',
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.canopy_cohorts (
  id uuid primary key default gen_random_uuid(),
  course_slug text not null,
  name text not null,
  starts_on date,
  ends_on date,
  status text not null default 'draft' check (status in ('draft','open','active','complete','archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.canopy_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cohort_id uuid references public.canopy_cohorts(id) on delete cascade,
  course_slug text not null default 'she-leads',
  status text not null default 'pending' check (status in ('pending','active','paused','completed','withdrawn')),
  created_at timestamptz not null default now(),
  unique(user_id,course_slug)
);

create table if not exists public.canopy_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null,
  lesson_id text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id,lesson_id)
);

create table if not exists public.canopy_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null,
  score integer not null,
  total integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.canopy_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null,
  title text not null,
  response text not null,
  status text not null default 'submitted' check (status in ('draft','submitted','reviewed','revision_requested','accepted')),
  feedback text,
  reviewer_id uuid references auth.users(id),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.canopy_announcements (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references public.canopy_cohorts(id) on delete cascade,
  title text not null,
  body text not null,
  published boolean not null default false,
  published_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- Create a profile automatically from auth metadata.
create or replace function public.handle_canopy_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.canopy_profiles(user_id,full_name,country)
  values(new.id,new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'country')
  on conflict(user_id) do nothing;
  return new;
end;$$;

drop trigger if exists on_canopy_auth_user_created on auth.users;
create trigger on_canopy_auth_user_created after insert on auth.users for each row execute function public.handle_canopy_new_user();

alter table public.canopy_profiles enable row level security;
alter table public.canopy_courses enable row level security;
alter table public.canopy_cohorts enable row level security;
alter table public.canopy_enrollments enable row level security;
alter table public.canopy_lesson_progress enable row level security;
alter table public.canopy_quiz_attempts enable row level security;
alter table public.canopy_submissions enable row level security;
alter table public.canopy_announcements enable row level security;

create or replace function public.canopy_staff()
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.canopy_profiles p where p.user_id=auth.uid() and p.role in ('manager','admin'));
$$;

-- Profiles: learners see themselves; staff see all.
drop policy if exists "canopy profiles read" on public.canopy_profiles;
create policy "canopy profiles read" on public.canopy_profiles for select to authenticated using (user_id=auth.uid() or public.canopy_staff());

drop policy if exists "canopy profiles self update" on public.canopy_profiles;
create policy "canopy profiles self update" on public.canopy_profiles for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

-- Public course metadata may be read by authenticated users.
drop policy if exists "canopy courses read" on public.canopy_courses;
create policy "canopy courses read" on public.canopy_courses for select to authenticated using (published=true or public.canopy_staff());
drop policy if exists "canopy cohorts read" on public.canopy_cohorts;
create policy "canopy cohorts read" on public.canopy_cohorts for select to authenticated using (status<>'draft' or public.canopy_staff());

-- Enrolments: learner reads own; staff read/write all.
drop policy if exists "canopy enrolments read" on public.canopy_enrollments;
create policy "canopy enrolments read" on public.canopy_enrollments for select to authenticated using (user_id=auth.uid() or public.canopy_staff());
drop policy if exists "canopy enrolments staff insert" on public.canopy_enrollments;
create policy "canopy enrolments staff insert" on public.canopy_enrollments for insert to authenticated with check (public.canopy_staff());
drop policy if exists "canopy enrolments staff update" on public.canopy_enrollments;
create policy "canopy enrolments staff update" on public.canopy_enrollments for update to authenticated using (public.canopy_staff()) with check (public.canopy_staff());

-- Learning records.
drop policy if exists "canopy progress read" on public.canopy_lesson_progress;
create policy "canopy progress read" on public.canopy_lesson_progress for select to authenticated using (user_id=auth.uid() or public.canopy_staff());
drop policy if exists "canopy progress write" on public.canopy_lesson_progress;
create policy "canopy progress write" on public.canopy_lesson_progress for insert to authenticated with check (user_id=auth.uid());
drop policy if exists "canopy progress update" on public.canopy_lesson_progress;
create policy "canopy progress update" on public.canopy_lesson_progress for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

drop policy if exists "canopy quiz read" on public.canopy_quiz_attempts;
create policy "canopy quiz read" on public.canopy_quiz_attempts for select to authenticated using (user_id=auth.uid() or public.canopy_staff());
drop policy if exists "canopy quiz insert" on public.canopy_quiz_attempts;
create policy "canopy quiz insert" on public.canopy_quiz_attempts for insert to authenticated with check (user_id=auth.uid());

drop policy if exists "canopy submissions read" on public.canopy_submissions;
create policy "canopy submissions read" on public.canopy_submissions for select to authenticated using (user_id=auth.uid() or public.canopy_staff());
drop policy if exists "canopy submissions insert" on public.canopy_submissions;
create policy "canopy submissions insert" on public.canopy_submissions for insert to authenticated with check (user_id=auth.uid());
drop policy if exists "canopy submissions staff update" on public.canopy_submissions;
create policy "canopy submissions staff update" on public.canopy_submissions for update to authenticated using (public.canopy_staff()) with check (public.canopy_staff());

drop policy if exists "canopy announcements read" on public.canopy_announcements;
create policy "canopy announcements read" on public.canopy_announcements for select to authenticated using (published=true or public.canopy_staff());
drop policy if exists "canopy announcements staff" on public.canopy_announcements;
create policy "canopy announcements staff" on public.canopy_announcements for all to authenticated using (public.canopy_staff()) with check (public.canopy_staff());

-- Seed the first programme shell. Curriculum content lives in src/canopy/canopyData.js in v1.
insert into public.canopy_courses(slug,title,description,level,published)
values('she-leads','She Leads Climate Mentorship','WOMATE flagship foundational climate leadership programme.','Foundational',true)
on conflict(slug) do update set title=excluded.title,description=excluded.description,level=excluded.level,published=excluded.published;

insert into public.canopy_cohorts(course_slug,name,starts_on,ends_on,status)
select 'she-leads','Cohort 3 · 2027','2027-01-18','2027-03-14','draft'
where not exists(select 1 from public.canopy_cohorts where name='Cohort 3 · 2027');
