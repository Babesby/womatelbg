-- Temporary, single-account Talent Discovery test requested by WOMATE.
-- Magdalene Aidoo remains ineligible for cohort achievements and graduation;
-- only public Talent Discovery visibility is excepted here. Remove the UUID
-- exception and revert discovery flags after the test.
create or replace function public.canopy_talent_is_visible(p_user uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(
   select 1 from public.canopy_talent_settings t
   join public.canopy_profiles p on p.user_id=t.user_id
   where t.user_id=p_user and p.role='learner'
     and t.approved_for_discovery=true and t.discoverable=true
     and (public.canopy_talent_eligible(p_user)
          or p_user='1c40c0ab-0d6f-4468-8f78-6e0553b123ea'::uuid)
     and public.canopy_talent_profile_ready(p_user)
 );
$$;

update public.canopy_talent_settings t
set approved_for_discovery=true,
    discoverable=true,
    public_slug=null,
    approved_at=now(),
    updated_at=now()
from public.canopy_profiles p
where t.user_id=p.user_id
  and t.user_id='1c40c0ab-0d6f-4468-8f78-6e0553b123ea'::uuid
  and p.full_name='Magdalene Aidoo'
  and (not t.approved_for_discovery or not t.discoverable
       or t.public_slug like 'phillipa-aidoo-%');
