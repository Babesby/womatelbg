import {CANOPY_ACCESS_DATE,CANOPY_ASSIGNMENT_SCHEDULE} from './canopySchedule';
import {CANOPY_BRAND,modules} from './canopyData';
import {canopyCurriculumMeta} from './canopyCurriculum2026';

const SUPPORT_ROUTE='/canopy/help';

function formatGmt(value,{time=true}={}){
  const options={weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:'UTC'};
  if(time){options.hour='2-digit';options.minute='2-digit';options.hour12=false}
  const text=new Intl.DateTimeFormat('en-GB',options).format(new Date(value));
  return time?`${text} GMT`:text;
}

function moduleNumberText(id){return String(Number(id))}
function moduleForSchedule(item){return modules.find(module=>module.id===item.moduleId)}

function referencedSchedule(query=''){
  const text=String(query).toLowerCase();
  const numbered=text.match(/module\s*0?([1-5])\b/);
  if(numbered)return CANOPY_ASSIGNMENT_SCHEDULE.find(item=>Number(item.moduleId)===Number(numbered[1]))||null;
  return CANOPY_ASSIGNMENT_SCHEDULE.find(item=>{
    const title=item.title.toLowerCase();
    const significant=title.split(/[^a-z0-9]+/).filter(word=>word.length>4);
    return significant.length&&significant.filter(word=>text.includes(word)).length>=Math.min(2,significant.length);
  })||null;
}

function currentSchedule(now=new Date()){
  const time=now.getTime();
  const started=CANOPY_ASSIGNMENT_SCHEDULE.filter(item=>time>=new Date(item.weekStartsAt).getTime());
  if(started.length){
    const active=[...started].reverse().find(item=>time<=new Date(item.resubmitUntil).getTime());
    return active||started[started.length-1];
  }
  return CANOPY_ASSIGNMENT_SCHEDULE[0]||null;
}

function scheduleForQuestion(query,now){return referencedSchedule(query)||currentSchedule(now)}

function moduleScheduleLine(item){
  const module=moduleForSchedule(item);
  const liveDate=module?.liveDate||formatGmt(item.speakerOpensAt,{time:false});
  return `Module ${item.moduleId} — ${item.title}: opens ${formatGmt(item.weekStartsAt,{time:false})}; live session ${liveDate} at ${canopyCurriculumMeta.liveSessionTime}; assignment due ${formatGmt(item.dueAt)}.`;
}

function sessionLine(item){
  const module=moduleForSchedule(item);
  return `Module ${item.moduleId} — ${item.title}: ${module?.liveDate||formatGmt(item.speakerOpensAt,{time:false})} at ${canopyCurriculumMeta.liveSessionTime}.`;
}

function deadlineAnswer(query){
  const item=referencedSchedule(query);
  if(item){
    return `Module ${item.moduleId} — ${item.title} is due ${formatGmt(item.dueAt)}. If a revision is required and you still have an attempt available, the configured resubmission window runs until ${formatGmt(item.resubmitUntil)}.`;
  }
  return `Assignment deadlines are configured per module:\n${CANOPY_ASSIGNMENT_SCHEDULE.map(moduleScheduleLine).join('\n')}\nFinal submission still requires all three assignment parts.`;
}

function speakerAnswer(query,now){
  const item=scheduleForQuestion(query,now);
  if(!item)return 'Speaker Challenge timing is not currently configured.';
  const open=now>=new Date(item.speakerOpensAt);
  const state=open?'is open':'is still locked';
  return `For Module ${item.moduleId} — ${item.title}, the Speaker Challenge ${state}. The Thursday live session is at ${canopyCurriculumMeta.liveSessionTime}, and Part 03 unlocks afterward at ${formatGmt(item.speakerOpensAt)}. Before it opens, you can complete and Save Progress on your paragraph and Part 02 practical challenge Drive link. Final submission stays unavailable until Part 03 is open and all three required parts are ready. When it opens, submit the public LinkedIn post link for the speaker task.`;
}

function attemptsAnswer(query){
  const item=referencedSchedule(query);
  const windowText=item?` For Module ${item.moduleId}, the configured resubmission window ends ${formatGmt(item.resubmitUntil)}.`:'';
  return `A normal learner can use up to three assignment attempts. Save Progress does not use an attempt. If feedback says revision required, you can submit again while an attempt remains and the resubmission window is still open.${windowText}`;
}

function liveSessionAnswer(query){
  const item=referencedSchedule(query);
  if(item){
    const module=moduleForSchedule(item);
    return `Module ${item.moduleId} — ${item.title} has its live expert session on ${module?.liveDate||formatGmt(item.speakerOpensAt,{time:false})} at ${canopyCurriculumMeta.liveSessionTime}. The Speaker Challenge unlocks after the session at ${formatGmt(item.speakerOpensAt)}. Check Canopy notifications/programme communication for the current join details.`;
  }
  return `All five She Leads live expert sessions are on Thursdays at ${canopyCurriculumMeta.liveSessionTime}:\n${CANOPY_ASSIGNMENT_SCHEDULE.map(sessionLine).join('\n')}\nParticipants are expected to attend at least 4 of the 5 live sessions. The Speaker Challenge unlocks later the same Thursday after each live session.`;
}

function programmeScheduleAnswer(){
  return `${CANOPY_BRAND.programme} · ${CANOPY_BRAND.cohort}. Participant Canopy access opens ${CANOPY_ACCESS_DATE}. The configured module schedule is:\n${CANOPY_ASSIGNMENT_SCHEDULE.map(moduleScheduleLine).join('\n')}`;
}

function participationAnswer(){
  const c=canopyCurriculumMeta.completion;
  return `Once WOMATE activates your course enrolment, work through the lessons and knowledge checks in each module, join the Thursday live sessions, and complete each weekly assignment by its deadline. The current completion requirements are: ${c.liveSessions} ${c.assignments} ${c.finalNote} ${c.graduation} Weekly assignments have three required parts: a paragraph response, a module-specific practical challenge uploaded to Google Drive, and the Speaker Challenge LinkedIn link. Use Save Progress when you are still working; final submission should be completed on time.`;
}

function schedulePhrases(kind){
  return CANOPY_ASSIGNMENT_SCHEDULE.flatMap(item=>{
    const n=moduleNumberText(item.moduleId);
    if(kind==='deadline')return [`module ${n} deadline`,`module ${n} due`,`when is module ${n} due`,`${item.title} deadline`];
    if(kind==='speaker')return [`module ${n} speaker challenge`,`module ${n} linkedin`,`when does module ${n} speaker challenge open`,`${item.title} speaker challenge`];
    if(kind==='schedule')return [`module ${n} schedule`,`when does module ${n} open`,`${item.title} schedule`];
    if(kind==='live')return [`module ${n} live session`,`module ${n} speaker session`,`${item.title} live session`];
    return [];
  });
}

export const CANOPY_HELP_COPY={
  eyebrow:'WOMATE · VERIFIED PARTICIPANT HELP',
  title:'Ask Canopy',
  intro:'Ask about selection, enrolment, your course, assignments, schedule or account. Answers come from verified WOMATE programme rules and the current Canopy configuration.',
  welcome:'Hi, I’m Canopy Help. What do you need help with?',
  placeholder:'Type a Canopy question…',
  localNote:'Answers are matched locally. No external AI service is used.',
  unknown:'I couldn’t find a verified Canopy answer for that. Please contact WOMATE Support or use the support option in Canopy.',
    supportButton:'Open Help & complaints'
};

export const CANOPY_HELP_QUICK_TOPICS=[
  {label:'Selection & enrolment',question:'Have I been selected and enrolled?'},
  {label:'Sign in',question:'I am having trouble signing in with email and password'},
  {label:'Selection graphic',question:'Why can’t I generate my selection graphic?'},
  {label:'Assignments',question:'How do weekly assignments work?'},
  {label:'Live sessions',question:'When are the live sessions?'},
  {label:'Speaker Challenge',question:'Why is the Speaker Challenge locked?'},
  {label:'Practical task',question:'What is the practical task for each module?'},
  {label:'Next cohort',question:'I was not selected this year. How do I register interest for next year?'},
  {label:'Certificates',question:'How do certificates work?'},
  {label:'Profile',question:'How do I change my name?'},
  {label:'Technical help',question:'Canopy is not working properly in my browser'}
];

export const CANOPY_HELP_TOPICS=[
  {
    id:'selection',title:'Selection status',
    phrases:['have i been selected','am i selected','was i selected','how do i know if i was selected','how do i know if i have been selected','selection email','selection code','did i get selected','i can log in does that mean i was selected'],
    keywords:['selected','selection','code','email','official','chosen'],
    answer:'Your selection is confirmed by an official WOMATE selection email containing your selection code and instructions to complete the required programme steps. If you received that email, you have been selected. If you did not receive an official selection email, do not treat a Canopy login or account as proof of selection; people who were not selected are not required to log in to Canopy. She Leads Cohort 2 is a programme for young African women. Male applicants are not eligible to participate in this cohort.',
    route:'/selected',actionLabel:'Verify selection code'
  },
  {
    id:'selection-graphic',title:'Selection graphic and selection code',
    phrases:['cannot generate my selection graphic','cant generate my selection graphic','can’t generate my selection graphic','selection graphic not working','selection card not working','cannot create selected graphic','cannot create selection card','selection code expired','selection code has expired','expired selection code','my selection code is not working','selection code not accepted'],
    keywords:['selection graphic','selection card','selected graphic','selection code','expired','generate','verify'],
    answer:'If you were selected but cannot generate your WOMATE selection graphic because the selection code from your selection message is no longer being accepted, the code may have expired. Reach out to the programme admins in the official WhatsApp group and request a new selection code, then return to the selection page and try again.',
    route:'/selected',actionLabel:'Open selection graphic'
  },
  {
    id:'next-cohort-interest',title:'Register interest for the next cohort',
    phrases:['i was not selected this year','not selected this year','i was not selected','not selected for this cohort','register for next year','register interest for next year','next year cohort','next cohort','2027 interest','expression of interest 2027','can i apply next year'],
    keywords:['not selected','next year','next cohort','2027','interest','apply'],
    answer:'If you were not selected for this year’s She Leads cohort, you do not need to log in to Canopy. You can register your interest for the next She Leads cohort through WOMATE’s 2027 Expression of Interest section.',
    route:'/she-leads#she-leads-2027-interest',actionLabel:'Register 2027 interest'
  },
  {
    id:'enrolment',title:'Canopy enrolment and activation',
    phrases:['am i enrolled','have i been enrolled','when will i be enrolled','why am i not enrolled','awaiting cohort enrolment','awaiting enrollment','course access not active','not active','i logged in but cannot access the course','does login mean enrolled','i can login am i enrolled','how long until enrollment'],
    keywords:['enrolled','enrolment','enrollment','active','activation','waiting','awaiting','course access','login'],
    answer:'Signing in to Canopy does not mean you are enrolled in the She Leads course. A selected participant may be able to create or access a Canopy account while course access still shows “Not active” or “Awaiting cohort enrolment”. WOMATE must verify that the required selection/onboarding steps have been completed before activating the course enrolment. If you have the official selection email and have completed the required steps, please allow WOMATE time to verify and enrol you. Do not create another account just because activation is still pending.',
    route:'/canopy/classroom',actionLabel:'Check course access'
  },
  {
    id:'login',title:'Login and sign-in',
    phrases:['how do i sign in','i cannot login','i cannot sign in','login help','sign in help','confirmation email','resend confirmation','email and password not working','password login not working','use google sign in','continue with google','google sign in'],
    keywords:['login','sign in','signin','account','confirmation','confirmed','email','password','google'],
    answer:'Canopy supports email/password sign-in and Continue with Google. If you are having trouble signing in with your email and password, use “Continue with Google” on the Canopy sign-in page. If your email account has not been confirmed, you can also use “Resend confirmation” and the newest confirmation link. Signing in does not by itself mean your She Leads course enrolment is active.',
    route:'/canopy/login',actionLabel:'Open sign in'
  },
  {
    id:'password',title:'Password reset',
    phrases:['forgot password','reset password','password reset','change my password','reset link expired','cannot reset password'],
    keywords:['password','forgot','reset','recovery','link','expired'],
    answer:'On the Canopy sign-in page, enter your email and choose “Forgot password?”. If an account exists, Canopy sends a reset link. The reset flow requires a new password of at least 8 characters. If the recovery session is missing or expired, request a fresh reset link.',
    route:'/canopy/login',actionLabel:'Go to password reset'
  },
  {
    id:'programme-schedule',title:'Programme and module schedule',
    phrases:['programme schedule','program schedule','module schedule','when does the course open','when is the next module',...schedulePhrases('schedule')],
    keywords:['programme','program','schedule','module','opens','open','cohort','date'],
    answer:()=>programmeScheduleAnswer(),
    route:'/canopy/course/she-leads',actionLabel:'View course'
  },
  {
    id:'live-sessions',title:'Live sessions',
    phrases:['live session','live sessions','expert session','speaker session','when is the live session','what time is the live session','what time are the sessions','session time','times for each session','how do i join the live session',...schedulePhrases('live')],
    keywords:['live','session','sessions','expert','speaker','thursday','join','time'],
    answer:({query})=>liveSessionAnswer(query),
    route:'/canopy/notifications',actionLabel:'Check notifications'
  },
  {
    id:'participation-expectations',title:'What participants are expected to do',
    phrases:['what am i expected to do in canopy','what do i need to do in canopy','what are the course requirements','what are the programme requirements','what do participants need to do','how do i complete the course','completion requirements','what should i do each week'],
    keywords:['expected','requirements','complete','completion','lessons','attend','assignments','progress','course'],
    answer:()=>participationAnswer(),
    route:'/canopy/course/she-leads',actionLabel:'Continue the course'
  },
  {
    id:'weekly-assignments',title:'Weekly assignments',
    phrases:['how do weekly assignments work','weekly assignment','assignment requirements','what do i submit','final assignment submission','submit my assignment'],
    keywords:['assignment','weekly','submit','submission','required','parts'],
    answer:'Each open module assignment has three required parts: 01 a paragraph response, 02 a practical creation task uploaded to Google Drive with a shareable link, and 03 the Thursday Speaker Challenge with a public LinkedIn post link. Part 02 changes by module: Module 01 uses CanopyCanvas; Module 02 is an AI-voice picture slideshow story; Module 03 is a one-rule climate-policy visual; Module 04 is a short real-world climate advocacy video; and Module 05 is a Canva climate-leadership vision board. Parts 01 and 02 can be prepared early. Final submission is available only after Part 03 opens and all three parts are ready.',
    route:'/canopy/assignments',actionLabel:'Open assignments'
  },
  {
    id:'save-progress',title:'Save Progress',
    phrases:['save progress','save my work','can i save early','can i save part 1','can i save part 2','does save progress count as an attempt','draft assignment'],
    keywords:['save','progress','draft','attempt','early','persist'],
    answer:'Save Progress stores the work you have entered without making a final assignment submission. You can save the paragraph, your practical-challenge Google Drive link, or the Speaker Challenge link as they become available. Saving progress does not use an assignment attempt. Canopy shows how many of the three required parts are ready.',
    route:'/canopy/assignments',actionLabel:'Open assignments'
  },
  {
    id:'attempts-revisions',title:'Attempts and revisions',
    phrases:['three attempts','3 attempts','revision required','submit revision','resubmit','how many attempts','attempts remaining','can i try again'],
    keywords:['attempt','attempts','revision','revise','resubmit','resubmission','feedback'],
    answer:({query})=>attemptsAnswer(query),
    route:'/canopy/assignments',actionLabel:'Review assignment'
  },
  {
    id:'paragraph',title:'Paragraph requirement',
    phrases:['paragraph requirement','paragraph answer','word count','minimum words','80 words','how long should my paragraph be'],
    keywords:['paragraph','words','word','80','response','answer'],
    answer:'The paragraph response must contain at least 80 words before final submission. The exact prompt changes by module and is shown inside that module’s assignment card.',
    route:'/canopy/assignments',actionLabel:'View paragraph prompt'
  },
  {
    id:'practical-challenges',title:'Module practical challenges',
    phrases:['practical task','practical challenge','module 2 practical','module 3 practical','module 4 practical','module 5 practical','ai voice slideshow','picture story','policy visual','climate rule visual','advocacy video','vision board'],
    keywords:['practical','slideshow','voice','policy','visual','video','vision','board','module'],
    answer:'Part 02 is intentionally different each week. Module 01: CanopyCanvas campaign graphic. Module 02: 30–60 second picture slideshow story with 4–7 visuals and an AI voiceover on a gender-and-climate justice issue. Module 03: one short climate rule presented as a bold public visual, such as a signboard, bus advert, billboard, street banner or skywriting. Module 04: 30–90 second real-world advocacy video using yourself, your surroundings or both, focused on waste or another climate issue you care about. Module 05: Canva climate-leadership vision board with your issue, leadership direction, opportunities and next steps. Upload the finished work to Google Drive and submit the shareable link.',
    route:'/canopy/assignments',actionLabel:'View practical task'
  },
  {
    id:'canopy-canvas',title:'CanopyCanvas requirement',
    phrases:['canopycanvas','canopy canvas','campaign graphic','canvas requirement','create my graphic','where do i make the campaign'],
    keywords:['canopycanvas','canvas','campaign','graphic','design'],
    answer:'CanopyCanvas is the practical creation tool for Module 01 only. Modules 02–05 use different creative practical tasks shown inside each assignment card. After completing any Part 02 task, upload the finished file to your own Google Drive, make it viewable by link, and paste that Drive link into the assignment.',
    route:'/canopy/canvas',actionLabel:'Open CanopyCanvas'
  },
  {
    id:'drive-link',title:'Google Drive practical-task link',
    phrases:['google drive link','canvas link','drive link','how do i submit canvas','upload canvas','docs google link'],
    keywords:['google','drive','link','canvas','upload','viewable','share'],
    answer:'Part 02 accepts a Google Drive or Google Docs URL. Complete the practical task shown for your module, upload the finished file to your own Google Drive, set access so anyone with the link can view it, then paste that link into the assignment field.',
    route:'/canopy/assignments',actionLabel:'Open assignment'
  },
  {
    id:'speaker-challenge',title:'Speaker Challenge and LinkedIn',
    phrases:['speaker challenge','why is speaker challenge locked','when does the speaker challenge open','linkedin link','linkedin speaker task','cannot submit speaker challenge','thursday challenge available','when can i add my linkedin link',...schedulePhrases('speaker')],
    keywords:['speaker','challenge','linkedin','locked','unlock','thursday','part 03','part 3'],
    answer:({query,now})=>speakerAnswer(query,now),
    route:'/canopy/assignments',actionLabel:'Open assignments'
  },
  {
    id:'deadlines',title:'Assignment deadlines',
    phrases:['assignment deadline','when is the assignment due','due date','submission deadline','resubmission deadline',...schedulePhrases('deadline')],
    keywords:['deadline','due','sunday','resubmit','resubmission','module'],
    answer:({query})=>deadlineAnswer(query),
    route:'/canopy/assignments',actionLabel:'View deadlines'
  },
  {
    id:'statuses',title:'Submission and review statuses',
    phrases:['submission status','what does revision required mean','needs manual review','auto reviewed','awaiting automation','reviewed status','assignment reviewed'],
    keywords:['status','submitted','reviewed','review','revision','automation','completed','feedback'],
    answer:'Assignment records can move through review states including awaiting automation, auto reviewed, needs manual review, revision required, and completed. “Revision required” means you should use the feedback and resubmit if an attempt and resubmission window remain. Final scores and feedback appear when they are released for the week or after WOMATE review.',
    route:'/canopy/assignments',actionLabel:'Check assignment status'
  },
  {
    id:'portfolio',title:'My She Leads Portfolio',
    phrases:['portfolio','my portfolio','download portfolio','save portfolio as pdf','climate job portfolio','job application evidence'],
    keywords:['portfolio','pdf','job','career','evidence','practical'],
    answer:'Your My She Leads Portfolio organises your submitted practical work and LinkedIn challenge links into one professional evidence page. Open Portfolio, check that your Google Drive links can be viewed, then use Export / Save as PDF if you want a clean record for climate jobs, internships, fellowships or professional opportunities.',
    route:'/canopy/portfolio',actionLabel:'Open portfolio'
  },
  {
    id:'certificates',title:'Certificates',
    phrases:['certificate','certificates','when do i get my certificate','where is my certificate','certificate link','completion record'],
    keywords:['certificate','completion','issued','drive','eligibility'],
    answer:`Certificates are issued by WOMATE after completion eligibility is confirmed. Current programme completion requirements include: ${canopyCurriculumMeta.completion.liveSessions} ${canopyCurriculumMeta.completion.assignments} ${canopyCurriculumMeta.completion.finalNote} ${canopyCurriculumMeta.completion.graduation} Once issued, your certificate appears in the Certificates area as a Google Drive completion record.`,
    route:'/canopy/certificate',actionLabel:'Open certificates'
  },
  {
    id:'profile-name',title:'Profile and name changes',
    phrases:['change my name','edit my name','update my profile','profile name','wrong name','certificate name'],
    keywords:['profile','name','change','edit','update','certificate'],
    answer:'You can update your participant Full Name from Profile & Settings and Save Settings will persist it across Canopy. Once a certificate has already been issued, self-service name changes are blocked; contact WOMATE Support for a certificate-name correction.',
    route:'/canopy/profile',actionLabel:'Open Profile & Settings'
  },
  {
    id:'account-deletion',title:'Account deletion request',
    phrases:['delete my account','account deletion','remove my account','deletion request','erase my account'],
    keywords:['delete','deletion','account','remove','erase'],
    answer:'Canopy uses a controlled account-deletion request, not an instant browser hard delete. In Profile & Settings, type DELETE and choose “Request account deletion”. The request pauses active course access and signs you out while WOMATE checks programme records before permanent deletion.',
    route:'/canopy/profile',actionLabel:'Open account settings'
  },
  {
    id:'complaints-support',title:'Complaints and WOMATE Support',
    phrases:['contact support','womate support','submit complaint','make a complaint','report a problem','need help from womate','support request'],
    keywords:['support','complaint','womate','problem','issue','report'],
    answer:'Open Help & complaints when a verified Ask Canopy answer does not resolve your issue. Your complaint is recorded in Canopy for authorised WOMATE staff to review, respond to and resolve. You can return to the Help page to see its status and WOMATE response.',
    route:SUPPORT_ROUTE,actionLabel:'Open WOMATE Support'
  },
  {
    id:'technical',title:'Technical and browser issues',
    phrases:['technical help','browser issue','page not loading','canopy not working','button not working','something is broken','error message','blank page'],
    keywords:['technical','browser','loading','load','broken','error','button','page','refresh'],
    answer:'For a browser or loading problem, refresh the page once, confirm your internet connection, then sign out and sign back in if Canopy is still responsive enough to do so. If the issue continues, open Help & complaints and include the page you were on, what you clicked, and the exact error message you saw.',
    route:SUPPORT_ROUTE,actionLabel:'Report technical issue'
  }
];

export const CANOPY_HELP_FALLBACK={
  id:'unknown',
  title:'Verified answer not found',
  answer:CANOPY_HELP_COPY.unknown,
  route:SUPPORT_ROUTE,
  actionLabel:CANOPY_HELP_COPY.supportButton
};
