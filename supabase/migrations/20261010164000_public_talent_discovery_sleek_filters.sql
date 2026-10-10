set lock_timeout='8s';
set statement_timeout='120s';

create index if not exists canopy_profiles_country_lower_idx
on public.canopy_profiles(lower(country));

create index if not exists canopy_talent_settings_collaboration_open_idx
on public.canopy_talent_settings(collaboration_open)
where collaboration_open=true;

drop function if exists public.canopy_public_talent_directory(text,text,integer);

create or replace function public.canopy_public_talent_filter_options()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'countries',
      coalesce((
        select jsonb_agg(x.country order by x.country)
        from (
          select distinct trim(p.country) country
          from public.canopy_profiles p
          join public.canopy_talent_settings t on t.user_id=p.user_id
          where p.role='learner'
            and public.canopy_talent_is_visible(p.user_id)
            and nullif(trim(coalesce(p.country,'')),'') is not null
        ) x
      ),'[]'::jsonb),
    'missions',
      coalesce((
        select jsonb_agg(
          jsonb_build_object('id',x.group_id,'name',x.mission_name)
          order by x.mission_name
        )
        from (
          select distinct g.id group_id,g.name mission_name
          from public.canopy_mission_completions c
          join public.canopy_mission_groups g on g.id=c.group_id
          join public.canopy_profiles p on p.user_id=c.user_id
          where c.status='completed'
            and p.role='learner'
            and public.canopy_talent_is_visible(c.user_id)
            and public.canopy_mission_name_is_meaningful(g.name)
        ) x
      ),'[]'::jsonb)
  );
$$;

revoke all on function public.canopy_public_talent_filter_options() from public;
grant execute on function public.canopy_public_talent_filter_options() to anon,authenticated;

create or replace function public.canopy_public_talent_directory(
  p_query text default null,
  p_after_slug text default null,
  p_limit integer default 24,
  p_country text default null,
  p_achievement text default null,
  p_mission_group uuid default null,
  p_collaboration_open boolean default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  lim integer:=least(greatest(coalesce(p_limit,24),1),48);
  q text:=nullif(trim(coalesce(p_query,'')),'');
  country_filter text:=nullif(trim(coalesce(p_country,'')),'');
  achievement_filter text:=nullif(lower(trim(coalesce(p_achievement,''))),'');
  result jsonb;
begin
  with base as(
    select
      p.user_id,
      p.full_name,
      p.country,
      t.public_slug slug,
      t.headline,
      t.climate_interests,
      t.avatar_path,
      t.collaboration_open,
      public.canopy_talent_completed_modules(p.user_id)>=5 all_modules_completed,
      public.canopy_talent_mission_completed(p.user_id) mission_completed,
      public.canopy_talent_final_team_completed(p.user_id) final_team_completed,
      nullif(public.canopy_completed_mission_identity(p.user_id)->>'mission_name','') mission_name,
      (select count(*)::integer
       from public.canopy_spotlight_nominations n
       join public.canopy_assignment_submissions s on s.id=n.submission_id
       where s.user_id=p.user_id
         and n.status='featured') spotlight_count
    from public.canopy_profiles p
    join public.canopy_talent_settings t on t.user_id=p.user_id
    where p.role='learner'
      and public.canopy_talent_is_visible(p.user_id)
      and t.public_slug is not null
      and (
        q is null
        or p.full_name ilike '%'||q||'%'
        or p.country ilike '%'||q||'%'
        or t.headline ilike '%'||q||'%'
        or exists(
          select 1
          from unnest(t.climate_interests) i
          where i ilike '%'||q||'%'
        )
        or nullif(public.canopy_completed_mission_identity(p.user_id)->>'mission_name','') ilike '%'||q||'%'
      )
      and (country_filter is null or lower(p.country)=lower(country_filter))
      and (
        achievement_filter is null
        or achievement_filter='all'
        or (achievement_filter='mission' and public.canopy_talent_mission_completed(p.user_id))
        or (achievement_filter='modules' and public.canopy_talent_completed_modules(p.user_id)>=5)
        or (achievement_filter='final' and public.canopy_talent_final_team_completed(p.user_id))
        or (
          achievement_filter='spotlight'
          and exists(
            select 1
            from public.canopy_spotlight_nominations n
            join public.canopy_assignment_submissions s on s.id=n.submission_id
            where s.user_id=p.user_id
              and n.status='featured'
          )
        )
      )
      and (
        p_mission_group is null
        or exists(
          select 1
          from public.canopy_mission_completions c
          where c.user_id=p.user_id
            and c.group_id=p_mission_group
            and c.status='completed'
        )
      )
      and (p_collaboration_open is null or t.collaboration_open=p_collaboration_open)
      and (p_after_slug is null or t.public_slug>p_after_slug)
    order by t.public_slug
    limit lim+1
  ),
  page as(
    select *
    from base
    order by slug
    limit lim
  )
  select jsonb_build_object(
    'items',coalesce((select jsonb_agg(to_jsonb(page) order by slug) from page),'[]'::jsonb),
    'has_more',(select count(*) from base)>lim,
    'next_cursor',(select slug from page order by slug desc limit 1)
  )
  into result;

  return result;
end;
$$;

revoke all on function public.canopy_public_talent_directory(text,text,integer,text,text,uuid,boolean) from public;
grant execute on function public.canopy_public_talent_directory(text,text,integer,text,text,uuid,boolean) to anon,authenticated;

create or replace function public.canopy_public_talent_profile(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select coalesce((
    select jsonb_build_object(
      'slug',t.public_slug,
      'full_name',p.full_name,
      'country',p.country,
      'headline',t.headline,
      'climate_interests',t.climate_interests,
      'avatar_path',t.avatar_path,
      'collaboration_open',t.collaboration_open,
      'all_modules_completed',public.canopy_talent_completed_modules(p.user_id)>=5,
      'mission_completed',public.canopy_talent_mission_completed(p.user_id),
      'mission_name',nullif(public.canopy_completed_mission_identity(p.user_id)->>'mission_name',''),
      'final_team_completed',public.canopy_talent_final_team_completed(p.user_id),
      'spotlight_count',(
        select count(*)::integer
        from public.canopy_spotlight_nominations n
        join public.canopy_assignment_submissions s on s.id=n.submission_id
        where s.user_id=p.user_id
          and n.status='featured'
      )
    )
    from public.canopy_profiles p
    join public.canopy_talent_settings t on t.user_id=p.user_id
    where p.role='learner'
      and public.canopy_talent_is_visible(p.user_id)
      and t.public_slug=trim(lower(p_slug))
    limit 1
  ),'{}'::jsonb);
$$;

revoke all on function public.canopy_public_talent_profile(text) from public;
grant execute on function public.canopy_public_talent_profile(text) to anon,authenticated;

reset lock_timeout;
reset statement_timeout;
