-- WOMATE CANOPY · PROGRESSIVE ASSIGNMENT DRAFTS
-- 21 September 2026
-- Additive. Does not alter final submissions, grading, attempts or tester mode.

create table if not exists public.canopy_assignment_drafts (
  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  week_key text not null
    check (
      week_key in (
        'module-01',
        'module-02',
        'module-03',
        'module-04',
        'module-05'
      )
    ),

  paragraph_response text not null default '',
  canvas_link text not null default '',
  linkedin_link text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (user_id,week_key)
);

alter table public.canopy_assignment_drafts
enable row level security;

drop policy if exists
  canopy_assignment_drafts_select_own
on public.canopy_assignment_drafts;

create policy
  canopy_assignment_drafts_select_own
on public.canopy_assignment_drafts
for select
to authenticated
using (user_id=auth.uid());

drop policy if exists
  canopy_assignment_drafts_insert_own
on public.canopy_assignment_drafts;

create policy
  canopy_assignment_drafts_insert_own
on public.canopy_assignment_drafts
for insert
to authenticated
with check (user_id=auth.uid());

drop policy if exists
  canopy_assignment_drafts_update_own
on public.canopy_assignment_drafts;

create policy
  canopy_assignment_drafts_update_own
on public.canopy_assignment_drafts
for update
to authenticated
using (user_id=auth.uid())
with check (user_id=auth.uid());

grant select,insert,update
on public.canopy_assignment_drafts
to authenticated;

create or replace function
public.canopy_touch_assignment_draft()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  new.updated_at:=now();
  return new;
end;
$$;

drop trigger if exists
  canopy_touch_assignment_draft
on public.canopy_assignment_drafts;

create trigger
  canopy_touch_assignment_draft
before update
on public.canopy_assignment_drafts
for each row
execute function
  public.canopy_touch_assignment_draft();
