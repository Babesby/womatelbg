-- WOMATE CANOPY · Spotlight Top 5 recognition + professional image handoff
-- 2026-09-27
-- Additive / rerunnable. Applies to Module 01 and every subsequent weekly Spotlight.

set lock_timeout = '8s';
set statement_timeout = '60s';

create table if not exists public.canopy_spotlight_recognition_assets (
  spotlight_id uuid primary key references public.canopy_spotlight_nominations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null,
  professional_image_drive_url text not null,
  consent_official_channels boolean not null default false,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists canopy_spotlight_recognition_assets_user_module_idx
  on public.canopy_spotlight_recognition_assets(user_id,module_id);

alter table public.canopy_spotlight_recognition_assets enable row level security;
revoke all on table public.canopy_spotlight_recognition_assets from anon, authenticated;

create or replace function public.canopy_submit_spotlight_recognition_asset(
  p_spotlight_id uuid,
  p_drive_url text,
  p_consent boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  learner_id uuid;
  spotlight_module text;
  clean_url text := trim(coalesce(p_drive_url,''));
  saved public.canopy_spotlight_recognition_assets%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;

  select s.user_id,n.module_id
  into learner_id,spotlight_module
  from public.canopy_spotlight_nominations n
  join public.canopy_assignment_submissions s on s.id=n.submission_id
  where n.id=p_spotlight_id
    and n.status='featured';

  if learner_id is null or learner_id<>auth.uid() then
    raise exception 'This Spotlight recognition request is not available for your account.';
  end if;

  if clean_url !~* '^https://drive\.google\.com/' then
    raise exception 'Paste a Google Drive share link for your professional image.';
  end if;

  if coalesce(p_consent,false) is not true then
    raise exception 'Please confirm WOMATE may use this image for your Spotlight celebration.';
  end if;

  insert into public.canopy_spotlight_recognition_assets(
    spotlight_id,user_id,module_id,professional_image_drive_url,
    consent_official_channels,submitted_at,updated_at
  ) values(
    p_spotlight_id,auth.uid(),spotlight_module,clean_url,true,now(),now()
  )
  on conflict(spotlight_id) do update set
    professional_image_drive_url=excluded.professional_image_drive_url,
    consent_official_channels=true,
    updated_at=now()
  returning * into saved;

  insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
  values(
    auth.uid(),
    'spotlight_photo_received',
    'Professional image received',
    'Thank you. WOMATE has received your professional image link for your Spotlight recognition.',
    '/canopy/classroom#spotlight',
    'spotlight-photo:'||p_spotlight_id::text||':'||auth.uid()::text
  )
  on conflict(fingerprint) do update set
    title=excluded.title,
    body=excluded.body,
    link=excluded.link,
    read_at=null,
    created_at=now();

  return jsonb_build_object(
    'spotlight_id',saved.spotlight_id,
    'module_id',saved.module_id,
    'professional_image_drive_url',saved.professional_image_drive_url,
    'consent_official_channels',saved.consent_official_channels,
    'submitted_at',saved.submitted_at,
    'updated_at',saved.updated_at
  );
end;
$$;

revoke all on function public.canopy_submit_spotlight_recognition_asset(uuid,text,boolean) from public;
grant execute on function public.canopy_submit_spotlight_recognition_asset(uuid,text,boolean) to authenticated;

create or replace function public.canopy_admin_spotlight_recognition_assets(p_module_id text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare result jsonb;
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'Only WOMATE Admin can view Spotlight recognition images.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'spotlight_id',a.spotlight_id,
    'user_id',a.user_id,
    'module_id',a.module_id,
    'learner_name',coalesce(nullif(trim(p.full_name),''),'Learner'),
    'professional_image_drive_url',a.professional_image_drive_url,
    'consent_official_channels',a.consent_official_channels,
    'submitted_at',a.submitted_at,
    'updated_at',a.updated_at
  ) order by a.updated_at desc),'[]'::jsonb)
  into result
  from public.canopy_spotlight_recognition_assets a
  left join public.canopy_profiles p on p.user_id=a.user_id
  where p_module_id is null or a.module_id=p_module_id;

  return result;
end;
$$;

revoke all on function public.canopy_admin_spotlight_recognition_assets(text) from public;
grant execute on function public.canopy_admin_spotlight_recognition_assets(text) to authenticated;

-- Rewrite every future spotlight notification into a personalised Top 5 message.
-- This hooks the notification itself, so it applies whether Admin directly
-- spotlights a learner or a nomination is later moved to Featured.
create or replace function public.canopy_personalise_spotlight_notification()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  full_name text;
  first_name text;
  module_key text;
  module_no text;
begin
  if new.type<>'spotlight_featured' then
    return new;
  end if;

  select nullif(trim(p.full_name),'') into full_name
  from public.canopy_profiles p
  where p.user_id=new.user_id;

  first_name:=coalesce(nullif(split_part(coalesce(full_name,''),' ',1),''),'Learner');
  module_key:=nullif(split_part(coalesce(new.fingerprint,''),':',2),'');
  module_no:=nullif(regexp_replace(coalesce(module_key,''),'[^0-9]','','g'),'');

  new.title:='Congratulations, '||first_name||' · Top 5 for Module '||coalesce(module_no,'');
  new.body:='You are one of WOMATE''s Top 5 Outstanding Learners for Module '||coalesce(module_no,'')||'. We would love to celebrate you on WOMATE''s official channels. Open Canopy Spotlight and attach a Google Drive link to a professional image. Set the file to “Anyone with the link” → “Viewer”.';
  new.link:='/canopy/classroom#spotlight';
  return new;
end;
$$;

drop trigger if exists canopy_personalise_spotlight_notification on public.canopy_notifications;
create trigger canopy_personalise_spotlight_notification
before insert or update of type,title,body,link,fingerprint
on public.canopy_notifications
for each row
execute function public.canopy_personalise_spotlight_notification();

-- Refresh already-created Spotlight notifications so Module 01's current
-- Top 5 receive the same personalised recognition request.
update public.canopy_notifications n
set title='Congratulations, '||coalesce(nullif(split_part(trim(coalesce(p.full_name,'')),' ',1),''),'Learner')||' · Top 5 for Module '||coalesce(nullif(regexp_replace(split_part(coalesce(n.fingerprint,''),':',2),'[^0-9]','','g'),''),''),
    body='You are one of WOMATE''s Top 5 Outstanding Learners for Module '||coalesce(nullif(regexp_replace(split_part(coalesce(n.fingerprint,''),':',2),'[^0-9]','','g'),''),'')||'. We would love to celebrate you on WOMATE''s official channels. Open Canopy Spotlight and attach a Google Drive link to a professional image. Set the file to “Anyone with the link” → “Viewer”.',
    link='/canopy/classroom#spotlight',
    read_at=null,
    created_at=now()
from public.canopy_profiles p
where n.user_id=p.user_id
  and n.type='spotlight_featured';

-- Learner-facing feed: the professional-image link is returned only to the
-- featured learner who owns it. Other participants never receive that URL.
create or replace function public.canopy_get_featured_spotlights(p_limit integer default 5)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  safe_limit integer := greatest(1,least(coalesce(p_limit,5),5));
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;

  select coalesce(jsonb_agg(item order by featured_at desc),'[]'::jsonb)
  into result
  from (
    select
      coalesce(n.decided_at,n.created_at) as featured_at,
      jsonb_build_object(
        'id',n.id,
        'submission_id',s.id,
        'week_key',s.week_key,
        'module_id',n.module_id,
        'category',n.category,
        'note',n.note,
        'featured_at',coalesce(n.decided_at,n.created_at),
        'learner_name',coalesce(nullif(trim(p.full_name),''),'She Leads fellow'),
        'paragraph_response',nullif(trim(s.paragraph_response),''),
        'canvas_link',nullif(trim(s.canvas_link),''),
        'linkedin_link',nullif(trim(s.linkedin_link),''),
        'artifact_url',nullif(trim(s.canvas_link),''),
        'is_me',(s.user_id=auth.uid()),
        'professional_image_drive_url',case when s.user_id=auth.uid() then (
          select a.professional_image_drive_url
          from public.canopy_spotlight_recognition_assets a
          where a.spotlight_id=n.id
          limit 1
        ) else null end,
        'professional_image_submitted_at',case when s.user_id=auth.uid() then (
          select a.updated_at
          from public.canopy_spotlight_recognition_assets a
          where a.spotlight_id=n.id
          limit 1
        ) else null end,
        'my_reaction',(
          select r.reaction
          from public.canopy_spotlight_reactions r
          where r.spotlight_id=n.id and r.user_id=auth.uid()
          limit 1
        ),
        'reaction_counts',jsonb_build_object(
          'love',(select count(*) from public.canopy_spotlight_reactions r where r.spotlight_id=n.id and r.reaction='love'),
          'clap',(select count(*) from public.canopy_spotlight_reactions r where r.spotlight_id=n.id and r.reaction='clap'),
          'insightful',(select count(*) from public.canopy_spotlight_reactions r where r.spotlight_id=n.id and r.reaction='insightful')
        )
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

reset lock_timeout;
reset statement_timeout;
