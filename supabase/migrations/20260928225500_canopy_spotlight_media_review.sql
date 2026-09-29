-- WOMATE CANOPY · Admin Spotlight professional-image review desk
-- 2026-09-28
-- Additive and rerunnable. Keeps learner consent/private links inside Admin-only RPCs.

set lock_timeout = '8s';
set statement_timeout = '60s';

alter table public.canopy_spotlight_recognition_assets
  add column if not exists media_status text not null default 'received',
  add column if not exists admin_note text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

update public.canopy_spotlight_recognition_assets
set media_status='received'
where media_status is null or trim(media_status)='';

create or replace function public.canopy_admin_spotlight_media_queue(p_module_id text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare result jsonb;
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'Only WOMATE Admin can view Spotlight professional images.';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'spotlight_id',n.id,
        'submission_id',s.id,
        'user_id',s.user_id,
        'module_id',n.module_id,
        'learner_name',coalesce(nullif(trim(p.full_name),''),'Learner'),
        'learner_email',coalesce(u.email,''),
        'country',coalesce(nullif(trim(p.country),''),''),
        'professional_image_drive_url',a.professional_image_drive_url,
        'consent_official_channels',coalesce(a.consent_official_channels,false),
        'submitted_at',a.submitted_at,
        'updated_at',a.updated_at,
        'media_status',case when a.spotlight_id is null then 'missing' else coalesce(nullif(a.media_status,''),'received') end,
        'admin_note',a.admin_note,
        'reviewed_at',a.reviewed_at
      )
      order by coalesce(a.updated_at,n.decided_at,n.created_at) desc
    ),
    '[]'::jsonb
  )
  into result
  from public.canopy_spotlight_nominations n
  join public.canopy_assignment_submissions s on s.id=n.submission_id
  left join public.canopy_profiles p on p.user_id=s.user_id
  left join auth.users u on u.id=s.user_id
  left join public.canopy_spotlight_recognition_assets a on a.spotlight_id=n.id
  where n.status='featured'
    and (p_module_id is null or n.module_id=p_module_id);

  return result;
end;
$$;

revoke all on function public.canopy_admin_spotlight_media_queue(text) from public;
grant execute on function public.canopy_admin_spotlight_media_queue(text) to authenticated;

create or replace function public.canopy_admin_review_spotlight_media(
  p_spotlight_id uuid,
  p_status text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  clean_status text:=lower(trim(coalesce(p_status,'')));
  clean_note text:=nullif(trim(coalesce(p_note,'')),'');
  asset public.canopy_spotlight_recognition_assets%rowtype;
  learner_id uuid;
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'Only WOMATE Admin can review Spotlight professional images.';
  end if;

  if clean_status not in ('approved','replacement_requested') then
    raise exception 'Invalid Spotlight image review status.';
  end if;

  if clean_status='replacement_requested' and clean_note is null then
    raise exception 'Add a short note explaining what the learner should replace.';
  end if;

  select s.user_id
  into learner_id
  from public.canopy_spotlight_recognition_assets a
  join public.canopy_spotlight_nominations n on n.id=a.spotlight_id and n.status='featured'
  join public.canopy_assignment_submissions s on s.id=n.submission_id
  where a.spotlight_id=p_spotlight_id;

  if learner_id is null then
    raise exception 'This featured learner has not submitted a professional image yet.';
  end if;

  update public.canopy_spotlight_recognition_assets
  set media_status=clean_status,
      admin_note=clean_note,
      reviewed_at=now(),
      reviewed_by=auth.uid()
  where spotlight_id=p_spotlight_id
  returning * into asset;

  insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
  values(
    learner_id,
    case when clean_status='approved' then 'spotlight_photo_approved' else 'spotlight_photo_update' end,
    case when clean_status='approved' then 'Your Spotlight image is approved' else 'Please update your Spotlight image' end,
    case when clean_status='approved'
      then 'WOMATE has approved the professional image you shared for your Spotlight recognition. Thank you.'
      else 'WOMATE reviewed your Spotlight image and needs an update before it can be used on official channels. '||clean_note
    end,
    '/canopy/classroom#spotlight',
    'spotlight-photo-review:'||p_spotlight_id::text
  )
  on conflict(fingerprint) do update set
    type=excluded.type,
    title=excluded.title,
    body=excluded.body,
    link=excluded.link,
    read_at=null,
    created_at=now();

  return jsonb_build_object(
    'spotlight_id',asset.spotlight_id,
    'media_status',asset.media_status,
    'admin_note',asset.admin_note,
    'reviewed_at',asset.reviewed_at
  );
end;
$$;

revoke all on function public.canopy_admin_review_spotlight_media(uuid,text,text) from public;
grant execute on function public.canopy_admin_review_spotlight_media(uuid,text,text) to authenticated;

-- A learner who replaces an image should return to the Admin review queue.
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
    consent_official_channels,submitted_at,updated_at,media_status,
    admin_note,reviewed_at,reviewed_by
  ) values(
    p_spotlight_id,auth.uid(),spotlight_module,clean_url,
    true,now(),now(),'received',
    null,null,null
  )
  on conflict(spotlight_id) do update set
    professional_image_drive_url=excluded.professional_image_drive_url,
    consent_official_channels=true,
    updated_at=now(),
    media_status='received',
    admin_note=null,
    reviewed_at=null,
    reviewed_by=null
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
