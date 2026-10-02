-- Preserve up to five featured learners PER MODULE, not five total.
-- This read-only feed fix does not alter Spotlight decisions.

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
      row_number() over(partition by n.module_id order by coalesce(n.decided_at,n.created_at) desc,n.id) as module_rank,
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
        'is_me',(s.user_id=auth.uid()),
        'professional_image_drive_url',case when s.user_id=auth.uid() then (
          select a.professional_image_drive_url
          from public.canopy_spotlight_recognition_assets a
          where a.spotlight_id=n.id
          limit 1
        ) else null end,
        'professional_image_submitted_at',case when s.user_id=auth.uid() then (
          select a.updated_at
          from public.canopy_spotlight_recognition_assets a
          where a.spotlight_id=n.id
          limit 1
        ) else null end,
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
  ) q
  where module_rank<=safe_limit;

  return result;
end;
$$;

revoke all on function public.canopy_get_featured_spotlights(integer) from public;
grant execute on function public.canopy_get_featured_spotlights(integer) to authenticated;
