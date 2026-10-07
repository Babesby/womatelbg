-- WOMATE Canopy - Spotlight workflow notifications + active queue dedupe
-- 2026-10-07
-- Safe/idempotent. Preserves final featured selections.

begin;

-- Collapse duplicate active nomination rows for the same learner/module.
-- Keep Featured over Shortlisted over Nominated, then the newest row.
with ranked as (
  select
    n.id,
    n.status,
    row_number() over(
      partition by n.module_id,s.user_id
      order by
        case n.status when 'featured' then 3 when 'shortlisted' then 2 when 'nominated' then 1 else 0 end desc,
        coalesce(n.decided_at,n.created_at) desc,
        n.created_at desc,
        n.id desc
    ) as rn
  from public.canopy_spotlight_nominations n
  join public.canopy_assignment_submissions s on s.id=n.submission_id
  where n.status in ('nominated','shortlisted','featured')
)
update public.canopy_spotlight_nominations n
set status='declined',
    decided_at=coalesce(n.decided_at,now())
from ranked r
where n.id=r.id
  and r.rn>1
  and n.status in ('nominated','shortlisted');

create or replace function public.canopy_notify_spotlight_state()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  learner_id uuid;
  module_no text;
  title_text text;
  body_text text;
  type_text text;
begin
  if new.status not in ('nominated','shortlisted') then
    return new;
  end if;

  if tg_op='UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  select s.user_id into learner_id
  from public.canopy_assignment_submissions s
  where s.id=new.submission_id;

  if learner_id is null then return new; end if;

  module_no:=coalesce(nullif(regexp_replace(coalesce(new.module_id,''),'[^0-9]','','g'),''),'');
  if new.status='nominated' then
    type_text:='spotlight_nominated';
    title_text:='Your work was nominated for Canopy Spotlight';
    body_text:='WOMATE has nominated your Module '||module_no||' work for Canopy Spotlight consideration. This is a nomination and is not yet a final Top 5 selection.';
  else
    type_text:='spotlight_shortlisted';
    title_text:='Your work was shortlisted for Canopy Spotlight';
    body_text:='Your Module '||module_no||' work has moved to the Canopy Spotlight shortlist. WOMATE will make the final Top 5 selection separately.';
  end if;

  insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
  values(
    learner_id,type_text,title_text,body_text,'/canopy/notifications',
    'spotlight-state:'||new.module_id||':'||learner_id::text||':'||new.status
  )
  on conflict(fingerprint) do update
  set type=excluded.type,
      title=excluded.title,
      body=excluded.body,
      link=excluded.link,
      read_at=null,
      created_at=now();

  return new;
end;
$$;

drop trigger if exists canopy_notify_spotlight_state on public.canopy_spotlight_nominations;
create trigger canopy_notify_spotlight_state
after insert or update of status
on public.canopy_spotlight_nominations
for each row
execute function public.canopy_notify_spotlight_state();

-- Notify learners for currently-active nominated/shortlisted states too.
insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
select distinct on (n.module_id,s.user_id,n.status)
  s.user_id,
  case n.status when 'nominated' then 'spotlight_nominated' else 'spotlight_shortlisted' end,
  case n.status
    when 'nominated' then 'Your work was nominated for Canopy Spotlight'
    else 'Your work was shortlisted for Canopy Spotlight'
  end,
  case n.status
    when 'nominated' then 'WOMATE has nominated your Module '||regexp_replace(n.module_id,'[^0-9]','','g')||' work for Canopy Spotlight consideration. This is a nomination and is not yet a final Top 5 selection.'
    else 'Your Module '||regexp_replace(n.module_id,'[^0-9]','','g')||' work has moved to the Canopy Spotlight shortlist. WOMATE will make the final Top 5 selection separately.'
  end,
  '/canopy/notifications',
  'spotlight-state:'||n.module_id||':'||s.user_id::text||':'||n.status
from public.canopy_spotlight_nominations n
join public.canopy_assignment_submissions s on s.id=n.submission_id
where n.status in ('nominated','shortlisted')
order by n.module_id,s.user_id,n.status,coalesce(n.decided_at,n.created_at) desc
on conflict(fingerprint) do update
set type=excluded.type,
    title=excluded.title,
    body=excluded.body,
    link=excluded.link,
    read_at=null,
    created_at=now();

commit;
