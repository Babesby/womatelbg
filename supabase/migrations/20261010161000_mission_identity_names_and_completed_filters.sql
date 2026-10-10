set lock_timeout='8s';
set statement_timeout='120s';

create or replace function public.canopy_mission_name_is_meaningful(p_name text)
returns boolean
language sql
immutable
set search_path=public
as $$
  select
    char_length(trim(coalesce(p_name,''))) between 4 and 100
    and lower(trim(coalesce(p_name,''))) not in (
      'mission',
      'climate mission',
      'womate mission',
      'cross-country climate mission',
      'cross country climate mission'
    )
    and lower(trim(coalesce(p_name,''))) !~ '^mission[[:space:]#_-]*[0-9]+$'
    and lower(trim(coalesce(p_name,''))) !~ '^mission[[:space:]]+(one|two|three|four|five|six|seven|eight|nine|ten)$';
$$;

create or replace function public.canopy_require_mission_identity_before_submit()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.status='submitted'
     and old.status is distinct from new.status
     and not public.canopy_mission_name_is_meaningful(new.name) then
    raise exception 'Give your team Mission one descriptive name before submitting final evidence. Example: Water Conservation Champions or Her Climate, Her Future.';
  end if;
  return new;
end;
$$;

drop trigger if exists canopy_require_mission_identity_before_submit_trg on public.canopy_mission_groups;
create trigger canopy_require_mission_identity_before_submit_trg
before update of status on public.canopy_mission_groups
for each row
execute function public.canopy_require_mission_identity_before_submit();

create or replace function public.canopy_update_mission_group(p_name text,p_choice text,p_custom_brief text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  gid uuid;
  group_status text;
  clean_name text:=left(trim(coalesce(p_name,'')),100);
  choice text:=lower(coalesce(p_choice,'standard'));
begin
  select m.group_id,g.status
  into gid,group_status
  from public.canopy_mission_group_members m
  join public.canopy_mission_groups g on g.id=m.group_id
  where m.user_id=auth.uid()
    and m.invitation_status='accepted'
  order by m.invited_at desc
  limit 1;

  if gid is null then raise exception 'Mission group access is required.'; end if;

  if not public.canopy_mission_name_is_meaningful(clean_name) then
    raise exception 'Choose one descriptive team Mission name, not Mission 1, Mission 2 or Cross-country climate mission. Example: Water Conservation Champions.';
  end if;

  if group_status in('inviting','active') then
    if choice not in('standard','custom') then raise exception 'Choose standard or custom mission.'; end if;
    if choice='custom' and char_length(trim(coalesce(p_custom_brief,'')))<20 then
      raise exception 'Describe your custom mission in at least 20 characters.';
    end if;

    update public.canopy_mission_groups
    set
      name=clean_name,
      mission_choice=choice,
      custom_brief=case when choice='custom' then left(trim(p_custom_brief),1200) else null end,
      updated_at=now()
    where id=gid;
  elsif group_status in('submitted','verified') then
    -- Preserve reviewed evidence and status. Only allow the shared display name to be corrected.
    update public.canopy_mission_groups
    set name=clean_name,updated_at=now()
    where id=gid;
  else
    raise exception 'This Mission can no longer be updated.';
  end if;

  insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
  select
    m.user_id,
    'mission_identity_updated',
    'Your Mission has a team name',
    'Your team Mission is now called "'||clean_name||'". WOMATE will use this shared name on verified Mission recognition and Talent Discovery.',
    '/canopy/opportunities',
    'mission-name:'||gid::text||':'||m.user_id::text
  from public.canopy_mission_group_members m
  where m.group_id=gid
    and m.invitation_status='accepted'
  on conflict(fingerprint) do update
  set
    title=excluded.title,
    body=excluded.body,
    link=excluded.link,
    type=excluded.type,
    read_at=null,
    created_at=now();

  return public.canopy_get_my_mission_hub();
end;
$$;

revoke all on function public.canopy_update_mission_group(text,text,text) from public;
grant execute on function public.canopy_update_mission_group(text,text,text) to authenticated;

insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
select
  m.user_id,
  'mission_name_required',
  'Give your Mission a team name',
  'Your team currently has a generic Mission label. Please open your Mission space and choose one clear shared name, for example Water Conservation Champions, Clean Cooking Action or Her Climate, Her Future. WOMATE will use that shared name on verified Mission recognition.',
  '/canopy/opportunities',
  'mission-name-required-20261010:'||g.id::text||':'||m.user_id::text
from public.canopy_mission_groups g
join public.canopy_mission_group_members m on m.group_id=g.id
where m.invitation_status='accepted'
  and not public.canopy_mission_name_is_meaningful(g.name)
on conflict(fingerprint) do update
set
  title=excluded.title,
  body=excluded.body,
  link=excluded.link,
  type=excluded.type,
  read_at=null,
  created_at=now();

create or replace function public.canopy_completed_mission_identity(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select coalesce((
    select jsonb_build_object(
      'group_id',c.group_id,
      'mission_name',case when public.canopy_mission_name_is_meaningful(g.name) then g.name else null end,
      'lead_stage',m.mission_no,
      'approved_at',c.approved_at
    )
    from public.canopy_mission_completions c
    join public.canopy_mission_groups g on g.id=c.group_id
    left join public.canopy_mission_group_members m
      on m.group_id=c.group_id and m.user_id=c.user_id
    where c.user_id=p_user
      and c.status='completed'
    order by c.approved_at desc nulls last,c.created_at desc
    limit 1
  ),'{}'::jsonb);
$$;

revoke all on function public.canopy_completed_mission_identity(uuid) from public;

create index if not exists canopy_mission_completions_group_status_idx
on public.canopy_mission_completions(group_id,status,user_id);

reset lock_timeout;
reset statement_timeout;
