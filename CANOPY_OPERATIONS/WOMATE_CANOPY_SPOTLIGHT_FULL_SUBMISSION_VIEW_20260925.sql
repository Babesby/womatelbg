-- WOMATE Canopy · learner-facing Spotlight full submission view · 2026-09-25
-- Rerunnable. Exposes only final featured Spotlight submissions to signed-in Canopy users.
-- Nominations and shortlists remain staff-only.

set lock_timeout = '8s';
set statement_timeout = '60s';

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
        'artifact_url',nullif(trim(s.canvas_link),'')
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
