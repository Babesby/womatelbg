-- WOMATE Canopy · resolve supplied learner complaints + Mission guidance
-- 2026-10-08
-- Idempotent: only exact named/subject complaints still open are updated.
-- Each resolved complaint generates/refreshes one learner notification.
-- Mission guidance reuses the existing per-user fingerprint to avoid duplicate notices.

begin;

with replies(full_name,subject,response_text) as (
 values
  ('Busisiwe Amantle Aphiri','Mission progress check-in / challenge','Thank you, Busisiwe. Yes, please proceed. You do not need to wait for active flooding. For Stage 1, document what is directly observable now — for example blocked drains, waste accumulation, drainage infrastructure, vulnerable areas or community observations. You may also use dated photos, videos or official reports from previous flooding events as supporting evidence, clearly labelled as secondary or historical evidence. Your group may adapt the angle while keeping the shared issue of flooding, drainage and waste. What matters is that you explain what you observed directly, what evidence came from earlier events, and what this shows about climate vulnerability in your context. Please continue with your Mission.'),
  ('Grace Kamkwamba','Revision of requested assignment','Thank you, Grace. You do not need to recreate your advocacy work simply because LinkedIn or X/Twitter is unavailable to you. A public Facebook post can be reviewed as your social advocacy evidence. Please use the public post link and make sure WOMATE can open it. If the assignment field still refuses the link, send the Facebook URL through Help & complaints and WOMATE will review it manually.'),
  ('Sellina Chirwa','Mission progress check-in / challenge','Thank you, Sellina. Please do not wait indefinitely for inactive teammates and do not pressure anyone who is not participating. Continue with the members who are active. Complete your own Mission part, submit your report and findings, and build the shared evidence folder with the work that was actually completed. In the folder, add a short factual contribution note listing who contributed and which listed members did not contribute. WOMATE will assess the evidence based on the active contributors rather than allowing an unresponsive teammate to block everyone.'),
  ('Mgeni Gondwe','Mission progress check-in / challenge','Thank you, Mgeni. You have already made a reasonable effort to contact your group. Please continue with the teammate who is responding instead of waiting indefinitely. Complete your own assigned stage and submit your individual Mission report. Use the private Canopy chat to leave one final coordination message for the others. Your shared folder should contain the work completed by active contributors and a factual note identifying who contributed and who did not. Lack of response from other members should not stop your own progress.'),
  ('Danielle Seiwaa Owusu','Mission progress check-in / challenge','Thank you, Danielle. Yes — the four active members should proceed. Do not keep the whole team waiting for one unresponsive member and do not pressure her to participate. Each active member should complete and submit her own Mission part and findings. Build the shared evidence folder from the contributions received and add a factual contribution note naming the contributors and the listed member who did not contribute. WOMATE will review what the active team completed.'),
  ('Regina Etim Efiong','The mission','Thank you, Regina. The Cross-country Climate Mission is an optional practical collaboration. Your group works around one climate issue and the five Mission stages are: Observe locally, Listen to people, Map responsibility, Take public action, and Multiply the learning. Each person leads one stage, reports what she did and learned, and contributes evidence to one shared folder. You can coordinate through the private Mission chat. Complete your assigned stage, submit your Mission report, and help your team document the overall findings and action.'),
  ('Jessica Amma Boanuh','Mission progress check-in / challenge','Thank you, Jessica. Please do not allow other members’ schedules to completely stop your progress. Send one clear message proposing the climate issue, a simple next step and a response deadline. Begin your own assigned Mission stage with anyone who is active. You are not expected to pressure inactive members. Submit your own report and findings, and document the actual contributors in the shared folder. WOMATE will review the work completed by those who participated.'),
  ('Karen Nambala','Mission progress check-in / challenge','Thank you for the update, Karen. Great — please continue with your chosen topic and keep documenting each member’s contribution as you work. Make sure each active lead submits her Mission report and that your group keeps the final evidence together in the shared folder.'),
  ('Olamide Peace Fasae','Mission progress check-in / challenge','Thank you, Olamide. Please continue with the members who are active rather than waiting indefinitely. Complete your own Mission stage and submit your report and findings. Keep coordination messages in the group chat so teammates can rejoin if they become active. In the final folder, record who actually contributed. Inactive teammates should not prevent committed participants from progressing.'),
  ('Pabalelo Reitumetse Latoya Kgopo','Mission progress check-in / challenge','Thank you for confirming. Please continue with your team as planned. Keep your evidence organised, make sure active members submit their Mission reports, and use the shared folder for the final team evidence.'),
  ('Latonia Alicia','Unavailable to view assignments','Thank you, Latonia. WOMATE identified a Canopy Assignments page loading bug affecting both phone and laptop access and corrected the assignment-page runtime issue. Please sign out, refresh the browser completely, sign back in and open Canopy → Assignments again. Your inability to access the page was a platform issue, not a failure to complete your work. If a revision deadline was affected while the page was unavailable, please submit the ready revision once the page opens; WOMATE will take the technical interruption into account.'),
  ('Patience Antwiwaa Mensah','Mission progress check-in / challenge','Thank you, Patience. You have made a reasonable effort to contact your teammates. Please proceed with the teammate who is responsive and complete your own Mission part. Continue leaving messages in the private Mission space so others can join later, but do not wait indefinitely or pressure them. Submit your report and findings and document actual contributors in the shared evidence folder.'),
  ('Apaki Naomi I.','Mission progress check-in / challenge','Thank you, Naomi. If she has accepted in Canopy, her Mission commitment is already recorded there. Participation in a separate WhatsApp or external group is not required for her Canopy acceptance. Continue coordinating through the private Canopy Mission chat and proceed with the active members. If she later joins the external chat, she can contribute from that point.'),
  ('Apaki Naomi I.','Mission progress check-in / challenge','Thank you, Naomi. Please send the missing teammate one final message through the private Canopy Mission chat, then continue with the members who are actively participating. Do not hold the Mission indefinitely for one person. Complete and submit your own parts and record actual contributors in the shared folder.'),
  ('Tadiwanashe Mugadza','Mission progress check-in / challenge','Thank you, Tadiwanashe. You should not be penalised because other members are reading messages without contributing. Continue with the active participants, complete your own assigned stage and submit your report. Keep a factual record of coordination attempts and list contributors and non-contributors in the final evidence folder. WOMATE will assess the work actually completed.'),
  ('Ewa Firmine OLOU','Issue with revision submission','Thank you, Ewa. WOMATE identified a technical problem that could cause the Assignments area to display a blank page, including during revision submission. The assignment-page runtime problem has been corrected in the current system. Your ready revision should not be disadvantaged by a platform failure. Please reopen Canopy Assignments after a full refresh and submit the requested revision. Only the section WOMATE specifically requested for revision should need to be changed; previously accepted parts should carry forward.'),
  ('ALINAFE JONAS','Mission progress check-in / challenge','Thank you for the update. Please proceed with the participant who is active rather than abandoning your own Mission progress. Complete your assigned stage and submit your report and findings. Do not pressure the other members. Record who participated in the shared folder so WOMATE can assess the actual contribution.'),
  ('Uchindami Phakati','Can’t see the other word that I’m supposed to revise','Thank you, Uchindami. When WOMATE requests a selective revision, Canopy should display only the part or parts selected for revision and carry forward the sections that were not requested. If your feedback specifically asks you to revise the paragraph but the paragraph field is missing, that is a technical mismatch rather than something you caused. Please reopen the assignment after refreshing. If the paragraph was not actually selected for revision, you do not need to rewrite it; revise only the section WOMATE requested.'),
  ('Mary Phale','Error in submitting my revision','Thank you, Mary. You are correct: if WOMATE requested only the practical evidence link, Canopy should not require you to rewrite or re-enter the paragraph. Your previously submitted paragraph should carry forward unchanged. Update only the requested practical link and submit the revision. The paragraph requirement should apply only when the paragraph itself has been selected for revision.'),
  ('MUNYONGA DAFINE','about assignment submission','Thank you. Please do not repeatedly recreate your revision. When WOMATE asks for a revision, only the requested section should need to be updated and previously accepted sections should remain attached to the submission. Refresh Canopy Assignments, reopen the revision request and submit the revised part again. If the system still blocks the ready revision, send the revised evidence or link through Help & complaints so WOMATE can verify it manually rather than allowing a technical error to disadvantage you.'),
  ('Esnart Potani','Assignment Feedback and Suggestions','Thank you, Esnart. Your feedback is noted and appreciated. Participants should receive clear platform guidance before deadlines, especially when a major service is unavailable. WOMATE should not require someone to recreate genuine advocacy work solely because a particular social platform was temporarily inaccessible. Where an alternative public platform is accepted for a challenge, the instructions will be stated clearly. Thank you for raising the communication issue.'),
  ('Mary Phale','Submission of my revised work','Thank you, Mary. If WOMATE requested revision of your practical or AI voice-over evidence only, you should not have to submit another 80-word paragraph. The existing paragraph should carry forward from your previous attempt. Please revise and submit only the requested practical section. The paragraph requirement should not block a practical-only revision.'),
  ('Jesca Nanziri','Mission','Thank you, Jesca. The Cross-country Mission is optional and group matching depends on available participants. Not being assigned immediately does not affect your course progress, assignment results or eligibility for the main programme. You remain Mission-eligible and can be matched when an appropriate active team becomes available. Please continue with your normal Canopy coursework in the meantime.'),
  ('Monrei Agatha','Submission','Thank you, Monrei. Part 2 is the practical evidence section. Canopy recognises supported practical links such as Google Drive, Google Docs, OneDrive and SharePoint. Please paste the direct share URL from your browser rather than formatted text or a hyperlink label, and make sure the file is viewable by link. If Part 2 still shows incomplete after that, the problem is with Canopy’s validation rather than your completed work; do not recreate the assignment. Send the evidence link through Help & complaints for manual checking while the submission issue is corrected.'),
  ('Emma Sesay','Gender and Climate justixez','Thank you, Emma. Please copy the actual Google Drive share address from your browser or share dialog and paste the plain URL into the practical-evidence field. It should look like https://drive.google.com/... or https://docs.google.com/.... Do not paste Markdown formatting such as [link](link). Make sure access is set so WOMATE can view the file. If the field still refuses a valid Drive link, send the URL through Help & complaints so WOMATE can review the evidence manually rather than making you redo the work.')
),
ranked_replies as (
  select *, row_number() over(partition by lower(trim(full_name)),lower(trim(subject)) order by response_text) as reply_rank
  from replies
),
ranked_actions as (
  select a.id,a.learner_id,a.subject,p.full_name,a.created_at,
         row_number() over(partition by lower(trim(coalesce(p.full_name,''))),lower(trim(coalesce(a.subject,''))) order by a.created_at asc,a.id) as action_rank
  from public.canopy_manager_actions a
  join public.canopy_profiles p on p.user_id=a.learner_id
  where a.action_type='complaint'
    and a.status='open'
    and a.created_at>='2026-10-02T00:00:00Z'::timestamptz
    and a.created_at<'2026-10-09T00:00:00Z'::timestamptz
),
matched as (
  select a.id,a.learner_id,r.response_text
  from ranked_actions a
  join ranked_replies r
    on lower(trim(a.full_name))=lower(trim(r.full_name))
   and lower(trim(a.subject))=lower(trim(r.subject))
   and a.action_rank=r.reply_rank
),
updated as (
  update public.canopy_manager_actions a
  set response_message=m.response_text,
      responded_at=coalesce(a.responded_at,now()),
      status='resolved',
      resolved_at=coalesce(a.resolved_at,now())
  from matched m
  where a.id=m.id and a.status='open'
  returning a.id,a.learner_id,a.response_message
)
insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
select u.learner_id,'complaint_response','WOMATE has responded to your complaint',u.response_message,'/canopy/help','complaint-response:'||u.id::text
from updated u
on conflict(fingerprint) do update set title=excluded.title,body=excluded.body,link=excluded.link,type=excluded.type,read_at=null;

insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
select distinct
  m.user_id,
  'mission_active_team_guidance',
  'Keep your WOMATE Mission moving',
  'If some teammates are not responding or are not actively contributing, do not pressure them and do not wait indefinitely. Work with the members who are active. Complete your own Mission part, submit your report and findings, and add the team evidence to the shared folder. Include a short factual contribution note listing who contributed and which listed team members did not contribute, without blame.

A completed and verifiable Mission can strengthen your consideration for future WOMATE funded projects, priority opportunities and upcoming programme surprises. This is consideration, not a guarantee of funding or selection.

If you have not accepted a Mission invitation, participation remains optional. WOMATE Team.',
  '/canopy/opportunities',
  'mission-active-guidance-oct08:'||m.user_id::text
from public.canopy_mission_group_members m
join public.canopy_mission_groups g on g.id=m.group_id
where m.invitation_status in('accepted','invited') and g.status in('inviting','active')
on conflict(fingerprint) do update set title=excluded.title,body=excluded.body,link=excluded.link,type=excluded.type,read_at=null;

commit;
