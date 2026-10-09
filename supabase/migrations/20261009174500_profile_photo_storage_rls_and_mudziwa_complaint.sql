-- WOMATE Canopy · profile-photo Storage RLS deep fix + Mudziwa complaint resolution
set lock_timeout='8s';
set statement_timeout='90s';

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('canopy-profile-images','canopy-profile-images',true,409600,array['image/webp','image/jpeg','image/png'])
on conflict(id) do update
set public=true,file_size_limit=409600,allowed_mime_types=array['image/webp','image/jpeg','image/png'];

drop policy if exists "canopy profile image select own" on storage.objects;
drop policy if exists "canopy profile image insert own" on storage.objects;
drop policy if exists "canopy profile image update own" on storage.objects;
drop policy if exists "canopy profile image delete own" on storage.objects;

create policy "canopy profile image select own"
on storage.objects for select to authenticated
using(bucket_id='canopy-profile-images' and name=(auth.uid()::text||'/avatar.webp'));

create policy "canopy profile image insert own"
on storage.objects for insert to authenticated
with check(bucket_id='canopy-profile-images' and name=(auth.uid()::text||'/avatar.webp'));

create policy "canopy profile image update own"
on storage.objects for update to authenticated
using(bucket_id='canopy-profile-images' and name=(auth.uid()::text||'/avatar.webp'))
with check(bucket_id='canopy-profile-images' and name=(auth.uid()::text||'/avatar.webp'));

create policy "canopy profile image delete own"
on storage.objects for delete to authenticated
using(bucket_id='canopy-profile-images' and name=(auth.uid()::text||'/avatar.webp'));

with target as (
  select a.id,a.learner_id
  from public.canopy_manager_actions a
  join public.canopy_profiles p on p.user_id=a.learner_id
  where a.action_type='complaint'
    and a.status='open'
    and lower(trim(coalesce(p.full_name,'')))=lower('Mudziwa Avhatendi')
    and lower(trim(coalesce(a.subject,'')))=lower('Unable to Upload Profile Photo on Canopy')
  order by a.created_at desc,a.id desc
  limit 1
),
resolved as (
  update public.canopy_manager_actions a
  set response_message=
      'WOMATE identified the profile-photo storage permission issue that caused the “New row violates row-level security policy” error. The Storage permissions have been corrected so your signed-in Canopy account can create or replace its own profile image. Please refresh Canopy (or sign out and back in), open Profile & Settings, and upload your photo again. Your photo remains restricted to your own upload path for editing, while the approved Talent Discovery profile can display the public image. If the upload still fails after refreshing, reply in Help and WOMATE will investigate the exact session immediately.',
      responded_at=now(),
      status='resolved',
      resolved_at=now()
  from target t
  where a.id=t.id
  returning a.id,a.learner_id,a.response_message
)
insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
select r.learner_id,'complaint_response','Your profile photo upload issue has been fixed',
       r.response_message,'/canopy/profile','complaint-response:'||r.id::text
from resolved r
on conflict(fingerprint) do update
set title=excluded.title,body=excluded.body,link=excluded.link,type=excluded.type,read_at=null,created_at=now();

reset lock_timeout;
reset statement_timeout;
