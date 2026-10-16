-- WOMATE C2: forward-only safety corrections for seven-day identity cleanup.
-- Preserve 2027 memberships and synchronize the legacy C2 membership at unenrolment.
BEGIN;

CREATE OR REPLACE FUNCTION public.canopy_admin_c2_simple_candidates()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE v_data jsonb;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.canopy_profiles p WHERE p.user_id=auth.uid() AND p.role='admin')
 THEN RAISE EXCEPTION 'Admin access required'; END IF;

 SELECT coalesce(jsonb_agg(jsonb_build_object('user_id',q.user_id,'full_name',q.full_name,'email',q.email) ORDER BY q.full_name),'[]'::jsonb)
 INTO v_data
 FROM (
  SELECT DISTINCT e.user_id,p.full_name::text AS full_name,u.email::text AS email
  FROM public.canopy_enrollments e
  JOIN public.canopy_profiles p ON p.user_id=e.user_id AND p.role='learner'
  JOIN auth.users u ON u.id=e.user_id
  WHERE e.status='active'
   AND NOT EXISTS(SELECT 1 FROM public.canopy_lesson_progress lp WHERE lp.user_id=e.user_id)
   AND NOT EXISTS(SELECT 1 FROM public.canopy_live_attendance la WHERE la.user_id=e.user_id AND la.attended=true)
   AND NOT EXISTS(SELECT 1 FROM public.canopy_assignment_submissions s WHERE s.user_id=e.user_id)
   AND NOT EXISTS(SELECT 1 FROM public.canopy_certificates c WHERE c.user_id=e.user_id)
   AND NOT EXISTS(SELECT 1 FROM public.canopy_graduation_2026_approvals g WHERE g.user_id=e.user_id AND g.graduated)
   AND NOT EXISTS(SELECT 1 FROM public.canopy_manager_actions a WHERE a.learner_id=e.user_id AND a.status='open')
   AND NOT EXISTS(SELECT 1 FROM public.canopy_mission_group_members m WHERE m.user_id=e.user_id)
   AND NOT EXISTS(SELECT 1 FROM public.canopy_cohort_memberships m
                  WHERE m.user_id=e.user_id AND m.cohort_key<>'she-leads-climate-c2-2026')
   AND NOT EXISTS(SELECT 1 FROM public.canopy_cohort_staff_assignments a WHERE a.user_id=e.user_id)
   AND NOT EXISTS(SELECT 1 FROM public.canopy_c2_inactivity_cases x WHERE x.user_id=e.user_id
                  AND x.status IN ('withdrawn','appealed','retained','purge_eligible'))
 ) q;
 RETURN v_data;
END $$;
REVOKE ALL ON FUNCTION public.canopy_admin_c2_simple_candidates() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.canopy_admin_c2_simple_candidates() TO authenticated;

-- The 2027 backfill created active C2 memberships: retire that *specific* membership
-- before the existing audited withdrawal RPC checks for another active programme.
CREATE OR REPLACE FUNCTION public.canopy_admin_c2_unenroll_simple(p_user uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE v_result jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.canopy_profiles p WHERE p.user_id=auth.uid() AND p.role='admin')
 THEN RAISE EXCEPTION 'Admin access required'; END IF;
 PERFORM 1 FROM public.canopy_enrollments e WHERE e.user_id=p_user AND e.status='active' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active Cohort 2 enrolment not found'; END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.canopy_admin_c2_simple_candidates()) j
               WHERE (j->>'user_id')::uuid=p_user)
 THEN RAISE EXCEPTION 'Learner is not eligible for inactivity unenrollment'; END IF;
 UPDATE public.canopy_cohort_memberships
 SET status='withdrawn',withdrawn_at=now(),updated_at=now()
 WHERE user_id=p_user AND cohort_key='she-leads-climate-c2-2026'
   AND status IN ('active','pending','paused','inactive');
 INSERT INTO public.canopy_c2_inactivity_cases(user_id,status)
 VALUES(p_user,'review') ON CONFLICT(user_id) DO UPDATE SET status='review',updated_at=now();
 v_result:=public.canopy_admin_c2_withdraw_verified(
   p_user,'No recorded lessons, attendance, assignments or missions; admin-initiated Cohort 2 unenrollment.'
 );
 RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION public.canopy_admin_c2_unenroll_simple(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.canopy_admin_c2_unenroll_simple(uuid) TO authenticated;

-- Restoration must reinstate the C2 cohort membership as well as legacy enrolment.
CREATE OR REPLACE FUNCTION public.canopy_admin_c2_restore_withdrawn(p_user uuid,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE v_prior text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.canopy_profiles p WHERE p.user_id=auth.uid() AND p.role='admin')
 THEN RAISE EXCEPTION 'Admin required'; END IF;
 IF length(btrim(coalesce(p_reason,'')))<15 THEN RAISE EXCEPTION 'Provide restoration reason'; END IF;
 SELECT status INTO v_prior FROM public.canopy_c2_inactivity_cases WHERE user_id=p_user FOR UPDATE;
 IF v_prior NOT IN ('withdrawn','purge_eligible') THEN RAISE EXCEPTION 'Not a withdrawn case'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user) THEN RAISE EXCEPTION 'Auth identity already deleted'; END IF;
 UPDATE public.canopy_enrollments SET status='active' WHERE user_id=p_user AND status='withdrawn';
 IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawn enrolment not found'; END IF;
 UPDATE public.canopy_cohort_memberships
 SET status='active',withdrawn_at=NULL,updated_at=now()
 WHERE user_id=p_user AND cohort_key='she-leads-climate-c2-2026' AND status='withdrawn';
 UPDATE public.canopy_c2_inactivity_cases
 SET status='retained',purge_after=NULL,decision_reason=btrim(p_reason),decided_by=auth.uid(),updated_at=now()
 WHERE user_id=p_user;
 INSERT INTO public.canopy_c2_inactivity_case_events(user_id,actor_id,previous_status,new_status,reason)
 VALUES(p_user,auth.uid(),v_prior,'retained',btrim(p_reason));
 INSERT INTO public.canopy_notifications(user_id,type,title,body,link,fingerprint)
 VALUES(p_user,'programme_review','Cohort 2 access restored',
 'Your Cohort 2 enrolment has been restored following review. Thank you for contacting WOMATE.',
 '/canopy','c2-restore:'||p_user||':'||extract(epoch from now())::bigint);
 RETURN jsonb_build_object('status','retained','user_id',p_user);
END $$;
REVOKE ALL ON FUNCTION public.canopy_admin_c2_restore_withdrawn(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.canopy_admin_c2_restore_withdrawn(uuid,text) TO authenticated;

-- A due date is necessary, not sufficient. Another cohort, protected achievement,
-- open complaint, or staff assignment always blocks permanent identity removal.
CREATE OR REPLACE FUNCTION public.canopy_c2_delete_due_auth()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE v_case record; v_name text; v_email text; v_count integer:=0;
BEGIN
 IF session_user<>'postgres' THEN RAISE EXCEPTION 'Database scheduler access required'; END IF;
 FOR v_case IN
  SELECT c.user_id,c.withdrawn_at,c.purge_after
  FROM public.canopy_c2_inactivity_cases c
  WHERE c.status='withdrawn' AND c.purge_after IS NOT NULL AND c.purge_after<=now()
  ORDER BY c.purge_after LIMIT 50 FOR UPDATE OF c SKIP LOCKED
 LOOP
  IF NOT EXISTS(SELECT 1 FROM public.canopy_enrollments e WHERE e.user_id=v_case.user_id AND e.status='withdrawn')
    OR EXISTS(SELECT 1 FROM public.canopy_enrollments e WHERE e.user_id=v_case.user_id AND e.status<>'withdrawn')
    OR EXISTS(SELECT 1 FROM public.canopy_cohort_memberships m WHERE m.user_id=v_case.user_id
              AND (m.cohort_key<>'she-leads-climate-c2-2026' OR m.status<>'withdrawn'))
    OR EXISTS(SELECT 1 FROM public.canopy_cohort_staff_assignments s WHERE s.user_id=v_case.user_id)
    OR EXISTS(SELECT 1 FROM public.canopy_profiles p WHERE p.user_id=v_case.user_id AND p.role<>'learner')
    OR EXISTS(SELECT 1 FROM public.canopy_lesson_progress lp WHERE lp.user_id=v_case.user_id)
    OR EXISTS(SELECT 1 FROM public.canopy_live_attendance la WHERE la.user_id=v_case.user_id AND la.attended=true)
    OR EXISTS(SELECT 1 FROM public.canopy_assignment_submissions a WHERE a.user_id=v_case.user_id)
    OR EXISTS(SELECT 1 FROM public.canopy_certificates ce WHERE ce.user_id=v_case.user_id)
    OR EXISTS(SELECT 1 FROM public.canopy_graduation_2026_approvals g WHERE g.user_id=v_case.user_id AND g.graduated)
    OR EXISTS(SELECT 1 FROM public.canopy_manager_actions a WHERE a.learner_id=v_case.user_id AND a.status='open')
    OR EXISTS(SELECT 1 FROM public.canopy_mission_group_members mm WHERE mm.user_id=v_case.user_id)
  THEN
   INSERT INTO public.canopy_c2_deletion_failures(user_id,last_error,attempted_at,attempts)
   VALUES(v_case.user_id,'Blocked: account has protected activity, membership, staff access or a conflicting enrolment.',now(),1)
   ON CONFLICT(user_id) DO UPDATE SET last_error=EXCLUDED.last_error,attempted_at=now(),
       attempts=public.canopy_c2_deletion_failures.attempts+1;
   CONTINUE;
  END IF;
  BEGIN
   v_name:=NULL; v_email:=NULL;
   SELECT p.full_name,u.email INTO v_name,v_email
   FROM auth.users u LEFT JOIN public.canopy_profiles p ON p.user_id=u.id
   WHERE u.id=v_case.user_id;
   DELETE FROM auth.users WHERE id=v_case.user_id;
   IF EXISTS(SELECT 1 FROM auth.users WHERE id=v_case.user_id)
   THEN RAISE EXCEPTION 'Auth identity remains after deletion'; END IF;
   INSERT INTO public.canopy_c2_deleted_identities(user_id,full_name,email,unenrolled_at,deleted_at)
   VALUES(v_case.user_id,v_name,v_email,v_case.withdrawn_at,now())
   ON CONFLICT(user_id) DO UPDATE SET deleted_at=EXCLUDED.deleted_at;
   DELETE FROM public.canopy_c2_deletion_failures WHERE user_id=v_case.user_id;
   v_count:=v_count+1;
  EXCEPTION WHEN OTHERS THEN
   INSERT INTO public.canopy_c2_deletion_failures(user_id,last_error,attempted_at,attempts)
   VALUES(v_case.user_id,SQLERRM,now(),1)
   ON CONFLICT(user_id) DO UPDATE SET last_error=EXCLUDED.last_error,attempted_at=now(),
       attempts=public.canopy_c2_deletion_failures.attempts+1;
  END;
 END LOOP;
 RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.canopy_c2_delete_due_auth() FROM PUBLIC,anon,authenticated,service_role;

-- Only report Deleted after verifying that the Auth row is actually absent.
CREATE OR REPLACE FUNCTION public.canopy_admin_c2_status_index()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE v_result jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.canopy_profiles p WHERE p.user_id=auth.uid() AND p.role='admin')
 THEN RAISE EXCEPTION 'Admin required'; END IF;
 SELECT coalesce(jsonb_agg(row_to_json(t)),'[]'::jsonb) INTO v_result FROM (
  SELECT c.user_id,'unenrolled'::text AS status,p.full_name::text AS full_name,
         u.email::text AS email,c.purge_after AS action_at
  FROM public.canopy_c2_inactivity_cases c
  JOIN auth.users u ON u.id=c.user_id
  LEFT JOIN public.canopy_profiles p ON p.user_id=c.user_id
  WHERE c.status='withdrawn'
  UNION ALL
  SELECT d.user_id,'deleted'::text,d.full_name,d.email,d.deleted_at
  FROM public.canopy_c2_deleted_identities d
  WHERE NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=d.user_id)
 ) t;
 RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION public.canopy_admin_c2_status_index() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.canopy_admin_c2_status_index() TO authenticated;
COMMIT;
