// Shared Ask Canopy interface, region-specific verified answers. No guesswork about
// unconfirmed speakers, session times, assignment grace or final certificates.
import {getCanopy2027Curriculum} from './canopyCurricula2027';
import {canopyPost2026Runtime} from './canopyCohortRuntime2027';
const date=iso=>iso?new Date(iso+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}):'To be announced';
const take=q=>String(q||'').toLowerCase();
export function matchCanopy2027HelpQuestion(query,cohortKey){
 const cohort=getCanopy2027Curriculum(cohortKey),runtime=canopyPost2026Runtime(cohortKey);
 if(!cohort||!runtime)return{title:'Canopy Help',answer:'This cohort could not be verified. Please reopen your assigned Canopy classroom.',route:'/canopy/classroom',actionLabel:'Open classroom'};
 const q=take(query),region=runtime.region||cohort.region;
 const detail=(title,answer,route='/canopy/classroom',actionLabel='Open Canopy')=>({title,answer,route,actionLabel});
 const entries=cohort.modules.map((m,i)=>'Module '+(i+1)+' — '+m.title+': '+date(runtime.moduleReleaseDates[m.id])).join('\n');
 if(/selection|selected|scratch|card|code|offer|admission|accept/.test(q))
  return detail('Your selection and acceptance',
   'An official WOMATE selection email provides your private selection card. Reveal its code, then use your application email and code to create your personalised “I Have Been Selected” graphic. Scratching does not accept the offer: you must separately choose Accept my offer before the personal seven-day deadline. A Canopy login alone does not confirm selection.',
   '/selected','Create my selected card');
 if(/schedule|timeline|week|module|open|start|course/.test(q)&&!/assignment|submit|score/.test(q))
  return detail(region+' cohort schedule',
   'Your '+runtime.shortName+' programme opens '+date(runtime.programmeOpenDate)+'. Modules unlock together each week.\n'+entries+'\nPlanned graduation: '+date(runtime.graduationDate)+'. Live-session join links and exact times will be announced by WOMATE.',
   '/canopy/course/she-leads','View modules');
 if(/live|speaker|youtube|session|thursday|meet/.test(q))
  return detail('Live sessions and speaker challenges',
   'Your '+region+' cohort follows five module weeks starting '+date(runtime.moduleReleaseDates['01'])+'. Speakers, live-session times, broadcasts and weekly images are published by WOMATE in Canopy. Do not use Cohort 2 (2026) session times or links for this programme. Check notifications for verified instructions.',
   '/canopy/notifications','Check announcements');
 if(/assignment|draft|save|attempt|score|grade|revision|evidence|practical|submit|deadline/.test(q))
  return detail('Assignments and feedback',
   'Your five '+region+' assignments use the prompts and practical challenges shown in your own module cards. Cohort 2-style paragraph, practical evidence and speaker challenge workflows are being aligned for 2027. Until that release is verified, follow only the submission fields and deadlines currently displayed in your Canopy classroom. Your final score and reviewer remarks are published following WOMATE assessment; never assume a quiz score is a final grade.',
   '/canopy/assignments','Open assignments');
 if(/certificate|graduat|completion|eligible|attendance/.test(q))
  return detail('Graduation and certification',
   'The '+region+' cohort graduation target is '+date(runtime.graduationDate)+'. Complete the approved learning, assignment and attendance requirements shown in Canopy. WOMATE verifies eligibility before issuing a Certificate of Completion. Selection alone does not earn a certificate. The final 2027 eligibility rules will be published by programme administrators.',
   '/canopy/certificate','View certificates');
 if(/password|login|sign in|account|profile/.test(q))
  return detail('Canopy access',
   'Use the same email address as your WOMATE application. A selected participant must accept the offer before account linkage and cohort access can be completed. If you cannot sign in, use the password reset process rather than creating duplicate accounts.',
   '/canopy/login','Open sign in');
 if(/complain|help|support|report|problem|technical|stuck/.test(q))
  return detail('Support and complaints',
   'You can raise a concern privately through Canopy Help & Complaints. WOMATE staff review the message and can respond through the existing workflow. Include the screen and module where the issue occurred, but never share your password or private selection code.',
   '/canopy/help','Contact WOMATE');
 return detail('Ask Canopy · '+region,
   'I can help with your verified '+region+' 2027 module schedule, selection card, assignment rules, live sessions, graduation and Canopy access. Please ask about one of these topics. For unconfirmed details, check your Canopy notices or ask WOMATE staff.',
   '/canopy/classroom','Open classroom');
}
