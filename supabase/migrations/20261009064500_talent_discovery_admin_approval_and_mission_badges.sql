-- WOMATE Talent Discovery: admin approval, achievement gates, profile readiness, Mission badges
set lock_timeout='8s';
set statement_timeout='120s';

alter table public.canopy_talent_settings
  add column if not exists approved_for_discovery boolean not null default false,
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamptz;

-- Explicit reset requested: nobody remains in Talent Discovery merely because of the legacy self-toggle.
update public.canopy_talent_settings
set approved_for_discovery=false,approved_by=null,approved_at=null,discoverable=false;

create or replace function public.canopy_talent_profile_ready(p_user uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce(nullif(trim(p.full_name),'') is not null,false)
     and coalesce(nullif(trim(p.country),'') is not null,false)
     and coalesce(nullif(trim(t.avatar_path),'') is not null,false)
     and coalesce(nullif(trim(t.headline),'') is not null,false)
     and coalesce(cardinality(t.climate_interests)>0,false)
  from public.canopy_profiles p
  left join public.canopy_talent_settings t on t.user_id=p.user_id
  where p.user_id=p_user;
$$;
revoke all on function public.canopy_talent_profile_ready(uuid) from public;

create or replace function public.canopy_talent_mission_completed(p_user uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.canopy_mission_completions c where c.user_id=p_user and c.status='completed');
$$;
revoke all on function public.canopy_talent_mission_completed(uuid) from public;

create or replace function public.canopy_talent_final_team_completed(p_user uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(
   select 1
   from public.canopy_mission_group_members mine
   join public.canopy_mission_groups g on g.id=mine.group_id
   where mine.user_id=p_user and mine.invitation_status='accepted' and g.status='verified'
     and exists(select 1 from public.canopy_mission_reports r where r.group_id=g.id)
     and not exists(
       select 1 from public.canopy_mission_reports r
       where r.group_id=g.id
         and not exists(
           select 1 from public.canopy_mission_completions c
           where c.group_id=g.id and c.user_id=r.user_id and c.status='completed'
         )
     )
 );
$$;
revoke all on function public.canopy_talent_final_team_completed(uuid) from public;

create or replace function public.canopy_talent_eligible(p_user uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select public.canopy_talent_completed_modules(p_user)>=5
     or public.canopy_talent_mission_completed(p_user);
$$;
revoke all on function public.canopy_talent_eligible(uuid) from public;

create or replace function public.canopy_talent_is_visible(p_user uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(
   select 1 from public.canopy_talent_settings t
   join public.canopy_profiles p on p.user_id=t.user_id
   where t.user_id=p_user and p.role='learner'
     and t.approved_for_discovery=true and t.discoverable=true
     and public.canopy_talent_eligible(p_user)
     and public.canopy_talent_profile_ready(p_user)
 );
$$;
revoke all on function public.canopy_talent_is_visible(uuid) from public;

create or replace function public.canopy_get_my_mission_completion()
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare item jsonb;
begin
 if auth.uid() is null then raise exception 'Not signed in.'; end if;
 select to_jsonb(c)||jsonb_build_object(
   'group_name',g.name,
   'group_status',g.status,
   'final_team_completed',public.canopy_talent_final_team_completed(auth.uid())
 ) into item
 from public.canopy_mission_completions c
 join public.canopy_mission_groups g on g.id=c.group_id
 where c.user_id=auth.uid() and c.status='completed'
 order by c.approved_at desc nulls last,c.created_at desc limit 1;
 return coalesce(item,'{}'::jsonb);
end;$$;
revoke all on function public.canopy_get_my_mission_completion() from public;
grant execute on function public.canopy_get_my_mission_completion() to authenticated;

create or replace function public.canopy_get_talent_network()
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare own public.canopy_talent_settings%rowtype; result jsonb; completed integer:=0; alum boolean:=false;
begin
 if auth.uid() is null then raise exception 'Not signed in.'; end if;
 insert into public.canopy_talent_settings(user_id) values(auth.uid()) on conflict(user_id) do nothing;
 select * into own from public.canopy_talent_settings where user_id=auth.uid();
 completed:=public.canopy_talent_completed_modules(auth.uid()); alum:=completed>=5;
 select jsonb_build_object(
  'me',jsonb_build_object(
    'discoverable',own.discoverable,'approved_for_discovery',own.approved_for_discovery,
    'mentor_available',own.mentor_available and alum,'collaboration_open',own.collaboration_open,
    'headline',own.headline,'climate_interests',own.climate_interests,'avatar_path',own.avatar_path,
    'completed_modules',completed,'alumni',alum,'all_modules_completed',completed>=5,
    'mission_completed',public.canopy_talent_mission_completed(auth.uid()),
    'final_team_completed',public.canopy_talent_final_team_completed(auth.uid()),
    'eligible_for_discovery',public.canopy_talent_eligible(auth.uid()),
    'profile_ready',public.canopy_talent_profile_ready(auth.uid()),
    'visible',public.canopy_talent_is_visible(auth.uid())
  ),
  'directory',coalesce((select jsonb_agg(to_jsonb(q) order by q.mission_completed desc,q.all_modules_completed desc,q.full_name) from(
    select p.user_id,p.full_name,p.country,t.headline,t.climate_interests,t.collaboration_open,t.avatar_path,
      (t.mentor_available and public.canopy_talent_completed_modules(p.user_id)>=5) mentor_available,
      public.canopy_talent_completed_modules(p.user_id) completed_modules,
      public.canopy_talent_completed_modules(p.user_id)>=5 alumni,
      public.canopy_talent_completed_modules(p.user_id)>=5 all_modules_completed,
      public.canopy_talent_mission_completed(p.user_id) mission_completed,
      public.canopy_talent_final_team_completed(p.user_id) final_team_completed,
      (select count(*)::integer from public.canopy_spotlight_nominations n join public.canopy_assignment_submissions s on s.id=n.submission_id where s.user_id=p.user_id and n.status='featured') spotlight_count
    from public.canopy_profiles p join public.canopy_talent_settings t on t.user_id=p.user_id
    where p.role='learner' and p.user_id<>auth.uid() and public.canopy_talent_is_visible(p.user_id)
  )q),'[]'::jsonb),
  'incoming',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'requester_id',r.requester_id,'requester_name',p.full_name,'requester_country',p.country,'message',r.message,'created_at',r.created_at) order by r.created_at desc) from public.canopy_collaboration_requests r join public.canopy_profiles p on p.user_id=r.requester_id where r.recipient_id=auth.uid() and r.status='pending'),'[]'::jsonb),
  'outgoing',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'recipient_id',r.recipient_id,'recipient_name',p.full_name,'status',r.status,'message',r.message,'created_at',r.created_at) order by r.created_at desc) from public.canopy_collaboration_requests r join public.canopy_profiles p on p.user_id=r.recipient_id where r.requester_id=auth.uid()),'[]'::jsonb)
 ) into result;
 return result;
end;$$;
revoke all on function public.canopy_get_talent_network() from public;
grant execute on function public.canopy_get_talent_network() to authenticated;

-- Learners can edit their professional content, but cannot self-approve/self-publish into Talent Discovery.
create or replace function public.canopy_save_talent_settings(p_discoverable boolean,p_mentor_available boolean,p_collaboration_open boolean,p_headline text,p_interests text[])
returns void language plpgsql security definer set search_path=public,auth as $$
declare completed integer; now_ready boolean; is_approved boolean;
begin
 if auth.uid() is null then raise exception 'Not signed in.'; end if;
 completed:=public.canopy_talent_completed_modules(auth.uid());
 insert into public.canopy_talent_settings(user_id,mentor_available,collaboration_open,headline,climate_interests,updated_at)
 values(auth.uid(),coalesce(p_mentor_available,false) and completed>=5,coalesce(p_collaboration_open,false),nullif(left(trim(coalesce(p_headline,'')),120),''),coalesce(p_interests,'{}'),now())
 on conflict(user_id) do update set
   mentor_available=excluded.mentor_available,collaboration_open=excluded.collaboration_open,
   headline=excluded.headline,climate_interests=excluded.climate_interests,updated_at=now();
 select approved_for_discovery into is_approved from public.canopy_talent_settings where user_id=auth.uid();
 now_ready:=public.canopy_talent_profile_ready(auth.uid());
 if is_approved and now_ready and public.canopy_talent_eligible(auth.uid()) then
   insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
   values(auth.uid(),'talent_discovery_live','Your Talent Discovery profile is live','Your WOMATE-approved professional profile is complete and is now visible in Talent Discovery. Keep your image, headline and climate interests current.','/canopy/talent','talent-discovery-live:'||auth.uid()::text)
   on conflict(fingerprint) do update set body=excluded.body,title=excluded.title,link=excluded.link,read_at=null,created_at=now();
 end if;
end;$$;
revoke all on function public.canopy_save_talent_settings(boolean,boolean,boolean,text,text[]) from public;
grant execute on function public.canopy_save_talent_settings(boolean,boolean,boolean,text,text[]) to authenticated;

create or replace function public.canopy_set_own_profile_photo(p_avatar_path text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare uid uuid:=auth.uid(); clean text:=nullif(trim(coalesce(p_avatar_path,'')),''); approved boolean:=false;
begin
 if uid is null then raise exception 'Not signed in.'; end if;
 if not exists(select 1 from public.canopy_profiles where user_id=uid and role in ('learner','tester')) then raise exception 'Participant profile editing is not available for this account.'; end if;
 if clean is not null and clean<>(uid::text||'/avatar.webp') then raise exception 'Invalid profile image path.'; end if;
 insert into public.canopy_talent_settings(user_id,avatar_path,updated_at) values(uid,clean,now())
 on conflict(user_id) do update set avatar_path=excluded.avatar_path,updated_at=now();
 select approved_for_discovery into approved from public.canopy_talent_settings where user_id=uid;
 if approved and public.canopy_talent_profile_ready(uid) and public.canopy_talent_eligible(uid) then
   insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
   values(uid,'talent_discovery_live','Your Talent Discovery profile is live','Your professional image and profile are complete. Your WOMATE-approved profile is now visible in Talent Discovery.','/canopy/talent','talent-discovery-live:'||uid::text)
   on conflict(fingerprint) do update set body=excluded.body,title=excluded.title,link=excluded.link,read_at=null,created_at=now();
 end if;
 return jsonb_build_object('ok',true,'avatar_path',clean);
end;$$;
revoke all on function public.canopy_set_own_profile_photo(text) from public;
grant execute on function public.canopy_set_own_profile_photo(text) to authenticated;

create or replace function public.canopy_admin_talent_network()
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
begin
 if not public.canopy_is_manager(auth.uid()) then raise exception 'Manager access required.'; end if;
 return jsonb_build_object(
   'visible_count',(select count(*) from public.canopy_profiles p where p.role='learner' and public.canopy_talent_is_visible(p.user_id)),
   'approved_count',(select count(*) from public.canopy_talent_settings where approved_for_discovery=true),
   'rows',coalesce((select jsonb_agg(to_jsonb(q) order by q.visible desc,q.eligible_for_discovery desc,q.full_name) from(
     select p.user_id,p.full_name,p.country,t.avatar_path,t.headline,t.climate_interests,t.collaboration_open,
       coalesce(t.approved_for_discovery,false) approved_for_discovery,
       coalesce(t.discoverable,false) discoverable,
       public.canopy_talent_completed_modules(p.user_id) completed_modules,
       public.canopy_talent_completed_modules(p.user_id)>=5 alumni,
       public.canopy_talent_completed_modules(p.user_id)>=5 all_modules_completed,
       public.canopy_talent_mission_completed(p.user_id) mission_completed,
       public.canopy_talent_final_team_completed(p.user_id) final_team_completed,
       public.canopy_talent_eligible(p.user_id) eligible_for_discovery,
       public.canopy_talent_profile_ready(p.user_id) profile_ready,
       public.canopy_talent_is_visible(p.user_id) visible,
       coalesce(t.mentor_available,false) and public.canopy_talent_completed_modules(p.user_id)>=5 mentor_available,
       (select count(*)::integer from public.canopy_spotlight_nominations n join public.canopy_assignment_submissions s on s.id=n.submission_id where s.user_id=p.user_id and n.status='featured') spotlight_count
     from public.canopy_profiles p
     left join public.canopy_talent_settings t on t.user_id=p.user_id
     where p.role='learner'
   )q),'[]'::jsonb)
 );
end;$$;
revoke all on function public.canopy_admin_talent_network() from public;
grant execute on function public.canopy_admin_talent_network() to authenticated;

-- Existing API name retained for compatibility; semantics are now explicit Admin approval/revocation.
create or replace function public.canopy_admin_set_talent_visibility(p_user uuid,p_discoverable boolean,p_remark text)
returns void language plpgsql security definer set search_path=public,auth as $$
declare ready boolean; eligible boolean;
begin
 if not public.canopy_is_manager(auth.uid()) then raise exception 'Manager access required.'; end if;
 if not exists(select 1 from public.canopy_profiles where user_id=p_user and role='learner') then raise exception 'Learner profile not found.'; end if;
 eligible:=public.canopy_talent_eligible(p_user);
 if coalesce(p_discoverable,false) and not eligible then raise exception 'Talent Discovery approval requires all five modules completed or an approved Mission Completed record.'; end if;
 insert into public.canopy_talent_settings(user_id,approved_for_discovery,discoverable,approved_by,approved_at,moderation_note,updated_at)
 values(p_user,coalesce(p_discoverable,false),coalesce(p_discoverable,false),case when p_discoverable then auth.uid() else null end,case when p_discoverable then now() else null end,nullif(trim(coalesce(p_remark,'')),''),now())
 on conflict(user_id) do update set
   approved_for_discovery=excluded.approved_for_discovery,discoverable=excluded.discoverable,
   approved_by=excluded.approved_by,approved_at=excluded.approved_at,moderation_note=excluded.moderation_note,updated_at=now();
 ready:=public.canopy_talent_profile_ready(p_user);
 insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
 values(
   p_user,'talent_discovery_approval',
   case when p_discoverable then 'Approved for WOMATE Talent Discovery — update your profile now' else 'Talent Discovery approval updated' end,
   case when p_discoverable and ready then
     'WOMATE has approved you for Talent Discovery. Your achievement and professional profile are ready, so your profile can now appear in the verified Talent Discovery directory.'
   when p_discoverable then
     'WOMATE has approved you for Talent Discovery. Please urgently update your profile, add a clear professional image, a professional headline and your climate interests. Your profile will remain hidden until these required profile details are complete.'
   else
     'Your Talent Discovery approval is no longer active. Your private Canopy learning record is unchanged.'
   end,
   case when p_discoverable and not ready then '/canopy/profile' else '/canopy/talent' end,
   'talent-discovery-approval:'||p_user::text
 )
 on conflict(fingerprint) do update set title=excluded.title,body=excluded.body,link=excluded.link,read_at=null,created_at=now();
end;$$;
revoke all on function public.canopy_admin_set_talent_visibility(uuid,boolean,text) from public;
grant execute on function public.canopy_admin_set_talent_visibility(uuid,boolean,text) to authenticated;

-- Collaboration cannot bypass visibility by calling the RPC with a hidden learner UUID.
create or replace function public.canopy_send_collaboration_request(p_recipient uuid,p_message text)
returns uuid language plpgsql security definer set search_path=public,auth as $$
declare rid uuid; clean text:=trim(coalesce(p_message,''));
begin
 if auth.uid() is null then raise exception 'Not signed in.'; end if;
 if p_recipient=auth.uid() then raise exception 'You cannot request collaboration with yourself.'; end if;
 if length(clean)<5 then raise exception 'Add a short collaboration note.'; end if;
 if not public.canopy_talent_is_visible(p_recipient) or not exists(select 1 from public.canopy_talent_settings where user_id=p_recipient and collaboration_open=true) then raise exception 'This participant is not available for Talent Discovery collaboration.'; end if;
 if exists(select 1 from public.canopy_collaboration_requests where requester_id=auth.uid() and recipient_id=p_recipient and status='pending') then raise exception 'You already have a pending request with this participant.'; end if;
 insert into public.canopy_collaboration_requests(requester_id,recipient_id,message) values(auth.uid(),p_recipient,left(clean,600)) returning id into rid;
 insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
 select p_recipient,'collaboration_request','New Canopy collaboration request',coalesce(p.full_name,'A Canopy participant')||' would like to collaborate with you.','/canopy/talent','talent-collab:'||rid::text from public.canopy_profiles p where p.user_id=auth.uid()
 on conflict(fingerprint) do nothing;
 return rid;
end;$$;
revoke all on function public.canopy_send_collaboration_request(uuid,text) from public;
grant execute on function public.canopy_send_collaboration_request(uuid,text) to authenticated;

-- Cohort-wide policy notice: legacy self-discoverability is retired.
insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
select p.user_id,'talent_discovery_policy','Talent Discovery now requires WOMATE approval',
'WOMATE has tightened Talent Discovery. Profiles are no longer shown through self-discoverability alone. To appear, you must be approved by Admin, have either all five modules completed or a WOMATE-approved Mission Completed record, and complete your professional profile with an image, headline and climate interests. If WOMATE approves you, you will receive a separate notification with the next steps.',
'/canopy/talent','talent-discovery-policy-20261009:'||p.user_id::text
from public.canopy_profiles p where p.role='learner'
on conflict(fingerprint) do nothing;

reset lock_timeout;
reset statement_timeout;
