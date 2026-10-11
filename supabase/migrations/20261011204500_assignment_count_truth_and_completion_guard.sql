set lock_timeout='8s';
set statement_timeout='120s';

create or replace function public.canopy_assignment_review_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  role_name text;
  result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to continue.'; end if;
  role_name:=coalesce(public.canopy_staff_role(auth.uid()),'');
  if not public.canopy_is_manager(auth.uid()) and role_name<>'programme_operations' then
    raise exception 'Programme Manager or Deputy Programme Manager access required.';
  end if;

  with base as (
    select s.*
    from public.canopy_assignment_submissions s
    left join public.canopy_profiles p on p.user_id=s.user_id
    left join auth.users u on u.id=s.user_id
    where coalesce(p.role,'learner')<>'tester'
      and lower(coalesce(u.email,''))<>'p.viewmultimedia@gmail.com'
      and s.week_key in ('module-01','module-02','module-03','module-04','module-05')
  ),
  latest_ranked as (
    select b.*,
      row_number() over(
        partition by b.user_id,b.week_key
        order by coalesce(b.attempt_no,1) desc,b.submitted_at desc nulls last,b.id desc
      ) rn
    from base b
  ),
  current_rows as (
    select * from latest_ranked where rn=1
  ),
  manual_completed as (
    select distinct b.user_id,b.week_key
    from base b
    where b.review_source='manual' and b.assessment_status='completed'
  ),
  post_completion as (
    select distinct b.id,b.week_key
    from base b
    where exists(
      select 1
      from base c
      where c.user_id=b.user_id
        and c.week_key=b.week_key
        and c.review_source='manual'
        and c.assessment_status='completed'
        and c.id<>b.id
        and coalesce(c.submitted_at,'epoch'::timestamptz)<coalesce(b.submitted_at,'epoch'::timestamptz)
    )
  ),
  keys as (
    select 'all'::text key
    union all select 'module-01'
    union all select 'module-02'
    union all select 'module-03'
    union all select 'module-04'
    union all select 'module-05'
  ),
  metrics as (
    select
      k.key,
      (select count(*) from base b where k.key='all' or b.week_key=k.key) total_attempts,
      (select count(*) from current_rows c where k.key='all' or c.week_key=k.key) current_records,
      (select count(*) from manual_completed m where k.key='all' or m.week_key=k.key) manual_completed,
      (select count(*) from current_rows c where (k.key='all' or c.week_key=k.key) and c.assessment_status='completed') current_completed,
      (select count(*) from current_rows c where (k.key='all' or c.week_key=k.key) and c.assessment_status='revision_required') revision_required,
      (select count(*) from current_rows c where (k.key='all' or c.week_key=k.key) and c.assessment_status in('auto_reviewed','needs_manual_review')) needs_attention,
      (select count(*) from post_completion p where k.key='all' or p.week_key=k.key) post_completion_attempts
    from keys k
  )
  select jsonb_build_object(
    'generated_at',now(),
    'modules',jsonb_object_agg(
      key,
      jsonb_build_object(
        'total_attempts',total_attempts,
        'current_records',current_records,
        'manual_completed',manual_completed,
        'current_completed',current_completed,
        'revision_required',revision_required,
        'needs_attention',needs_attention,
        'post_completion_attempts',post_completion_attempts
      )
      order by key
    )
  )
  into result
  from metrics;

  return result;
end;
$$;

revoke all on function public.canopy_assignment_review_metrics() from public;
grant execute on function public.canopy_assignment_review_metrics() to authenticated;

create or replace function public.canopy_assignment_review_rows()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  role_name text;
  result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to continue.'; end if;
  role_name:=coalesce(public.canopy_staff_role(auth.uid()),'');
  if not public.canopy_is_manager(auth.uid()) and role_name<>'programme_operations' then
    raise exception 'Programme Manager or Deputy Programme Manager access required.';
  end if;

  with base as (
    select s.*
    from public.canopy_assignment_submissions s
    left join public.canopy_profiles p on p.user_id=s.user_id
    left join auth.users u on u.id=s.user_id
    where coalesce(p.role,'learner')<>'tester'
      and lower(coalesce(u.email,''))<>'p.viewmultimedia@gmail.com'
      and s.week_key in ('module-01','module-02','module-03','module-04','module-05')
  ),
  ranked as (
    select
      b.*,
      row_number() over(
        partition by b.user_id,b.week_key
        order by
          case when b.review_source='manual' and b.assessment_status='completed' then 0 else 1 end,
          case when b.review_source='manual' and b.assessment_status='completed' then b.submitted_at end desc nulls last,
          coalesce(b.attempt_no,1) desc,
          b.submitted_at desc nulls last,
          b.id desc
      ) truth_rank
    from base b
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',r.id,
    'user_id',r.user_id,
    'learner_id',r.user_id,
    'week_key',r.week_key,
    'module_label',replace(initcap(replace(r.week_key,'-',' ')),'Module ','Module '),
    'attempt_no',coalesce(r.attempt_no,1),
    'submitted_at',r.submitted_at,
    'learner_name',coalesce(p.full_name,'Learner'),
    'learner_email',u.email,
    'email',u.email,
    'score',coalesce(r.final_score,r.auto_score),
    'auto_score',r.auto_score,
    'review_source',r.review_source,
    'score_band',r.score_band,
    'assessment_status',r.assessment_status,
    'paragraph_response',coalesce(r.paragraph_response,''),
    'paragraph_excerpt',left(coalesce(r.paragraph_response,''),360),
    'final_feedback',r.final_feedback,
    'canvas_link',r.canvas_link,
    'linkedin_link',r.linkedin_link,
    'truth_source',case when r.review_source='manual' and r.assessment_status='completed' then 'manual_completion' else 'latest_attempt' end
  ) order by r.submitted_at desc),'[]'::jsonb)
  into result
  from ranked r
  left join public.canopy_profiles p on p.user_id=r.user_id
  left join auth.users u on u.id=r.user_id
  where r.truth_rank=1;

  return result;
end;
$$;

revoke all on function public.canopy_assignment_review_rows() from public;
grant execute on function public.canopy_assignment_review_rows() to authenticated;

create or replace function public.canopy_protect_manual_assignment_completion()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if exists(
    select 1
    from public.canopy_assignment_submissions c
    where c.user_id=new.user_id
      and c.week_key=new.week_key
      and c.review_source='manual'
      and c.assessment_status='completed'
  ) then
    raise exception 'This assignment has already been manually completed by WOMATE. A new attempt cannot replace the final review.';
  end if;
  return new;
end;
$$;

drop trigger if exists canopy_protect_manual_assignment_completion_trg
on public.canopy_assignment_submissions;

create trigger canopy_protect_manual_assignment_completion_trg
before insert on public.canopy_assignment_submissions
for each row
execute function public.canopy_protect_manual_assignment_completion();

create index if not exists canopy_assignment_user_week_review_idx
on public.canopy_assignment_submissions(user_id,week_key,review_source,assessment_status,submitted_at desc);

reset lock_timeout;
reset statement_timeout;
