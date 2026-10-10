begin;

-- Explicit, auditable Talent Discovery eligibility exceptions.
create table if not exists public.canopy_talent_eligibility_overrides (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason text not null,
  recognition_key text,
  active boolean not null default true,
  granted_at timestamptz not null default now()
);

alter table public.canopy_talent_eligibility_overrides enable row level security;
revoke all on table public.canopy_talent_eligibility_overrides from anon,authenticated;

-- Allow a celebration song/media URL to travel with a special recognition.
alter table public.canopy_special_recognitions
  add column if not exists celebration_youtube_embed_url text;

-- Preserve the programme-wide rule while permitting explicit WOMATE-awarded exceptions.
create or replace function public.canopy_talent_eligible(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
 select public.canopy_talent_completed_modules(p_user)>=5
     or public.canopy_talent_mission_completed(p_user)
     or exists(
       select 1
       from public.canopy_talent_eligibility_overrides o
       where o.user_id=p_user and o.active=true
     );
$$;
revoke all on function public.canopy_talent_eligible(uuid) from public;

do $$
declare
  learner_id uuid;
  featured_count integer:=0;
  module03_submission uuid;
  recognition_id uuid;
  recognition_body text;
  notification_body text;
begin
  select p.user_id
    into learner_id
  from public.canopy_profiles p
  where lower(trim(coalesce(p.full_name,'')))='priscilla ewurabena afful'
    and p.role='learner'
  limit 1;

  if learner_id is null then
    raise exception 'Priscilla Ewurabena Afful learner profile was not found. No recognition changes were applied.';
  end if;

  select count(*)
    into featured_count
  from public.canopy_spotlight_nominations n
  join public.canopy_assignment_submissions s on s.id=n.submission_id
  where s.user_id=learner_id
    and n.status='featured';

  if featured_count < 2 then
    raise exception 'Priscilla has only % confirmed featured Spotlight record(s); expected at least 2. No recognition changes were applied.',featured_count;
  end if;

  select s.id
    into module03_submission
  from public.canopy_assignment_submissions s
  where s.user_id=learner_id
    and s.week_key='module-03'
  order by
    coalesce(s.attempt_no,1) desc,
    s.submitted_at desc
  limit 1;

  recognition_body :=
    'Priscilla, WOMATE sees the consistency, care and leadership behind your work. Being selected for Canopy Spotlight twice is exceptional, and your Module 03 Climate Advocacy & Digital Innovation work shows the depth, clarity and commitment you continue to bring to this programme. We are deeply proud of you and grateful for the standard you are setting. This second Spotlight makes you specially eligible for WOMATE Talent Discovery. Keep building your professional profile so your work can be seen and celebrated. One more Spotlight — a third — would place you in a very rare circle we’ll be watching closely as we shape a special She Leads 2026 recognition and representation opportunity. Please receive this celebration song as a small reminder that your effort is seen, valued and remembered. 💚';

  notification_body :=
    'Priscilla, congratulations on becoming the first learner in this cohort to be selected for Canopy Spotlight twice. WOMATE sees your consistency, thoughtfulness and leadership, and we deeply appreciate the care you bring to your work. Your second Spotlight has now made you specially eligible for Talent Discovery. Please keep your professional profile complete and current. A third Spotlight would place you in a very rare circle we’ll be watching closely as we shape a special She Leads 2026 recognition and representation opportunity. We have also added a celebration song to your Spotlight recognition — this moment is yours. 💚';

  insert into public.canopy_talent_eligibility_overrides(
    user_id,reason,recognition_key,active,granted_at
  )
  values(
    learner_id,
    'Two-time Canopy Spotlight recognition · WOMATE special Talent Discovery eligibility',
    'priscilla-double-spotlight-2026',
    true,
    now()
  )
  on conflict(user_id) do update
    set reason=excluded.reason,
        recognition_key=excluded.recognition_key,
        active=true,
        granted_at=excluded.granted_at;

  insert into public.canopy_special_recognitions(
    user_id,module_id,submission_id,recognition_key,label,title,body,visible,celebration_youtube_embed_url
  )
  values(
    learner_id,
    'module-03',
    module03_submission,
    'priscilla-double-spotlight-2026',
    'TWO-TIME CANOPY SPOTLIGHT',
    'WOMATE sees you, Priscilla 💚',
    recognition_body,
    true,
    'https://www.youtube.com/embed/J91ti_MpdHA'
  )
  on conflict(recognition_key) do update
    set user_id=excluded.user_id,
        module_id=excluded.module_id,
        submission_id=excluded.submission_id,
        label=excluded.label,
        title=excluded.title,
        body=excluded.body,
        visible=true,
        celebration_youtube_embed_url=excluded.celebration_youtube_embed_url
  returning id into recognition_id;

  insert into public.canopy_notifications(
    user_id,type,title,body,link,fingerprint
  )
  values(
    learner_id,
    'special_recognition',
    'Priscilla — twice in Canopy Spotlight. WOMATE sees you 💚',
    notification_body,
    '/canopy#spotlight',
    'special-recognition:priscilla-double-spotlight-2026'
  )
  on conflict(fingerprint) do update
    set title=excluded.title,
        body=excluded.body,
        link=excluded.link,
        type=excluded.type,
        read_at=null,
        created_at=now();
end;
$$;

-- Return the optional celebration embed with special recognitions.
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
    'id','special:'||r.id::text,
    'is_special',true,
    'is_me',(r.user_id=auth.uid()),
    'module_id',r.module_id,
    'week_key',r.module_id,
    'learner_name',coalesce(nullif(trim(p.full_name),''),'She Leads fellow'),
    'special_label',r.label,
    'special_title',r.title,
    'special_body',r.body,
    'celebration_youtube_embed_url',
      case when r.user_id=auth.uid() then r.celebration_youtube_embed_url else null end,
    'paragraph_response',nullif(trim(s.paragraph_response),''),
    'canvas_link',nullif(trim(s.canvas_link),''),
    'linkedin_link',nullif(trim(s.linkedin_link),''),
    'featured_at',r.created_at,
    'reaction_counts',jsonb_build_object('love',0,'clap',0,'insightful',0),
    'my_reaction',null,
    'professional_image_drive_url',null,
    'professional_image_submitted_at',null
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
