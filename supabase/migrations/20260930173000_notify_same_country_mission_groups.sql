-- WOMATE Canopy: guidance for mission groups with repeated countries.
-- Sends one deduplicated notification to current invited/accepted members
-- of inviting/active groups where at least one country appears more than once.

with affected_groups as (
  select m.group_id
  from public.canopy_mission_group_members m
  join public.canopy_mission_groups g on g.id = m.group_id
  where m.invitation_status in ('invited','accepted')
    and g.status in ('inviting','active')
  group by m.group_id
  having exists (
    select 1
    from public.canopy_mission_group_members x
    where x.group_id = m.group_id
      and x.invitation_status in ('invited','accepted')
    group by lower(trim(x.country))
    having count(*) > 1
  )
),
recipients as (
  select distinct m.group_id, m.user_id
  from public.canopy_mission_group_members m
  join affected_groups a on a.group_id = m.group_id
  where m.invitation_status in ('invited','accepted')
)
insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
select
  r.user_id,
  'mission_guidance',
  'Your WOMATE Mission Group',
  'Your mission group may include two or more participants from the same country. That is completely fine.

The goal is still to work as one five-person team, with each member leading one stage of the mission: Observe, Understand, Connect, Act, and Multiply.

Where members share the same country, avoid repeating the exact same contribution. Instead, bring different communities, experiences, perspectives, or examples from that country.

For example, two members from Nigeria could look at different cities, communities, climate impacts, or responses.

Your group should still work on one shared climate case or issue, compare experiences across the countries represented, complete one practical group action, and submit one shared Mission Proof Folder.

What matters most is not having five different countries. What matters is five active women contributing meaningfully to one shared mission.

Once you accept your Mission invitation, please stay active in the group and work with your teammates through to completion.

WOMATE Team',
  '/canopy/opportunities',
  'mission-same-country-guidance:' || r.group_id::text || ':' || r.user_id::text
from recipients r
on conflict (fingerprint) do update
set
  title = excluded.title,
  body = excluded.body,
  link = excluded.link,
  type = excluded.type,
  read_at = null;
