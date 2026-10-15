
-- WOMATE operational safety migration. Review and apply in Supabase SQL Editor.
-- This migration NEVER deletes auth.users. Withdrawal requires an admin operation.
create table if not exists public.canopy_mission_contribution_reviews (
  group_id uuid not null,
  user_id uuid not null,
  decision text not null check(decision in ('approved','revision_required','rejected')),
  reason text,
  reviewer_id uuid not null,
  reviewed_at timestamptz not null default now(),
  primary key(group_id,user_id)
);
alter table public.canopy_mission_contribution_reviews enable row level security;
revoke all on public.canopy_mission_contribution_reviews from anon, authenticated;

create or replace function public.canopy_admin_review_mission_contribution_v2(
  p_group uuid,p_user uuid,p_decision text,p_remark text default null
) returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare
  v_decision text := lower(trim(coalesce(p_decision,'')));
  v_remark text := nullif(trim(coalesce(p_remark,'')),'');
  v_proof text;
  v_report uuid;
begin
 if not public.canopy_is_manager(auth.uid()) then raise exception 'Manager access required'; end if;
 if v_decision not in ('approved','revision_required','rejected') then raise exception 'Unsupported decision'; end if;
 if v_decision <> 'approved' and length(coalesce(v_remark,'')) < 12 then raise exception 'Explain the revision or rejection (12+ characters)'; end if;
 select id,proof_url into v_report,v_proof from public.canopy_mission_reports
 where group_id=p_group and user_id=p_user order by submitted_at desc limit 1;
 if v_report is null then raise exception 'An individual report is required'; end if;
 if v_decision='approved' and (v_proof is null or length(trim(v_proof)) < 12) then raise exception 'The individual report needs its own evidence link before approval'; end if;
 if v_decision='approved' then
   perform public.canopy_admin_review_mission_contributor(p_group,p_user,'completed',v_remark);
 else
   if exists(select 1 from public.canopy_mission_completions where group_id=p_group and user_id=p_user and status='completed') then
     perform public.canopy_admin_review_mission_contributor(p_group,p_user,'revoked',v_remark);
   end if;
 end if;
 insert into public.canopy_mission_contribution_reviews(group_id,user_id,decision,reason,reviewer_id,reviewed_at)
 values(p_group,p_user,v_decision,v_remark,auth.uid(),now())
 on conflict(group_id,user_id) do update set decision=excluded.decision,reason=excluded.reason,reviewer_id=excluded.reviewer_id,reviewed_at=now();
 if v_decision <> 'approved' then
   insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
   values(p_user,'mission_review',
      case when v_decision='revision_required' then 'Mission contribution: revision requested' else 'Mission contribution: review not approved' end,
      coalesce(v_remark,'Please review your contribution.'),'/canopy/opportunities',
      'mission-review-v2:'||p_group||':'||p_user||':'||extract(epoch from now())::bigint);
 end if;
 return jsonb_build_object('decision',v_decision,'group_id',p_group,'user_id',p_user,'reviewed_at',now());
end $$;
revoke all on function public.canopy_admin_review_mission_contribution_v2(uuid,uuid,text,text) from public;
grant execute on function public.canopy_admin_review_mission_contribution_v2(uuid,uuid,text,text) to authenticated;

-- Auditable list and queue; deleting Supabase Auth identities is intentionally a separate,
-- service-role-only action subject to seven-day delay and cross-service dependency review.
create table if not exists public.canopy_c2_inactivity_cases (
 user_id uuid primary key,
 status text not null default 'review' check(status in ('review','withdrawn','appealed','retained','purge_eligible')),
 identified_at timestamptz not null default now(),
 withdrawn_at timestamptz,
 purge_after timestamptz,
 decided_by uuid,
 decision_reason text,
 updated_at timestamptz not null default now()
);
alter table public.canopy_c2_inactivity_cases enable row level security;
revoke all on public.canopy_c2_inactivity_cases from anon, authenticated;

create or replace function public.canopy_admin_c2_zero_activity_candidates()
returns table(user_id uuid, enrolled_at timestamptz)
language plpgsql security definer set search_path=public,auth as $$
begin
 if not public.canopy_is_manager(auth.uid()) then raise exception 'Manager access required'; end if;
 return query
 select e.user_id,e.created_at
 from public.canopy_enrollments e
 join public.canopy_profiles p on p.user_id=e.user_id
 where e.status='active'
   and coalesce(p.role,'learner')='learner'
   and not exists(select 1 from public.canopy_lesson_progress l where l.user_id=e.user_id and l.completed=true)
   and not exists(select 1 from public.canopy_live_attendance a where a.user_id=e.user_id and a.attended=true)
   and not exists(select 1 from public.canopy_assignment_submissions s where s.user_id=e.user_id)
   and not exists(select 1 from public.canopy_certificates c where c.user_id=e.user_id)
   and not exists(select 1 from public.canopy_c2_inactivity_cases x where x.user_id=e.user_id and x.status in ('appealed','retained','withdrawn'))
   -- Cases are candidates, not an automated deletion verdict. Other staff tables and
   -- manually recorded activity must be audited before calling the withdrawal function.
 order by e.created_at;
end $$;
revoke all on function public.canopy_admin_c2_zero_activity_candidates() from public;
grant execute on function public.canopy_admin_c2_zero_activity_candidates() to authenticated;

create or replace function public.canopy_admin_c2_queue_inactivity_reviews()
returns integer language plpgsql security definer set search_path=public,auth as $$
declare n integer;
begin
 if not public.canopy_is_manager(auth.uid()) then raise exception 'Manager access required'; end if;
 insert into public.canopy_c2_inactivity_cases(user_id,status)
 select c.user_id,'review' from public.canopy_admin_c2_zero_activity_candidates() c
 on conflict(user_id) do nothing;
 get diagnostics n=row_count;
 return n;
end $$;
revoke all on function public.canopy_admin_c2_queue_inactivity_reviews() from public;
grant execute on function public.canopy_admin_c2_queue_inactivity_reviews() to authenticated;
