-- ADMIN-ONLY cohort 2 graduation operations. Non-destructive and idempotent.
create or replace function public.canopy_admin_graduation_2026_list()
returns table(user_id uuid,full_name text,email text,graduated boolean,has_certificate boolean)
language plpgsql security definer set search_path=public,auth as $$
begin
 if auth.uid() is null or not exists(select 1 from public.canopy_profiles p where p.user_id=auth.uid() and p.role='admin') then raise exception 'Admin access required'; end if;
 return query select distinct e.user_id, p.full_name::text, u.email::text,
 coalesce(a.graduated,false),exists(select 1 from public.canopy_certificates c where c.user_id=e.user_id)
 from public.canopy_enrollments e
 join public.canopy_profiles p on p.user_id=e.user_id
 join auth.users u on u.id=e.user_id
 left join public.canopy_graduation_2026_approvals a on a.user_id=e.user_id
 where coalesce(p.role,'learner')='learner';
end $$;
revoke all on function public.canopy_admin_graduation_2026_list() from public,anon;
grant execute on function public.canopy_admin_graduation_2026_list() to authenticated;

-- Admin-only review listing: do NOT treat as a final verification of inactivity.
create or replace function public.canopy_admin_inactivity_2026_preview()
returns table(user_id uuid,full_name text,email text,enrolled_at timestamptz)
language plpgsql security definer set search_path=public,auth as $$
begin
 if auth.uid() is null or not exists(select 1 from public.canopy_profiles p where p.user_id=auth.uid() and p.role='admin') then raise exception 'Admin access required'; end if;
 return query select c.user_id,p.full_name::text,u.email::text,c.enrolled_at
 from public.canopy_admin_c2_zero_activity_candidates() c
 join public.canopy_profiles p on p.user_id=c.user_id
 join auth.users u on u.id=c.user_id;
end $$;
revoke all on function public.canopy_admin_inactivity_2026_preview() from public,anon;
grant execute on function public.canopy_admin_inactivity_2026_preview() to authenticated;
