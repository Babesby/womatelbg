begin;

create table if not exists public.canopy_special_recognitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null check (module_id in ('module-01','module-02','module-03','module-04','module-05')),
  submission_id uuid references public.canopy_assignment_submissions(id) on delete set null,
  recognition_key text not null unique,
  label text not null,
  title text not null,
  body text not null,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.canopy_special_recognitions enable row level security;
revoke all on table public.canopy_special_recognitions from anon,authenticated;

with learner as (
  select p.user_id from public.canopy_profiles p
  where lower(trim(coalesce(p.full_name,'')))='odum ifeoluwa'
  limit 1
),
latest_submission as (
  select s.id,s.user_id
  from public.canopy_assignment_submissions s
  join learner l on l.user_id=s.user_id
  where s.week_key='module-02'
  order by coalesce(s.attempt_no,1) desc,s.submitted_at desc
  limit 1
)
insert into public.canopy_special_recognitions(
  user_id,module_id,submission_id,recognition_key,label,title,body,visible
)
select
  l.user_id,'module-02',s.id,
  'module02-applied-climate-justice-distinction',
  'ASSIGNMENT OF THE WEEK',
  'WOMATE Applied Climate Justice Distinction',
  'Odum Ifeoluwa is recognised for an outstanding applied response that turns Gender & Climate Justice into practical, locally grounded action — centring women''s knowledge, leadership, time and participation in mangrove restoration.',
  true
from learner l
left join latest_submission s on s.user_id=l.user_id
on conflict(recognition_key) do update
set user_id=excluded.user_id,module_id=excluded.module_id,submission_id=excluded.submission_id,label=excluded.label,title=excluded.title,body=excluded.body,visible=true;

create or replace function public.canopy_get_special_recognitions()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id','special:'||r.id::text,'is_special',true,'is_me',(r.user_id=auth.uid()),
    'module_id',r.module_id,'week_key',r.module_id,
    'learner_name',coalesce(nullif(trim(p.full_name),''),'She Leads fellow'),
    'special_label',r.label,'special_title',r.title,'special_body',r.body,
    'paragraph_response',nullif(trim(s.paragraph_response),''),
    'canvas_link',nullif(trim(s.canvas_link),''),
    'linkedin_link',nullif(trim(s.linkedin_link),''),
    'featured_at',r.created_at,
    'reaction_counts',jsonb_build_object('love',0,'clap',0,'insightful',0),
    'my_reaction',null,'professional_image_drive_url',null,'professional_image_submitted_at',null
  ) order by r.created_at desc),'[]'::jsonb)
  into result
  from public.canopy_special_recognitions r
  left join public.canopy_profiles p on p.user_id=r.user_id
  left join public.canopy_assignment_submissions s on s.id=r.submission_id
  where r.visible=true;
  return result;
end;
$$;

revoke all on function public.canopy_get_special_recognitions() from public;
grant execute on function public.canopy_get_special_recognitions() to authenticated;

commit;
