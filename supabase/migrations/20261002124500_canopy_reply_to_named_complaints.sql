-- Targeted WOMATE complaint replies. Save a reply and notify only exact matching open complaints.
-- Cases awaiting verification remain open; this script does not claim remediation.
with replies(full_name,subject,response_text) as (
 values
  ('James Amarachi mercy','About the group work project','Dear James, thank you for reaching out. We understand that you missed your Mission invitation. We will review its status and check whether you can be reassigned to a group with an available seat. Please monitor Canopy notifications and promptly respond to any new invitation. Warm regards, WOMATE Team.'),
  ('Lauretta Molatlhegi','Mission missing','Dear Lauretta, thank you for reaching out. Mission eligibility requires at least one Module 01-05 assignment manually marked Completed by WOMATE. We will check your completion record and group allocation. If confirmed, we will review your access and available matching options. Warm regards, WOMATE Team.'),
  ('Joselyne Naava','Sharing my canopy account','Dear Joselyne, please do not share your Canopy password or verification codes. Authorised WOMATE staff can view your learning progress and submissions in the staff dashboard. If you want us to review a particular assignment, tell us its module number and the issue. Warm regards, WOMATE Team.'),
  ('Cynthia Massina','Submission of yesterday assignment but later tells that l didnt','Dear Cynthia, thank you for reporting this. We will check your submission history to confirm whether the assignment was recorded and whether your dashboard status is correct. Please avoid repeated submissions while this is investigated. We will tell you if any action is needed. Warm regards, WOMATE Team.'),
  ('Sellina Chirwa','Resubmitting of the assignment','Dear Sellina, thank you for correcting your Google Drive permissions. We understand that you have already used three attempts and need to submit only an accessible CanopyCanvas link. We will review your submission and whether a link-only correction can be authorised without repeating the assignment. Please keep the corrected link ready. Warm regards, WOMATE Team.'),
  ('Aliciana Mrisha','Revision','Dear Aliciana, if WOMATE has marked your assignment Revision required, corrections can be submitted during the authorised revision period. We will check your latest review and whether your revision window is open. If a technical issue blocks access, we will review it and advise you. Warm regards, WOMATE Team.'),
  ('Inertia Ayvor Moyo','Assignment error','Dear Inertia, thank you for reporting that your three assignment components show one remaining. We will check which components were saved and whether the final submission was recorded. Please do not repeat the entire assignment until we identify what is missing. Warm regards, WOMATE Team.'),
  ('Happiness Mlaponi','Resubmitting Google drive link','Dear Happiness, we understand that your assignment requires an updated Google Drive link but no link field is visible. We will review your assignment and revision status to determine how to allow the link correction. Please keep the accessible link ready; you should not need to repeat unrelated components simply to correct it. Warm regards, WOMATE Team.'),
  ('Shumirai P Dube','Assignment submission','Dear Shumirai, thank you for reporting this. Canopy accepts valid LinkedIn or X/Twitter links for the relevant social submission component. We will check the link validation and your saved assignment. Please ensure your post is accessible and that you copied its complete URL. Warm regards, WOMATE Team.'),
  ('Esnart Potani','Delay to submit the assignment','Dear Esnart, thank you for explaining the network and power difficulties you face. We appreciate your commitment to learning. We will review your assignment record and available submission or revision options. Where an exception requires approval, the team will assess it and communicate the decision. Warm regards, WOMATE Team.'),
  ('Jesca Nanziri','Have we been given out another assignment?. How can I check my assignment progress of last week','Dear Jesca, every Canopy module has its own assignment and deadline. Please open the relevant module to see its assignment and available results. We will verify whether your recent submission was recorded and clarify which assignment your deadline notification refers to. Warm regards, WOMATE Team.'),
  ('Delshik Faith Adams','Canopy not showing any information','Dear Delshik, thank you for reporting the Awaiting enrolment message. We will check your Canopy enrolment and learner access permissions. If your enrolment is approved but access has not been activated correctly, the team will investigate and advise you. Warm regards, WOMATE Team.')
), matched as (
 select a.id,a.learner_id,r.response_text
 from public.canopy_manager_actions a
 join public.canopy_profiles p on p.user_id=a.learner_id
 join replies r on lower(trim(p.full_name))=lower(trim(r.full_name))
   and lower(trim(a.subject))=lower(trim(r.subject))
 where a.action_type='complaint' and a.status='open'
   and (a.response_message is null or btrim(a.response_message)='')
), updated as (
 update public.canopy_manager_actions a
 set response_message=m.response_text,responded_at=now()
 from matched m where a.id=m.id
 returning a.id,a.learner_id,a.response_message
)
insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
select u.learner_id,'complaint_response','WOMATE has responded to your complaint',
       u.response_message,'/canopy/help','complaint-response:'||u.id::text
from updated u
on conflict(fingerprint) do update set
 title=excluded.title,body=excluded.body,link=excluded.link,type=excluded.type,read_at=null;
