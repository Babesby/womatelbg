-- Allow participants to revoke an earlier public-directory consent even after card expiry.
-- Publishing a new consent still requires a current valid private card code.
create or replace function public.womate_2027_set_public_selection_consent(
 p_email text,p_code text,p_opt_in boolean
) returns boolean language plpgsql security definer set search_path=public,private,extensions,pg_temp as $$
declare selected_id uuid; normalized_email text:=lower(trim(coalesce(p_email,'')));
begin
 if length(normalized_email)>320 or p_code is null or length(p_code)>40 or p_opt_in is null then return false; end if;
 select a.id into selected_id from public.womate_cohort_applications a
 join public.womate_selected_card_invites i on lower(i.email)=lower(a.email)
  and i.programme_slug=a.cohort_key and i.code_hash=a.offer_code_hash
 where lower(a.email)=normalized_email
   and a.cohort_key in ('she-leads-climate-c3-2027','she-leads-asia-c1-2027')
   and a.status in ('selected','offer_accepted','account_linked','onboarding_complete')
   and a.reviewer_note_private is distinct from 'WOMATE_EMAIL_FLOW_TEST'
   and a.decision_email_status='sent'
   and i.status='active'
   and (not p_opt_in or i.expires_at is null or i.expires_at>now())
   and i.code_hash=md5(upper(trim(p_code)))
 order by a.reviewed_at desc nulls last limit 1;
 if selected_id is null then return false; end if;
 update public.womate_cohort_applications set public_selection_listing_opt_in=p_opt_in where id=selected_id;
 return true;
end $$;
revoke all on function public.womate_2027_set_public_selection_consent(text,text,boolean) from public;
grant execute on function public.womate_2027_set_public_selection_consent(text,text,boolean) to anon,authenticated;

create or replace function public.womate_2027_admin_directory_state(p_cohort text)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare is_published boolean:=false; selected_total int:=0; opted int:=0; ready int:=0;
begin
 if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then raise exception 'WOMATE administrator only'; end if;
 if p_cohort not in ('she-leads-climate-c3-2027','she-leads-asia-c1-2027') then raise exception 'Unsupported cohort'; end if;
 select coalesce((delivery_rules->>'public_selection_directory_enabled')::boolean,false) into is_published
 from public.canopy_programme_cohorts where cohort_key=p_cohort;
 select count(*),
 count(*) filter(where public_selection_listing_opt_in),
 count(*) filter(where public_selection_listing_opt_in and offer_accepted_at is not null)
 into selected_total,opted,ready
 from public.womate_cohort_applications
 where cohort_key=p_cohort and status in ('selected','offer_accepted','account_linked','onboarding_complete')
 and decision_email_status='sent' and reviewer_note_private is distinct from 'WOMATE_EMAIL_FLOW_TEST';
 return jsonb_build_object('published',is_published,'selected_notified',selected_total,
 'opted_in',opted,'accepted_opted_in',ready);
end $$;
revoke all on function public.womate_2027_admin_directory_state(text) from public,anon;
grant execute on function public.womate_2027_admin_directory_state(text) to authenticated;
