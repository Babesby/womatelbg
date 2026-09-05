const fs=require('fs');

const APP='src/canopy/CanopyApp.jsx';
const ASSIGN='src/canopy/CanopyAssignmentsV2.jsx';
const API='src/canopy/canopyApi.js';
const CSS='src/canopy/canopy.css';

for(const f of [APP,ASSIGN,API,CSS]){
  if(!fs.existsSync(f)){console.error(`STOP: missing ${f}`);process.exit(1)}
}
let app=fs.readFileSync(APP,'utf8');
let assign=fs.readFileSync(ASSIGN,'utf8');
let api=fs.readFileSync(API,'utf8');
let css=fs.readFileSync(CSS,'utf8');

function replaceOnce(src,re,to,label){
  if(typeof re==='string'){
    if(src.includes(to)) return src;
    if(!src.includes(re)){console.error(`STOP: ${label} not found`);process.exit(1)}
    return src.replace(re,to);
  }
  if(src.match(re)?.[0]?.includes(to)) return src;
  if(!re.test(src)){console.error(`STOP: ${label} not found`);process.exit(1)}
  re.lastIndex=0;
  return src.replace(re,to);
}

// -----------------------------------------------------------------------------
// CanopyApp.jsx
// -----------------------------------------------------------------------------
if(!app.includes("const CANOPY_TESTER_EMAIL='p.viewmultimedia@gmail.com'")){
  const re=/(const route\s*=\s*\(\)\s*=>[^\n]+;\s*)/;
  if(!re.test(app)){console.error('STOP: Canopy route constant not found');process.exit(1)}
  app=app.replace(re,`$1
const CANOPY_TESTER_EMAIL='p.viewmultimedia@gmail.com';
function isCanopyTester(viewer){return String(viewer?.user?.email||'').trim().toLowerCase()===CANOPY_TESTER_EMAIL}
`);
}

// Add tester flag after manager declarations used in navigation/shell/app.
// Safe because the same helper only evaluates authenticated viewer email.
app=app.replace(
  /(\bconst manager=\['manager','admin'\]\.includes\(viewer\?\.profile\?\.role\);)(?!\s*\n\s*const tester=)/g,
  "$1\n const tester=isCanopyTester(viewer);"
);
app=app.replace(
  /(\bconst manager=\['manager','admin'\]\.includes\(viewer\.profile\?\.role\);)(?!\s*\n\s*const tester=)/g,
  "$1\n const tester=isCanopyTester(viewer);"
);

// Isolated tester dashboard.
if(!app.includes('function TesterDashboard(')){
  const marker='\n\nfunction canopyModuleSchedule';
  if(!app.includes(marker)){console.error('STOP: module schedule helper marker not found');process.exit(1)}
  app=app.replace(marker,`

function TesterDashboard({viewer,progress}){
 const done=new Set(progress.filter(x=>x.completed).map(x=>x.lesson_id));
 const completed=done.size,pct=Math.round(completed/totalLessons*100);
 let next=null;
 for(const m of modules){for(const l of m.lessons){if(!done.has(l.id)){next={m,l};break}}if(next)break}
 return <main className="canopyDashboard canopyTesterDashboard">
  <section className="canopyWelcome canopyTesterWelcome"><div><span className="canopyEyebrow">CANOPY TESTER</span><h1>Everything is open for testing.</h1><p>This account bypasses cohort dates only for WOMATE testing. Participant and admin access rules stay unchanged.</p></div><div className="canopyProgressRing" style={{'--p':\`\${pct*3.6}deg\`}}><div><strong>{pct}%</strong><span>complete</span></div></div></section>
  <section className="canopyTesterStatus">
   <article><Lock size={18}/><div><small>MODULE ACCESS</small><strong>All 5 modules open</strong></div></article>
   <article><FileText size={18}/><div><small>ASSIGNMENTS</small><strong>All assignments open</strong></div></article>
   <article><Sparkles size={18}/><div><small>GRADING</small><strong>Immediate automated score</strong></div></article>
  </section>
  <section className="canopyContinue"><div><span>TEST LEARNER JOURNEY</span><h2>{next?next.m.title:'All lessons completed'}</h2><p>{next?next.l.title:'Every learner route remains available for continued testing.'}</p></div><button className="canopyPrimary" onClick={()=>go(next?\`/canopy/course/she-leads/\${next.m.id}/\${next.l.id}\`:'/canopy/course/she-leads')}>{next?'Continue testing':'Open course'} <ArrowRight size={17}/></button></section>
  <section className="canopyDashGrid">
   <article><small>COURSE</small><h3>Full curriculum</h3><p>No module date locks apply to this tester account.</p><button onClick={()=>go('/canopy/course/she-leads')}>Open all modules <ArrowRight size={15}/></button></article>
   <article><small>ASSIGNMENTS</small><h3>Immediate grading sandbox</h3><p>Submit any module assignment and receive its automated test result immediately.</p><button onClick={()=>go('/canopy/assignments')}>Test assignments <ArrowRight size={15}/></button></article>
  </section>
 </main>
}
`+marker);
}

// Course module locks.
app=replaceOnce(app,'function CourseOverview({progress}){','function CourseOverview({progress,tester=false}){','CourseOverview signature');
app=replaceOnce(app,'const locked=!canopyModuleIsOpen(m);','const locked=!tester&&!canopyModuleIsOpen(m);','CourseOverview module lock');

// Lesson locks.
app=replaceOnce(app,'function Lesson({moduleId,lessonId,progress,session,reload}){','function Lesson({moduleId,lessonId,progress,session,reload,tester=false}){','Lesson signature');
app=replaceOnce(
  app,
  ' if(!canopyModuleIsOpen(m))return <main className="canopyLockedModule"><Lock/><h1>This module opens with the cohort.</h1>',
  ' if(!tester&&!canopyModuleIsOpen(m))return <main className="canopyLockedModule"><Lock/><h1>This module opens with the cohort.</h1>',
  'Lesson schedule guard'
);

// Quiz locks.
app=replaceOnce(app,'function Quiz({moduleId,session}){','function Quiz({moduleId,session,tester=false}){','Quiz signature');
app=replaceOnce(
  app,
  ' if(!canopyModuleIsOpen(m))return <main className="canopyLockedModule"><Lock/><h1>This module opens with the cohort.</h1><p>Knowledge checks become available with their scheduled module.</p>',
  ' if(!tester&&!canopyModuleIsOpen(m))return <main className="canopyLockedModule"><Lock/><h1>This module opens with the cohort.</h1><p>Knowledge checks become available with their scheduled module.</p>',
  'Quiz schedule guard'
);

// Profile accurately reports isolated tester status.
if(!app.includes("isCanopyTester(viewer)?'Unrestricted test access'")){
  app=app.replace(
    "<div><small>Role</small><b>{p.role||'learner'}</b></div><div><small>Course access</small><b>{viewer.enrollments?.some(e=>e.status==='active')?'Active':'Awaiting enrolment'}</b></div>",
    "<div><small>Role</small><b>{isCanopyTester(viewer)?'tester':(p.role||'learner')}</b></div><div><small>Course access</small><b>{isCanopyTester(viewer)?'Unrestricted test access':(viewer.enrollments?.some(e=>e.status==='active')?'Active':'Awaiting enrolment')}</b></div>"
  );
}

// App-level tester flag may use reversed role-array order in this source.
if(!app.includes("const manager=['manager','admin'].includes(viewer.profile?.role);\n const tester=isCanopyTester(viewer);")){
  app=app.replace(
    "const manager=['manager','admin'].includes(viewer.profile?.role);",
    "const manager=['manager','admin'].includes(viewer.profile?.role);\n const tester=isCanopyTester(viewer);"
  );
}

// Bypass enrollment only for exact tester email.
app=replaceOnce(
  app,
  " const active=viewer.enrollments?.some(e=>e.status==='active');let content;",
  " const active=tester||viewer.enrollments?.some(e=>e.status==='active');let content;",
  'active enrollment gate'
);

// Tester gets tester dashboard; normal participant keeps normal Dashboard.
app=replaceOnce(
  app,
  " else if(path==='/canopy/classroom')content=<Dashboard viewer={viewer} progress={progress}/>;",
  " else if(path==='/canopy/classroom')content=tester?<TesterDashboard viewer={viewer} progress={progress}/>:<Dashboard viewer={viewer} progress={progress}/>;",
  'classroom route'
);
app=replaceOnce(
  app,
  " else if(path==='/canopy/course/she-leads')content=<CourseOverview progress={progress}/>;",
  " else if(path==='/canopy/course/she-leads')content=<CourseOverview progress={progress} tester={tester}/>;",
  'course route'
);
app=replaceOnce(
  app,
  "content=last==='quiz'?<Quiz moduleId={moduleId} session={viewer.session} reload={load}/>:<Lesson moduleId={moduleId} lessonId={last} progress={progress} session={viewer.session} reload={load}/>",
  "content=last==='quiz'?<Quiz moduleId={moduleId} session={viewer.session} reload={load} tester={tester}/>:<Lesson moduleId={moduleId} lessonId={last} progress={progress} session={viewer.session} reload={load} tester={tester}/>",
  'lesson/quiz route'
);
app=replaceOnce(
  app,
  "}else content=<Dashboard viewer={viewer} progress={progress}/>",
  "}else content=tester?<TesterDashboard viewer={viewer} progress={progress}/>:<Dashboard viewer={viewer} progress={progress}/>",
  'fallback dashboard route'
);

// Tester label in left-nav footer, without changing manager or ordinary learner wording.
if(!app.includes("tester?'CANOPY TEST MODE'")){
  app=app.replace(
    "<div className=\"canopySideBottom\"><small>{manager?'WOMATE OPERATIONS':CANOPY_BRAND.programme}</small><b>{manager?'She Leads Climate Mentorship · Cohort 2 · 2026':CANOPY_BRAND.cohort}</b></div>",
    "<div className=\"canopySideBottom\"><small>{manager?'WOMATE OPERATIONS':tester?'CANOPY TEST MODE':CANOPY_BRAND.programme}</small><b>{manager?'She Leads Climate Mentorship · Cohort 2 · 2026':tester?'All modules · all assignments · unrestricted':CANOPY_BRAND.cohort}</b></div>"
  );
}

// -----------------------------------------------------------------------------
// CanopyAssignmentsV2.jsx
// -----------------------------------------------------------------------------
if(!assign.includes('submitTesterWeeklyAssignment')){
  assign=assign.replace(
    "import {getWeeklyAssignmentSubmissions,submitWeeklyAssignment,getPuzzleProgress,savePuzzleCompletion,refreshLearningAutomation} from './canopyApi';",
    "import {getWeeklyAssignmentSubmissions,submitWeeklyAssignment,submitTesterWeeklyAssignment,getPuzzleProgress,savePuzzleCompletion,refreshLearningAutomation} from './canopyApi';"
  );
}
if(!assign.includes('CANOPY_ASSIGNMENT_SCHEDULE,formatCanopyDate')){
  assign=assign.replace(
    "import {formatCanopyDate,openAssignments,speakerChallengeOpen} from './canopySchedule';",
    "import {CANOPY_ASSIGNMENT_SCHEDULE,formatCanopyDate,openAssignments,speakerChallengeOpen} from './canopySchedule';"
  );
}
assign=replaceOnce(
  assign,
  "  const[now,setNow]=useState(()=>new Date());\n  const available=openAssignments(now);",
  "  const[now,setNow]=useState(()=>new Date());\n  const tester=String(viewer?.user?.email||'').trim().toLowerCase()==='p.viewmultimedia@gmail.com';\n  const available=tester?CANOPY_ASSIGNMENT_SCHEDULE:openAssignments(now);",
  'tester assignment availability'
);
assign=replaceOnce(
  assign,
  "  const scoreVisible=s=>s&&(s.final_score!=null||s.auto_score!=null)&&now>=new Date(s.release_at);",
  "  const scoreVisible=s=>s&&(s.final_score!=null||s.auto_score!=null)&&(tester||now>=new Date(s.release_at));",
  'tester immediate score'
);
assign=replaceOnce(
  assign,
  "    if(!speakerChallengeOpen(item,now)){setMessage('Parts 01 and 02 are open now. The speaker challenge opens after Thursday’s live session.');return}",
  "    if(!tester&&!speakerChallengeOpen(item,now)){setMessage('Parts 01 and 02 are open now. The speaker challenge opens after Thursday’s live session.');return}",
  'tester speaker challenge gate'
);
assign=replaceOnce(
  assign,
  "    try{await submitWeeklyAssignment(viewer.session,item.weekKey,{paragraph_response:paragraph,canvas_link:canvas,linkedin_link:linkedin});",
  "    try{await (tester?submitTesterWeeklyAssignment:submitWeeklyAssignment)(viewer.session,item.weekKey,{paragraph_response:paragraph,canvas_link:canvas,linkedin_link:linkedin});",
  'tester isolated submit RPC'
);
assign=replaceOnce(
  assign,
  "        const mayResubmit=count<3&&now<=new Date(item.resubmitUntil);",
  "        const mayResubmit=tester||(count<3&&now<=new Date(item.resubmitUntil));",
  'tester resubmission gate'
);
assign=replaceOnce(
  assign,
  "        const speakerOpen=speakerChallengeOpen(item,now);",
  "        const speakerOpen=tester||speakerChallengeOpen(item,now);",
  'tester speaker open'
);
assign=replaceOnce(
  assign,
  "{sub&&<small>{Math.max(0,3-count)} resubmission{3-count===1?'':'s'} remaining.</small>}",
  "{sub&&!tester&&<small>{Math.max(0,3-count)} resubmission{3-count===1?'':'s'} remaining.</small>}{sub&&tester&&<small>Tester mode has no date or attempt lock.</small>}",
  'tester attempt notice'
);

// -----------------------------------------------------------------------------
// canopyApi.js
// -----------------------------------------------------------------------------
if(!api.includes('export async function submitTesterWeeklyAssignment')){
  const anchor=`export async function submitWeeklyAssignment(session,weekKey,payload){
  const s=await refreshSession(session||getStoredSession());if(!s?.access_token)throw new Error('Your Canopy session has expired. Sign in again.');
  return rest('rpc/canopy_submit_weekly_assignment',{token:s.access_token,method:'POST',body:{
    p_week_key:weekKey,p_paragraph_response:payload.paragraph_response,p_canvas_link:payload.canvas_link,p_linkedin_link:payload.linkedin_link
  }});
}`;
  if(!api.includes(anchor)){console.error('STOP: submitWeeklyAssignment API not found');process.exit(1)}
  api=api.replace(anchor,anchor+`

export async function submitTesterWeeklyAssignment(session,weekKey,payload){
  const s=await refreshSession(session||getStoredSession());if(!s?.access_token)throw new Error('Your Canopy session has expired. Sign in again.');
  if(String(s.user?.email||'').trim().toLowerCase()!=='p.viewmultimedia@gmail.com')throw new Error('Tester access is restricted to the designated WOMATE tester account.');
  return rest('rpc/canopy_tester_submit_weekly_assignment',{token:s.access_token,method:'POST',body:{
    p_week_key:weekKey,p_paragraph_response:payload.paragraph_response,p_canvas_link:payload.canvas_link,p_linkedin_link:payload.linkedin_link
  }});
}`);
}

// Filter tester profile and tester-owned records from manager operational snapshot.
if(!api.includes('const testerIds=new Set')){
  const old="  return {profiles:profiles||[],enrollments:enrollments||[],progress:progress||[],submissions:submissions||[],actions:actions||[],certificates:certificates||[]};";
  const neu=`  const testerIds=new Set((profiles||[]).filter(p=>p.role==='tester').map(p=>p.user_id));
  return {
    profiles:(profiles||[]).filter(p=>!testerIds.has(p.user_id)),
    enrollments:(enrollments||[]).filter(x=>!testerIds.has(x.user_id)),
    progress:(progress||[]).filter(x=>!testerIds.has(x.user_id)),
    submissions:(submissions||[]).filter(x=>!testerIds.has(x.user_id)),
    actions:(actions||[]).filter(x=>!testerIds.has(x.learner_id)),
    certificates:(certificates||[]).filter(x=>!testerIds.has(x.user_id))
  };`;
  if(!api.includes(old)){console.error('STOP: manager snapshot return not found');process.exit(1)}
  api=api.replace(old,neu);
}

// -----------------------------------------------------------------------------
// CSS
// -----------------------------------------------------------------------------
if(!css.includes('CANOPY TESTER MODE — isolated account only')){
css+=`

/* CANOPY TESTER MODE — isolated account only */
.canopyTesterWelcome{border:1px solid rgba(198,255,82,.45)}
.canopyTesterStatus{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem;margin:1rem 0 1.25rem}
.canopyTesterStatus article{display:flex;align-items:center;gap:.8rem;padding:1rem 1.05rem;border:1px solid rgba(14,77,74,.12);border-radius:18px;background:#fff}
.canopyTesterStatus article>div{display:grid;gap:.2rem}
.canopyTesterStatus small{font-size:.66rem;letter-spacing:.1em;opacity:.58}
.canopyTesterStatus strong{font-size:.92rem}
@media(max-width:760px){.canopyTesterStatus{grid-template-columns:1fr}}
`;
}

fs.writeFileSync(APP,app,'utf8');
fs.writeFileSync(ASSIGN,assign,'utf8');
fs.writeFileSync(API,api,'utf8');
fs.writeFileSync(CSS,css,'utf8');

console.log('PASS exact tester email isolation added');
console.log('PASS separate tester classroom dashboard added');
console.log('PASS all tester modules, lessons and quizzes unlocked');
console.log('PASS all tester assignments and speaker tasks unlocked');
console.log('PASS tester date/attempt locks bypassed');
console.log('PASS tester immediate-grade RPC wired');
console.log('PASS tester excluded from manager operational snapshot');
console.log('PASS ordinary participant/admin routing and schedule code retained');
console.log('NEXT: run CANOPY_TESTER/WOMATE_CANOPY_TESTER_MODE.sql in Supabase');
console.log('NEXT: node .\\CANOPY_TESTER\\audit_tester_mode.cjs; npm run build');
