-- WOMATE Canopy · learner experience enhancement · 24 September 2026
-- Additive only. Exposes ONLY Programme Manager/WOMATE-featured Spotlight items
-- to authenticated Canopy users. Existing nomination/review workflow is unchanged.

create or replace function public.canopy_get_featured_spotlights(p_limit integer default 8)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  safe_limit integer := greatest(1,least(coalesce(p_limit,8),12));
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;

  select coalesce(jsonb_agg(item order by featured_at desc),'[]'::jsonb)
  into result
  from (
    select coalesce(n.decided_at,n.created_at) as featured_at,
      jsonb_build_object(
      'id',n.id,
      'module_id',n.module_id,
      'category',n.category,
      'note',n.note,
      'featured_at',coalesce(n.decided_at,n.created_at),
      'learner_name',coalesce(nullif(trim(p.full_name),''),'She Leads fellow'),
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
