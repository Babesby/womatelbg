-- Graduate opportunities: 2026 certified graduates plus future certified 2027 cohorts.
-- Private by default; WOMATE alone decides what consented profiles to share.
create table if not exists public.womate_graduate_placement_interests(
 user_id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null check(length(full_name) between 2 and 160),
 email text not null,
 country text not null check(length(country) between 2 and 100),
 skills text[] not null default '{}',
 placement_types text[] not null default '{}',
 work_areas text[] not null default '{}',
 experience text not null default '',
 motivation text not null default '',
 available_hours integer not null check(available_hours between 1 and 40),
 availability text not null,
 portfolio_url text,
 cv_url text,
 remote_only boolean not null default true,
 consent_share boolean not null default false,
 state text not null default 'submitted' check(state in ('submitted','shortlisted','matched','placed','closed')),
 internal_notes text not null default '',
 partner_name text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.womate_graduate_placement_interests enable row level security;
revoke all on public.womate_graduate_placement_interests from anon,authenticated,public;
create or replace function private.womate_is_verified_graduate(p_user uuid)
returns boolean language sql stable security definer set search_path=public,auth,private,pg_temp as $$
 select p_user is not null and (
 exists(select 1 from public.canopy_graduation_2026_approvals x where x.user_id=p_user and x.graduated=true)
 or exists(select 1 from public.womate_c2_graduation_release x where x.user_id=p_user)
 or exists(select 1 from public.canopy_certificates c where c.user_id=p_user
   and (c.cohort_key='she-leads-climate-c2-2026'
     or c.cohort_key in ('she-leads-climate-c3-2027','she-leads-asia-c1-2027')))
 );
$$;
revoke all on function private.womate_is_verified_graduate(uuid) from public,anon,authenticated;

create or replace function public.womate_my_graduate_placement_opportunity()
returns jsonb language plpgsql security definer set search_path=public,auth,private,pg_temp as $$
declare me uuid:=auth.uid(); existing public.womate_graduate_placement_interests%rowtype;
begin
 if me is null then raise exception 'Sign in to Canopy'; end if;
 if not private.womate_is_verified_graduate(me) then
   return jsonb_build_object('eligible',false,'applied',false);
 end if;
 insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
 values(me,'graduate_opportunity','Graduate opportunities · Remote internships & volunteering',
 'WOMATE is building a graduate talent pool for partner-hosted remote projects. Beyond the Science Ghana is an initial host. Other placements depend on partner needs and selection.',
 '/canopy/graduate-opportunities','womate-graduate-opportunities-2026-v1:'||me::text)
 on conflict(fingerprint) do nothing;
 select * into existing from public.womate_graduate_placement_interests where user_id=me;
 return jsonb_build_object('eligible',true,'applied',found,
  'state',case when found then existing.state else null end,
  'last_updated',case when found then existing.updated_at else null end);
end $$;
revoke all on function public.womate_my_graduate_placement_opportunity() from public,anon;
grant execute on function public.womate_my_graduate_placement_opportunity() to authenticated;

create or replace function public.womate_apply_graduate_placement(
 p_name text,p_country text,p_skills text[],p_areas text[],
 p_types text[],p_experience text,p_motivation text,
 p_hours integer,p_availability text,p_portfolio text,p_cv text,
 p_remote boolean,p_consent boolean)
returns jsonb language plpgsql security definer set search_path=public,auth,private,pg_temp as $$
declare me uuid:=auth.uid(); addr text;
begin
 if me is null or not private.womate_is_verified_graduate(me) then raise exception 'Verified graduates only'; end if;
 select email into addr from auth.users where id=me;
 if length(btrim(coalesce(p_name,''))) not between 2 and 160
 or length(btrim(coalesce(p_country,''))) not between 2 and 100
 or length(btrim(coalesce(p_experience,''))) > 2500
 or length(btrim(coalesce(p_motivation,''))) not between 40 and 2500
 or p_hours not between 1 and 40
 or length(btrim(coalesce(p_availability,''))) not between 3 and 120
 or cardinality(coalesce(p_skills,'{}'))>12 or cardinality(coalesce(p_areas,'{}')) not between 1 and 8
 or cardinality(coalesce(p_types,'{}')) not between 1 and 3 then
   raise exception 'Please complete all required placement fields';
 end if;
 if p_portfolio is not null and btrim(p_portfolio)<>'' and
    (length(p_portfolio)>600 or p_portfolio !~* '^https://[^[:space:]]+$') then raise exception 'Portfolio URL must be HTTPS'; end if;
 if p_cv is not null and btrim(p_cv)<>'' and
    (length(p_cv)>600 or p_cv !~* '^https://[^[:space:]]+$') then raise exception 'CV URL must be HTTPS'; end if;
 if not p_consent then raise exception 'Consent required before WOMATE can share a curated profile'; end if;
 insert into public.womate_graduate_placement_interests
 (user_id,full_name,email,country,skills,work_areas,placement_types,experience,motivation,
  available_hours,availability,portfolio_url,cv_url,remote_only,consent_share)
 values(me,btrim(p_name),addr,btrim(p_country),coalesce(p_skills,'{}'),coalesce(p_areas,'{}'),
  coalesce(p_types,'{}'),btrim(coalesce(p_experience,'')),btrim(p_motivation),
  p_hours,btrim(p_availability),nullif(btrim(p_portfolio),''),
  nullif(btrim(p_cv),''),p_remote,p_consent)
 on conflict(user_id) do update set
 full_name=excluded.full_name,country=excluded.country,skills=excluded.skills,
 work_areas=excluded.work_areas,placement_types=excluded.placement_types,
 experience=excluded.experience,motivation=excluded.motivation,
 available_hours=excluded.available_hours,availability=excluded.availability,
 portfolio_url=excluded.portfolio_url,cv_url=excluded.cv_url,remote_only=excluded.remote_only,
 consent_share=excluded.consent_share,updated_at=now()
 where public.womate_graduate_placement_interests.state in ('submitted','shortlisted');
 if not found then raise exception 'Placement already in progress; contact WOMATE for changes'; end if;
 return jsonb_build_object('ok',true,'state','submitted');
end $$;
revoke all on function public.womate_apply_graduate_placement(text,text,text[],text[],text[],text,text,integer,text,text,text,boolean,boolean) from public,anon;
grant execute on function public.womate_apply_graduate_placement(text,text,text[],text[],text[],text,text,integer,text,text,text,boolean,boolean) to authenticated;

create or replace function public.womate_admin_graduate_placements()
returns jsonb language plpgsql stable security definer set search_path=public,auth,private,pg_temp as $$
begin
 if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then raise exception 'WOMATE admin only'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
 'user_id',user_id,'full_name',full_name,'email',email,'country',country,
 'skills',skills,'work_areas',work_areas,'placement_types',placement_types,
 'experience',experience,'motivation',motivation,'available_hours',available_hours,
 'availability',availability,'portfolio_url',portfolio_url,'cv_url',cv_url,
 'remote_only',remote_only,'consent_share',consent_share,'state',state,
 'internal_notes',internal_notes,'partner_name',partner_name,'created_at',created_at)
 order by created_at desc) from public.womate_graduate_placement_interests),'[]'::jsonb);
end $$;
revoke all on function public.womate_admin_graduate_placements() from public,anon;
grant execute on function public.womate_admin_graduate_placements() to authenticated;

create or replace function public.womate_admin_review_graduate_placement(
 p_user uuid,p_state text,p_notes text,p_partner text default null)
returns boolean language plpgsql security definer set search_path=public,auth,private,pg_temp as $$
begin
 if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then raise exception 'WOMATE admin only'; end if;
 if p_state not in ('submitted','shortlisted','matched','placed','closed')
 or length(coalesce(p_notes,''))>2000 or length(coalesce(p_partner,''))>160 then
 raise exception 'Invalid review details'; end if;
 update public.womate_graduate_placement_interests
 set state=p_state,internal_notes=coalesce(p_notes,''),
 partner_name=nullif(btrim(p_partner),''),updated_at=now()
 where user_id=p_user;
 return found;
end $$;
revoke all on function public.womate_admin_review_graduate_placement(uuid,text,text,text) from public,anon;
grant execute on function public.womate_admin_review_graduate_placement(uuid,text,text,text) to authenticated;
