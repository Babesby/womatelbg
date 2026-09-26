-- WOMATE CANOPY · learner Spotlight reactions · 2026-09-26
-- Additive / rerunnable. Read-aloud and mobile-avatar changes are client-side only.

set lock_timeout = '8s';
set statement_timeout = '60s';

create table if not exists public.canopy_spotlight_reactions (
  spotlight_id uuid not null references public.canopy_spotlight_nominations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('love','clap','insightful')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (spotlight_id,user_id)
);

alter table public.canopy_spotlight_reactions enable row level security;
revoke all on table public.canopy_spotlight_reactions from anon, authenticated;

create or replace function public.canopy_react_to_spotlight(
  p_spotlight_id uuid,
  p_reaction text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  clean_reaction text := nullif(trim(coalesce(p_reaction,'')),'');
  counts jsonb;
  current_reaction text;
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;

  if not exists(
    select 1
    from public.canopy_profiles p
    where p.user_id=auth.uid()
      and p.role in ('learner','tester')
  ) then
    raise exception 'Spotlight reactions are available to participants.';
  end if;

  if not exists(
    select 1
    from public.canopy_spotlight_nominations n
    where n.id=p_spotlight_id
      and n.status='featured'
  ) then
    raise exception 'This Spotlight item is unavailable.';
  end if;

  if clean_reaction is null then
    delete from public.canopy_spotlight_reactions
    where spotlight_id=p_spotlight_id and user_id=auth.uid();
  else
    if clean_reaction not in ('love','clap','insightful') then
      raise exception 'Unsupported Spotlight reaction.';
    end if;

    insert into public.canopy_spotlight_reactions(
      spotlight_id,user_id,reaction,created_at,updated_at
    ) values(
      p_spotlight_id,auth.uid(),clean_reaction,now(),now()
    )
    on conflict(spotlight_id,user_id) do update set
      reaction=excluded.reaction,
      updated_at=now();
  end if;

  select reaction into current_reaction
  from public.canopy_spotlight_reactions
  where spotlight_id=p_spotlight_id and user_id=auth.uid();

  select jsonb_build_object(
    'love',count(*) filter(where r.reaction='love'),
    'clap',count(*) filter(where r.reaction='clap'),
    'insightful',count(*) filter(where r.reaction='insightful')
  ) into counts
  from public.canopy_spotlight_reactions r
  where r.spotlight_id=p_spotlight_id;

  return jsonb_build_object(
    'spotlight_id',p_spotlight_id,
    'my_reaction',current_reaction,
    'reaction_counts',coalesce(counts,'{"love":0,"clap":0,"insightful":0}'::jsonb)
  );
end;
$$;

revoke all on function public.canopy_react_to_spotlight(uuid,text) from public;
grant execute on function public.canopy_react_to_spotlight(uuid,text) to authenticated;

create or replace function public.canopy_get_featured_spotlights(p_limit integer default 5)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  safe_limit integer := greatest(1,least(coalesce(p_limit,5),5));
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;

  select coalesce(jsonb_agg(item order by featured_at desc),'[]'::jsonb)
  into result
  from (
    select
      coalesce(n.decided_at,n.created_at) as featured_at,
      jsonb_build_object(
        'id',n.id,
        'submission_id',s.id,
        'week_key',s.week_key,
        'module_id',n.module_id,
        'category',n.category,
        'note',n.note,
        'featured_at',coalesce(n.decided_at,n.created_at),
        'learner_name',coalesce(nullif(trim(p.full_name),''),'She Leads fellow'),
        'paragraph_response',nullif(trim(s.paragraph_response),''),
        'canvas_link',nullif(trim(s.canvas_link),''),
        'linkedin_link',nullif(trim(s.linkedin_link),''),
        'artifact_url',nullif(trim(s.canvas_link),''),
        'my_reaction',(
          select r.reaction
          from public.canopy_spotlight_reactions r
          where r.spotlight_id=n.id and r.user_id=auth.uid()
          limit 1
        ),
        'reaction_counts',jsonb_build_object(
          'love',(select count(*) from public.canopy_spotlight_reactions r where r.spotlight_id=n.id and r.reaction='love'),
          'clap',(select count(*) from public.canopy_spotlight_reactions r where r.spotlight_id=n.id and r.reaction='clap'),
          'insightful',(select count(*) from public.canopy_spotlight_reactions r where r.spotlight_id=n.id and r.reaction='insightful')
        )
      ) as item
    from public.canopy_spotlight_nominations n
    join public.canopy_assignment_submissions s on s.id=n.submission_id
    left join public.canopy_profiles p on p.user_id=s.user_id
    where n.status='featured'
    order by coalesce(n.decided_at,n.created_at) desc
    limit safe_limit
  ) q;

  return result;
end;
$$;

revoke all on function public.canopy_get_featured_spotlights(integer) from public;
grant execute on function public.canopy_get_featured_spotlights(integer) to authenticated;

reset lock_timeout;
reset statement_timeout;
