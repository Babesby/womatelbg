-- WOMATE CANOPY · Admin Spotlight filters, Love it + final-five cap · 2026-09-25
-- Additive / rerunnable. No table rebuilds or destructive changes.
-- Nominations and shortlists remain unlimited. Final Spotlight is capped at
-- five distinct learners per module/week and the cap is enforced in PostgreSQL.

set lock_timeout = '8s';
set statement_timeout = '60s';



-- Internal WOMATE Admin shortlist marker. "Love it" is not learner-facing and
-- does not count toward nominations, shortlists or the final-five quota.
create table if not exists public.canopy_spotlight_loves (
  submission_id uuid primary key references public.canopy_assignment_submissions(id) on delete cascade,
  loved_by uuid not null references auth.users(id),
  loved_at timestamptz not null default now()
);

alter table public.canopy_spotlight_loves enable row level security;
revoke all on table public.canopy_spotlight_loves from anon, authenticated;

create or replace function public.canopy_admin_toggle_spotlight_love(p_submission_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  existing boolean;
  learner_id uuid;
  module_id text;
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'Only WOMATE Admin can use Love it in the Spotlight list.';
  end if;

  select s.user_id,s.week_key into learner_id,module_id
  from public.canopy_assignment_submissions s
  where s.id=p_submission_id;

  if not found then raise exception 'Submission not found.'; end if;

  select exists(select 1 from public.canopy_spotlight_loves where submission_id=p_submission_id)
  into existing;

  if existing then
    delete from public.canopy_spotlight_loves where submission_id=p_submission_id;
  else
    insert into public.canopy_spotlight_loves(submission_id,loved_by,loved_at)
    values(p_submission_id,auth.uid(),now())
    on conflict(submission_id) do update set loved_by=excluded.loved_by,loved_at=excluded.loved_at;
  end if;

  insert into public.canopy_team_audit_log(actor_user_id,action,target_user_id,detail)
  values(
    auth.uid(),
    case when existing then 'spotlight_love_removed' else 'spotlight_loved' end,
    learner_id,
    jsonb_build_object('submission_id',p_submission_id,'module_id',module_id,'loved',not existing)
  );

  return jsonb_build_object('submission_id',p_submission_id,'loved',not existing);
end;
$$;

revoke all on function public.canopy_admin_toggle_spotlight_love(uuid) from public;
grant execute on function public.canopy_admin_toggle_spotlight_love(uuid) to authenticated;

create or replace function public.canopy_admin_spotlight_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  result jsonb;
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'Only WOMATE Admin can open the final Spotlight dashboard.';
  end if;

  select jsonb_build_object(
    'nominations',coalesce((
      select jsonb_agg(x.item order by x.created_at desc)
      from (
        select n.created_at,
          jsonb_build_object(
            'id',n.id,
            'submission_id',n.submission_id,
            'module_id',n.module_id,
            'category',n.category,
            'note',n.note,
            'status',n.status,
            'nominated_by',n.nominated_by,
            'decided_by',n.decided_by,
            'decided_at',n.decided_at,
            'created_at',n.created_at,
            'user_id',s.user_id,
            'learner_name',coalesce(p.full_name,'Learner'),
            'attempt_no',s.attempt_no,
            'score',coalesce(s.final_score,s.auto_score),
            'score_band',s.score_band,
            'canvas_link',s.canvas_link,
            'linkedin_link',s.linkedin_link
          ) as item
        from public.canopy_spotlight_nominations n
        join public.canopy_assignment_submissions s on s.id=n.submission_id
        left join public.canopy_profiles p on p.user_id=s.user_id
      ) x
    ),'[]'::jsonb),
    'weekly',coalesce((
      select jsonb_agg(jsonb_build_object(
        'module_id',w.module_id,
        'featured_count',(
          select count(distinct s.user_id)
          from public.canopy_spotlight_nominations n
          join public.canopy_assignment_submissions s on s.id=n.submission_id
          where n.module_id=w.module_id and n.status='featured'
        )
      ) order by w.module_id)
      from (values('module-01'),('module-02'),('module-03'),('module-04'),('module-05')) w(module_id)
    ),'[]'::jsonb),
    'loves',coalesce((
      select jsonb_agg(jsonb_build_object(
        'submission_id',l.submission_id,
        'user_id',s.user_id,
        'module_id',s.week_key,
        'loved_by',l.loved_by,
        'loved_at',l.loved_at
      ) order by l.loved_at desc)
      from public.canopy_spotlight_loves l
      join public.canopy_assignment_submissions s on s.id=l.submission_id
    ),'[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.canopy_admin_spotlight_dashboard() from public;
grant execute on function public.canopy_admin_spotlight_dashboard() to authenticated;

-- Keep the existing team workflow, but enforce the same final-five rule even
-- if a Programme Manager features from the staff workspace.
create or replace function public.canopy_update_spotlight_status(p_nomination_id uuid,p_status text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  staff_role text;
  r public.canopy_spotlight_nominations%rowtype;
  learner_id uuid;
  featured_people integer;
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  staff_role:=public.canopy_staff_role(auth.uid());

  if p_status not in ('shortlisted','featured','declined') then
    raise exception 'Unsupported Spotlight status.';
  end if;

  if staff_role='programme_operations' and p_status<>'shortlisted' then
    raise exception 'The Operations Deputy may shortlist; final Spotlight decisions belong to the Programme Manager/WOMATE Admin.';
  end if;

  if not public.canopy_is_womate_admin(auth.uid())
     and coalesce(staff_role,'') not in ('programme_manager','programme_operations') then
    raise exception 'This account cannot make Spotlight decisions.';
  end if;

  select * into r
  from public.canopy_spotlight_nominations
  where id=p_nomination_id
  for update;

  if not found then raise exception 'Spotlight nomination not found.'; end if;

  if p_status='featured' then
    -- Serialise final selections within one module/week so concurrent clicks
    -- cannot exceed the five-person cap.
    perform pg_advisory_xact_lock(hashtext('womate_canopy_spotlight'),hashtext(r.module_id));

    select s.user_id into learner_id
    from public.canopy_assignment_submissions s
    where s.id=r.submission_id;

    if exists(
      select 1
      from public.canopy_spotlight_nominations n
      join public.canopy_assignment_submissions s on s.id=n.submission_id
      where n.module_id=r.module_id
        and n.status='featured'
        and s.user_id=learner_id
        and n.id<>r.id
    ) then
      raise exception 'This learner is already in this week''s Canopy Spotlight.';
    end if;

    select count(distinct s.user_id) into featured_people
    from public.canopy_spotlight_nominations n
    join public.canopy_assignment_submissions s on s.id=n.submission_id
    where n.module_id=r.module_id
      and n.status='featured'
      and n.id<>r.id;

    if featured_people>=5 then
      raise exception 'This week''s Canopy Spotlight is full. Remove one of the five selections before adding another learner.';
    end if;
  end if;

  update public.canopy_spotlight_nominations
  set status=p_status,decided_by=auth.uid(),decided_at=now()
  where id=p_nomination_id
  returning * into r;

  if p_status='featured' and learner_id is not null then
    insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
    values(
      learner_id,
      'spotlight_featured',
      'Your work is in Canopy Spotlight',
      'WOMATE selected your work for this week''s Canopy Spotlight.',
      '/canopy/classroom',
      'spotlight:'||r.module_id||':'||learner_id::text
    )
    on conflict(fingerprint) do update set
      title=excluded.title,
      body=excluded.body,
      link=excluded.link,
      read_at=null,
      created_at=now();
  end if;

  insert into public.canopy_team_audit_log(actor_user_id,action,target_user_id,detail)
  values(
    auth.uid(),
    'spotlight_status_changed',
    learner_id,
    jsonb_build_object('nomination_id',r.id,'module_id',r.module_id,'status',p_status)
  );

  return jsonb_build_object('id',r.id,'status',r.status,'module_id',r.module_id);
end;
$$;

revoke all on function public.canopy_update_spotlight_status(uuid,text) from public;
grant execute on function public.canopy_update_spotlight_status(uuid,text) to authenticated;

-- WOMATE Admin may bypass nomination/shortlisting and directly select strong
-- work. The same final-five cap is enforced atomically.
create or replace function public.canopy_admin_feature_spotlight(
  p_submission_id uuid,
  p_category text default 'emerging_leadership',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  submission_module text;
  learner_id uuid;
  nomination_id uuid;
  featured_people integer;
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'Only WOMATE Admin can directly select Canopy Spotlight work.';
  end if;

  if p_category not in ('strongest_insight','canopycanvas','local_application','emerging_leadership','policy_idea','other') then
    raise exception 'Unsupported Spotlight category.';
  end if;

  select s.week_key,s.user_id into submission_module,learner_id
  from public.canopy_assignment_submissions s
  where s.id=p_submission_id;

  if not found then raise exception 'Submission not found.'; end if;

  perform pg_advisory_xact_lock(hashtext('womate_canopy_spotlight'),hashtext(submission_module));

  if exists(
    select 1
    from public.canopy_spotlight_nominations n
    join public.canopy_assignment_submissions s on s.id=n.submission_id
    where n.module_id=submission_module
      and n.status='featured'
      and s.user_id=learner_id
  ) then
    raise exception 'This learner is already in this week''s Canopy Spotlight.';
  end if;

  select count(distinct s.user_id) into featured_people
  from public.canopy_spotlight_nominations n
  join public.canopy_assignment_submissions s on s.id=n.submission_id
  where n.module_id=submission_module
    and n.status='featured';

  if featured_people>=5 then
    raise exception 'This week''s Canopy Spotlight is full. Remove one of the five selections before adding another learner.';
  end if;

  -- Prefer an existing nomination for this submission so team work is retained.
  select n.id into nomination_id
  from public.canopy_spotlight_nominations n
  where n.submission_id=p_submission_id
  order by
    case n.status when 'shortlisted' then 1 when 'nominated' then 2 when 'declined' then 3 else 4 end,
    n.created_at desc
  limit 1
  for update;

  if nomination_id is null then
    insert into public.canopy_spotlight_nominations(
      submission_id,module_id,category,note,nominated_by,status,decided_by,decided_at
    ) values(
      p_submission_id,submission_module,p_category,
      nullif(trim(coalesce(p_note,'')),''),auth.uid(),'featured',auth.uid(),now()
    ) returning id into nomination_id;
  else
    update public.canopy_spotlight_nominations
    set category=p_category,
        note=coalesce(nullif(trim(coalesce(p_note,'')),''),note),
        status='featured',
        decided_by=auth.uid(),
        decided_at=now()
    where id=nomination_id;
  end if;

  insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
  values(
    learner_id,
    'spotlight_featured',
    'Your work is in Canopy Spotlight',
    'WOMATE selected your work for this week''s Canopy Spotlight.',
    '/canopy/classroom',
    'spotlight:'||submission_module||':'||learner_id::text
  )
  on conflict(fingerprint) do update set
    title=excluded.title,
    body=excluded.body,
    link=excluded.link,
    read_at=null,
    created_at=now();

  insert into public.canopy_team_audit_log(actor_user_id,action,target_user_id,detail)
  values(
    auth.uid(),
    'spotlight_admin_direct_feature',
    learner_id,
    jsonb_build_object('nomination_id',nomination_id,'submission_id',p_submission_id,'module_id',submission_module,'category',p_category)
  );

  return jsonb_build_object(
    'id',nomination_id,
    'submission_id',p_submission_id,
    'module_id',submission_module,
    'status','featured',
    'featured_count',featured_people+1,
    'limit',5
  );
end;
$$;

revoke all on function public.canopy_admin_feature_spotlight(uuid,text,text) from public;
grant execute on function public.canopy_admin_feature_spotlight(uuid,text,text) to authenticated;

reset lock_timeout;
reset statement_timeout;
