-- Opt-in selected-participant showcase for Africa C3 and Asia C1 in 2027.
-- 2026 directory and existing private admission codes stay unchanged.
alter table public.womate_cohort_applications
 add column if not exists public_selection_listing_opt_in boolean not null default false;

create or replace function public.womate_2027_set_public_selection_consent(
 p_email text,p_code text,p_opt_in boolean
) returns boolean language plpgsql security definer set search_path=public,private,extensions,pg_temp as $$
declare selected_id uuid; normalized_email text:=lower(trim(coalesce(p_email,'')));
begin
 if length(normalized_email)>320 or p_code is null or length(p_code)>40 or p_opt_in is null then return false; end if;
 -- Only the participant who has received the valid private selected-card code
 -- can choose to display or withdraw their own name. Codes never leave the server.
 select a.id into selected_id from public.womate_cohort_applications a
 join public.womate_selected_card_invites i on lower(i.email)=lower(a.email)
  and i.programme_slug=a.cohort_key and i.code_hash=a.offer_code_hash
 where lower(a.email)=normalized_email
   and a.cohort_key in ('she-leads-climate-c3-2027','she-leads-asia-c1-2027')
   and a.status in ('selected','offer_accepted','account_linked','onboarding_complete')
   and a.reviewer_note_private is distinct from 'WOMATE_EMAIL_FLOW_TEST'
   and a.decision_email_status='sent'
   and i.status='active'
   and (i.expires_at is null or i.expires_at>now())
   and i.code_hash=md5(upper(trim(p_code)))
 order by a.reviewed_at desc nulls last limit 1;
 if selected_id is null then return false; end if;
 update public.womate_cohort_applications set public_selection_listing_opt_in=p_opt_in
 where id=selected_id;
 return true;
end $$;
revoke all on function public.womate_2027_set_public_selection_consent(text,text,boolean) from public;
grant execute on function public.womate_2027_set_public_selection_consent(text,text,boolean) to anon,authenticated;

create or replace function public.womate_2027_public_selected_directory(p_cohort text)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare published boolean:=false; result jsonb:='[]'::jsonb;
begin
 if p_cohort not in ('she-leads-climate-c3-2027','she-leads-asia-c1-2027') then
   return jsonb_build_object('published',false,'count',0,'rows','[]'::jsonb);
 end if;
 select coalesce((delivery_rules->>'public_selection_directory_enabled')::boolean,false)
 into published from public.canopy_programme_cohorts where cohort_key=p_cohort;
 if not coalesce(published,false) then
   return jsonb_build_object('published',false,'count',0,'rows','[]'::jsonb);
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('fullName',q.full_name,
 'countryName',q.country_name,'cohortKey',p_cohort) order by q.full_name),'[]'::jsonb)
 into result from (
 select a.full_name,coalesce(nullif(a.country,''),'Country not specified') as country_name
 from public.womate_cohort_applications a
 where a.cohort_key=p_cohort
   and a.public_selection_listing_opt_in=true
   and a.status in ('selected','offer_accepted','account_linked','onboarding_complete')
   and a.offer_accepted_at is not null
   and a.decision_email_status='sent'
   and a.reviewer_note_private is distinct from 'WOMATE_EMAIL_FLOW_TEST'
 order by lower(a.full_name) limit 1000
 ) q;
 return jsonb_build_object('published',true,'count',jsonb_array_length(result),'rows',result);
end $$;
revoke all on function public.womate_2027_public_selected_directory(text) from public;
grant execute on function public.womate_2027_public_selected_directory(text) to anon,authenticated;

create or replace function public.womate_2027_admin_publish_selected_directory(p_cohort text,p_publish boolean)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare row_count integer;
begin
 if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then raise exception 'WOMATE administrator only'; end if;
 if p_cohort not in ('she-leads-climate-c3-2027','she-leads-asia-c1-2027') then raise exception 'Choose Africa or Asia 2027'; end if;
 update public.canopy_programme_cohorts set delivery_rules=
  jsonb_set(jsonb_set(coalesce(delivery_rules,'{}'::jsonb),
   '{public_selection_directory_enabled}',to_jsonb(coalesce(p_publish,false)),true),
   '{public_selection_directory_updated_at}',to_jsonb(now()::text),true)
 where cohort_key=p_cohort;
 select count(*) into row_count from public.womate_cohort_applications
 where cohort_key=p_cohort and public_selection_listing_opt_in=true and offer_accepted_at is not null
 and decision_email_status='sent' and status in ('selected','offer_accepted','account_linked','onboarding_complete')
 and reviewer_note_private is distinct from 'WOMATE_EMAIL_FLOW_TEST';
 return jsonb_build_object('published',coalesce(p_publish,false),'consented_accepted_count',row_count);
end $$;
revoke all on function public.womate_2027_admin_publish_selected_directory(text,boolean) from public,anon;
grant execute on function public.womate_2027_admin_publish_selected_directory(text,boolean) to authenticated;

-- Explicitly closed until WOMATE confirms the official publication.
update public.canopy_programme_cohorts set delivery_rules=jsonb_set(
 coalesce(delivery_rules,'{}'::jsonb),'{public_selection_directory_enabled}','false'::jsonb,true)
where cohort_key in ('she-leads-climate-c3-2027','she-leads-asia-c1-2027')
 and delivery_rules->>'public_selection_directory_enabled' is null;
