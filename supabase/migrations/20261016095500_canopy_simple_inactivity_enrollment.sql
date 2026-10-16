-- Existing Admin permission, cohort participation and learner activity are enforced in SQL.
-- Return JSONB instead of RETURNS TABLE(user_id...) to avoid PL/pgSQL output-variable ambiguity.
BEGIN;
CREATE OR REPLACE FUNCTION public.canopy_admin_c2_simple_candidates()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE v_data jsonb;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.canopy_profiles p WHERE p.user_id=auth.uid() AND p.role='admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('user_id',q.user_id,'full_name',q.full_name,'email',q.email) ORDER BY q.full_name),'[]'::jsonb)
 INTO v_data
 FROM (
 SELECT DISTINCT e.user_id,p.full_name::text AS full_name,u.email::text AS email
 FROM public.canopy_enrollments e
 JOIN public.canopy_profiles p ON p.user_id=e.user_id
 JOIN auth.users u ON u.id=e.user_id
 WHERE e.status='active' AND p.role='learner'
 AND NOT EXISTS(SELECT 1 FROM public.canopy_lesson_progress lp WHERE lp.user_id=e.user_id AND lp.completed=true)
 AND NOT EXISTS(SELECT 1 FROM public.canopy_live_attendance la WHERE la.user_id=e.user_id AND la.attended=true)
 AND NOT EXISTS(SELECT 1 FROM public.canopy_assignment_submissions s WHERE s.user_id=e.user_id)
 AND NOT EXISTS(SELECT 1 FROM public.canopy_certificates c WHERE c.user_id=e.user_id)
 AND NOT EXISTS(SELECT 1 FROM public.canopy_cohort_memberships m WHERE m.user_id=e.user_id AND m.status='active')
 AND NOT EXISTS(SELECT 1 FROM public.canopy_graduation_2026_approvals a WHERE a.user_id=e.user_id AND a.graduated=true)
 AND NOT EXISTS(SELECT 1 FROM public.canopy_c2_inactivity_cases x WHERE x.user_id=e.user_id AND x.status IN ('withdrawn','appealed','retained','purge_eligible'))
 ) q;
 RETURN v_data;
END $$;
REVOKE ALL ON FUNCTION public.canopy_admin_c2_simple_candidates() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.canopy_admin_c2_simple_candidates() TO authenticated;

CREATE OR REPLACE FUNCTION public.canopy_admin_c2_unenroll_simple(p_user uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.canopy_profiles p WHERE p.user_id=auth.uid() AND p.role='admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.canopy_admin_c2_simple_candidates()) j WHERE (j->>'user_id')::uuid=p_user) THEN
 RAISE EXCEPTION 'Learner is not eligible for inactivity unenrollment'; END IF;
 INSERT INTO public.canopy_c2_inactivity_cases(user_id,status)
 VALUES(p_user,'review') ON CONFLICT(user_id) DO UPDATE SET status='review',updated_at=now();
 RETURN public.canopy_admin_c2_withdraw_verified(p_user,'No recorded lessons, attendance, or submitted assignments; admin-initiated Cohort 2 unenrollment.');
END $$;
REVOKE ALL ON FUNCTION public.canopy_admin_c2_unenroll_simple(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.canopy_admin_c2_unenroll_simple(uuid) TO authenticated;
COMMIT;
