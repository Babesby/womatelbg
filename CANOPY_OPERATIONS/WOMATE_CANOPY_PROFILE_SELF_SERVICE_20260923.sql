-- WOMATE CANOPY · PARTICIPANT PROFILE SELF-SERVICE · 23 SEP 2026
begin;

create table if not exists public.canopy_profile_name_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  old_name text,
  new_name text not null,
  changed_at timestamptz not null default now()
);
create index if not exists canopy_profile_name_changes_user_idx
on public.canopy_profile_name_changes(user_id,changed_at desc);
revoke all on public.canopy_profile_name_changes from public,anon,authenticated;

create table if not exists public.canopy_account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  email text,
  reason text,
  status text not null default 'requested'
    check(status in ('requested','cancelled','completed','declined')),
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists canopy_account_deletion_requests_status_idx
on public.canopy_account_deletion_requests(status,requested_at desc);
alter table public.canopy_account_deletion_requests enable row level security;
revoke all on public.canopy_account_deletion_requests from public,anon,authenticated;

create or replace function public.canopy_update_own_profile_name(p_full_name text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  uid uuid:=auth.uid();
  cleaned text;
  old_name text;
  user_role text;
begin
  if uid is null then raise exception 'Not signed in.'; end if;
  cleaned:=regexp_replace(trim(coalesce(p_full_name,'')),'\s+',' ','g');
  if char_length(cleaned)<2 then raise exception 'Enter your full name.'; end if;
  if char_length(cleaned)>120 then raise exception 'Name is too long.'; end if;

  select role,full_name into user_role,old_name
  from public.canopy_profiles
  where user_id=uid;

  if user_role is null then raise exception 'Canopy profile not found.'; end if;
  if user_role not in ('learner','tester') then
    raise exception 'Participant profile editing is not available for this account.';
  end if;

  if exists(select 1 from public.canopy_certificates where user_id=uid) then
    raise exception 'A certificate has already been issued for this account. Contact WOMATE Support to correct the certificate name.';
  end if;

  if cleaned is not distinct from old_name then
    return jsonb_build_object('ok',true,'full_name',cleaned,'changed',false);
  end if;

  update public.canopy_profiles set full_name=cleaned where user_id=uid;

  update auth.users
  set raw_user_meta_data=coalesce(raw_user_meta_data,'{}'::jsonb)||jsonb_build_object('full_name',cleaned)
  where id=uid;

  insert into public.canopy_profile_name_changes(user_id,old_name,new_name)
  values(uid,old_name,cleaned);

  return jsonb_build_object('ok',true,'full_name',cleaned,'changed',true);
end;
$$;
revoke all on function public.canopy_update_own_profile_name(text) from public;
grant execute on function public.canopy_update_own_profile_name(text) to authenticated;

create or replace function public.canopy_get_own_account_deletion_request()
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  uid uuid:=auth.uid();
  row_data jsonb;
begin
  if uid is null then raise exception 'Not signed in.'; end if;
  select to_jsonb(r) into row_data
  from (
    select id,status,reason,requested_at,updated_at,completed_at
    from public.canopy_account_deletion_requests
    where user_id=uid
    limit 1
  ) r;
  return coalesce(row_data,'null'::jsonb);
end;
$$;
revoke all on function public.canopy_get_own_account_deletion_request() from public;
grant execute on function public.canopy_get_own_account_deletion_request() to authenticated;

create or replace function public.canopy_request_own_account_deletion(p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  uid uuid:=auth.uid();
  user_role text;
  user_email text;
  request_id uuid;
begin
  if uid is null then raise exception 'Not signed in.'; end if;

  select role into user_role from public.canopy_profiles where user_id=uid;
  if user_role is distinct from 'learner' then
    raise exception 'Self-service deletion requests are available to learner accounts only.';
  end if;

  select email into user_email from auth.users where id=uid;

  insert into public.canopy_account_deletion_requests(
    user_id,email,reason,status,requested_at,updated_at,completed_at
  )
  values(uid,user_email,nullif(trim(coalesce(p_reason,'')),''),'requested',now(),now(),null)
  on conflict(user_id) do update
  set email=excluded.email,
      reason=excluded.reason,
      status='requested',
      requested_at=now(),
      updated_at=now(),
      completed_at=null
  returning id into request_id;

  update public.canopy_enrollments
  set status='paused'
  where user_id=uid and status='active';

  return jsonb_build_object(
    'ok',true,
    'request_id',request_id,
    'status','requested',
    'message','Your deletion request has been recorded and your Canopy course access has been paused.'
  );
end;
$$;
revoke all on function public.canopy_request_own_account_deletion(text) from public;
grant execute on function public.canopy_request_own_account_deletion(text) to authenticated;

commit;
