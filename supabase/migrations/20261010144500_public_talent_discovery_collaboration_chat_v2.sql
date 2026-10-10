set lock_timeout='8s';
set statement_timeout='120s';
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

alter table public.canopy_talent_settings add column if not exists public_slug text;
update public.canopy_talent_settings t
set public_slug=trim(both '-' from lower(regexp_replace(coalesce(p.full_name,'talent'),'[^a-zA-Z0-9]+','-','g')))||'-'||substr(md5(t.user_id::text),1,16)
from public.canopy_profiles p
where p.user_id=t.user_id and nullif(trim(t.public_slug),'') is null;
update public.canopy_talent_settings
set public_slug='talent-'||substr(md5(user_id::text),1,16)
where nullif(trim(public_slug),'') is null;
create unique index if not exists canopy_talent_settings_public_slug_uidx on public.canopy_talent_settings(public_slug);
create index if not exists canopy_profiles_full_name_trgm_idx on public.canopy_profiles using gin(full_name gin_trgm_ops);
create index if not exists canopy_profiles_country_trgm_idx on public.canopy_profiles using gin(country gin_trgm_ops);
create index if not exists canopy_talent_settings_headline_trgm_idx on public.canopy_talent_settings using gin(headline gin_trgm_ops);

create or replace function public.canopy_talent_assign_public_slug()
returns trigger language plpgsql security definer set search_path=public as $$
declare n text;
begin
 if nullif(trim(new.public_slug),'') is null then
  select trim(both '-' from lower(regexp_replace(coalesce(p.full_name,'talent'),'[^a-zA-Z0-9]+','-','g'))) into n from public.canopy_profiles p where p.user_id=new.user_id;
  new.public_slug:=coalesce(nullif(n,''),'talent')||'-'||substr(md5(new.user_id::text),1,16);
 end if;
 return new;
end;$$;
drop trigger if exists canopy_talent_assign_public_slug_trg on public.canopy_talent_settings;
create trigger canopy_talent_assign_public_slug_trg before insert or update of public_slug on public.canopy_talent_settings for each row execute function public.canopy_talent_assign_public_slug();

create table if not exists public.canopy_public_collaboration_requests(
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references auth.users(id) on delete cascade,
 requester_name text not null,
 requester_email text not null,
 requester_organization text,
 initial_message text not null,
 access_token_hash text not null,
 status text not null default 'pending' check(status in('pending','accepted','declined','closed')),
 consent_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 responded_at timestamptz,
 last_activity_at timestamptz not null default now()
);
create index if not exists canopy_public_collab_recipient_idx on public.canopy_public_collaboration_requests(recipient_id,status,last_activity_at desc);
create index if not exists canopy_public_collab_email_idx on public.canopy_public_collaboration_requests(lower(requester_email),created_at desc);

create table if not exists public.canopy_public_collaboration_messages(
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references public.canopy_public_collaboration_requests(id) on delete cascade,
 sender_kind text not null check(sender_kind in('visitor','participant','system')),
 sender_user_id uuid references auth.users(id) on delete set null,
 body text not null,
 created_at timestamptz not null default now()
);
create index if not exists canopy_public_collab_messages_idx on public.canopy_public_collaboration_messages(request_id,created_at);

alter table public.canopy_public_collaboration_requests enable row level security;
alter table public.canopy_public_collaboration_messages enable row level security;
revoke all on public.canopy_public_collaboration_requests,public.canopy_public_collaboration_messages from anon,authenticated;

create or replace function public.canopy_public_talent_directory(p_query text default null,p_after_slug text default null,p_limit integer default 24)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare lim integer:=least(greatest(coalesce(p_limit,24),1),48); q text:=nullif(trim(coalesce(p_query,'')),''); result jsonb;
begin
 with base as(
  select p.user_id,p.full_name,p.country,t.public_slug slug,t.headline,t.climate_interests,t.avatar_path,t.collaboration_open,
    public.canopy_talent_completed_modules(p.user_id)>=5 all_modules_completed,
    public.canopy_talent_mission_completed(p.user_id) mission_completed,
    public.canopy_talent_final_team_completed(p.user_id) final_team_completed,
    (select count(*)::integer from public.canopy_spotlight_nominations n join public.canopy_assignment_submissions s on s.id=n.submission_id where s.user_id=p.user_id and n.status='featured') spotlight_count
  from public.canopy_profiles p join public.canopy_talent_settings t on t.user_id=p.user_id
  where p.role='learner' and public.canopy_talent_is_visible(p.user_id) and t.public_slug is not null
    and (q is null or p.full_name ilike '%'||q||'%' or p.country ilike '%'||q||'%' or t.headline ilike '%'||q||'%' or exists(select 1 from unnest(t.climate_interests) i where i ilike '%'||q||'%'))
    and (p_after_slug is null or t.public_slug>p_after_slug)
  order by t.public_slug
  limit lim+1
 ), page as(select * from base order by slug limit lim)
 select jsonb_build_object(
   'items',coalesce((select jsonb_agg(to_jsonb(page) order by slug) from page),'[]'::jsonb),
   'has_more',(select count(*) from base)>lim,
   'next_cursor',(select slug from page order by slug desc limit 1)
 ) into result;
 return result;
end;$$;
revoke all on function public.canopy_public_talent_directory(text,text,integer) from public;
grant execute on function public.canopy_public_talent_directory(text,text,integer) to anon,authenticated;

create or replace function public.canopy_public_talent_profile(p_slug text)
returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce((select jsonb_build_object(
  'slug',t.public_slug,'full_name',p.full_name,'country',p.country,'headline',t.headline,'climate_interests',t.climate_interests,
  'avatar_path',t.avatar_path,'collaboration_open',t.collaboration_open,
  'all_modules_completed',public.canopy_talent_completed_modules(p.user_id)>=5,
  'mission_completed',public.canopy_talent_mission_completed(p.user_id),
  'final_team_completed',public.canopy_talent_final_team_completed(p.user_id),
  'spotlight_count',(select count(*)::integer from public.canopy_spotlight_nominations n join public.canopy_assignment_submissions s on s.id=n.submission_id where s.user_id=p.user_id and n.status='featured')
 ) from public.canopy_profiles p join public.canopy_talent_settings t on t.user_id=p.user_id
 where p.role='learner' and public.canopy_talent_is_visible(p.user_id) and t.public_slug=trim(lower(p_slug)) limit 1),'{}'::jsonb);
$$;
revoke all on function public.canopy_public_talent_profile(text) from public;
grant execute on function public.canopy_public_talent_profile(text) to anon,authenticated;

create or replace function public.canopy_public_submit_collaboration_request(p_slug text,p_name text,p_email text,p_organization text,p_message text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare recipient uuid; recipient_name text; rid uuid; raw_token text; clean_name text:=trim(coalesce(p_name,'')); clean_email text:=lower(trim(coalesce(p_email,''))); clean_org text:=nullif(trim(coalesce(p_organization,'')),''); clean_message text:=trim(coalesce(p_message,'')); hourly integer; daily integer;
begin
 if length(clean_name)<2 or length(clean_name)>120 then raise exception 'Enter your full name.'; end if;
 if length(clean_email)>160 or clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid email address.'; end if;
 if clean_org is not null and length(clean_org)>160 then raise exception 'Organisation or role is too long.'; end if;
 if length(clean_message)<20 then raise exception 'Please add a little more detail about the collaboration.'; end if;
 if length(clean_message)>1500 then raise exception 'Collaboration message is too long.'; end if;

 select p.user_id,p.full_name into recipient,recipient_name
 from public.canopy_profiles p join public.canopy_talent_settings t on t.user_id=p.user_id
 where p.role='learner' and public.canopy_talent_is_visible(p.user_id) and t.collaboration_open=true and t.public_slug=trim(lower(p_slug))
 limit 1;
 if recipient is null then raise exception 'This participant is not currently accepting public collaboration requests.'; end if;

 select count(*) into hourly from public.canopy_public_collaboration_requests where requester_email=clean_email and created_at>now()-interval '1 hour';
 select count(*) into daily from public.canopy_public_collaboration_requests where requester_email=clean_email and created_at>now()-interval '24 hours';
 if hourly>=3 or daily>=8 then raise exception 'Please wait before sending another collaboration request.'; end if;
 if exists(select 1 from public.canopy_public_collaboration_requests where recipient_id=recipient and requester_email=clean_email and status='pending' and created_at>now()-interval '7 days') then raise exception 'You already have a pending collaboration request with this participant.'; end if;

 raw_token:=encode(gen_random_bytes(32),'hex');
 insert into public.canopy_public_collaboration_requests(recipient_id,requester_name,requester_email,requester_organization,initial_message,access_token_hash)
 values(recipient,left(clean_name,120),clean_email,left(clean_org,160),left(clean_message,1500),encode(digest(raw_token,'sha256'),'hex')) returning id into rid;
 insert into public.canopy_public_collaboration_messages(request_id,sender_kind,body) values(rid,'visitor',left(clean_message,1500));
 insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
 values(recipient,'external_collaboration_request','New public Talent Discovery collaboration request',clean_name||case when clean_org is not null then ' from '||clean_org else '' end||' has requested a collaboration through your public WOMATE Talent Discovery profile.','/canopy/talent','public-talent-collab:'||rid::text)
 on conflict(fingerprint) do nothing;
 return jsonb_build_object('id',rid,'token',raw_token,'status','pending','recipient_name',recipient_name);
end;$$;
revoke all on function public.canopy_public_submit_collaboration_request(text,text,text,text,text) from public;
grant execute on function public.canopy_public_submit_collaboration_request(text,text,text,text,text) to anon,authenticated;

create or replace function public.canopy_public_collaboration_thread(p_request uuid,p_token text)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare r public.canopy_public_collaboration_requests%rowtype; recipient_name text;
begin
 select * into r from public.canopy_public_collaboration_requests where id=p_request and access_token_hash=encode(digest(coalesce(p_token,''),'sha256'),'hex');
 if r.id is null then raise exception 'Collaboration request access is unavailable.'; end if;
 select full_name into recipient_name from public.canopy_profiles where user_id=r.recipient_id;
 return jsonb_build_object('id',r.id,'status',r.status,'recipient_name',recipient_name,'created_at',r.created_at,'responded_at',r.responded_at,
  'messages',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'sender_kind',m.sender_kind,'body',m.body,'created_at',m.created_at) order by m.created_at) from public.canopy_public_collaboration_messages m where m.request_id=r.id),'[]'::jsonb));
end;$$;
revoke all on function public.canopy_public_collaboration_thread(uuid,text) from public;
grant execute on function public.canopy_public_collaboration_thread(uuid,text) to anon,authenticated;

create or replace function public.canopy_public_collaboration_send_message(p_request uuid,p_token text,p_message text)
returns uuid language plpgsql security definer set search_path=public as $$
declare r public.canopy_public_collaboration_requests%rowtype; mid uuid; clean text:=trim(coalesce(p_message,'')); recent integer;
begin
 select * into r from public.canopy_public_collaboration_requests where id=p_request and access_token_hash=encode(digest(coalesce(p_token,''),'sha256'),'hex');
 if r.id is null then raise exception 'Collaboration request access is unavailable.'; end if;
 if r.status<>'accepted' then raise exception 'Chat becomes available after the collaboration request is accepted.'; end if;
 if length(clean)<1 or length(clean)>1200 then raise exception 'Message must be between 1 and 1200 characters.'; end if;
 select count(*) into recent from public.canopy_public_collaboration_messages where request_id=r.id and sender_kind='visitor' and created_at>now()-interval '5 minutes';
 if recent>=8 then raise exception 'Please wait a moment before sending more messages.'; end if;
 insert into public.canopy_public_collaboration_messages(request_id,sender_kind,body) values(r.id,'visitor',clean) returning id into mid;
 update public.canopy_public_collaboration_requests set last_activity_at=now() where id=r.id;
 insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
 values(r.recipient_id,'external_collaboration_message','New Talent Discovery chat message',r.requester_name||' sent you a new collaboration message.','/canopy/talent','public-talent-chat:'||mid::text)
 on conflict(fingerprint) do nothing;
 return mid;
end;$$;
revoke all on function public.canopy_public_collaboration_send_message(uuid,text,text) from public;
grant execute on function public.canopy_public_collaboration_send_message(uuid,text,text) to anon,authenticated;

create or replace function public.canopy_get_external_collaboration_requests()
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
begin
 if auth.uid() is null then raise exception 'Not signed in.'; end if;
 return jsonb_build_object('requests',coalesce((select jsonb_agg(to_jsonb(q) order by q.sort_pending,q.last_activity_at desc) from(
  select r.id,r.requester_name,r.requester_email,r.requester_organization,r.initial_message message,r.status,r.created_at,r.responded_at,r.last_activity_at,
    case when r.status='pending' then 0 else 1 end sort_pending,
    (select m.body from public.canopy_public_collaboration_messages m where m.request_id=r.id order by m.created_at desc limit 1) last_message
  from public.canopy_public_collaboration_requests r
  where r.recipient_id=auth.uid() and r.status in('pending','accepted')
  order by case when r.status='pending' then 0 else 1 end,r.last_activity_at desc limit 100
 )q),'[]'::jsonb));
end;$$;
revoke all on function public.canopy_get_external_collaboration_requests() from public;
grant execute on function public.canopy_get_external_collaboration_requests() to authenticated;

create or replace function public.canopy_get_external_collaboration_thread(p_request uuid)
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare r public.canopy_public_collaboration_requests%rowtype;
begin
 if auth.uid() is null then raise exception 'Not signed in.'; end if;
 select * into r from public.canopy_public_collaboration_requests where id=p_request and recipient_id=auth.uid();
 if r.id is null then raise exception 'Collaboration thread unavailable.'; end if;
 return jsonb_build_object('id',r.id,'requester_name',r.requester_name,'requester_email',r.requester_email,'requester_organization',r.requester_organization,'status',r.status,
  'messages',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'sender_kind',m.sender_kind,'body',m.body,'created_at',m.created_at) order by m.created_at) from public.canopy_public_collaboration_messages m where m.request_id=r.id),'[]'::jsonb));
end;$$;
revoke all on function public.canopy_get_external_collaboration_thread(uuid) from public;
grant execute on function public.canopy_get_external_collaboration_thread(uuid) to authenticated;

create or replace function public.canopy_respond_external_collaboration_request(p_request uuid,p_accept boolean)
returns void language plpgsql security definer set search_path=public,auth as $$
declare r public.canopy_public_collaboration_requests%rowtype; next_status text;
begin
 if auth.uid() is null then raise exception 'Not signed in.'; end if;
 select * into r from public.canopy_public_collaboration_requests where id=p_request and recipient_id=auth.uid() and status='pending';
 if r.id is null then raise exception 'Public collaboration request is no longer available.'; end if;
 next_status:=case when coalesce(p_accept,false) then 'accepted' else 'declined' end;
 update public.canopy_public_collaboration_requests set status=next_status,responded_at=now(),last_activity_at=now() where id=r.id;
 if next_status='accepted' then insert into public.canopy_public_collaboration_messages(request_id,sender_kind,sender_user_id,body) values(r.id,'system',auth.uid(),'Your collaboration request has been accepted. You can now continue the conversation here.'); end if;
end;$$;
revoke all on function public.canopy_respond_external_collaboration_request(uuid,boolean) from public;
grant execute on function public.canopy_respond_external_collaboration_request(uuid,boolean) to authenticated;

create or replace function public.canopy_send_external_collaboration_message(p_request uuid,p_message text)
returns uuid language plpgsql security definer set search_path=public,auth as $$
declare r public.canopy_public_collaboration_requests%rowtype; clean text:=trim(coalesce(p_message,'')); mid uuid;
begin
 if auth.uid() is null then raise exception 'Not signed in.'; end if;
 select * into r from public.canopy_public_collaboration_requests where id=p_request and recipient_id=auth.uid() and status='accepted';
 if r.id is null then raise exception 'Accepted collaboration thread not found.'; end if;
 if length(clean)<1 or length(clean)>1200 then raise exception 'Message must be between 1 and 1200 characters.'; end if;
 insert into public.canopy_public_collaboration_messages(request_id,sender_kind,sender_user_id,body) values(r.id,'participant',auth.uid(),clean) returning id into mid;
 update public.canopy_public_collaboration_requests set last_activity_at=now() where id=r.id;
 return mid;
end;$$;
revoke all on function public.canopy_send_external_collaboration_message(uuid,text) from public;
grant execute on function public.canopy_send_external_collaboration_message(uuid,text) to authenticated;

reset lock_timeout;
reset statement_timeout;
