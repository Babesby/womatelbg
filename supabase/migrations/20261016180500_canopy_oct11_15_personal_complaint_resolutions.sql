-- WOMATE Canopy · personally written case-by-case responses for complaints 11–15 October 2026.
-- Exact-name, subject, UTC day and message-fragment verification; never touch unrelated cases.
-- Pending assessment appeal and Mission access issue stay OPEN until verified.
-- This is a forward-only migration. No grades or learner access are changed.
BEGIN;
SET LOCAL lock_timeout='8s';
SET LOCAL statement_timeout='90s';

CREATE TEMP TABLE canopy_oct16_replies (
  case_key text PRIMARY KEY, full_name text NOT NULL, subject text NOT NULL,
  submitted_day date NOT NULL, message_fragment text NOT NULL, close_now boolean NOT NULL,
  response_text text NOT NULL
) ON COMMIT DROP;

INSERT INTO canopy_oct16_replies VALUES
  ('agness', 'Agness Msampha', 'My appeal for module 3 assignment', '2026-10-15', 'When I was submitting my assignment for module 3', false, 'Dear Agness, thank you for explaining the power interruptions and the difficulty accessing your shared recording. We understand why the different marks are upsetting. An 80/100 result is not automatically changed because a partner received 100/100: we first need to compare the submitted links, access permissions and individual assessment records. Please change the Google Drive file to a viewable link and send the corrected URL in a new Help & Complaints message clearly labelled ''Module 03 assessment appeal''. We will review the evidence and feedback before deciding whether any correction is justified. The standard Module 03 revision window has ended, so this is a manual assessment review, not an automatic new attempt. Your appeal remains open for verification. Warm regards, WOMATE Team.'),
  ('dineo-clear', 'Dineo Motsoari', 'Mission progress check-in / challenge', '2026-10-15', 'Sorry for the mix up but there are no challenges', true, 'Dear Dineo, thank you for confirming that your team has no current challenges. We appreciate the update and are closing this check-in as no assistance is required. Please continue coordinating with your team through Canopy and submit your own Mission contribution before the programme deadline. Warm regards, WOMATE Team.'),
  ('dineo-survey', 'Dineo Motsoari', 'Mission progress check-in / challenge', '2026-10-15', 'I surveyed and photographed residential property damaged', true, 'Dear Dineo, thank you for sharing your detailed observations about rainfall damage, drainage and flood vulnerability. Your field observations are relevant to Stage 1, Observe locally. Please enter the summary in your assigned Mission report in Canopy and add a viewable evidence link where available; a complaint check-in does not replace a Mission report. Distinguish direct observations from conclusions that would need professional structural assessment, and do not enter unsafe buildings to collect evidence. This guidance completes your check-in. Warm regards, WOMATE Team.'),
  ('grace', 'Grace Kitiibwa Kasumba', 'Mission progress check-in / challenge', '2026-10-15', 'I understand that we are not supposed to wait for inactive teammates', true, 'Dear Grace, thank you for keeping your team moving despite limited replies. We have noted your request for a gentle Canopy team check-in. Please continue with the two active members rather than waiting for everyone, submit your own assigned stage and keep your shared folder updated with a factual list of actual contributors. The other team members should not be pressured to participate. If you are still unable to access or identify your team, send us a new Help message with the team name so we can investigate. Warm regards, WOMATE Team.'),
  ('cynthia', 'Cynthia Massina', 'Mission progress check-in / challenge', '2026-10-14', 'Other members are not participated am only one', true, 'Dear Cynthia, thank you for informing us. You do not need to abandon your Mission because you are the only member currently contributing. Leave one clear invitation to collaborate in the private Canopy team chat, complete your own assigned stage and submit your individual Mission report. You can submit the shared evidence that active contributors have genuinely produced, with a factual contribution note; do not claim work on behalf of absent members. WOMATE assesses verified contributions, and you are not expected to pressure others. Warm regards, WOMATE Team.'),
  ('nothando', 'Nothando Mary Masviviriri', 'Mission progress check-in / challenge', '2026-10-14', 'Community Perspectives on Flooding in Zimbabwe', true, 'Dear Nothando, thank you for documenting perspectives from residents, farmers, business owners and young people. You have identified an important shared pattern: flooding affects homes, livelihoods, education and access, and communities want to be included in solutions. This is strong material for Stage 2, Listen to people. Please submit it in your individual Mission report, making clear which perspectives came from actual conversations and which are illustrative or secondary. Add a viewable source or evidence link where appropriate and share the synthesis with your team. A Help check-in does not itself count as a Mission report. Warm regards, WOMATE Team.'),
  ('emma', 'Emma Sesay', 'Mission progress check-in / challenge', '2026-10-14', 'My team mate are not ready to comply', true, 'Dear Emma, thank you for the update and for continuing your part. Please do not wait indefinitely for unresponsive teammates. Send one final coordination message in the private Canopy Mission chat, finish your assigned stage and submit your individual report with the evidence available. The final shared folder should record what was actually completed and who contributed. WOMATE will review active participants'' work on its merits; you should not be disadvantaged simply because others did not respond. Warm regards, WOMATE Team.'),
  ('comfort', 'Comfort Kaphuka', 'My mission isn''t opening', '2026-10-14', 'I am currently experiencing difficulties accessing my mission', false, 'Dear Comfort, thank you for flagging the access problem. Completing lesson modules alone does not unlock the optional Mission. Canopy requires at least one assignment from Modules 01-05 to have been manually marked Completed by WOMATE, together with a saved country on your profile. If you already meet both conditions but the Missions page remains locked or fails to load, this needs an access check rather than another assignment attempt. Please tell us in a new Help message which module is marked Completed and what the Missions page displays. Your access complaint remains open until eligibility or the technical problem is verified. Warm regards, WOMATE Team.'),
  ('marie-14', 'Marie Goretti', 'Mission progress check-in / challenge', '2026-10-14', 'we have a challenges of having group', true, 'Dear Marie, thank you for updating us about HER FUTURE. A WhatsApp group is optional; your accepted Mission team can coordinate in the private Canopy Mission chat even if a separate group cannot be created. Agree on one climate issue and divide the five stages among the members who are active: Observe locally, Listen to people, Map responsibility, Take public action and Multiply the learning. Each lead submits her own report, and the team provides one shared evidence folder by 23 October at 11:59 PM GMT. Continue with active members and record contributions fairly. Warm regards, WOMATE Team.'),
  ('angelina', 'Angelina Owusuaa Nyamekye', 'Request for Support with Module 2 Video Assignment and Module 3 Access', '2026-10-14', 'I sincerely apologise for not communicating', true, 'Dear Angelina, thank you for explaining your absence and the unstable network during your retreat. We appreciate that you have returned to your programme activities. The general final first-submission grace period for Module 02 ended on 14 October at 12:00 GMT and for Module 03 on 13 October at 12:00 GMT; those windows cannot be reopened automatically. Please check your Assignments page for any already-authorised individual revision or accommodation, and review what is recorded in your submission history. If an assessment you submitted on time is missing, report that specific record for verification. This response clarifies the applicable windows without granting an unapproved extension. Warm regards, WOMATE Team.'),
  ('mirriam', 'Mirriam Molowa', 'Requesting for time to write module 3 assignment', '2026-10-12', 'I would like to apologize for not taking assignment', true, 'Dear Mirriam, thank you for being open about the pressure of schoolwork. We understand that balancing academic responsibilities can be difficult. WOMATE provided a final additional Module 03 first-submission window ending on 13 October 2026 at 12:00 GMT. That general grace period has now closed, and no further general extension is available. You can still view your course materials and any assessment already submitted; please continue with upcoming programme activities. This is a decision on the extension request, not a claim that a late submission was accepted. Warm regards, WOMATE Team.'),
  ('issah', 'Issah Suabida Suglo', 'Mission progress check-in / challenge', '2026-10-12', 'I don''t understand what the mission is all about', true, 'Dear Issah, thank you for asking for clarification. The Five Leads Mission is an optional group climate-action activity with five stages: Observe locally, Listen to people, Map responsibility, Take public action and Multiply the learning. Open Canopy > Missions to see your assigned stage, team and private chat. Agree on a shared issue, then complete and submit your own stage report and contribute to one shared evidence folder by 23 October at 11:59 PM GMT. You do not need to depend on WhatsApp or wait indefinitely for silent teammates. Please proceed with anyone who is active and record actual contributions. Warm regards, WOMATE Team.'),
  ('marie-12a', 'Marie Goretti', 'Mission progress check-in / challenge', '2026-10-12', 'would appreciate your support in addressing the challenges we may face', true, 'Dear Marie, thank you for your thoughtful request for support for HER FUTURE. Please use the private Canopy Mission chat as your central coordination space, confirm one shared climate issue and assign simple next steps to the active members. You can find your five stages, individual report area and group evidence section under Canopy > Missions. Keep questions specific in Help & Complaints so WOMATE can address any concrete access or technical barrier. Your team is welcome to use credible public resources and local evidence; you should not wait for all members before starting. Warm regards, WOMATE Team.'),
  ('marie-12b', 'Marie Goretti', 'Mission progress check-in / challenge', '2026-10-12', 'would like to appreciate your support in addressing the changes', true, 'Dear Marie, thank you for following up on behalf of HER FUTURE. We have noted your request for timely guidance and practical resources. The Mission workspace in Canopy contains your team, assigned leads, private messaging, reports and shared evidence submission. Please coordinate there, work with active contributors and complete your individual reports. The final team evidence is due on 23 October at 11:59 PM GMT. For a specific blocked feature or unanswered technical question, submit the exact error or affected page through Help so it can be checked separately. Warm regards, WOMATE Team.'),
  ('hosanna', 'Hosanna Alabi', 'Request for a Short Extension to Submit Assignments', '2026-10-12', 'I sincerely apologise for missing the assignment submission deadline', true, 'Dear Hosanna, thank you for explaining the difficulty coordinating with your partner and for sharing evidence of your individual work. Partner delays can be frustrating, and your own effort is acknowledged. WOMATE''s final first-submission grace period for Modules 01 and 02 ended on 14 October at 12:00 GMT, and for Module 03 on 13 October at 12:00 GMT. No further general extension has been authorised. If you submitted a component before its deadline but Canopy did not record it, please report the exact submission and timestamp for review; an external post on its own is not proof that all required Canopy parts were submitted. Warm regards, WOMATE Team.'),
  ('oladeji', 'Oladeji Ameerah', 'Request for Consideration Regarding Missed Assignment Submissions', '2026-10-12', 'I''m reaching out regarding the Climate Debate assignment', true, 'Dear Ameerah, thank you for your message and for accepting responsibility for the missed Climate Debate submission. We appreciate the work you and your partner put into the recording. The additional general Module 03 first-submission window ended on 13 October 2026 at 12:00 GMT, and that window has now closed. We cannot confirm or grant another attempt through a complaint response. If the completed recording was actually submitted in Canopy before the applicable deadline but is missing from your history, please provide the submission details for a technical review. Continue with the remaining module activities. Warm regards, WOMATE Team.'),
  ('diana', 'Diana Njuguna', 'Mission progress check-in / challenge', '2026-10-11', 'Following you grouping us we were not able', true, 'Dear Diana, thank you for candidly sharing the coordination difficulties created by different countries, time zones and work schedules. Cross-country collaboration is an intentional part of this Mission, but your feedback about future matching has been noted for programme review. For the current team, agree on one short asynchronous check-in, use the private Canopy chat, and divide work among the three people who are active. Each contributor should submit her own stage report, and the team should document actual participants in one shared evidence folder. Please do not wait indefinitely for inactive members. Warm regards, WOMATE Team.'),
  ('margret', 'Margret Akiru Lokitan', 'Mission progress check-in / challenge', '2026-10-11', 'I would like to know whether each member has to submit', true, 'Dear Margret, thank you for checking before submitting. Each active Mission lead must submit her own assigned stage report through Canopy > Missions. The group then submits one shared Google Drive or Docs evidence link for the overall team, rather than five separate final group submissions. The shared folder should contain the work actually completed and a factual contribution note naming who participated; do not list absent members as contributors. One active member may send the final shared folder once the required reports and evidence are ready, by 23 October at 11:59 PM GMT. Warm regards, WOMATE Team.'),
  ('jessica', 'Jessica Amma Boanuh', 'Mission progress check-in / challenge', '2026-10-11', 'we have started discussions but i''d like a breakdown', true, 'Dear Jessica, thank you for asking. The Five Leads Mission is one shared climate-action project carried out in five stages: 1. Observe locally, 2. Listen to people, 3. Map responsibility, 4. Take public action, and 5. Multiply the learning. Your Missions page shows which stage you lead. Your team agrees on one climate issue, each active member completes and submits her own stage report, and the team submits one shared evidence folder that records actual contributors. Use the private Canopy chat to coordinate and aim to submit the shared evidence by Friday, 23 October at 11:59 PM GMT. Warm regards, WOMATE Team.');

-- Verify each intended complaint has exactly one unique match, irrespective of its current status.
-- An unexpected database state stops this transaction rather than changing the wrong learner.
CREATE TEMP TABLE canopy_oct16_matches ON COMMIT DROP AS
SELECT r.case_key,a.id,a.learner_id,a.status,a.response_message
FROM canopy_oct16_replies r
JOIN public.canopy_manager_actions a
  ON a.action_type='complaint'
 AND lower(btrim(coalesce(a.subject,'')))=lower(btrim(r.subject))
JOIN public.canopy_profiles p ON p.user_id=a.learner_id
WHERE (
  -- Standard match: learner name, subject, UTC day and message fragment.
  (
    lower(regexp_replace(btrim(coalesce(p.full_name,'')),'[[:space:]]+',' ','g'))
       = lower(regexp_replace(btrim(r.full_name),'[[:space:]]+',' ','g'))
    AND (a.created_at AT TIME ZONE 'UTC')::date=r.submitted_day
    AND strpos(
      replace(lower(coalesce(a.message,'')),chr(8217),chr(39)),
      replace(lower(r.message_fragment),chr(8217),chr(39))
    )>0
  )
  OR
  -- These two complaints have distinctive text even if profile names differ.
  -- Guard by subject and +/- one UTC day, and enforce ONE matching row below.
  (
    r.case_key='mirriam'
    AND (a.created_at AT TIME ZONE 'UTC')::date
        BETWEEN (r.submitted_day - 1) AND (r.submitted_day + 1)
    AND lower(coalesce(a.message,'')) LIKE '%school workload%'
  )
  OR
  (
    r.case_key='oladeji'
    AND (a.created_at AT TIME ZONE 'UTC')::date
        BETWEEN (r.submitted_day - 1) AND (r.submitted_day + 1)
    AND lower(coalesce(a.message,'')) LIKE '%fell asleep%'
    AND lower(coalesce(a.message,'')) LIKE '%debate%'
  )
);

DO $$
DECLARE v_invalid text;
BEGIN
 SELECT string_agg(r.case_key||' ('||coalesce(m.n,0)::text||' matches)',', ' ORDER BY r.case_key)
 INTO v_invalid
 FROM canopy_oct16_replies r
 LEFT JOIN (SELECT case_key,count(*) n FROM canopy_oct16_matches GROUP BY case_key) m USING(case_key)
 WHERE coalesce(m.n,0)<>1;
 IF v_invalid IS NOT NULL THEN
   RAISE EXCEPTION 'WOMATE complaint match verification failed: %',v_invalid;
 END IF;
END $$;

CREATE TEMP TABLE canopy_oct16_changed ON COMMIT DROP AS
WITH updated AS (
 UPDATE public.canopy_manager_actions a
 SET response_message=r.response_text,responded_at=now(),
     status=CASE
       WHEN r.case_key='grace' THEN
         CASE WHEN EXISTS(SELECT 1 FROM public.canopy_mission_group_members g
                          WHERE g.user_id=a.learner_id AND g.invitation_status='accepted')
              THEN 'resolved' ELSE 'open' END
       WHEN r.close_now THEN 'resolved' ELSE 'open' END,
     resolved_at=CASE
       WHEN r.case_key='grace' THEN
         CASE WHEN EXISTS(SELECT 1 FROM public.canopy_mission_group_members g
                          WHERE g.user_id=a.learner_id AND g.invitation_status='accepted')
              THEN now() ELSE NULL END
       WHEN r.close_now THEN now() ELSE NULL END
 FROM canopy_oct16_matches m
 JOIN canopy_oct16_replies r ON r.case_key=m.case_key
 WHERE a.id=m.id AND a.status='open'
   AND (a.response_message IS NULL OR btrim(a.response_message)='')
 RETURNING a.id,a.learner_id,a.response_message,a.status
)
SELECT m.case_key,u.* FROM updated u
JOIN canopy_oct16_matches m ON m.id=u.id;

-- Send the actual full personalised response to each learner inside Canopy.
INSERT INTO public.canopy_notifications(user_id,type,title,body,link,fingerprint)
SELECT c.learner_id,'complaint_response','WOMATE has responded to your complaint',
       c.response_message,'/canopy/help','complaint-response:'||c.id::text
FROM canopy_oct16_changed c
ON CONFLICT(fingerprint) DO UPDATE
SET title=excluded.title,body=excluded.body,link=excluded.link,type=excluded.type,read_at=NULL;

-- Grace explicitly requested a teammate reminder. Send a gentle check-in only to the
-- peers in Grace's current accepted group, without disclosing her private complaint.
WITH grace_groups AS (
 SELECT DISTINCT member.group_id,peer.user_id
 FROM canopy_oct16_changed c
 JOIN public.canopy_mission_group_members member
   ON member.user_id=c.learner_id AND member.invitation_status='accepted'
 JOIN public.canopy_mission_group_members peer
   ON peer.group_id=member.group_id AND peer.user_id<>c.learner_id
  AND peer.invitation_status IN ('accepted','invited')
 WHERE c.case_key='grace'
)
INSERT INTO public.canopy_notifications(user_id,type,title,body,link,fingerprint)
SELECT g.user_id,'mission_active_team_guidance','Please check your WOMATE Mission team',
       'Your Mission teammates are coordinating in Canopy. If you accepted your invitation, please check the private Mission chat and share an update on the stage you are able to complete. Participation should remain respectful and voluntary. Active members may continue and submit verifiable contributions even when others cannot take part.',
       '/canopy/opportunities',
       'mission-team-checkin-oct16:'||g.group_id::text||':'||g.user_id::text
FROM grace_groups g
ON CONFLICT(fingerprint) DO UPDATE
SET title=excluded.title,body=excluded.body,link=excluded.link,type=excluded.type,read_at=NULL;

DO $$
DECLARE v_written integer;v_closed integer;v_pending integer;
BEGIN
 SELECT count(*),count(*) FILTER(WHERE status='resolved'),count(*) FILTER(WHERE status='open')
 INTO v_written,v_closed,v_pending FROM canopy_oct16_changed;
 RAISE NOTICE 'WOMATE Oct 16 replies written: %, resolved: %, remaining open pending verification: %',
 v_written,v_closed,v_pending;
END $$;
COMMIT;
