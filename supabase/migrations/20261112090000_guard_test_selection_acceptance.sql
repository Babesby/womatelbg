-- Preserve the deployed safeguard: demo admission flows cannot reserve real seats.
CREATE OR REPLACE FUNCTION public.womate_accept_cohort_offer(p_reference text, p_email text, p_code text, p_accept boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare x public.womate_cohort_applications%rowtype;
begin
  select * into x from public.womate_cohort_applications
  where application_reference=upper(trim(p_reference))
    and lower(email)=lower(trim(p_email))
  for update;
  if not found then raise exception 'Application not found'; end if;
  if x.status<>'selected' then raise exception 'This application does not have an open offer'; end if;
  if x.offer_expires_at is not null and x.offer_expires_at<=now() then raise exception 'This offer has expired'; end if;
  if x.offer_code_hash is null or md5(upper(trim(coalesce(p_code,''))))<>x.offer_code_hash then raise exception 'Invalid offer code'; end if;

  -- A test selection must never turn into a genuine admission.
  if x.reviewer_note_private='WOMATE_EMAIL_FLOW_TEST' then
    return jsonb_build_object(
      'ok',true,'preview',true,'reference',x.application_reference,
      'status',case when p_accept then 'preview_accepted' else 'preview_declined' end,
      'next_step','preview_only'
    );
  end if;

  update public.womate_cohort_applications set
    status=case when p_accept then 'offer_accepted' else 'offer_declined' end,
    offer_accepted_at=case when p_accept then now() else null end,
    offer_declined_at=case when p_accept then null else now() end,
    updated_at=now()
  where id=x.id returning * into x;

  return jsonb_build_object(
    'ok',true,'reference',x.application_reference,'status',x.status,
    'next_step',case when p_accept then 'create_or_sign_in_canopy' else 'complete' end
  );
end
$function$

