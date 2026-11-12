-- Read a participant's current 2027 public showcase preference using their verified private code.
create or replace function public.womate_2027_public_selection_consent_status(p_email text,p_code text)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce((
 select a.public_selection_listing_opt_in from public.womate_cohort_applications a
 join public.womate_selected_card_invites i on i.programme_slug=a.cohort_key
 and lower(i.email)=lower(a.email) and i.code_hash=a.offer_code_hash
 where lower(a.email)=lower(trim(coalesce(p_email,'')))
 and length(coalesce(p_email,''))<=320 and length(coalesce(p_code,''))<=40
 and i.code_hash=md5(upper(trim(coalesce(p_code,''))))
 and i.status='active'
 and a.cohort_key in ('she-leads-climate-c3-2027','she-leads-asia-c1-2027')
 and a.status in ('selected','offer_accepted','account_linked','onboarding_complete')
 and a.reviewer_note_private is distinct from 'WOMATE_EMAIL_FLOW_TEST'
 and a.decision_email_status='sent'
 limit 1),false);
$$;
revoke all on function public.womate_2027_public_selection_consent_status(text,text) from public;
grant execute on function public.womate_2027_public_selection_consent_status(text,text) to anon,authenticated;
