-- Certified-only bulk graduation; one transaction, explicit aliases and role checks.
BEGIN;
CREATE OR REPLACE FUNCTION public.canopy_admin_graduation_bulk_approve_2026(p_user_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE v_requested integer; v_approved integer;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.canopy_profiles AS administrator WHERE administrator.user_id=auth.uid() AND administrator.role='admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
 SELECT count(DISTINCT candidate.id) INTO v_requested FROM unnest(coalesce(p_user_ids,ARRAY[]::uuid[])) AS candidate(id);
 IF v_requested=0 OR v_requested>1000 THEN RAISE EXCEPTION 'Select between 1 and 1000 learners'; END IF;
 IF EXISTS (
  SELECT 1 FROM (SELECT DISTINCT candidate.id AS learner_id FROM unnest(p_user_ids) AS candidate(id)) AS requested
  WHERE NOT EXISTS (SELECT 1 FROM public.canopy_certificates AS cert WHERE cert.user_id=requested.learner_id)
     OR NOT EXISTS (SELECT 1 FROM public.canopy_enrollments AS enrollment WHERE enrollment.user_id=requested.learner_id AND enrollment.status='active')
     OR NOT EXISTS (SELECT 1 FROM public.canopy_profiles AS profile WHERE profile.user_id=requested.learner_id AND profile.role='learner')
 ) THEN RAISE EXCEPTION 'Every selected learner must have an issued certificate and active learner enrollment'; END IF;
 INSERT INTO public.canopy_graduation_2026_approvals AS approval(user_id,graduated,marked_at,marked_by)
 SELECT DISTINCT candidate.id,true,now(),auth.uid() FROM unnest(p_user_ids) AS candidate(id)
 ON CONFLICT (user_id) DO UPDATE SET graduated=true,marked_at=excluded.marked_at,marked_by=excluded.marked_by;
 GET DIAGNOSTICS v_approved=ROW_COUNT;
 RETURN jsonb_build_object('approved_count',v_approved,'requested_count',v_requested);
END $$;
REVOKE ALL ON FUNCTION public.canopy_admin_graduation_bulk_approve_2026(uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.canopy_admin_graduation_bulk_approve_2026(uuid[]) TO authenticated;

-- Explicit table aliases prevent ambiguous RETURNS TABLE output names inside PL/pgSQL.
CREATE OR REPLACE FUNCTION public.canopy_admin_graduation_2026_list()
RETURNS TABLE(user_id uuid,full_name text,email text,graduated boolean,has_certificate boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.canopy_profiles AS administrator WHERE administrator.user_id=auth.uid() AND administrator.role='admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
 RETURN QUERY SELECT DISTINCT enrollment.user_id,profile.full_name::text,account.email::text,
 coalesce(approval.graduated,false),EXISTS(SELECT 1 FROM public.canopy_certificates AS cert WHERE cert.user_id=enrollment.user_id)
 FROM public.canopy_enrollments AS enrollment
 JOIN public.canopy_profiles AS profile ON profile.user_id=enrollment.user_id
 JOIN auth.users AS account ON account.id=enrollment.user_id
 LEFT JOIN public.canopy_graduation_2026_approvals AS approval ON approval.user_id=enrollment.user_id
 WHERE profile.role='learner' AND enrollment.status='active';
END $$;
REVOKE ALL ON FUNCTION public.canopy_admin_graduation_2026_list() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.canopy_admin_graduation_2026_list() TO authenticated;

CREATE OR REPLACE FUNCTION public.canopy_admin_inactivity_2026_preview()
RETURNS TABLE(user_id uuid,full_name text,email text,enrolled_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.canopy_profiles AS administrator WHERE administrator.user_id=auth.uid() AND administrator.role='admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
 RETURN QUERY SELECT candidate.user_id,profile.full_name::text,account.email::text,candidate.enrolled_at
 FROM public.canopy_admin_c2_zero_activity_candidates() AS candidate
 JOIN public.canopy_profiles AS profile ON profile.user_id=candidate.user_id
 JOIN auth.users AS account ON account.id=candidate.user_id;
END $$;
REVOKE ALL ON FUNCTION public.canopy_admin_inactivity_2026_preview() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.canopy_admin_inactivity_2026_preview() TO authenticated;
COMMIT;