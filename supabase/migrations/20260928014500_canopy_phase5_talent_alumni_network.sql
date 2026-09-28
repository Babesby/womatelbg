-- WOMATE Canopy Phase 5: participant-controlled talent + alumni network
set lock_timeout='8s';
set statement_timeout='90s';
create extension if not exists pgcrypto;

create table if not exists public.canopy_talent_settings(
  user_id uuid primary key references auth.users(id) on delete cascade,
  discoverable boolean not null default false,
  mentor_available boolean not null default false,
  collaboration_open boolean not null default false,
  headline text,
  climate_interests text[] not null default '{}',
  moderation_note text,
  updated_at timestamptz not null default now()
);
create table if not exists public.canopy_collaboration_requests(
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  status text not null default 'pending' check(status in('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check(requester_id<>recipient_id)
);
create index if not exists canopy_collab_recipient_idx on public.canopy_collaboration_requests(recipient_id,status,created_at desc);
create index if not exists canopy_collab_requester_idx on public.canopy_collaboration_requests(requester_id,status,created_at desc);
alter table public.canopy_talent_settings enable row level security;
alter table public.canopy_collaboration_requests enable row level security;
revoke all on public.canopy_talent_settings,public.canopy_collaboration_requests from anon,authenticated;

create or replace function public.canopy_talent_completed_modules(p_user uuid)
returns integer language sql stable security definer set search_path=public as $$
with ranked as(
 select s.week_key,s.assessment_status,row_number() over(partition by s.week_key order by s.submitted_at desc,s.id desc) rn
 from public.canopy_assignment_submissions s where s.user_id=p_user
) select count(*)::integer from ranked where rn=1 and assessment_status='completed';
$$;
revoke all on function public.canopy_talent_completed_modules(uuid) from public;

create or replace function public.canopy_get_talent_network()
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare own public.canopy_talent_settings%rowtype; result jsonb; completed integer:=0; alum boolean:=false;
begin
 if auth.uid() is null then raise exception 'Not signed in.'; end if;
 insert into public.canopy_talent_settings(user_id) values(auth.uid()) on conflict(user_id) do nothing;
 select * into own from public.canopy_talent_settings where user_id=auth.uid();
 completed:=public.canopy_talent_completed_modules(auth.uid()); alum:=completed>=5;
 select jsonb_build_object(
  'me',jsonb_build_object('discoverable',own.discoverable,'mentor_available',own.mentor_available and alum,'collaboration_open',own.collaboration_open,'headline',own.headline,'climate_interests',own.climate_interests,'completed_modules',completed,'alumni',alum),
  'directory',coalesce((select jsonb_agg(to_jsonb(q) order by q.alumni desc,q.full_name) from(
    select p.user_id,p.full_name,p.country,t.headline,t.climate_interests,t.collaboration_open,
      (t.mentor_available and public.canopy_talent_completed_modules(p.user_id)>=5) mentor_available,
      public.canopy_talent_completed_modules(p.user_id) completed_modules,
      (public.canopy_talent_completed_modules(p.user_id)>=5) alumni,
      (select count(*)::integer from public.canopy_spotlight_nominations n join public.canopy_assignment_submissions s on s.id=n.submission_id where s.user_id=p.user_id and n.status='featured') spotlight_count,
      exists(select 1 from public.canopy_mission_group_members m join public.canopy_mission_groups g on g.id=m.group_id where m.user_id=p.user_id and m.invitation_status='accepted' and g.status='verified') verified_mission
    from public.canopy_profiles p join public.canopy_talent_settings t on t.user_id=p.user_id
    where p.role='learner' and t.discoverable=true and p.user_id<>auth.uid()
  )q),'[]'::jsonb),
  'incoming',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'requester_id',r.requester_id,'requester_name',p.full_name,'requester_country',p.country,'message',r.message,'created_at',r.created_at) order by r.created_at desc) from public.canopy_collaboration_requests r join public.canopy_profiles p on p.user_id=r.requester_id where r.recipient_id=auth.uid() and r.status='pending'),'[]'::jsonb),
  'outgoing',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'recipient_id',r.recipient_id,'recipient_name',p.full_name,'status',r.status,'message',r.message,'created_at',r.created_at) order by r.created_at desc) from public.canopy_collaboration_requests r join public.canopy_profiles p on p.user_id=r.recipient_id where r.requester_id=auth.uid()),'[]'::jsonb)
 ) into result;
 return result;
end;$$;
revoke all on function public.canopy_get_talent_network() from public;
grant execute on function public.canopy_get_talent_network() to authenticated;

create or replace function public.canopy_save_talent_settings(p_discoverable boolean,p_mentor_available boolean,p_collaboration_open boolean,p_headline text,p_interests text[])
returns void language plpgsql security definer set search_path=public,auth as $$
declare completed integer;
begin
 if auth.uid() is null then raise exception 'Not signed in.'; end if;
 completed:=public.canopy_talent_completed_modules(auth.uid());
 insert into public.canopy_talent_settings(user_id,discoverable,mentor_available,collaboration_open,headline,climate_interests,updated_at)
 values(auth.uid(),coalesce(p_discoverable,false),coalesce(p_mentor_available,false) and completed>=5,coalesce(p_collaboration_open,false),nullif(left(trim(coalesce(p_headline,'')),120),''),coalesce(p_interests,'{}'),now())
 on conflict(user_id) do update set discoverable=excluded.discoverable,mentor_available=excluded.mentor_available,collaboration_open=excluded.collaboration_open,headline=excluded.headline,climate_interests=excluded.climate_interests,updated_at=now();
end;$$;
revoke all on function public.canopy_save_talent_settings(boolean,boolean,boolean,text,text[]) from public;
grant execute on function public.canopy_save_talent_settings(boolean,boolean,boolean,text,text[]) to authenticated;

create or replace function public.canopy_send_collaboration_request(p_recipient uuid,p_message text)
returns uuid language plpgsql security definer set search_path=public,auth as $$
declare rid uuid; clean text:=trim(coalesce(p_message,''));
begin
 if auth.uid() is null then raise exception 'Not signed in.'; end if;
 if p_recipient=auth.uid() then raise exception 'You cannot request collaboration with yourself.'; end if;
 if length(clean)<5 then raise exception 'Add a short collaboration note.'; end if;
 if not exists(select 1 from public.canopy_talent_settings where user_id=p_recipient and discoverable=true and collaboration_open=true) then raise exception 'This participant is not accepting collaboration requests.'; end if;
 if exists(select 1 from public.canopy_collaboration_requests where requester_id=auth.uid() and recipient_id=p_recipient and status='pending') then raise exception 'You already have a pending request with this participant.'; end if;
 insert into public.canopy_collaboration_requests(requester_id,recipient_id,message) values(auth.uid(),p_recipient,left(clean,600)) returning id into rid;
 insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
 select p_recipient,'collaboration_request','New Canopy collaboration request',coalesce(p.full_name,'A Canopy participant')||' would like to collaborate with you.','/canopy/talent','talent-collab:'||rid::text from public.canopy_profiles p where p.user_id=auth.uid()
 on conflict(fingerprint) do nothing;
 return rid;
end;$$;
revoke all on function public.canopy_send_collaboration_request(uuid,text) from public;
grant execute on function public.canopy_send_collaboration_request(uuid,text) to authenticated;

create or replace function public.canopy_respond_collaboration_request(p_request uuid,p_accept boolean)
returns void language plpgsql security definer set search_path=public,auth as $$
declare r public.canopy_collaboration_requests%rowtype; clean text;
begin
 select * into r from public.canopy_collaboration_requests where id=p_request and recipient_id=auth.uid() and status='pending';
 if r.id is null then raise exception 'Collaboration request unavailable.'; end if;
 clean:=case when coalesce(p_accept,false) then 'accepted' else 'declined' end;
 update public.canopy_collaboration_requests set status=clean,responded_at=now() where id=r.id;
 insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
 values(r.requester_id,'collaboration_response',case when clean='accepted' then 'Collaboration request accepted' else 'Collaboration request update' end,case when clean='accepted' then 'Your Canopy collaboration request was accepted. Continue coordinating through the programme and mutually agreed channels.' else 'Your Canopy collaboration request was declined.' end,'/canopy/talent','talent-collab-response:'||r.id::text)
 on conflict(fingerprint) do update set title=excluded.title,body=excluded.body,read_at=null,created_at=now();
end;$$;
revoke all on function public.canopy_respond_collaboration_request(uuid,boolean) from public;
grant execute on function public.canopy_respond_collaboration_request(uuid,boolean) to authenticated;

create or replace function public.canopy_admin_talent_network()
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
begin
 if not public.canopy_is_manager(auth.uid()) then raise exception 'Manager access required.'; end if;
 return jsonb_build_object('discoverable_count',(select count(*) from public.canopy_talent_settings where discoverable=true),'rows',coalesce((select jsonb_agg(to_jsonb(q) order by q.discoverable desc,q.full_name) from(
  select p.user_id,p.full_name,p.country,coalesce(t.discoverable,false) discoverable,coalesce(t.mentor_available,false) and public.canopy_talent_completed_modules(p.user_id)>=5 mentor_available,coalesce(t.collaboration_open,false) collaboration_open,t.headline,t.climate_interests,public.canopy_talent_completed_modules(p.user_id) completed_modules,public.canopy_talent_completed_modules(p.user_id)>=5 alumni,(select count(*)::integer from public.canopy_spotlight_nominations n join public.canopy_assignment_submissions s on s.id=n.submission_id where s.user_id=p.user_id and n.status='featured') spotlight_count,exists(select 1 from public.canopy_mission_group_members m join public.canopy_mission_groups g on g.id=m.group_id where m.user_id=p.user_id and m.invitation_status='accepted' and g.status='verified') verified_mission from public.canopy_profiles p left join public.canopy_talent_settings t on t.user_id=p.user_id where p.role='learner'
 )q),'[]'::jsonb));
end;$$;
revoke all on function public.canopy_admin_talent_network() from public;
grant execute on function public.canopy_admin_talent_network() to authenticated;

create or replace function public.canopy_admin_set_talent_visibility(p_user uuid,p_discoverable boolean,p_remark text)
returns void language plpgsql security definer set search_path=public,auth as $$
begin
 if not public.canopy_is_manager(auth.uid()) then raise exception 'Manager access required.'; end if;
 insert into public.canopy_talent_settings(user_id,discoverable,moderation_note,updated_at) values(p_user,coalesce(p_discoverable,false),nullif(trim(coalesce(p_remark,'')),''),now()) on conflict(user_id) do update set discoverable=excluded.discoverable,moderation_note=excluded.moderation_note,updated_at=now();
 insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint) values(p_user,'talent_visibility','Canopy talent profile visibility updated',case when p_discoverable then 'WOMATE has restored your talent profile visibility.' else 'WOMATE has hidden your talent profile from the participant directory. Your private Canopy data is unchanged.' end,'/canopy/talent','talent-visibility:'||p_user::text) on conflict(fingerprint) do update set body=excluded.body,read_at=null,created_at=now();
end;$$;
revoke all on function public.canopy_admin_set_talent_visibility(uuid,boolean,text) from public;
grant execute on function public.canopy_admin_set_talent_visibility(uuid,boolean,text) to authenticated;
