-- WOMATE CANOPY · DEPUTY DASHBOARD + TEAM ACCESS RETRY FIX
-- 10 September 2026
-- Safe, additive hotfix. Existing staff memberships/codes are preserved.

begin;

-- Make Team Access activation idempotent for the SAME authenticated user/code.
-- This prevents a stale browser-pending code from failing every page load after
-- the code has already successfully activated that user's membership.
create or replace function public.canopy_activate_team_access(p_code text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  c public.canopy_team_access_codes%rowtype;
  normalized text:=upper(trim(coalesce(p_code,'')));
  email_value text:=lower(coalesce(auth.jwt()->>'email',''));
  existing_role text;
  existing_module text;
  existing_status text;
begin
  if auth.uid() is null then raise exception 'Sign in to continue.'; end if;
  if email_value='p.viewmultimedia@gmail.com' then
    raise exception 'This account is reserved for testing.';
  end if;
  if normalized='' then raise exception 'Enter your WOMATE Team Access Code.'; end if;

  select * into c
  from public.canopy_team_access_codes
  where code_hash=md5(normalized)
  for update;

  if not found then raise exception 'This Team Access Code is invalid.'; end if;

  -- If this exact code already activated THIS user, treat a browser retry as success.
  select m.role,m.module_id,m.status
    into existing_role,existing_module,existing_status
  from public.canopy_staff_memberships m
  where m.user_id=auth.uid()
    and m.activated_by_code=c.id
  limit 1;

  if found and existing_status='active' then
    return jsonb_build_object(
      'user_id',auth.uid(),
      'role',existing_role,
      'module_id',existing_module,
      'status','active',
      'already_activated',true
    );
  end if;

  if c.status='revoked' then raise exception 'This Team Access Code was revoked.'; end if;
  if c.expires_at<=now() then
    update public.canopy_team_access_codes set status='expired' where id=c.id;
    raise exception 'This Team Access Code has expired. Ask WOMATE for a fresh code.';
  end if;
  if c.status<>'active' or c.used_count>=c.max_uses then
    raise exception 'This Team Access Code has already been used.';
  end if;

  insert into public.canopy_staff_memberships(
    user_id,role,module_id,status,activated_by_code,created_at,updated_at
  )
  values(auth.uid(),c.role,c.module_id,'active',c.id,now(),now())
  on conflict(user_id) do update
  set role=excluded.role,
      module_id=excluded.module_id,
      status='active',
      activated_by_code=excluded.activated_by_code,
      updated_at=now();

  update public.canopy_team_access_codes
  set used_count=used_count+1,
      last_used_at=now(),
      status=case when used_count+1>=max_uses then 'used' else 'active' end
  where id=c.id;

  insert into public.canopy_team_audit_log(actor_user_id,action,target_user_id,detail)
  values(auth.uid(),'team_access_activated',auth.uid(),jsonb_build_object(
    'code_id',c.id,'role',c.role,'module_id',c.module_id
  ));

  return jsonb_build_object(
    'user_id',auth.uid(),'role',c.role,'module_id',c.module_id,'status','active'
  );
end;
$$;

revoke all on function public.canopy_activate_team_access(text) from public;
grant execute on function public.canopy_activate_team_access(text) to authenticated;

commit;
