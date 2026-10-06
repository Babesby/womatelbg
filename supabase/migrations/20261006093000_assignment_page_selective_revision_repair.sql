-- WOMATE Canopy - selective revision carry-forward safeguard
-- Safe/idempotent: preserves unrequested parts from the last manually reviewed attempt.

create or replace function public.canopy_preserve_unrequested_revision_parts()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  previous public.canopy_assignment_submissions%rowtype;
  selection text;
  requested text[];
begin
  select *
    into previous
  from public.canopy_assignment_submissions
  where user_id=new.user_id
    and week_key=new.week_key
  order by attempt_no desc,submitted_at desc,id desc
  limit 1;

  if previous.id is null
     or previous.review_source <> 'manual'
     or previous.assessment_status <> 'revision_required' then
    return new;
  end if;

  selection := substring(
    coalesce(previous.manual_feedback,previous.final_feedback,'')
    from '\[CANOPY_REVISION:([a-z,]+)\]'
  );

  if selection is null or selection='all' then
    return new;
  end if;

  requested := string_to_array(selection,',');

  if not ('paragraph'=any(requested)) then
    new.paragraph_response := previous.paragraph_response;
  end if;

  if not ('practical'=any(requested)) then
    new.canvas_link := previous.canvas_link;
  end if;

  if not ('speaker'=any(requested)) then
    new.linkedin_link := previous.linkedin_link;
  end if;

  return new;
end;
$$;

drop trigger if exists ab_canopy_preserve_unrequested_revision_parts
on public.canopy_assignment_submissions;

create trigger ab_canopy_preserve_unrequested_revision_parts
before insert on public.canopy_assignment_submissions
for each row
execute function public.canopy_preserve_unrequested_revision_parts();

notify pgrst,'reload schema';
