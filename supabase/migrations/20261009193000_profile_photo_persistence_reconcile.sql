-- WOMATE Canopy profile-photo persistence repair
set lock_timeout='8s';
set statement_timeout='90s';

alter function public.canopy_get_talent_network() volatile;

create or replace function public.canopy_reconcile_own_profile_photo()
returns jsonb
language plpgsql
security definer
set search_path=public,auth,storage
as $$
declare
  uid uuid:=auth.uid();
  expected text;
  exists_in_storage boolean:=false;
begin
  if uid is null then raise exception 'Not signed in.'; end if;
  expected:=uid::text||'/avatar.webp';

  insert into public.canopy_talent_settings(user_id)
  values(uid)
  on conflict(user_id) do nothing;

  select exists(
    select 1 from storage.objects
    where bucket_id='canopy-profile-images' and name=expected
  ) into exists_in_storage;

  if exists_in_storage then
    update public.canopy_talent_settings
    set avatar_path=expected,
        updated_at=case when avatar_path is distinct from expected then now() else updated_at end
    where user_id=uid and avatar_path is distinct from expected;
  end if;

  return jsonb_build_object(
    'ok',true,
    'avatar_path',case when exists_in_storage then expected else null end,
    'exists_in_storage',exists_in_storage
  );
end;
$$;

revoke all on function public.canopy_reconcile_own_profile_photo() from public;
grant execute on function public.canopy_reconcile_own_profile_photo() to authenticated;

reset lock_timeout;
reset statement_timeout;
