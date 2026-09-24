-- WOMATE CANOPY · PARTICIPANT PROFILE DETAILS EXTENSION · 24 SEP 2026
-- Adds atomic participant editing for full name + country.
-- Safe additive migration. Does not replace or rerun the 23 Sep profile migration.

begin;

create or replace function public.canopy_update_own_profile_details(
  p_full_name text,
  p_country text
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  uid uuid:=auth.uid();
  cleaned_name text;
  cleaned_country text;
  old_name text;
  old_country text;
  user_role text;
  name_changed boolean;
  country_changed boolean;
begin
  if uid is null then raise exception 'Not signed in.'; end if;

  cleaned_name:=regexp_replace(trim(coalesce(p_full_name,'')),'\s+',' ','g');
  cleaned_country:=regexp_replace(trim(coalesce(p_country,'')),'\s+',' ','g');

  if char_length(cleaned_name)<2 then raise exception 'Enter your full name.'; end if;
  if char_length(cleaned_name)>120 then raise exception 'Name is too long.'; end if;
  if char_length(cleaned_country)<2 then raise exception 'Enter your country.'; end if;
  if char_length(cleaned_country)>80 then raise exception 'Country is too long.'; end if;

  select role,full_name,country into user_role,old_name,old_country
  from public.canopy_profiles
  where user_id=uid;

  if user_role is null then raise exception 'Canopy profile not found.'; end if;
  if user_role not in ('learner','tester') then
    raise exception 'Participant profile editing is not available for this account.';
  end if;

  name_changed:=cleaned_name is distinct from old_name;
  country_changed:=cleaned_country is distinct from old_country;

  if name_changed and exists(select 1 from public.canopy_certificates where user_id=uid) then
    raise exception 'A certificate has already been issued for this account. Contact WOMATE Support to correct the certificate name.';
  end if;

  if not name_changed and not country_changed then
    return jsonb_build_object(
      'ok',true,
      'full_name',cleaned_name,
      'country',cleaned_country,
      'changed',false
    );
  end if;

  update public.canopy_profiles
  set full_name=cleaned_name,
      country=cleaned_country
  where user_id=uid;

  update auth.users
  set raw_user_meta_data=coalesce(raw_user_meta_data,'{}'::jsonb)||jsonb_build_object(
    'full_name',cleaned_name,
    'country',cleaned_country
  )
  where id=uid;

  if name_changed then
    insert into public.canopy_profile_name_changes(user_id,old_name,new_name)
    values(uid,old_name,cleaned_name);
  end if;

  return jsonb_build_object(
    'ok',true,
    'full_name',cleaned_name,
    'country',cleaned_country,
    'changed',true,
    'name_changed',name_changed,
    'country_changed',country_changed
  );
end;
$$;

revoke all on function public.canopy_update_own_profile_details(text,text) from public;
grant execute on function public.canopy_update_own_profile_details(text,text) to authenticated;

commit;
