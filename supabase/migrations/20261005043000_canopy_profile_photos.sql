begin;
alter table public.canopy_talent_settings add column if not exists avatar_path text;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('canopy-profile-images','canopy-profile-images',true,409600,array['image/webp','image/jpeg','image/png'])
on conflict(id) do update set public=true,file_size_limit=409600,allowed_mime_types=array['image/webp','image/jpeg','image/png'];

drop policy if exists "canopy profile image insert own" on storage.objects;
create policy "canopy profile image insert own" on storage.objects for insert to authenticated
with check(bucket_id='canopy-profile-images' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "canopy profile image update own" on storage.objects;
create policy "canopy profile image update own" on storage.objects for update to authenticated
using(bucket_id='canopy-profile-images' and (storage.foldername(name))[1]=auth.uid()::text)
with check(bucket_id='canopy-profile-images' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "canopy profile image delete own" on storage.objects;
create policy "canopy profile image delete own" on storage.objects for delete to authenticated
using(bucket_id='canopy-profile-images' and (storage.foldername(name))[1]=auth.uid()::text);

create or replace function public.canopy_set_own_profile_photo(p_avatar_path text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare uid uuid:=auth.uid(); clean text:=nullif(trim(coalesce(p_avatar_path,'')),'');
begin
 if uid is null then raise exception 'Not signed in.'; end if;
 if not exists(select 1 from public.canopy_profiles where user_id=uid and role in ('learner','tester')) then raise exception 'Participant profile editing is not available for this account.'; end if;
 if clean is not null and clean<>uid::text||'/avatar.webp' then raise exception 'Invalid profile image path.'; end if;
 insert into public.canopy_talent_settings(user_id,avatar_path,updated_at) values(uid,clean,now())
 on conflict(user_id) do update set avatar_path=excluded.avatar_path,updated_at=now();
 return jsonb_build_object('ok',true,'avatar_path',clean);
end;$$;
revoke all on function public.canopy_set_own_profile_photo(text) from public;
grant execute on function public.canopy_set_own_profile_photo(text) to authenticated;

create or replace function public.canopy_get_talent_network()
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare own public.canopy_talent_settings%rowtype; result jsonb; completed integer:=0; alum boolean:=false;
begin
 if auth.uid() is null then raise exception 'Not signed in.'; end if;
 insert into public.canopy_talent_settings(user_id) values(auth.uid()) on conflict(user_id) do nothing;
 select * into own from public.canopy_talent_settings where user_id=auth.uid();
 completed:=public.canopy_talent_completed_modules(auth.uid()); alum:=completed>=5;
 select jsonb_build_object(
  'me',jsonb_build_object('discoverable',own.discoverable,'mentor_available',own.mentor_available and alum,'collaboration_open',own.collaboration_open,'headline',own.headline,'climate_interests',own.climate_interests,'avatar_path',own.avatar_path,'completed_modules',completed,'alumni',alum),
  'directory',coalesce((select jsonb_agg(to_jsonb(q) order by q.alumni desc,q.full_name) from(
    select p.user_id,p.full_name,p.country,t.headline,t.climate_interests,t.collaboration_open,t.avatar_path,
      (t.mentor_available and public.canopy_talent_completed_modules(p.user_id)>=5) mentor_available,
      public.canopy_talent_completed_modules(p.user_id) completed_modules,
      public.canopy_talent_completed_modules(p.user_id)>=5 alumni,
      (select count(*)::integer from public.canopy_spotlight_nominations n join public.canopy_assignment_submissions s on s.id=n.submission_id where s.user_id=p.user_id and n.status='featured') spotlight_count,
      exists(select 1 from public.canopy_mission_group_members m join public.canopy_mission_groups g on g.id=m.group_id where m.user_id=p.user_id and m.invitation_status='accepted' and g.status='verified') verified_mission
    from public.canopy_profiles p join public.canopy_talent_settings t on t.user_id=p.user_id
    where p.role='learner' and t.discoverable=true and p.user_id<>auth.uid()
  )q),'[]'::jsonb),
  'incoming',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'requester_id',r.requester_id,'requester_name',p.full_name,'requester_country',p.country,'message',r.message,'created_at',r.created_at) order by r.created_at desc) from public.canopy_collaboration_requests r join public.canopy_profiles p on p.user_id=r.requester_id where r.recipient_id=auth.uid() and r.status='pending'),'[]'::jsonb),
  'outgoing',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'recipient_id',r.recipient_id,'recipient_name',p.full_name,'status',r.status,'message',r.message,'created_at',r.created_at) order by r.created_at desc) from public.canopy_collaboration_requests r join public.canopy_profiles p on p.user_id=r.recipient_id where r.requester_id=auth.uid()),'[]'::jsonb)
 ) into result; return result;
end;$$;
revoke all on function public.canopy_get_talent_network() from public;
grant execute on function public.canopy_get_talent_network() to authenticated;
commit;
