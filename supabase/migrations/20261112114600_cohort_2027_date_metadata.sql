-- Align descriptive 2027 cohort metadata with the already configured admissions and teaching dates.
-- Does NOT open applications, activate memberships or publish missing live session times.
update public.canopy_programme_cohorts
set delivery_rules=delivery_rules||jsonb_build_object(
 'application_window','1 January – 15 February 2027',
 'application_open_target','2027-01-01',
 'application_close_target','2027-02-15',
 'target_window','March – April 2027',
 'session_start','Teaching weeks begin 8 March 2027; exact live-session times to be confirmed'
)
where cohort_key='she-leads-asia-c1-2027'
 and delivery_rules->'admissions'->>'is_open'='false';
update public.canopy_programme_cohorts
set delivery_rules=delivery_rules||jsonb_build_object(
 'application_window','10 – 20 September 2027',
 'application_open_target','2027-09-10',
 'application_close_target','2027-09-20',
 'target_window','October – November 2027',
 'session_start_target','Teaching weeks begin 11 October 2027; exact live-session times to be confirmed'
)
where cohort_key='she-leads-climate-c3-2027'
 and delivery_rules->'admissions'->>'is_open'='false';
