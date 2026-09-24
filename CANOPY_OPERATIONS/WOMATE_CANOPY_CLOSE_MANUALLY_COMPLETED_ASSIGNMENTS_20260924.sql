-- WOMATE CANOPY · close manually completed assignments · 2026-09-24
-- Safe to run more than once.
-- Once WOMATE manually marks an assignment completed, learners cannot create
-- another attempt for the same module/week. Existing records are retained.

begin;

create or replace function public.canopy_block_resubmit_after_manual_completion()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if exists (
    select 1
    from public.canopy_assignment_submissions s
    where s.user_id = new.user_id
      and s.week_key = new.week_key
      and s.review_source = 'manual'
      and s.assessment_status = 'completed'
  ) then
    raise exception 'This assignment has been completed after WOMATE review and is closed for resubmission.';
  end if;

  return new;
end;
$$;

drop trigger if exists canopy_block_resubmit_after_manual_completion
on public.canopy_assignment_submissions;

create trigger canopy_block_resubmit_after_manual_completion
before insert on public.canopy_assignment_submissions
for each row
execute function public.canopy_block_resubmit_after_manual_completion();

commit;
