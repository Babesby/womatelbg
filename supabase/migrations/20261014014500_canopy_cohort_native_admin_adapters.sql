-- WOMATE Canopy - cohort-native Admin operational adapters
-- 2026-10-14
-- Additive/scoped. Cohort 2 remains the legacy production runtime.
-- Future cohort participant delivery stays unpublished until its participant runtime is activated.

set lock_timeout='8s';
set statement_timeout='90s';
begin;

-- ---------------------------------------------------------------------------
-- 1) Add cohort identity to admin-owned operational records.
-- Existing records are Cohort 2 and keep their current behavior.
-- ---------------------------------------------------------------------------
alter table public.canopy_manager_actions
  add column if not exists cohort_key text references public.canopy_programme_cohorts(cohort_key)
  default 'she-leads-climate-c2-2026';

update public.canopy_manager_actions
set cohort_key='she-leads-climate-c2-2026'
where cohort_key is null;

alter table public.canopy_manager_actions alter column cohort_key set not null;
create index if not exists canopy_manager_actions_cohort_idx
  on public.canopy_manager_actions(cohort_key,created_at desc);

alter table public.canopy_certificates
  add column if not exists cohort_key text references public.canopy_programme_cohorts(cohort_key)
  default 'she-leads-climate-c2-2026';

update public.canopy_certificates
set cohort_key='she-leads-climate-c2-2026'
where cohort_key is null;

alter table public.canopy_certificates alter column cohort_key set not null;
create index if not exists canopy_certificates_cohort_idx
  on public.canopy_certificates(cohort_key,issued_at desc);

alter table public.canopy_opportunities
  add column if not exists cohort_key text references public.canopy_programme_cohorts(cohort_key)
  default 'she-leads-climate-c2-2026';

update public.canopy_opportunities
set cohort_key='she-leads-climate-c2-2026'
where cohort_key is null;

alter table public.canopy_opportunities alter column cohort_key set not null;
create index if not exists canopy_opportunities_cohort_idx
  on public.canopy_opportunities(cohort_key,archived,published,created_at desc);

alter table public.canopy_funding_calls
  add column if not exists cohort_key text references public.canopy_programme_cohorts(cohort_key)
  default 'she-leads-climate-c2-2026';

update public.canopy_funding_calls
set cohort_key='she-leads-climate-c2-2026'
where cohort_key is null;

alter table public.canopy_funding_calls alter column cohort_key set not null;
create index if not exists canopy_funding_calls_cohort_idx
  on public.canopy_funding_calls(cohort_key,archived,published,created_at desc);

alter table public.canopy_mission_groups
  add column if not exists cohort_key text references public.canopy_programme_cohorts(cohort_key)
  default 'she-leads-climate-c2-2026';

update public.canopy_mission_groups
set cohort_key='she-leads-climate-c2-2026'
where cohort_key is null;

alter table public.canopy_mission_groups alter column cohort_key set not null;
create index if not exists canopy_mission_groups_cohort_idx
  on public.canopy_mission_groups(cohort_key,status,updated_at desc);

-- Future cohorts need attendance records that can coexist with a learner's
-- historical Cohort 2 attendance. Keep the legacy table untouched.
create table if not exists public.canopy_cohort_live_attendance (
  cohort_key text not null references public.canopy_programme_cohorts(cohort_key) on update cascade on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null,
  attended boolean not null default true,
  marked_by uuid references auth.users(id) on delete set null,
  marked_at timestamptz not null default now(),
  primary key(cohort_key,user_id,module_id)
);

alter table public.canopy_cohort_live_attendance enable row level security;
revoke all on public.canopy_cohort_live_attendance from anon,authenticated;

-- Preserve a cohort-aware copy of current attendance for future reporting.
insert into public.canopy_cohort_live_attendance(cohort_key,user_id,module_id,attended,marked_by,marked_at)
select 'she-leads-climate-c2-2026',a.user_id,a.module_id,a.attended,a.marked_by,a.marked_at
from public.canopy_live_attendance a
on conflict(cohort_key,user_id,module_id) do update
set attended=excluded.attended,marked_by=excluded.marked_by,marked_at=excluded.marked_at;

-- ---------------------------------------------------------------------------
-- 2) Admin cohort catalog now carries ALL membership statuses.
-- This lets Manage cohort reactivate paused/withdrawn members without losing
-- them from the selected cohort context.
-- ---------------------------------------------------------------------------
create or replace function public.canopy_admin_cohort_catalog()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'WOMATE Admin access required.';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'cohort_key',c.cohort_key,
        'programme_key',c.programme_key,
        'display_name',c.display_name,
        'cohort_year',c.cohort_year,
        'cohort_number',c.cohort_number,
        'region',c.region,
        'access_model',c.access_model,
        'status',c.status,
        'member_count',coalesce(m.member_count,0),
        'active_count',coalesce(m.active_count,0),
        'member_ids',coalesce(m.member_ids,'[]'::jsonb),
        'memberships',coalesce(m.memberships,'[]'::jsonb)
      )
      order by c.cohort_year desc,c.display_name
    )
    from public.canopy_programme_cohorts c
    left join lateral (
      select
        count(*)::integer member_count,
        count(*) filter(where cm.status='active')::integer active_count,
        coalesce(jsonb_agg(cm.user_id order by cm.joined_at),'[]'::jsonb) member_ids,
        coalesce(jsonb_agg(
          jsonb_build_object(
            'user_id',cm.user_id,
            'status',cm.status,
            'source',cm.source,
            'joined_at',cm.joined_at,
            'completed_at',cm.completed_at,
            'withdrawn_at',cm.withdrawn_at
          )
          order by cm.joined_at
        ),'[]'::jsonb) memberships
      from public.canopy_cohort_memberships cm
      where cm.cohort_key=c.cohort_key
    ) m on true
  ),'[]'::jsonb);
end;
$$;

revoke all on function public.canopy_admin_cohort_catalog() from public;
grant execute on function public.canopy_admin_cohort_catalog() to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Cohort-scoped communication/actions.
-- Frontend passes an explicit recipient list for bulk actions so another
-- cohort can never be accidentally contacted by an audience filter.
-- ---------------------------------------------------------------------------
create or replace function public.canopy_admin_create_cohort_action(
  p_cohort_key text,
  p_learner_id uuid,
  p_action_type text,
  p_subject text,
  p_message text,
  p_status text default 'open',
  p_certificate_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'WOMATE Admin access required.';
  end if;

  if not exists(
    select 1 from public.canopy_cohort_memberships
    where cohort_key=p_cohort_key and user_id=p_learner_id
  ) then
    raise exception 'This learner is not a member of the selected cohort.';
  end if;

  insert into public.canopy_manager_actions(
    learner_id,action_type,subject,message,status,certificate_code,created_by,cohort_key
  )
  values(
    p_learner_id,
    p_action_type,
    left(trim(coalesce(p_subject,'')),240),
    trim(coalesce(p_message,'')),
    coalesce(nullif(trim(coalesce(p_status,'')),''),'open'),
    nullif(trim(coalesce(p_certificate_code,'')),''),
    auth.uid(),
    p_cohort_key
  )
  returning id into v_id;

  return jsonb_build_object('ok',true,'id',v_id,'cohort_key',p_cohort_key);
end;
$$;

revoke all on function public.canopy_admin_create_cohort_action(text,uuid,text,text,text,text,text) from public;
grant execute on function public.canopy_admin_create_cohort_action(text,uuid,text,text,text,text,text) to authenticated;

create or replace function public.canopy_admin_create_cohort_bulk_action(
  p_cohort_key text,
  p_recipient_ids uuid[],
  p_action_type text,
  p_subject text,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_user uuid;
  v_sent integer:=0;
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'WOMATE Admin access required.';
  end if;

  if coalesce(array_length(p_recipient_ids,1),0)=0 then
    return jsonb_build_object('sent',0,'cohort_key',p_cohort_key);
  end if;

  foreach v_user in array p_recipient_ids loop
    if exists(
      select 1 from public.canopy_cohort_memberships
      where cohort_key=p_cohort_key and user_id=v_user
        and status not in ('inactive')
    ) then
      insert into public.canopy_manager_actions(
        learner_id,action_type,subject,message,status,created_by,cohort_key
      )
      values(
        v_user,
        p_action_type,
        left(trim(coalesce(p_subject,'')),240),
        trim(coalesce(p_message,'')),
        'open',
        auth.uid(),
        p_cohort_key
      );
      v_sent:=v_sent+1;
    end if;
  end loop;

  return jsonb_build_object('sent',v_sent,'cohort_key',p_cohort_key);
end;
$$;

revoke all on function public.canopy_admin_create_cohort_bulk_action(text,uuid[],text,text,text) from public;
grant execute on function public.canopy_admin_create_cohort_bulk_action(text,uuid[],text,text,text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Future-cohort attendance adapter.
-- Cohort 2 continues through the legacy attendance RPC to preserve production.
-- ---------------------------------------------------------------------------
create or replace function public.canopy_admin_cohort_attendance(p_cohort_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'WOMATE Admin access required.';
  end if;

  return jsonb_build_object(
    'learners',coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'user_id',p.user_id,
          'full_name',coalesce(p.full_name,'Learner'),
          'country',p.country
        )
        order by p.full_name
      )
      from public.canopy_cohort_memberships cm
      join public.canopy_profiles p on p.user_id=cm.user_id and p.role='learner'
      where cm.cohort_key=p_cohort_key
        and cm.status not in ('inactive')
    ),'[]'::jsonb),
    'attendance',coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'user_id',a.user_id,
          'module_id',a.module_id,
          'attended',a.attended,
          'marked_at',a.marked_at
        )
      )
      from public.canopy_cohort_live_attendance a
      where a.cohort_key=p_cohort_key
    ),'[]'::jsonb)
  );
end;
$$;

revoke all on function public.canopy_admin_cohort_attendance(text) from public;
grant execute on function public.canopy_admin_cohort_attendance(text) to authenticated;

create or replace function public.canopy_admin_set_cohort_attendance(
  p_cohort_key text,p_user_id uuid,p_module_id text,p_attended boolean
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'WOMATE Admin access required.';
  end if;

  if not exists(
    select 1 from public.canopy_cohort_memberships
    where cohort_key=p_cohort_key and user_id=p_user_id
      and status not in ('inactive')
  ) then
    raise exception 'This learner is not a member of the selected cohort.';
  end if;

  insert into public.canopy_cohort_live_attendance(
    cohort_key,user_id,module_id,attended,marked_by,marked_at
  )
  values(p_cohort_key,p_user_id,p_module_id,coalesce(p_attended,false),auth.uid(),now())
  on conflict(cohort_key,user_id,module_id) do update
  set attended=excluded.attended,marked_by=excluded.marked_by,marked_at=excluded.marked_at;

  return jsonb_build_object(
    'ok',true,'cohort_key',p_cohort_key,'user_id',p_user_id,
    'module_id',p_module_id,'attended',coalesce(p_attended,false)
  );
end;
$$;

revoke all on function public.canopy_admin_set_cohort_attendance(text,uuid,text,boolean) from public;
grant execute on function public.canopy_admin_set_cohort_attendance(text,uuid,text,boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Mission Admin adapter.
-- Existing review RPCs still operate on the selected group id; listing/stats
-- are now selected-cohort only.
-- ---------------------------------------------------------------------------
create or replace function public.canopy_admin_cohort_mission_groups(p_cohort_key text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_all jsonb;
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'WOMATE Admin access required.';
  end if;

  v_all:=public.canopy_admin_mission_groups();

  return coalesce((
    select jsonb_agg(x)
    from jsonb_array_elements(coalesce(v_all,'[]'::jsonb)) x
    join public.canopy_mission_groups g on g.id=(x->>'id')::uuid
    where g.cohort_key=p_cohort_key
  ),'[]'::jsonb);
end;
$$;

revoke all on function public.canopy_admin_cohort_mission_groups(text) from public;
grant execute on function public.canopy_admin_cohort_mission_groups(text) to authenticated;

create or replace function public.canopy_admin_cohort_mission_stats(p_cohort_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'WOMATE Admin access required.';
  end if;

  return jsonb_build_object(
    'eligible',(
      select count(*) from public.canopy_cohort_memberships cm
      where cm.cohort_key=p_cohort_key
        and cm.status not in ('inactive','withdrawn')
        and public.canopy_module1_mission_eligible(cm.user_id)
    ),
    'groups_formed',(select count(*) from public.canopy_mission_groups where cohort_key=p_cohort_key),
    'invited',(
      select count(*) from public.canopy_mission_group_members m
      join public.canopy_mission_groups g on g.id=m.group_id
      where g.cohort_key=p_cohort_key and m.invitation_status='invited'
    ),
    'accepted',(
      select count(*) from public.canopy_mission_group_members m
      join public.canopy_mission_groups g on g.id=m.group_id
      where g.cohort_key=p_cohort_key and m.invitation_status='accepted'
    ),
    'submitted',(select count(*) from public.canopy_mission_groups where cohort_key=p_cohort_key and status='submitted'),
    'verified',(select count(*) from public.canopy_mission_groups where cohort_key=p_cohort_key and status='verified'),
    'updated_at',now()
  );
end;
$$;

revoke all on function public.canopy_admin_cohort_mission_stats(text) from public;
grant execute on function public.canopy_admin_cohort_mission_stats(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6) Opportunity Admin adapter.
-- Future-cohort items are intentionally draft-only until participant routing
-- is activated, preventing publication into the current Cohort 2 feed.
-- ---------------------------------------------------------------------------
create or replace function public.canopy_admin_cohort_opportunities(p_cohort_key text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'WOMATE Admin access required.';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(o) order by o.archived,o.published desc,o.featured desc,o.created_at desc)
    from public.canopy_opportunities o
    where o.cohort_key=p_cohort_key
  ),'[]'::jsonb);
end;
$$;

revoke all on function public.canopy_admin_cohort_opportunities(text) from public;
grant execute on function public.canopy_admin_cohort_opportunities(text) to authenticated;

create or replace function public.canopy_admin_save_cohort_opportunity(
  p_cohort_key text,
  p_id uuid,p_title text,p_organization text,p_type text,p_summary text,p_url text,
  p_location text,p_country text,p_global boolean,p_compensation text,p_deadline_at timestamptz,
  p_min_module_no integer,p_requires_spotlight boolean,p_requires_verified_mission boolean,
  p_featured boolean,p_published boolean
)
returns public.canopy_opportunities
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_saved public.canopy_opportunities%rowtype;
  v_publish boolean:=coalesce(p_published,false) and p_cohort_key='she-leads-climate-c2-2026';
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'WOMATE Admin access required.';
  end if;

  if not exists(select 1 from public.canopy_programme_cohorts where cohort_key=p_cohort_key) then
    raise exception 'Selected cohort was not found.';
  end if;

  if p_id is not null and exists(
    select 1 from public.canopy_opportunities
    where id=p_id and cohort_key<>p_cohort_key
  ) then
    raise exception 'This opportunity belongs to another cohort.';
  end if;

  select * into v_saved
  from public.canopy_admin_save_opportunity(
    p_id,p_title,p_organization,p_type,p_summary,p_url,p_location,p_country,p_global,
    p_compensation,p_deadline_at,p_min_module_no,p_requires_spotlight,
    p_requires_verified_mission,p_featured,v_publish
  );

  update public.canopy_opportunities
  set cohort_key=p_cohort_key,
      published=v_publish,
      published_at=case when v_publish then coalesce(published_at,now()) else null end,
      updated_at=now()
  where id=v_saved.id
  returning * into v_saved;

  return v_saved;
end;
$$;

revoke all on function public.canopy_admin_save_cohort_opportunity(text,uuid,text,text,text,text,text,text,text,boolean,text,timestamptz,integer,boolean,boolean,boolean,boolean) from public;
grant execute on function public.canopy_admin_save_cohort_opportunity(text,uuid,text,text,text,text,text,text,text,boolean,text,timestamptz,integer,boolean,boolean,boolean,boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 7) Funding Admin adapter, also draft-only for future participant runtimes.
-- ---------------------------------------------------------------------------
create or replace function public.canopy_admin_cohort_funding_calls(p_cohort_key text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'WOMATE Admin access required.';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(q) order by q.archived,q.published desc,q.featured desc,q.created_at desc)
    from (
      select c.*,
        (select count(*) from public.canopy_funding_applications a
         where a.call_id=c.id and a.status<>'withdrawn') application_count
      from public.canopy_funding_calls c
      where c.cohort_key=p_cohort_key
    ) q
  ),'[]'::jsonb);
end;
$$;

revoke all on function public.canopy_admin_cohort_funding_calls(text) from public;
grant execute on function public.canopy_admin_cohort_funding_calls(text) to authenticated;

create or replace function public.canopy_admin_save_cohort_funding_call(
  p_cohort_key text,
  p_id uuid,p_title text,p_sponsor text,p_type text,p_summary text,p_deliverable text,
  p_amount_text text,p_url text,p_country text,p_global boolean,p_participation_mode text,
  p_deadline_at timestamptz,p_min_module_no integer,p_requires_spotlight boolean,
  p_requires_verified_mission boolean,p_slots integer,p_featured boolean,p_published boolean
)
returns public.canopy_funding_calls
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_saved public.canopy_funding_calls%rowtype;
  v_publish boolean:=coalesce(p_published,false) and p_cohort_key='she-leads-climate-c2-2026';
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'WOMATE Admin access required.';
  end if;

  if not exists(select 1 from public.canopy_programme_cohorts where cohort_key=p_cohort_key) then
    raise exception 'Selected cohort was not found.';
  end if;

  if p_id is not null and exists(
    select 1 from public.canopy_funding_calls
    where id=p_id and cohort_key<>p_cohort_key
  ) then
    raise exception 'This funding call belongs to another cohort.';
  end if;

  select * into v_saved
  from public.canopy_admin_save_funding_call(
    p_id,p_title,p_sponsor,p_type,p_summary,p_deliverable,p_amount_text,p_url,p_country,
    p_global,p_participation_mode,p_deadline_at,p_min_module_no,p_requires_spotlight,
    p_requires_verified_mission,p_slots,p_featured,v_publish
  );

  update public.canopy_funding_calls
  set cohort_key=p_cohort_key,
      published=v_publish,
      published_at=case when v_publish then coalesce(published_at,now()) else null end,
      updated_at=now()
  where id=v_saved.id
  returning * into v_saved;

  return v_saved;
end;
$$;

revoke all on function public.canopy_admin_save_cohort_funding_call(text,uuid,text,text,text,text,text,text,text,text,boolean,text,timestamptz,integer,boolean,boolean,integer,boolean,boolean) from public;
grant execute on function public.canopy_admin_save_cohort_funding_call(text,uuid,text,text,text,text,text,text,text,text,boolean,text,timestamptz,integer,boolean,boolean,integer,boolean,boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 8) Talent Discovery Admin adapter.
-- Talent moderation remains person-level, but the Admin queue is selected
-- cohort only.
-- ---------------------------------------------------------------------------
create or replace function public.canopy_admin_cohort_talent_network(p_cohort_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare
  v_all jsonb;
  v_rows jsonb;
  v_visible integer:=0;
  v_approved integer:=0;
begin
  if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then
    raise exception 'WOMATE Admin access required.';
  end if;

  v_all:=public.canopy_admin_talent_network();

  select coalesce(jsonb_agg(x),'[]'::jsonb)
  into v_rows
  from jsonb_array_elements(coalesce(v_all->'rows','[]'::jsonb)) x
  where exists(
    select 1 from public.canopy_cohort_memberships cm
    where cm.cohort_key=p_cohort_key
      and cm.user_id=(x->>'user_id')::uuid
  );

  select count(*)::integer into v_visible
  from jsonb_array_elements(v_rows) x
  where coalesce((x->>'visible')::boolean,false);

  select count(*)::integer into v_approved
  from jsonb_array_elements(v_rows) x
  where coalesce((x->>'approved_for_discovery')::boolean,false);

  return jsonb_build_object(
    'rows',v_rows,
    'visible_count',v_visible,
    'approved_count',v_approved
  );
end;
$$;

revoke all on function public.canopy_admin_cohort_talent_network(text) from public;
grant execute on function public.canopy_admin_cohort_talent_network(text) to authenticated;

commit;
reset lock_timeout;
reset statement_timeout;
