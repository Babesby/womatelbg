-- Graduation reflections: persist the Canopy Tester note in the REAL
-- shared, moderated Cohort 2 graduation wall. This changes no learner
-- certification/approval rules and does not open graduation early.
-- Migration is safe to apply once, or rerun via CREATE OR REPLACE.
BEGIN;

-- Validate the tester from the signed-in account on the database side:
-- the frontend 'tester' flag is not trusted as an authorization signal.
CREATE OR REPLACE FUNCTION public.canopy_graduation_2026_tester_account(p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=public,auth AS $$
  SELECT p_user IS NOT NULL AND EXISTS (
    SELECT 1 FROM auth.users AS account
    WHERE account.id=p_user
      AND lower(account.email)='p.viewmultimedia@gmail.com'
      AND account.email_confirmed_at IS NOT NULL
  );
$$;
REVOKE ALL ON FUNCTION public.canopy_graduation_2026_tester_account(uuid) FROM PUBLIC,anon,authenticated;

-- Secure read path. The named tester may preview only approved/visible
-- reflections before the release date. All other users keep the original
-- eligibility + 29 October time gate.
CREATE OR REPLACE FUNCTION public.canopy_graduation_2026_overview()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE
  v_user uuid:=auth.uid();
  v_access boolean;
  v_tester boolean;
  v_count integer;
  v_enrolled integer;
  v_items jsonb;
  v_read boolean;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  v_tester:=public.canopy_graduation_2026_tester_account(v_user);
  v_access:=public.canopy_graduation_2026_eligible(v_user);
  v_read:=v_tester OR (v_access AND now()>=timestamptz '2026-10-29 00:00:00+00');

  SELECT count(*) INTO v_enrolled
  FROM public.canopy_enrollments AS enrolled
  WHERE enrolled.status='active';

  SELECT count(*) INTO v_count
  FROM public.canopy_graduation_2026_approvals AS approval
  WHERE approval.graduated=true
    AND public.canopy_graduation_2026_eligible(approval.user_id);

  IF v_read THEN
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id',reflection_row.user_id,
          'display_name',reflection_row.display_name,
          'reflection',reflection_row.reflection,
          'created_at',reflection_row.created_at
        ) ORDER BY reflection_row.updated_at DESC
      ),'[]'::jsonb
    )
    INTO v_items
    FROM (
      SELECT note.user_id,note.display_name,note.reflection,note.created_at,note.updated_at
      FROM public.canopy_graduation_2026_reflections AS note
      LEFT JOIN public.canopy_graduation_reflection_reviews_2026 AS review
        ON review.user_id=note.user_id
      WHERE coalesce(review.state,'visible')='visible'
      ORDER BY note.updated_at DESC
      LIMIT 100
    ) AS reflection_row;
  ELSE
    v_items:='[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'accepted_count',990,
    'enrolled_count',v_enrolled,
    'graduated_count',v_count,
    'can_enter',v_read,
    'reflections',v_items
  );
END;
$$;
REVOKE ALL ON FUNCTION public.canopy_graduation_2026_overview() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.canopy_graduation_2026_overview() TO authenticated;

-- Secure write path: one persisted note per account (existing PK/user_id).
-- Tester can publish early; learners STILL need approved graduation,
-- certificate, active enrollment, and the real graduation opening date.
CREATE OR REPLACE FUNCTION public.canopy_graduation_2026_submit(
  p_display_name text,
  p_reflection text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE
  v_user uuid:=auth.uid();
  v_tester boolean;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  v_tester:=public.canopy_graduation_2026_tester_account(v_user);
  IF NOT v_tester AND (
    now()<timestamptz '2026-10-29 00:00:00+00'
    OR NOT public.canopy_graduation_2026_eligible(v_user)
  ) THEN
    RAISE EXCEPTION 'Graduation access is not available for this account';
  END IF;
  IF char_length(btrim(coalesce(p_display_name,''))) NOT BETWEEN 2 AND 100
    OR char_length(btrim(coalesce(p_reflection,''))) NOT BETWEEN 30 AND 1200
  THEN
    RAISE EXCEPTION 'Name or reflection length outside permitted range';
  END IF;

  INSERT INTO public.canopy_graduation_2026_reflections(
    user_id,display_name,reflection
  )
  VALUES(v_user,btrim(p_display_name),btrim(p_reflection))
  ON CONFLICT(user_id) DO UPDATE SET
    display_name=excluded.display_name,
    reflection=excluded.reflection,
    updated_at=now();
END;
$$;
REVOKE ALL ON FUNCTION public.canopy_graduation_2026_submit(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.canopy_graduation_2026_submit(text,text) TO authenticated;

COMMIT;
