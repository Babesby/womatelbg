-- WOMATE C2: audited withdrawal; no auth.users deletion.
BEGIN;
CREATE OR REPLACE FUNCTION public.canopy_admin_c2_withdraw_verified(p_user uuid,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE v_prior text; v_count int;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.canopy_profiles WHERE user_id=auth.uid() AND role='admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
 IF length(btrim(coalesce(p_reason,'')))<25 THEN RAISE EXCEPTION 'Document at least 25 characters of verification'; END IF;
 SELECT status INTO v_prior FROM public.canopy_c2_inactivity_cases WHERE user_id=p_user FOR UPDATE;
 IF NOT FOUND OR v_prior<>'review' THEN RAISE EXCEPTION 'Only open, verified review cases may be withdrawn'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.canopy_admin_c2_zero_activity_candidates() c WHERE c.user_id=p_user) THEN RAISE EXCEPTION 'Learner no longer meets conservative zero-activity criteria'; END IF;
 IF EXISTS (SELECT 1 FROM public.canopy_graduation_2026_approvals WHERE user_id=p_user AND graduated) THEN RAISE EXCEPTION 'Graduate approval exists'; END IF;
 IF EXISTS (SELECT 1 FROM public.canopy_cohort_memberships WHERE user_id=p_user AND status='active') THEN RAISE EXCEPTION 'Active membership in another programme'; END IF;
 IF EXISTS (SELECT 1 FROM public.canopy_manager_actions WHERE learner_id=p_user AND status='open') THEN RAISE EXCEPTION 'Open complaint or learner action requires review'; END IF;
 -- Suppress automated removal if a second active enrollment record exists. A human should reconcile it.
 SELECT count(*) INTO v_count FROM public.canopy_enrollments WHERE user_id=p_user AND status='active';
 IF v_count<>1 THEN RAISE EXCEPTION 'Expected exactly one active enrollment'; END IF;
 UPDATE public.canopy_enrollments SET status='withdrawn' WHERE user_id=p_user AND status='active';
 UPDATE public.canopy_c2_inactivity_cases SET status='withdrawn',withdrawn_at=now(),purge_after=now()+interval '7 days',decided_by=auth.uid(),decision_reason=btrim(p_reason),updated_at=now() WHERE user_id=p_user;
 INSERT INTO public.canopy_c2_inactivity_case_events(user_id,actor_id,previous_status,new_status,reason) VALUES(p_user,auth.uid(),v_prior,'withdrawn',btrim(p_reason));
 INSERT INTO public.canopy_notifications(user_id,type,title,body,link,fingerprint)
 VALUES(p_user,'programme_review','Cohort 2 enrolment update','Your Cohort 2 enrolment has been withdrawn following an individual participation review. If this is incorrect or you have an unresolved technical issue, appeal within seven days by emailing womatead@gmail.com. Your account has not been deleted.','/canopy/help','c2-withdrawal:'||p_user||':'||extract(epoch from now())::bigint);
 RETURN jsonb_build_object('status','withdrawn','user_id',p_user,'purge_after',now()+interval '7 days');
END $$;
REVOKE ALL ON FUNCTION public.canopy_admin_c2_withdraw_verified(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.canopy_admin_c2_withdraw_verified(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.canopy_admin_c2_restore_withdrawn(p_user uuid,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE v_prior text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.canopy_profiles WHERE user_id=auth.uid() AND role='admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
 IF length(btrim(coalesce(p_reason,'')))<15 THEN RAISE EXCEPTION 'Provide restoration reason'; END IF;
 SELECT status INTO v_prior FROM public.canopy_c2_inactivity_cases WHERE user_id=p_user FOR UPDATE;
 IF v_prior NOT IN ('withdrawn','purge_eligible') THEN RAISE EXCEPTION 'Not a withdrawn case'; END IF;
 UPDATE public.canopy_enrollments SET status='active' WHERE user_id=p_user AND status='withdrawn';
 UPDATE public.canopy_c2_inactivity_cases SET status='retained',purge_after=NULL,decision_reason=btrim(p_reason),decided_by=auth.uid(),updated_at=now() WHERE user_id=p_user;
 INSERT INTO public.canopy_c2_inactivity_case_events(user_id,actor_id,previous_status,new_status,reason) VALUES(p_user,auth.uid(),v_prior,'retained',btrim(p_reason));
 INSERT INTO public.canopy_notifications(user_id,type,title,body,link,fingerprint) VALUES(p_user,'programme_review','Cohort 2 access restored','Your Cohort 2 enrolment has been restored following review. Thank you for contacting WOMATE.','/canopy','c2-restore:'||p_user||':'||extract(epoch from now())::bigint);
 RETURN jsonb_build_object('status','retained','user_id',p_user);
END $$;
REVOKE ALL ON FUNCTION public.canopy_admin_c2_restore_withdrawn(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.canopy_admin_c2_restore_withdrawn(uuid,text) TO authenticated;

-- Candidates for later independently authorised identity cleanup; this function NEVER deletes auth identities.
CREATE OR REPLACE FUNCTION public.canopy_admin_c2_auth_purge_preview()
RETURNS TABLE(user_id uuid,withdrawn_at timestamptz,purge_after timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.canopy_profiles WHERE user_id=auth.uid() AND role='admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
 RETURN QUERY SELECT c.user_id,c.withdrawn_at,c.purge_after FROM public.canopy_c2_inactivity_cases c
 WHERE c.status='withdrawn' AND c.purge_after<=now()
 AND NOT EXISTS(SELECT 1 FROM public.canopy_enrollments e WHERE e.user_id=c.user_id AND e.status='active')
 AND NOT EXISTS(SELECT 1 FROM public.canopy_cohort_memberships m WHERE m.user_id=c.user_id AND m.status='active')
 AND NOT EXISTS(SELECT 1 FROM public.canopy_graduation_2026_approvals g WHERE g.user_id=c.user_id AND g.graduated)
 ORDER BY c.purge_after;
END $$;
REVOKE ALL ON FUNCTION public.canopy_admin_c2_auth_purge_preview() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.canopy_admin_c2_auth_purge_preview() TO authenticated;
COMMIT;
