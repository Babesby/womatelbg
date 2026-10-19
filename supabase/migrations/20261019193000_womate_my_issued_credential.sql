CREATE OR REPLACE FUNCTION public.womate_my_certificate_credentials()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,auth AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to see your issued credential.'; END IF;
 RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('certificate_id',c.credential_code,'status',c.status,'issued_at',c.issued_at,'award_type',c.award_type) ORDER BY c.issued_at DESC) FROM public.womate_certificate_credentials c WHERE c.recipient_id=auth.uid()),'[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.womate_my_certificate_credentials() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.womate_my_certificate_credentials() TO authenticated;