import {CANOPY_ACCESS_DATE,CANOPY_ASSIGNMENT_SCHEDULE} from './canopySchedule';
import {CANOPY_BRAND,modules} from './canopyData';

const SUPPORT_ANCHOR='#canopy-help-support';

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
  return `Module ${item.moduleId} — ${item.title}: opens ${formatGmt(item.weekStartsAt,{time:false})}; live session ${liveDate}; assignment due ${formatGmt(item.dueAt)}.`;
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
  return `For Module ${item.moduleId} — ${item.title}, the Speaker Challenge ${state}. It unlocks ${formatGmt(item.speakerOpensAt)} after the Thursday live expert session. Before it opens, you can complete and Save Progress on your paragraph and CanopyCanvas link. Final submission stays unavailable until Part 03 is open and all three required parts are ready. When it opens, submit the public LinkedIn post link for the speaker task.`;
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
    return `Module ${item.moduleId} — ${item.title} has its live expert session on ${module?.liveDate||formatGmt(item.speakerOpensAt,{time:false})}. The current source does not publish a separate live-session join time or join link in Canopy Help. The Speaker Challenge unlocks afterward at ${formatGmt(item.speakerOpensAt)}.`;
  }
  return `She Leads uses a Thursday live expert session for each module. Current dates are:\n${CANOPY_ASSIGNMENT_SCHEDULE.map(item=>{const module=moduleForSchedule(item);return `Module ${item.moduleId}: ${module?.liveDate||formatGmt(item.speakerOpensAt,{time:false})}`}).join('\n')}\nThe source does not expose a separate join link or live-session start time here. Speaker Challenge unlock times are configured independently at 18:00 GMT after each session.`;
}

function programmeScheduleAnswer(){
  return `${CANOPY_BRAND.programme} · ${CANOPY_BRAND.cohort}. Participant Canopy access opens ${CANOPY_ACCESS_DATE}. The configured module schedule is:\n${CANOPY_ASSIGNMENT_SCHEDULE.map(moduleScheduleLine).join('\n')}`;
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
  intro:'Ask about your course, assignments, schedule or account. Answers come from the current WOMATE Canopy rules and configuration.',
  welcome:'Hi, I’m Canopy Help. What do you need help with?',
  placeholder:'Type a Canopy question…',
  localNote:'Answers are matched locally. No external AI service is used.',
  unknown:'I couldn’t find a verified Canopy answer for that. Please contact WOMATE Support or use the support option in Canopy.',
  supportTitle:'WOMATE Support',
  supportIntro:'If the verified help answers do not resolve your issue, send WOMATE a support request. This is the only part of this page that writes to Canopy.',
  supportButton:'Contact WOMATE Support'
};

export const CANOPY_HELP_QUICK_TOPICS=[
  {label:'Assignments',question:'How do weekly assignments work?'},
  {label:'Live sessions',question:'When are the live sessions?'},
  {label:'Speaker Challenge',question:'Why is the Speaker Challenge locked?'},
  {label:'CanopyCanvas',question:'What do I need to do for CanopyCanvas?'},
  {label:'Certificates',question:'How do certificates work?'},
  {label:'Profile',question:'How do I change my name?'},
  {label:'Technical help',question:'Canopy is not working properly in my browser'}
];

export const CANOPY_HELP_TOPICS=[
  {
    id:'login',title:'Login and sign-in',
    phrases:['how do i sign in','i cannot login','i cannot sign in','login help','sign in help','confirmation email','resend confirmation'],
    keywords:['login','sign in','signin','account','confirmation','confirmed','email','google'],
    answer:'Canopy supports sign-in with email and password, and Continue with Google. If your email account has not been confirmed, use “Resend confirmation” on the sign-in page and use the newest confirmation link. If your password is the problem, use “Forgot password?” instead.',
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
    phrases:['live session','live sessions','expert session','speaker session','when is the live session','how do i join the live session',...schedulePhrases('live')],
    keywords:['live','session','expert','speaker','thursday','join'],
    answer:({query})=>liveSessionAnswer(query),
    route:'/canopy/notifications',actionLabel:'Check notifications'
  },
  {
    id:'weekly-assignments',title:'Weekly assignments',
    phrases:['how do weekly assignments work','weekly assignment','assignment requirements','what do i submit','final assignment submission','submit my assignment'],
    keywords:['assignment','weekly','submit','submission','required','parts'],
    answer:'Each open module assignment has three required parts: 01 a paragraph response, 02 a CanopyCanvas campaign uploaded to your Google Drive with a shareable link, and 03 the Thursday Speaker Challenge with a public LinkedIn post link. Parts 01 and 02 can be prepared early. Final submission is available only after Part 03 opens and all three parts are ready.',
    route:'/canopy/assignments',actionLabel:'Open assignments'
  },
  {
    id:'save-progress',title:'Save Progress',
    phrases:['save progress','save my work','can i save early','can i save part 1','can i save part 2','does save progress count as an attempt','draft assignment'],
    keywords:['save','progress','draft','attempt','early','persist'],
    answer:'Save Progress stores the work you have entered without making a final assignment submission. You can save the paragraph, CanopyCanvas link, or Speaker Challenge link as they become available. Saving progress does not use an assignment attempt. Canopy shows how many of the three required parts are ready.',
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
    id:'canopy-canvas',title:'CanopyCanvas requirement',
    phrases:['canopycanvas','canopy canvas','campaign graphic','canvas requirement','create my graphic','where do i make the campaign'],
    keywords:['canopycanvas','canvas','campaign','graphic','design'],
    answer:'Use CanopyCanvas to create the campaign graphic required for the weekly assignment. After finishing it, download the graphic, upload it to your own Google Drive, make the file viewable by link, and paste that Google Drive link into the assignment.',
    route:'/canopy/canvas',actionLabel:'Open CanopyCanvas'
  },
  {
    id:'drive-link',title:'Google Drive CanopyCanvas link',
    phrases:['google drive link','canvas link','drive link','how do i submit canvas','upload canvas','docs google link'],
    keywords:['google','drive','link','canvas','upload','viewable','share'],
    answer:'The CanopyCanvas evidence field accepts a Google Drive or Google Docs URL. Download your finished CanopyCanvas graphic, upload it to your own Google Drive, make the file viewable by link, then paste that link into the assignment field.',
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
    id:'certificates',title:'Certificates',
    phrases:['certificate','certificates','when do i get my certificate','where is my certificate','certificate link','completion record'],
    keywords:['certificate','completion','issued','drive','eligibility'],
    answer:'Certificates are issued by WOMATE after completion eligibility is confirmed, including attendance and required assignments. Once issued, your certificate appears in the Certificates area as a Google Drive completion record. If no certificate has been issued yet, the page will say so.',
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
    answer:'Use WOMATE Support on this Help page when the verified answers do not resolve your issue. A support request is recorded in Canopy for authorised WOMATE staff to review and respond to. You can return here to see the request status and any WOMATE response.',
    route:SUPPORT_ANCHOR,actionLabel:'Open WOMATE Support'
  },
  {
    id:'technical',title:'Technical and browser issues',
    phrases:['technical help','browser issue','page not loading','canopy not working','button not working','something is broken','error message','blank page'],
    keywords:['technical','browser','loading','load','broken','error','button','page','refresh'],
    answer:'For a browser or loading problem, refresh the page once, confirm your internet connection, then sign out and sign back in if Canopy is still responsive enough to do so. If the issue continues, use WOMATE Support below and include the page you were on, what you clicked, and the exact error message you saw.',
    route:SUPPORT_ANCHOR,actionLabel:'Report technical issue'
  }
];

export const CANOPY_HELP_FALLBACK={
  id:'unknown',
  title:'Verified answer not found',
  answer:CANOPY_HELP_COPY.unknown,
  route:SUPPORT_ANCHOR,
  actionLabel:CANOPY_HELP_COPY.supportButton
};
