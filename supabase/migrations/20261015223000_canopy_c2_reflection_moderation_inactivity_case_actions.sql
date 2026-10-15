-- Cohort 2 safeguarding and reflection moderation: additive migration.
-- This migration intentionally DOES NOT DELETE auth.users.
BEGIN;
CREATE TABLE IF NOT EXISTS public.canopy_graduation_reflection_reviews_2026 (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 state text NOT NULL CHECK (state IN ('visible','hidden')) DEFAULT 'visible',
 reason text, reviewer_id uuid REFERENCES auth.users(id), reviewed_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.canopy_graduation_reflection_reviews_2026 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.canopy_graduation_reflection_reviews_2026 FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.canopy_admin_graduation_reflections_2026()
RETURNS TABLE(user_id uuid,display_name text,reflection text,created_at timestamptz,state text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.canopy_profiles WHERE user_id=auth.uid() AND role='admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
 RETURN QUERY SELECT r.user_id,r.display_name,r.reflection,r.created_at,coalesce(m.state,'visible')
 FROM public.canopy_graduation_2026_reflections r LEFT JOIN public.canopy_graduation_reflection_reviews_2026 m ON m.user_id=r.user_id
 ORDER BY r.created_at DESC LIMIT 500;
END $$;
REVOKE ALL ON FUNCTION public.canopy_admin_graduation_reflections_2026() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.canopy_admin_graduation_reflections_2026() TO authenticated;

CREATE OR REPLACE FUNCTION public.canopy_admin_moderate_graduation_reflection_2026(p_user uuid,p_state text,p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.canopy_profiles WHERE user_id=auth.uid() AND role='admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
 IF p_state NOT IN ('visible','hidden') THEN RAISE EXCEPTION 'Invalid moderation state'; END IF;
 IF p_state='hidden' AND length(btrim(coalesce(p_reason,'')))<12 THEN RAISE EXCEPTION 'Moderation reason must have at least 12 characters'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.canopy_graduation_2026_reflections WHERE user_id=p_user) THEN RAISE EXCEPTION 'Reflection not found'; END IF;
 INSERT INTO public.canopy_graduation_reflection_reviews_2026(user_id,state,reason,reviewer_id) VALUES(p_user,p_state,nullif(btrim(p_reason),''),auth.uid())
 ON CONFLICT(user_id) DO UPDATE SET state=excluded.state,reason=excluded.reason,reviewer_id=excluded.reviewer_id,reviewed_at=now();
END $$;
REVOKE ALL ON FUNCTION public.canopy_admin_moderate_graduation_reflection_2026(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.canopy_admin_moderate_graduation_reflection_2026(uuid,text,text) TO authenticated;

-- Preserve the original graduation access checks, but never display a hidden reflection.
CREATE OR REPLACE FUNCTION public.canopy_graduation_2026_overview()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE v_user uuid:=auth.uid();v_access boolean;v_count integer;v_enrolled integer;v_items jsonb;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 v_access=public.canopy_graduation_2026_eligible(v_user);
 SELECT count(*) INTO v_enrolled FROM public.canopy_enrollments WHERE status='active';
 SELECT count(*) INTO v_count FROM public.canopy_graduation_2026_approvals a WHERE a.graduated=true AND public.canopy_graduation_2026_eligible(a.user_id);
 IF v_access AND now()>=timestamptz '2026-10-29 00:00:00+00' THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',r.user_id,'display_name',r.display_name,'reflection',r.reflection,'created_at',r.created_at) ORDER BY r.created_at DESC),'[]'::jsonb) INTO v_items
  FROM (SELECT r.* FROM public.canopy_graduation_2026_reflections r
   LEFT JOIN public.canopy_graduation_reflection_reviews_2026 m ON m.user_id=r.user_id
   WHERE coalesce(m.state,'visible')='visible' ORDER BY r.created_at DESC LIMIT 100) r;
 ELSE v_items='[]'::jsonb; END IF;
 RETURN jsonb_build_object('accepted_count',990,'enrolled_count',v_enrolled,'graduated_count',v_count,
 'can_enter',v_access AND now()>=timestamptz '2026-10-29 00:00:00+00','reflections',v_items);
END $$;
REVOKE ALL ON FUNCTION public.canopy_graduation_2026_overview() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.canopy_graduation_2026_overview() TO authenticated;

-- Case transitions are auditable. Candidate screening alone never triggers withdrawal.
CREATE TABLE IF NOT EXISTS public.canopy_c2_inactivity_case_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id uuid NOT NULL,
 actor_id uuid NOT NULL,
 previous_status text,
 new_status text NOT NULL,
 reason text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.canopy_c2_inactivity_case_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.canopy_c2_inactivity_case_events FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.canopy_admin_c2_inactivity_cases_list()
RETURNS TABLE(user_id uuid,status text,identified_at timestamptz,withdrawn_at timestamptz,purge_after timestamptz,decision_reason text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.canopy_profiles WHERE user_id=auth.uid() AND role='admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
 RETURN QUERY SELECT c.user_id,c.status,c.identified_at,c.withdrawn_at,c.purge_after,c.decision_reason
 FROM public.canopy_c2_inactivity_cases c ORDER BY c.identified_at DESC LIMIT 1000;
END $$;
REVOKE ALL ON FUNCTION public.canopy_admin_c2_inactivity_cases_list() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.canopy_admin_c2_inactivity_cases_list() TO authenticated;

CREATE OR REPLACE FUNCTION public.canopy_admin_c2_inactivity_decide(p_user uuid,p_decision text,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE v_prior text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.canopy_profiles WHERE user_id=auth.uid() AND role='admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
 IF p_decision NOT IN ('retained','appealed','review') THEN RAISE EXCEPTION 'This route only supports reversible review decisions'; END IF;
 IF length(btrim(coalesce(p_reason,'')))<15 THEN RAISE EXCEPTION 'Provide a reason of at least 15 characters'; END IF;
 SELECT status INTO v_prior FROM public.canopy_c2_inactivity_cases WHERE user_id=p_user FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Queue the case before deciding'; END IF;
 IF v_prior IN ('withdrawn','purge_eligible') THEN RAISE EXCEPTION 'Withdrawn cases require independent restoration review'; END IF;
 UPDATE public.canopy_c2_inactivity_cases SET status=p_decision,decision_reason=btrim(p_reason),decided_by=auth.uid(),updated_at=now() WHERE user_id=p_user;
 INSERT INTO public.canopy_c2_inactivity_case_events(user_id,actor_id,previous_status,new_status,reason) VALUES(p_user,auth.uid(),v_prior,p_decision,btrim(p_reason));
 RETURN jsonb_build_object('status',p_decision,'user_id',p_user);
END $$;
REVOKE ALL ON FUNCTION public.canopy_admin_c2_inactivity_decide(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.canopy_admin_c2_inactivity_decide(uuid,text,text) TO authenticated;

-- A separate controlled notice step: records the communication only AFTER Admin verifies the case.
CREATE OR REPLACE FUNCTION public.canopy_admin_c2_send_review_notice(p_user uuid,p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.canopy_profiles WHERE user_id=auth.uid() AND role='admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
 IF length(btrim(coalesce(p_reason,'')))<15 THEN RAISE EXCEPTION 'Provide context before sending a notice'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.canopy_c2_inactivity_cases WHERE user_id=p_user AND status='review') THEN RAISE EXCEPTION 'Only queued review cases can be notified'; END IF;
 INSERT INTO public.canopy_notifications(user_id,type,title,body,link,fingerprint)
 VALUES(p_user,'programme_review','Your Canopy participation needs attention',
 'Our team is reviewing accounts without recorded learning activity. If you have already participated or experienced technical difficulties, please contact womatead@gmail.com so we can verify your record. Your access has not been changed by this notice.',
 '/canopy/help','inactivity-review:'||p_user||':'||extract(epoch from now())::bigint);
 INSERT INTO public.canopy_c2_inactivity_case_events(user_id,actor_id,previous_status,new_status,reason)
 VALUES(p_user,auth.uid(),'review','review','Review notice sent: '||btrim(p_reason));
END $$;
REVOKE ALL ON FUNCTION public.canopy_admin_c2_send_review_notice(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.canopy_admin_c2_send_review_notice(uuid,text) TO authenticated;
COMMIT;
