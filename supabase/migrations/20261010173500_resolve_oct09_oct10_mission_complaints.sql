-- WOMATE Canopy · resolve supplied Mission complaints from 8-10 Oct 2026
-- Idempotent by exact learner name + subject + open status.
-- Resolves only the latest matching open complaint for each named learner.
-- Each resolved complaint refreshes one learner notification.

begin;

do $$
declare
  missing text;
begin
  with expected(full_name,subject) as (
    values
      ('Cleve Pride Biira','Mission progress check-in / challenge'),
      ('NJIFACK LINDA CHOPNJUNG','Mission progress check-in / challenge'),
      ('Blessing Adiza Amaana','Mission progress check-in / challenge'),
      ('Bukola Meshinoye','Mission progress check-in / challenge'),
      ('Rediet Mulugeta','Mission progress check-in / challenge'),
      ('mariama sesay','Where can I find my mission'),
      ('Mmesoma Jennifer Obiezu','Mission progress check-in / challenge'),
      ('yollanda Gomani','Mission progress check-in / challenge')
  ),
  found as (
    select e.full_name,e.subject,count(a.id) n
    from expected e
    left join public.canopy_profiles p
      on lower(trim(coalesce(p.full_name,'')))=lower(trim(e.full_name))
    left join public.canopy_manager_actions a
      on a.learner_id=p.user_id
     and a.action_type='complaint'
     and a.status='open'
     and lower(trim(coalesce(a.subject,'')))=lower(trim(e.subject))
     and a.created_at>='2026-10-08T00:00:00Z'::timestamptz
     and a.created_at<'2026-10-11T00:00:00Z'::timestamptz
    group by e.full_name,e.subject
  )
  select string_agg(full_name||' ['||subject||']',', ')
  into missing
  from found
  where n=0;

  if missing is not null then
    raise exception 'Expected open complaint(s) not found: %',missing;
  end if;
end;
$$;

with replies(full_name,subject,response_text) as (
 values
  (
    'Cleve Pride Biira',
    'Mission progress check-in / challenge',
    'Thank you, Cleve, and thank you for explaining the constraint clearly. You do not need to make a costly physical visit to the Ministry of Water and Environment in order for your Stage 3 policy-mapping work to be valid. Please proceed using credible secondary and remote evidence. You may use official Ministry of Water and Environment pages, NEMA material, KCCA plans, the Uganda Climate Change Act 2021 and other reliable government or institutional sources. A phone interview is also acceptable if you record the date, the person or office consulted, their role where appropriate, and a short factual note of what you learned. Clearly distinguish desk or secondary evidence from any direct interview evidence in your brief. Your stakeholder mapping and policy analysis for Banda flooding can therefore proceed without a physical office visit. Please submit on time with the strongest verifiable evidence you can reasonably access. Transport limitations should not prevent you from completing your Mission contribution.'
  ),
  (
    'NJIFACK LINDA CHOPNJUNG',
    'Mission progress check-in / challenge',
    'Thank you, Linda. The five-person poster you saw is a WOMATE learner-recognition feature. It does not automatically move participants into a new Mission team and it is separate from Mission matching. WOMATE uses verified programme participation, quality of work, consistency and demonstrated leadership when selecting learners for recognition features. There is no separate form you need to submit for that poster. Keep completing your coursework and Mission contribution carefully, respond to feedback, stay active in Canopy and continue producing work WOMATE can verify. Cross-country Mission teams are formed through the Mission system, so recognition on a poster is not required before you can work with women from other countries.'
  ),
  (
    'Blessing Adiza Amaana',
    'Mission progress check-in / challenge',
    'Thank you, Blessing. Please do not wait indefinitely for teammates who are not responding, and do not pressure them to participate. Send one final clear coordination message in the private Canopy Mission chat, then continue with any member who is active. Complete your own assigned Mission stage, submit your individual Mission report and findings, and place the evidence you actually completed in the shared folder. Add a short factual contribution note stating who contributed and which listed members did not contribute. WOMATE will review the work completed by active participants, so another member''s inactivity should not block your own progress.'
  ),
  (
    'Bukola Meshinoye',
    'Mission progress check-in / challenge',
    'Thank you, Bukola. If you are having difficulty reaching your group members, please use the private Canopy Mission chat as the main coordination record and send one clear final message with the next task and a reasonable response deadline. Do not wait indefinitely and do not pressure anyone who remains inactive. Continue your own assigned Mission stage, submit your report and findings, and document the work completed by active contributors in the shared evidence folder. Include a factual note showing who contributed and who did not respond. WOMATE will assess your actual contribution rather than allow an inactive teammate to stop your progress.'
  ),
  (
    'Rediet Mulugeta',
    'Mission progress check-in / challenge',
    'Thank you, Rediet. Coordination problems should not stop your individual Mission progress. Please simplify the next step for the group: post one clear message in the private Canopy Mission chat stating the shared issue, what each active person needs to do and when you need a response. Continue your own assigned stage even if the full team is not coordinating well. Work with members who are active, submit your individual Mission report and findings, and keep a factual contribution record in the shared folder. WOMATE will review the evidence produced by the participants who actually contributed.'
  ),
  (
    'mariama sesay',
    'Where can I find my mission',
    'Thank you, Mariama. In Canopy, open the left-side menu and select Missions. The Missions area is at Canopy → Missions and opens your private Mission space when you have an active invitation or accepted team. If you have been invited, accept the invitation there first. After acceptance you will see your team members, your assigned lead stage, the private team chat, reports and shared Mission guidance. If the page shows that you are waiting instead, Canopy has not yet placed you into an active team. Waiting for a Mission team does not block your normal coursework.'
  ),
  (
    'Mmesoma Jennifer Obiezu',
    'Mission progress check-in / challenge',
    'Thank you, Mmesoma. You have made a reasonable effort to reach Jesca. Please leave one final coordination message for her in the private Canopy Mission chat, then continue with the members who are actively participating. A WhatsApp group or external chat is optional and is not required for a learner to participate in her Canopy Mission, so please keep the important coordination record inside Canopy. Do not pressure an unresponsive member. Complete your own assigned stage, submit your report and findings, and document the actual contributors in the shared evidence folder. WOMATE will assess the work that was genuinely completed.'
  ),
  (
    'yollanda Gomani',
    'Mission progress check-in / challenge',
    'Thank you for the update, Yollanda. Your documentary on plastic waste and urban pollution in Malawi can remain part of your Mission evidence. You do not need to hold your own progress indefinitely while waiting for teammates to reply. Please make sure your own assigned Mission report and findings are submitted in Canopy and that the documentary or its accessible evidence link is included in the shared folder. Leave a clear message in the private Mission chat so your teammates can respond or add their parts when they become active. In the final evidence, record who actually contributed. WOMATE will review your individual contribution and the evidence completed by active team members.'
  )
),
ranked_actions as (
  select
    a.id,
    a.learner_id,
    p.full_name,
    a.subject,
    a.created_at,
    row_number() over(
      partition by lower(trim(coalesce(p.full_name,''))),lower(trim(coalesce(a.subject,'')))
      order by a.created_at desc,a.id desc
    ) rn
  from public.canopy_manager_actions a
  join public.canopy_profiles p on p.user_id=a.learner_id
  where a.action_type='complaint'
    and a.status='open'
    and a.created_at>='2026-10-08T00:00:00Z'::timestamptz
    and a.created_at<'2026-10-11T00:00:00Z'::timestamptz
),
matched as (
  select a.id,a.learner_id,r.response_text
  from ranked_actions a
  join replies r
    on lower(trim(a.full_name))=lower(trim(r.full_name))
   and lower(trim(a.subject))=lower(trim(r.subject))
  where a.rn=1
),
updated as (
  update public.canopy_manager_actions a
  set
    response_message=m.response_text,
    responded_at=coalesce(a.responded_at,now()),
    status='resolved',
    resolved_at=coalesce(a.resolved_at,now())
  from matched m
  where a.id=m.id
    and a.status='open'
  returning a.id,a.learner_id,a.response_message
)
insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
select
  u.learner_id,
  'complaint_response',
  'WOMATE has responded to your complaint',
  u.response_message,
  '/canopy/help',
  'complaint-response:'||u.id::text
from updated u
on conflict(fingerprint) do update
set
  title=excluded.title,
  body=excluded.body,
  link=excluded.link,
  type=excluded.type,
  read_at=null;

do $$
declare
  remaining integer;
begin
  select count(*)
  into remaining
  from public.canopy_manager_actions a
  join public.canopy_profiles p on p.user_id=a.learner_id
  where a.action_type='complaint'
    and a.status='open'
    and a.created_at>='2026-10-08T00:00:00Z'::timestamptz
    and a.created_at<'2026-10-11T00:00:00Z'::timestamptz
    and (
      (lower(trim(p.full_name))=lower('Cleve Pride Biira') and lower(trim(a.subject))=lower('Mission progress check-in / challenge'))
      or (lower(trim(p.full_name))=lower('NJIFACK LINDA CHOPNJUNG') and lower(trim(a.subject))=lower('Mission progress check-in / challenge'))
      or (lower(trim(p.full_name))=lower('Blessing Adiza Amaana') and lower(trim(a.subject))=lower('Mission progress check-in / challenge'))
      or (lower(trim(p.full_name))=lower('Bukola Meshinoye') and lower(trim(a.subject))=lower('Mission progress check-in / challenge'))
      or (lower(trim(p.full_name))=lower('Rediet Mulugeta') and lower(trim(a.subject))=lower('Mission progress check-in / challenge'))
      or (lower(trim(p.full_name))=lower('mariama sesay') and lower(trim(a.subject))=lower('Where can I find my mission'))
      or (lower(trim(p.full_name))=lower('Mmesoma Jennifer Obiezu') and lower(trim(a.subject))=lower('Mission progress check-in / challenge'))
      or (lower(trim(p.full_name))=lower('yollanda Gomani') and lower(trim(a.subject))=lower('Mission progress check-in / challenge'))
    );

  if remaining<>0 then
    raise exception 'Complaint resolution verification failed. Matching open complaints remaining: %',remaining;
  end if;
end;
$$;

commit;
