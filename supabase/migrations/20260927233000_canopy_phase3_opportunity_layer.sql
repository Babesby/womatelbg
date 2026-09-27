-- WOMATE Canopy Phase 3: human-curated opportunity layer
set lock_timeout='8s';
set statement_timeout='90s';
create extension if not exists pgcrypto;

create table if not exists public.canopy_opportunities(
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organization text not null,
  opportunity_type text not null default 'other' check(opportunity_type in ('job','internship','fellowship','grant','scholarship','consultancy','conference','volunteer','other')),
  summary text not null,
  url text not null,
  location text,
  country text,
  global boolean not null default false,
  compensation text,
  deadline_at timestamptz,
  min_module_no integer not null default 0 check(min_module_no between 0 and 5),
  requires_spotlight boolean not null default false,
  requires_verified_mission boolean not null default false,
  featured boolean not null default false,
  published boolean not null default false,
  archived boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index if not exists canopy_opportunities_live_idx on public.canopy_opportunities(published,archived,deadline_at);

create table if not exists public.canopy_opportunity_saves(
  opportunity_id uuid not null references public.canopy_opportunities(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key(opportunity_id,user_id)
);
create index if not exists canopy_opportunity_saves_user_idx on public.canopy_opportunity_saves(user_id,created_at desc);

alter table public.canopy_opportunities enable row level security;
alter table public.canopy_opportunity_saves enable row level security;
revoke all on public.canopy_opportunities,public.canopy_opportunity_saves from anon,authenticated;

create or replace function public.canopy_opportunity_matches(p_user uuid,p_opportunity uuid)
returns boolean language plpgsql stable security definer set search_path=public,auth as $$
declare
  o public.canopy_opportunities%rowtype;
  learner_country text;
  completed_modules integer:=0;
  spotlight_count integer:=0;
  mission_ok boolean:=false;
begin
  select * into o from public.canopy_opportunities where id=p_opportunity and published=true and archived=false;
  if o.id is null then return false; end if;
  select country into learner_country from public.canopy_profiles where user_id=p_user;
  with ranked as (
    select s.week_key,s.assessment_status,row_number() over(partition by s.week_key order by s.submitted_at desc,s.id desc) rn
    from public.canopy_assignment_submissions s where s.user_id=p_user
  ) select count(*) into completed_modules from ranked where rn=1 and assessment_status='completed';
  select count(*) into spotlight_count
  from public.canopy_spotlight_nominations n join public.canopy_assignment_submissions s on s.id=n.submission_id
  where s.user_id=p_user and n.status='featured';
  select exists(
    select 1 from public.canopy_mission_group_members m join public.canopy_mission_groups g on g.id=m.group_id
    where m.user_id=p_user and m.invitation_status='accepted' and g.status='verified'
  ) into mission_ok;
  return (o.global or nullif(trim(coalesce(o.country,'')),'') is null or lower(trim(o.country))=lower(trim(coalesce(learner_country,''))))
    and completed_modules>=coalesce(o.min_module_no,0)
    and (not o.requires_spotlight or spotlight_count>0)
    and (not o.requires_verified_mission or mission_ok);
end;$$;
revoke all on function public.canopy_opportunity_matches(uuid,uuid) from public;

create or replace function public.canopy_get_my_opportunities()
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare
  learner_country text;
  completed_modules integer:=0;
  spotlight_count integer:=0;
  mission_ok boolean:=false;
  items jsonb;
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  select country into learner_country from public.canopy_profiles where user_id=auth.uid();
  with ranked as (
    select s.week_key,s.assessment_status,row_number() over(partition by s.week_key order by s.submitted_at desc,s.id desc) rn
    from public.canopy_assignment_submissions s where s.user_id=auth.uid()
  ) select count(*) into completed_modules from ranked where rn=1 and assessment_status='completed';
  select count(*) into spotlight_count
  from public.canopy_spotlight_nominations n join public.canopy_assignment_submissions s on s.id=n.submission_id
  where s.user_id=auth.uid() and n.status='featured';
  select exists(
    select 1 from public.canopy_mission_group_members m join public.canopy_mission_groups g on g.id=m.group_id
    where m.user_id=auth.uid() and m.invitation_status='accepted' and g.status='verified'
  ) into mission_ok;
  select coalesce(jsonb_agg(to_jsonb(q) order by q.matched desc,q.featured desc,coalesce(q.deadline_at,'9999-12-31'::timestamptz),q.created_at desc),'[]'::jsonb)
  into items from (
    select o.*,public.canopy_opportunity_matches(auth.uid(),o.id) matched,
      exists(select 1 from public.canopy_opportunity_saves s where s.opportunity_id=o.id and s.user_id=auth.uid()) saved
    from public.canopy_opportunities o
    where o.published=true and o.archived=false and (o.deadline_at is null or o.deadline_at>now())
  ) q;
  return jsonb_build_object('country',learner_country,'completed_modules',completed_modules,'spotlight_count',spotlight_count,'verified_mission',mission_ok,'opportunities',items);
end;$$;
revoke all on function public.canopy_get_my_opportunities() from public;
grant execute on function public.canopy_get_my_opportunities() to authenticated;

create or replace function public.canopy_toggle_opportunity_save(p_opportunity uuid)
returns boolean language plpgsql security definer set search_path=public,auth as $$
declare exists_now boolean;
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  if not exists(select 1 from public.canopy_opportunities where id=p_opportunity and published=true and archived=false) then raise exception 'Opportunity unavailable.'; end if;
  select exists(select 1 from public.canopy_opportunity_saves where opportunity_id=p_opportunity and user_id=auth.uid()) into exists_now;
  if exists_now then delete from public.canopy_opportunity_saves where opportunity_id=p_opportunity and user_id=auth.uid(); return false;
  else insert into public.canopy_opportunity_saves(opportunity_id,user_id) values(p_opportunity,auth.uid()) on conflict do nothing; return true; end if;
end;$$;
revoke all on function public.canopy_toggle_opportunity_save(uuid) from public;
grant execute on function public.canopy_toggle_opportunity_save(uuid) to authenticated;

create or replace function public.canopy_admin_opportunities()
returns setof public.canopy_opportunities language plpgsql security definer set search_path=public,auth as $$
begin
  if not public.canopy_is_manager(auth.uid()) then raise exception 'Manager access required.'; end if;
  return query select * from public.canopy_opportunities order by archived,published desc,featured desc,created_at desc;
end;$$;
revoke all on function public.canopy_admin_opportunities() from public;
grant execute on function public.canopy_admin_opportunities() to authenticated;

create or replace function public.canopy_admin_save_opportunity(
  p_id uuid,p_title text,p_organization text,p_type text,p_summary text,p_url text,p_location text,p_country text,p_global boolean,
  p_compensation text,p_deadline_at timestamptz,p_min_module_no integer,p_requires_spotlight boolean,p_requires_verified_mission boolean,p_featured boolean,p_published boolean
) returns public.canopy_opportunities language plpgsql security definer set search_path=public,auth as $$
declare saved public.canopy_opportunities%rowtype; clean_type text:=lower(trim(coalesce(p_type,'other')));
begin
  if not public.canopy_is_manager(auth.uid()) then raise exception 'Manager access required.'; end if;
  if char_length(trim(coalesce(p_title,'')))<3 then raise exception 'Add an opportunity title.'; end if;
  if char_length(trim(coalesce(p_organization,'')))<2 then raise exception 'Add the organisation.'; end if;
  if char_length(trim(coalesce(p_summary,'')))<20 then raise exception 'Add a short useful summary.'; end if;
  if trim(coalesce(p_url,'')) !~* '^https?://' then raise exception 'Add a valid opportunity URL.'; end if;
  if clean_type not in ('job','internship','fellowship','grant','scholarship','consultancy','conference','volunteer','other') then clean_type:='other'; end if;
  if p_id is null then
    insert into public.canopy_opportunities(title,organization,opportunity_type,summary,url,location,country,global,compensation,deadline_at,min_module_no,requires_spotlight,requires_verified_mission,featured,published,published_at,created_by)
    values(trim(p_title),trim(p_organization),clean_type,trim(p_summary),trim(p_url),nullif(trim(coalesce(p_location,'')),''),nullif(trim(coalesce(p_country,'')),''),coalesce(p_global,false),nullif(trim(coalesce(p_compensation,'')),''),p_deadline_at,greatest(0,least(5,coalesce(p_min_module_no,0))),coalesce(p_requires_spotlight,false),coalesce(p_requires_verified_mission,false),coalesce(p_featured,false),coalesce(p_published,false),case when coalesce(p_published,false) then now() else null end,auth.uid()) returning * into saved;
  else
    update public.canopy_opportunities set title=trim(p_title),organization=trim(p_organization),opportunity_type=clean_type,summary=trim(p_summary),url=trim(p_url),location=nullif(trim(coalesce(p_location,'')),''),country=nullif(trim(coalesce(p_country,'')),''),global=coalesce(p_global,false),compensation=nullif(trim(coalesce(p_compensation,'')),''),deadline_at=p_deadline_at,min_module_no=greatest(0,least(5,coalesce(p_min_module_no,0))),requires_spotlight=coalesce(p_requires_spotlight,false),requires_verified_mission=coalesce(p_requires_verified_mission,false),featured=coalesce(p_featured,false),published=coalesce(p_published,false),published_at=case when coalesce(p_published,false) and published_at is null then now() when not coalesce(p_published,false) then null else published_at end,updated_at=now()
    where id=p_id returning * into saved;
    if saved.id is null then raise exception 'Opportunity not found.'; end if;
  end if;
  return saved;
end;$$;
revoke all on function public.canopy_admin_save_opportunity(uuid,text,text,text,text,text,text,text,boolean,text,timestamptz,integer,boolean,boolean,boolean,boolean) from public;
grant execute on function public.canopy_admin_save_opportunity(uuid,text,text,text,text,text,text,text,boolean,text,timestamptz,integer,boolean,boolean,boolean,boolean) to authenticated;

create or replace function public.canopy_admin_archive_opportunity(p_id uuid)
returns void language plpgsql security definer set search_path=public,auth as $$
begin
  if not public.canopy_is_manager(auth.uid()) then raise exception 'Manager access required.'; end if;
  update public.canopy_opportunities set archived=true,published=false,updated_at=now() where id=p_id;
end;$$;
revoke all on function public.canopy_admin_archive_opportunity(uuid) from public;
grant execute on function public.canopy_admin_archive_opportunity(uuid) to authenticated;

create or replace function public.canopy_admin_notify_opportunity(p_id uuid)
returns integer language plpgsql security definer set search_path=public,auth as $$
declare r record; sent integer:=0; o public.canopy_opportunities%rowtype;
begin
  if not public.canopy_is_manager(auth.uid()) then raise exception 'Manager access required.'; end if;
  select * into o from public.canopy_opportunities where id=p_id and published=true and archived=false;
  if o.id is null then raise exception 'Publish the opportunity before notifying learners.'; end if;
  for r in select p.user_id from public.canopy_profiles p where p.role='learner' and public.canopy_opportunity_matches(p.user_id,p_id)
  loop
    insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
    values(r.user_id,'opportunity_match','A Canopy opportunity may fit your profile',o.title||' from '||o.organization||' may fit evidence you have already built in Canopy. Review the details and decide whether you want to pursue it.','/canopy/opportunity-board','opportunity:'||p_id::text||':'||r.user_id::text)
    on conflict(fingerprint) do update set title=excluded.title,body=excluded.body,link=excluded.link,type=excluded.type,read_at=null;
    sent:=sent+1;
  end loop;
  return sent;
end;$$;
revoke all on function public.canopy_admin_notify_opportunity(uuid) from public;
grant execute on function public.canopy_admin_notify_opportunity(uuid) to authenticated;
