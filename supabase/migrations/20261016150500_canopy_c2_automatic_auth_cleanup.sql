-- WOMATE Cohort 2: automatic seven-day Auth deletion with durable audit.
-- Runs hourly in Postgres as the migration owner. Does not rely on client sessions.
BEGIN;
CREATE TABLE IF NOT EXISTS public.canopy_c2_deleted_identities (
 user_id uuid PRIMARY KEY,
 full_name text,
 email text,
 unenrolled_at timestamptz,
 deleted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.canopy_c2_deleted_identities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.canopy_c2_deleted_identities FROM PUBLIC,anon,authenticated;

CREATE TABLE IF NOT EXISTS public.canopy_c2_deletion_failures (
 user_id uuid PRIMARY KEY,
 last_error text NOT NULL,
 attempted_at timestamptz NOT NULL DEFAULT now(),
 attempts integer NOT NULL DEFAULT 1
);
ALTER TABLE public.canopy_c2_deletion_failures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.canopy_c2_deletion_failures FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.canopy_c2_delete_due_auth()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE v_case record; v_name text; v_email text; v_count integer:=0;
BEGIN
 -- This function is callable by the Postgres scheduler only, not API users.
 IF current_user <> 'postgres' AND session_user <> 'postgres' THEN
   RAISE EXCEPTION 'Database scheduler access required';
 END IF;
 FOR v_case IN
   SELECT c.user_id,c.withdrawn_at,c.purge_after
   FROM public.canopy_c2_inactivity_cases c
   WHERE c.status='withdrawn' AND c.purge_after IS NOT NULL AND c.purge_after<=now()
   ORDER BY c.purge_after FOR UPDATE OF c SKIP LOCKED
 LOOP
   -- Never delete an identity still actively enrolled in another programme.
   IF EXISTS (SELECT 1 FROM public.canopy_enrollments e WHERE e.user_id=v_case.user_id AND e.status='active')
     OR EXISTS (SELECT 1 FROM public.canopy_cohort_memberships m WHERE m.user_id=v_case.user_id AND m.status='active') THEN
     CONTINUE;
   END IF;
   BEGIN
     SELECT p.full_name,u.email INTO v_name,v_email
       FROM auth.users u LEFT JOIN public.canopy_profiles p ON p.user_id=u.id
       WHERE u.id=v_case.user_id;
     IF EXISTS (SELECT 1 FROM auth.users u WHERE u.id=v_case.user_id) THEN
       DELETE FROM auth.users u WHERE u.id=v_case.user_id;
     END IF;
     -- This record has no FK to auth.users, so it survives account deletion.
     INSERT INTO public.canopy_c2_deleted_identities(user_id,full_name,email,unenrolled_at,deleted_at)
       VALUES(v_case.user_id,v_name,v_email,v_case.withdrawn_at,now())
       ON CONFLICT(user_id) DO UPDATE SET deleted_at=EXCLUDED.deleted_at;
     DELETE FROM public.canopy_c2_deletion_failures f WHERE f.user_id=v_case.user_id;
     v_count:=v_count+1;
   EXCEPTION WHEN OTHERS THEN
     INSERT INTO public.canopy_c2_deletion_failures(user_id,last_error,attempted_at,attempts)
       VALUES(v_case.user_id,SQLERRM,now(),1)
       ON CONFLICT(user_id) DO UPDATE
       SET last_error=EXCLUDED.last_error,attempted_at=now(),attempts=public.canopy_c2_deletion_failures.attempts+1;
   END;
 END LOOP;
 RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.canopy_c2_delete_due_auth() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.canopy_admin_c2_status_index()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE v_result jsonb;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.canopy_profiles p WHERE p.user_id=auth.uid() AND p.role='admin')
 THEN RAISE EXCEPTION 'Admin required'; END IF;
 SELECT coalesce(jsonb_agg(row_to_json(t)),'[]'::jsonb) INTO v_result FROM (
   SELECT c.user_id,'unenrolled'::text AS status,p.full_name::text AS full_name,u.email::text AS email,c.purge_after AS action_at
   FROM public.canopy_c2_inactivity_cases c
   LEFT JOIN public.canopy_profiles p ON p.user_id=c.user_id
   LEFT JOIN auth.users u ON u.id=c.user_id
   WHERE c.status='withdrawn'
     AND NOT EXISTS(SELECT 1 FROM public.canopy_c2_deleted_identities d WHERE d.user_id=c.user_id)
   UNION ALL
   SELECT d.user_id,'deleted'::text AS status,d.full_name,d.email,d.deleted_at AS action_at
   FROM public.canopy_c2_deleted_identities d
 ) t;
 RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION public.canopy_admin_c2_status_index() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.canopy_admin_c2_status_index() TO authenticated;
COMMIT;

-- Supabase provides pg_cron. Schedule one hourly run; named jobs are upserted by cron.schedule.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
SELECT cron.schedule('womate-c2-seven-day-auth-deletion','5 * * * *','SELECT public.canopy_c2_delete_due_auth();');
