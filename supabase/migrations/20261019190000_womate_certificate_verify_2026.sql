-- WOMATE official credential registry, She Leads Cohort 2 / 2026.
-- Reserve immutable sequential IDs and expose only exact public certificate lookups.
CREATE SEQUENCE IF NOT EXISTS public.womate_c2_credential_serial START WITH 1 MINVALUE 1 NO CYCLE;

CREATE TABLE IF NOT EXISTS public.womate_certificate_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid NOT NULL UNIQUE REFERENCES public.canopy_certificates(id) ON DELETE RESTRICT,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  serial_no integer NOT NULL UNIQUE CHECK(serial_no BETWEEN 1 AND 500),
  credential_code text GENERATED ALWAYS AS ('SLCMPC02-' || lpad(serial_no::text,3,'0')) STORED UNIQUE,
  recipient_name text NOT NULL CHECK(length(btrim(recipient_name)) BETWEEN 2 AND 180),
  programme_name text NOT NULL DEFAULT 'She Leads Climate Mentorship Programme',
  cohort_label text NOT NULL DEFAULT 'Cohort 2 · 2026',
  award_type text NOT NULL DEFAULT 'completion' CHECK(award_type IN ('completion','participation','recognition')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'issued' CHECK(status IN ('issued','revoked')),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id),
  revocation_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.womate_certificate_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.womate_certificate_credentials FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.womate_c2_credential_serial FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS womate_c2_credentials_person_idx ON public.womate_certificate_credentials(recipient_id);

CREATE OR REPLACE FUNCTION public.womate_c2_baseline_met(p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,auth
AS $$
 SELECT EXISTS(SELECT 1 FROM public.canopy_profiles p
    JOIN public.canopy_enrollments e ON e.user_id=p.user_id
    JOIN auth.users u ON u.id=p.user_id
    WHERE p.user_id=p_user AND p.role='learner' AND e.status='active' AND e.course_slug='she-leads'
      AND (SELECT count(distinct lesson_id) FROM public.canopy_lesson_progress lp WHERE lp.user_id=p_user AND lp.completed=true)>=10
      AND (SELECT count(distinct week_key) FROM public.canopy_assignment_submissions s
        WHERE s.user_id=p_user AND s.week_key IN ('module-01','module-02','module-03','module-04','module-05')
          AND s.review_source='manual' AND s.assessment_status='completed' AND coalesce(s.final_score,0)>0)>=3
      AND EXISTS(SELECT 1 FROM public.canopy_live_attendance la WHERE la.user_id=p_user AND la.attended=true)
      AND EXISTS(SELECT 1 FROM public.womate_selected_card_invites invite
         WHERE lower(btrim(invite.email))=lower(btrim(u.email))
           AND (invite.programme_slug='she-leads-2026' OR invite.cohort_label='Cohort 2 · 2026'))
 );
$$;
REVOKE ALL ON FUNCTION public.womate_c2_baseline_met(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.womate_register_issued_certificate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth
AS $$
DECLARE serial integer; holder_name text;
BEGIN
  IF NEW.cohort_key <> 'she-leads-climate-c2-2026' OR NEW.course_slug <> 'she-leads'
    OR NOT EXISTS(SELECT 1 FROM public.canopy_profiles p WHERE p.user_id=NEW.user_id AND p.role='learner')
  THEN RETURN NEW; END IF;
  IF NOT public.womate_c2_baseline_met(NEW.user_id) THEN
    RAISE EXCEPTION 'Learner has not met the minimum WOMATE baseline: 3 manually completed assignments, 10 lessons, recorded attendance and a selection code.';
  END IF;
  SELECT btrim(full_name) INTO holder_name FROM public.canopy_profiles WHERE user_id=NEW.user_id;
  IF length(coalesce(holder_name,''))<2 THEN RAISE EXCEPTION 'The learner must have a verified full name before credential issuance.'; END IF;
  IF EXISTS (SELECT 1 FROM public.womate_certificate_credentials WHERE certificate_id=NEW.id) THEN RETURN NEW; END IF;
  serial:=nextval('public.womate_c2_credential_serial');
  IF serial>500 THEN RAISE EXCEPTION 'SLCMPC02-001 through SLCMPC02-500 are exhausted. Increase the series explicitly before issuing more certificates.'; END IF;
  INSERT INTO public.womate_certificate_credentials(certificate_id,recipient_id,serial_no,recipient_name,issued_at)
  VALUES(NEW.id,NEW.user_id,serial,holder_name,NEW.issued_at);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS womate_issue_verified_credential ON public.canopy_certificates;
CREATE TRIGGER womate_issue_verified_credential AFTER INSERT ON public.canopy_certificates
FOR EACH ROW EXECUTE FUNCTION public.womate_register_issued_certificate();

CREATE OR REPLACE FUNCTION public.womate_verify_certificate(p_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public
AS $$
DECLARE c public.womate_certificate_credentials%rowtype;
BEGIN
  IF p_code IS NULL OR upper(btrim(p_code)) !~ '^SLCMPC02-[0-9]{3}$' THEN
    RETURN jsonb_build_object('found',false);
  END IF;
  SELECT * INTO c FROM public.womate_certificate_credentials WHERE credential_code=upper(btrim(p_code)) LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('found',false); END IF;
  RETURN jsonb_build_object('found',true,'certificate_id',c.credential_code,
    'recipient_name',c.recipient_name,'programme_name',c.programme_name,
    'cohort',c.cohort_label,'award_type',c.award_type,'issued_at',c.issued_at,
    'status',c.status);
END;
$$;
REVOKE ALL ON FUNCTION public.womate_verify_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.womate_verify_certificate(text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.womate_admin_change_credential_status(p_code text,p_status text,p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth
AS $$
DECLARE c public.womate_certificate_credentials%rowtype; next_status text:=lower(btrim(coalesce(p_status,'')));
BEGIN
  IF auth.uid() IS NULL OR NOT public.canopy_is_womate_admin(auth.uid()) THEN RAISE EXCEPTION 'WOMATE admin access required'; END IF;
  IF next_status NOT IN ('issued','revoked') THEN RAISE EXCEPTION 'Choose issued or revoked'; END IF;
  IF next_status='revoked' AND length(btrim(coalesce(p_reason,'')))<12 THEN
     RAISE EXCEPTION 'Document a reason of at least 12 characters before revocation';
  END IF;
  UPDATE public.womate_certificate_credentials
   SET status=next_status,revoked_at=CASE WHEN next_status='revoked' THEN now() ELSE NULL END,
      revoked_by=CASE WHEN next_status='revoked' THEN auth.uid() ELSE NULL END,
      revocation_reason=CASE WHEN next_status='revoked' THEN btrim(p_reason) ELSE NULL END
   WHERE credential_code=upper(btrim(coalesce(p_code,''))) RETURNING * INTO c;
  IF NOT FOUND THEN RAISE EXCEPTION 'Issued certificate ID not found'; END IF;
  RETURN jsonb_build_object('certificate_id',c.credential_code,'status',c.status);
END;
$$;
REVOKE ALL ON FUNCTION public.womate_admin_change_credential_status(text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.womate_admin_change_credential_status(text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.womate_admin_prospective_graduates_2026()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,auth
AS $$
DECLARE output jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.canopy_is_womate_admin(auth.uid()) THEN
    RAISE EXCEPTION 'WOMATE admin access required';
  END IF;
  WITH active AS (
    SELECT DISTINCT e.user_id,p.full_name,p.country,u.email
    FROM public.canopy_enrollments e JOIN public.canopy_profiles p ON p.user_id=e.user_id AND p.role='learner'
    JOIN auth.users u ON u.id=e.user_id
    WHERE e.status='active' AND e.course_slug='she-leads'
  ), lesson AS (
    SELECT user_id,count(distinct lesson_id) FILTER(WHERE completed=true)::integer lessons
    FROM public.canopy_lesson_progress GROUP BY user_id
  ), assignments AS (
    SELECT user_id,
      count(distinct week_key) FILTER(WHERE review_source='manual' AND assessment_status='completed' AND coalesce(final_score,0)>0)::integer approved,
      count(distinct week_key)::integer submitted
    FROM public.canopy_assignment_submissions
    WHERE week_key IN ('module-01','module-02','module-03','module-04','module-05')
    GROUP BY user_id
  ), attendance AS (
    SELECT user_id,count(distinct module_id) FILTER(WHERE attended=true)::integer sessions
    FROM public.canopy_live_attendance GROUP BY user_id
  ), code AS (
    SELECT lower(btrim(email)) email,
     bool_or(programme_slug='she-leads-2026' OR cohort_label='Cohort 2 · 2026') generated
    FROM public.womate_selected_card_invites GROUP BY lower(btrim(email))
  ), base AS (
    SELECT a.user_id,a.full_name,a.country,coalesce(l.lessons,0) AS lessons,
      coalesce(s.approved,0) AS assignments_completed,coalesce(s.submitted,0) AS assignments_submitted,
      coalesce(t.sessions,0) AS attendance,coalesce(c.generated,false) AS selection_code,
      (coalesce(l.lessons,0)>=10 AND coalesce(s.approved,0)>=3 AND coalesce(t.sessions,0)>=1 AND coalesce(c.generated,false)) AS baseline_met,
      (select cred.credential_code from public.womate_certificate_credentials cred where cred.recipient_id=a.user_id order by cred.issued_at desc limit 1) AS credential_id,
      (select cred.status from public.womate_certificate_credentials cred where cred.recipient_id=a.user_id order by cred.issued_at desc limit 1) AS credential_status
    FROM active a LEFT JOIN lesson l ON l.user_id=a.user_id
     LEFT JOIN assignments s ON s.user_id=a.user_id LEFT JOIN attendance t ON t.user_id=a.user_id
     LEFT JOIN code c ON c.email=lower(btrim(a.email))
  ), ranked AS (
    SELECT row_number() OVER(ORDER BY baseline_met DESC,assignments_completed DESC,lessons DESC,attendance DESC,full_name ASC,user_id ASC)::integer AS rank,
      user_id,coalesce(full_name,'Unnamed learner') AS full_name,coalesce(country,'') AS country,
      lessons,assignments_completed,assignments_submitted,attendance,selection_code,baseline_met,credential_id,credential_status
    FROM base
  )
  SELECT jsonb_build_object(
    'as_of',now(),'criteria',jsonb_build_object('lessons_min',10,'reviewed_assignments_min',3,'attendance_min',1,'requires_generated_selection_code',true),
    'total',(select count(*) from ranked),
    'baseline_count',(select count(*) from ranked where baseline_met),
    'rows',coalesce((select jsonb_agg(to_jsonb(r) ORDER BY r.rank) from ranked r),'[]'::jsonb))
  INTO output;
  RETURN output;
END;
$$;
REVOKE ALL ON FUNCTION public.womate_admin_prospective_graduates_2026() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.womate_admin_prospective_graduates_2026() TO authenticated;