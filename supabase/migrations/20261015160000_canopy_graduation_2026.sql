-- WOMATE Cohort 2 graduation celebration. Additive; does not modify 2026 assessment records.
BEGIN;
CREATE TABLE IF NOT EXISTS public.canopy_graduation_2026_approvals (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 graduated boolean NOT NULL DEFAULT false,
 marked_at timestamptz,
 marked_by uuid REFERENCES auth.users(id)
);
CREATE TABLE IF NOT EXISTS public.canopy_graduation_2026_reflections (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 display_name text NOT NULL CHECK(char_length(btrim(display_name)) BETWEEN 2 AND 100),
 reflection text NOT NULL CHECK(char_length(btrim(reflection)) BETWEEN 30 AND 1200),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.canopy_graduation_2026_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canopy_graduation_2026_reflections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.canopy_graduation_2026_approvals FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.canopy_graduation_2026_reflections FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.canopy_graduation_2026_eligible(p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,auth AS $$
 SELECT EXISTS(SELECT 1 FROM public.canopy_graduation_2026_approvals a
  WHERE a.user_id=p_user AND a.graduated=true)
 AND EXISTS(SELECT 1 FROM public.canopy_certificates c WHERE c.user_id=p_user)
 AND EXISTS(SELECT 1 FROM public.canopy_enrollments e WHERE e.user_id=p_user AND e.status='active');
$$;
REVOKE ALL ON FUNCTION public.canopy_graduation_2026_eligible(uuid) FROM PUBLIC,anon,authenticated;

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
   FROM (SELECT * FROM public.canopy_graduation_2026_reflections ORDER BY created_at DESC LIMIT 100) r;
 ELSE v_items='[]'::jsonb; END IF;
 RETURN jsonb_build_object('accepted_count',990,'enrolled_count',v_enrolled,'graduated_count',v_count,
 'can_enter',v_access AND now()>=timestamptz '2026-10-29 00:00:00+00', 'reflections',v_items);
END;$$;
REVOKE ALL ON FUNCTION public.canopy_graduation_2026_overview() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.canopy_graduation_2026_overview() TO authenticated;

CREATE OR REPLACE FUNCTION public.canopy_graduation_2026_submit(p_display_name text,p_reflection text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE v_user uuid:=auth.uid();
BEGIN
 IF v_user IS NULL OR now()<timestamptz '2026-10-29 00:00:00+00' OR NOT public.canopy_graduation_2026_eligible(v_user) THEN
 RAISE EXCEPTION 'Graduation access is not available for this account'; END IF;
 IF char_length(btrim(coalesce(p_display_name,''))) NOT BETWEEN 2 AND 100 OR char_length(btrim(coalesce(p_reflection,''))) NOT BETWEEN 30 AND 1200 THEN
 RAISE EXCEPTION 'Name or reflection length outside permitted range'; END IF;
 INSERT INTO public.canopy_graduation_2026_reflections(user_id,display_name,reflection)
 VALUES(v_user,btrim(p_display_name),btrim(p_reflection))
 ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name,reflection=excluded.reflection,updated_at=now();
END;$$;
REVOKE ALL ON FUNCTION public.canopy_graduation_2026_submit(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.canopy_graduation_2026_submit(text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.canopy_admin_mark_graduated_2026(p_user_id uuid,p_graduated boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.canopy_profiles WHERE user_id=auth.uid() AND role='admin') THEN
 RAISE EXCEPTION 'Admin permission required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.canopy_enrollments WHERE user_id=p_user_id) THEN RAISE EXCEPTION 'No Cohort 2 enrollment'; END IF;
 INSERT INTO public.canopy_graduation_2026_approvals(user_id,graduated,marked_at,marked_by)
 VALUES(p_user_id,p_graduated,now(),auth.uid())
 ON CONFLICT(user_id) DO UPDATE SET graduated=excluded.graduated,marked_at=excluded.marked_at,marked_by=excluded.marked_by;
END;$$;
REVOKE ALL ON FUNCTION public.canopy_admin_mark_graduated_2026(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.canopy_admin_mark_graduated_2026(uuid,boolean) TO authenticated;
COMMIT;
