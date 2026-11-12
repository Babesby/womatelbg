import React,{useEffect,useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,Award,BookOpen,Check,CheckCircle2,ClipboardCheck,ExternalLink,FileText,Globe2,GraduationCap,Leaf,Lock,ShieldCheck,Sparkles} from 'lucide-react';
import {CanopyLessonActivity} from './CanopyExperience';
import {getCanopy2027LessonActivity,getCanopy2027LessonSources} from './canopyCurriculumSources2027';
import {getCanopy2027Curriculum} from './canopyCurricula2027';
import {canopyPost2026Runtime} from './canopyCohortRuntime2027';
import {getCohortWorkspace,completeCohortLesson,submitCohortAssignment} from './canopyLearningApi';
import {primeCanopyFeedbackAudio,playCanopyCorrectSound,playCanopyErrorSound} from './canopyFeedbackAudio';
import './Canopy2027Learning.css';

const go=path=>{const target=String(path||'/canopy/classroom');const current=window.location.pathname+window.location.search+window.location.hash;if(current!==target)window.history.pushState({},'',target);window.dispatchEvent(new CustomEvent('womate:navigate',{detail:{path:target}}));window.scrollTo({top:0,left:0,behavior:'auto'})};
const fmt=value=>{if(!value)return'Scheduled';const d=new Date(value+'T00:00:00Z');return d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})};
const stageLabels=['Understand','Empathise','Influence','Advocate','Lead'];

function Journey({modules,done}){
 return <section className="cx-journey is-compact" aria-label="She Leads progress"><div className="cx-journey-track">{modules.map((m,index)=>{const count=m.lessons.filter(l=>done.has(l.id)).length;const complete=count===m.lessons.length;const active=!complete&&count>0;return <div className={'cx-journey-stop '+(complete?'is-complete':active?'is-active':'')} key={m.id}><div className="cx-journey-node">{complete?<Check size={15}/>:String(index+1).padStart(2,'0')}</div><strong>{stageLabels[index]||('Module '+(index+1))}</strong></div>})}</div></section>;
}

function Waiting({cohort,data}){
 return <main className="canopyDashboard cx-dashboard"><section className="canopyWelcome cx-welcome"><div><span className="canopyEyebrow">MY CANOPY</span><h1>Welcome.</h1><p>Your place in {cohort.name} is confirmed.</p></div><div className="canopyProgressRing" style={{'--p':'0deg'}}><div><strong>0%</strong><span>complete</span></div></div></section><section className="canopyLockedState"><Lock/><div><h2>Awaiting programme opening</h2><p>Learning access opens {fmt(data?.schedule?.programme_open_date)}. Your course will then open week by week with the cohort.</p></div></section></main>;
}

function Home({cohort,modules,data,done,tester}){
 const completed=done.size,total=modules.reduce((n,m)=>n+m.lessons.length,0),pct=total?Math.round(completed/total*100):0;
 const open=new Set(tester?modules.map(m=>m.id):(data.open_modules||[]));
 const current=[...modules].filter(m=>open.has(m.id)).at(-1)||null;
 const next=current?.lessons.find(l=>!done.has(l.id))||current?.lessons[0]||null;
 const submission=current?(data.submissions||[]).filter(s=>s.module_id===current.id).sort((a,b)=>b.attempt-a.attempt)[0]:null;
 return <main className="canopyDashboard cx-dashboard">
  <section className="canopyWelcome cx-welcome"><div><span className="canopyEyebrow">MY CANOPY</span><h1>Welcome back.</h1><p>Continue where you left off.</p></div><div className="canopyProgressRing" style={{'--p':`${pct*3.6}deg`}}><div><strong>{pct}%</strong><span>complete</span></div></div></section>
  {current?<section className="cx-week"><header><span>THIS WEEK</span><strong>Module {current.id}</strong></header><div className="cx-week-list"><div className="cx-week-row"><small>LEARN</small><strong>{next?next.title:'Module complete'}</strong><button className="cx-text-action" onClick={()=>go(next?`/canopy/course/she-leads/${current.id}/${next.id}`:'/canopy/course/she-leads')}>{next?'Continue':'Open course'} <ArrowRight size={14}/></button></div><div className="cx-week-row"><small>ASSIGNMENT</small><strong>{submission?'Submitted':'Open with this module'}</strong><button className="cx-text-action" onClick={()=>go('/canopy/assignments')}>Open <ArrowRight size={14}/></button></div><div className="cx-week-row"><small>LIVE SESSION</small><strong>Module {current.id}</strong><button className="cx-text-action" onClick={()=>go('/canopy/notifications')}>Details <ArrowRight size={14}/></button></div></div></section>:<section className="canopyLockedState"><Lock/><div><h2>Your first module is coming up.</h2><p>Canopy releases learning week by week so everyone moves through the programme together.</p></div></section>}
  <section className="canopyDashStrip"><div className="canopyDashProgress"><small>YOUR PROGRESS</small><strong>{completed} of {total} lessons complete</strong><div className="canopyLine"><span style={{width:`${pct}%`}}/></div></div><div className="canopyDashActions"><button className="canopyPrimary" disabled={!current} onClick={()=>current&&go(next?`/canopy/course/she-leads/${current.id}/${next.id}`:'/canopy/course/she-leads')}>{next?'Continue learning':'Open course'} <ArrowRight size={15}/></button></div></section>
  <Journey modules={modules} done={done}/>
 </main>;
}

function Course({cohort,modules,data,done,tester}){
 const open=new Set(tester?modules.map(m=>m.id):(data.open_modules||[]));
 const releases=data?.schedule?.module_release_dates||{};
 const total=modules.reduce((n,m)=>n+m.lessons.length,0);
 return <main className="canopyCoursePage"><section className="canopyCourseHero"><div><span className="canopyEyebrow">SHE LEADS · {cohort.region.toUpperCase()} · 2027</span><h1>From Climate Knowledge to Climate Leadership</h1><div className="canopyCourseMetaLine"><span>{modules.length} modules</span><span>{total} lessons</span></div></div></section><Journey modules={modules} done={done}/><section className="canopyCurriculum"><div className="canopySectionHead"><span>COURSE</span><h2>Modules</h2></div>{modules.map(m=>{const n=m.lessons.filter(l=>done.has(l.id)).length;const complete=n===m.lessons.length;const locked=!open.has(m.id);return <article key={m.id}><button className="canopyModuleRow" disabled={locked&&!tester} onClick={()=>!locked||tester?go(`/canopy/course/she-leads/${m.id}/${m.lessons[0].id}`):null}><span className="canopyModuleNo" aria-label={complete?`Module ${m.id} completed`:`Module ${m.id}`}>{complete?<Check aria-hidden="true"/>:m.id}</span><div><small>Week {Number(m.id)}</small><h3>{m.title}</h3><span>{n}/{m.lessons.length} complete</span></div><div className="canopyModuleArrow">{locked&&!tester?<><span className="canopyModuleOpenDate">Opens {fmt(releases[m.id])}</span><Lock/></>:<ArrowRight/>}</div></button></article>})}</section></main>;
}

function Lesson({cohort,module,lessonId,data,reload,tester,session}){
 const [saving,setSaving]=useState(false),[saveError,setSaveError]=useState('');
 const done=new Set(data.lessons||[]);
 const open=new Set(tester?[module.id]:(data.open_modules||[]));
 if(!open.has(module.id)&&!tester)return <main className="canopyLockedModule"><Lock/><h1>This module opens with the cohort.</h1><p>Canopy releases learning week by week so everyone moves through the programme together. This module opens {fmt(data?.schedule?.module_release_dates?.[module.id])}.</p><button className="canopySecondary" onClick={()=>go('/canopy/course/she-leads')}>Back to course</button></main>;
 const index=module.lessons.findIndex(l=>l.id===lessonId),lesson=module.lessons[index];
 if(!lesson)return <main className="canopyLockedModule"><BookOpen/><h1>Lesson not found.</h1><button className="canopySecondary" onClick={()=>go('/canopy/course/she-leads')}>Back to course</button></main>;
 const next=module.lessons[index+1],prev=module.lessons[index-1];
 const sources=getCanopy2027LessonSources(cohort.cohortKey,module.id);
 const activity=getCanopy2027LessonActivity(cohort.cohortKey,lesson);
 const complete=async()=>{if(tester||saving||done.has(lesson.id))return;setSaveError('');setSaving(true);try{await completeCohortLesson(cohort.cohortKey,lesson.id,session);await reload();if(next)go(`/canopy/course/she-leads/${module.id}/${next.id}`);else go(`/canopy/course/she-leads/${module.id}/quiz`)}catch(e){setSaveError(e?.message||'Progress could not be saved. Please try again.')}finally{setSaving(false)}};
 return <main className="canopyLesson"><div className="canopyLessonCrumb"><button onClick={()=>go('/canopy/course/she-leads')}><ArrowLeft/> Course</button><span>Module {module.id}</span></div><div className="canopyLessonLayout"><aside><span>{module.id}</span><h2>{module.title}</h2><div>{module.lessons.map((l,i)=><button key={l.id} className={l.id===lesson.id?'active':''} onClick={()=>go(`/canopy/course/she-leads/${module.id}/${l.id}`)}><span>{done.has(l.id)?<Check/>:i+1}</span><b>{l.title}</b></button>)}<button className="quiz" onClick={()=>go(`/canopy/course/she-leads/${module.id}/quiz`)}><ClipboardCheck/><b>Knowledge check</b></button></div></aside><article><header className="canopyLessonHeader"><div><small>WEEK {Number(module.id)}</small><h1>{lesson.title}</h1></div></header><div className="canopyLessonBody">{lesson.body.map((p,i)=><p key={i}>{p}</p>)}<div className="canopyTakeaway"><Leaf/><div><span>KEY TAKEAWAY</span><p>{lesson.keyIdea}</p></div></div><CanopyLessonActivity moduleId={module.id} lessonId={lesson.id} activityOverride={activity}/>{sources.length>0&&<section className="cx-lesson-sources"><header><span>GO DEEPER</span><h3>Read, watch & explore.</h3><p>Curated sources behind this module. Use them to deepen the lesson, compare perspectives and explore current cases.</p></header><div>{sources.map((source,i)=><a key={source.url+i} href={source.url} target="_blank" rel="noopener noreferrer"><small>{source.type}</small><strong>{source.title}</strong><span>{source.author}</span>{source.note&&<p>{source.note}</p>}<ExternalLink size={14}/></a>)}</div></section>}</div><footer><button className="canopySecondary" disabled={!prev} onClick={()=>prev&&go(`/canopy/course/she-leads/${module.id}/${prev.id}`)}><ArrowLeft/> Previous</button><div className="c27-completionAction">{saveError&&<p role="alert" className="canopyFormMsg error">{saveError}</p>}<button className="canopyPrimary" type="button" disabled={tester||saving||done.has(lesson.id)} onClick={complete}>{saving?'Saving…':done.has(lesson.id)?'Completed':tester?'Tester · read only':'Mark complete'} {next?<ArrowRight/>:<Check/>}</button></div></footer></article></div></main>;
}

function Quiz({module}){
 const [answers,setAnswers]=useState({}),[result,setResult]=useState(null);
 const questions=module.lessons.map(l=>l.check);
 const submit=e=>{e.preventDefault();primeCanopyFeedbackAudio();let score=0;questions.forEach((q,i)=>{if(Number(answers[i])===q.answer)score++});setResult({score,total:questions.length});if(score===questions.length)playCanopyCorrectSound();else playCanopyErrorSound()};
 return <main className="canopyQuiz"><button className="canopyBack" onClick={()=>go(`/canopy/course/she-leads/${module.id}/${module.lessons.at(-1).id}`)}><ArrowLeft/> Back to module</button><section><span className="canopyEyebrow">MODULE {module.id} · KNOWLEDGE CHECK</span><h1>{module.title}</h1><p>Check your understanding. You can review the module and try again.</p><form onSubmit={submit}>{questions.map((q,i)=><fieldset key={i}><legend>{i+1}. {q.question}</legend>{q.options.map((o,j)=><label key={o}><input type="radio" name={`q${i}`} value={j} checked={String(answers[i])===String(j)} onChange={e=>setAnswers({...answers,[i]:e.target.value})}/><span>{o}</span></label>)}</fieldset>)}<button className="canopyPrimary" disabled={Object.keys(answers).length!==questions.length}>Check answers</button></form>{result&&<div className="canopyQuizResult"><strong>{result.score}/{result.total}</strong><div><h3>{result.score===result.total?'Strong work.':'Keep building the foundation.'}</h3><p>{result.score===result.total?'You answered every question correctly.':'Review any concepts you missed, then try again when ready.'}</p><button className="canopyTextBtn" onClick={()=>go('/canopy/assignments')}>Go to assignments <ArrowRight/></button></div></div>}</section></main>;
}

function Assignments({cohort,modules,data,reload,tester,session}){
 const [drafts,setDrafts]=useState({}),[busy,setBusy]=useState(''),[message,setMessage]=useState('');
 const open=new Set(tester?modules.map(m=>m.id):(data.open_modules||[])),releases=data?.schedule?.module_release_dates||{};
 const latest=id=>(data.submissions||[]).filter(s=>s.module_id===id).sort((a,b)=>b.attempt-a.attempt)[0];
 const send=async m=>{const response=String(drafts[m.id]||'').trim();if(response.length<120)return;setBusy(m.id);setMessage('');try{await submitCohortAssignment(cohort.cohortKey,m.id,response,'',session);await reload();setMessage('Assignment submitted successfully.')}catch(e){setMessage(e.message)}finally{setBusy('')}};
 return <section className="ca-page"><div className="ca-head"><span className="ca-kicker">ASSIGNMENTS</span><h1>Weekly work.</h1><p>Each assignment opens with its module. Complete the current work carefully and build on WOMATE feedback before the next module opens.</p></div><div className="ca-stack">{modules.map(m=>{const unlocked=open.has(m.id),sub=latest(m.id);if(!unlocked&&!tester)return <article className="ca-card" key={m.id}><div className="ca-card-head"><div><small>MODULE {m.id}</small><h2>{m.assignment.title}</h2></div><div className="ca-dates"><span>Opens {fmt(releases[m.id])}</span><strong>Locked</strong></div></div><p className="ca-locked">This assignment opens with Module {Number(m.id)}.</p></article>;return <article className="ca-card" key={m.id}><div className="ca-card-head"><div><small>MODULE {m.id}</small><h2>{m.assignment.title}</h2></div><div className="ca-dates"><span>Week {Number(m.id)}</span>{sub&&<strong>Attempt {sub.attempt}</strong>}</div></div><div className="ca-threefold"><div><b>01</b><h3>Applied response</h3><p>{m.assignment.prompt}</p></div><div><b>02</b><h3>Use evidence</h3><p>Ground your response in credible information and your own local context.</p></div><div><b>03</b><h3>Reflect & act</h3><p>Show what you learned, who is affected and what responsible action follows.</p></div></div>{sub&&sub.status!=='approved'&&sub.status!=='completed'&&<div className="ca-status"><div><span>Status</span><strong>{String(sub.status||'submitted').replaceAll('_',' ')}</strong></div>{sub.score!=null&&<div><span>Score</span><strong>{sub.score}/100</strong></div>}{sub.feedback&&<div className="ca-feedback"><span>Feedback</span><strong>{sub.feedback}</strong></div>}</div>}{!sub||sub.status==='revision_required'?<div className="ca-form"><label>Paragraph answer<textarea rows="8" value={drafts[m.id]||''} onChange={e=>setDrafts(x=>({...x,[m.id]:e.target.value}))} placeholder="Write your response here…"/></label><div className="ca-assignment-form-actions"><button type="button" disabled={busy===m.id||String(drafts[m.id]||'').trim().length<120} onClick={()=>send(m)}>{busy===m.id?'Submitting…':sub?'Submit revision':'Submit final assignment'}</button></div></div>:(sub?.status==='approved'||sub?.status==='completed')?null:<p className="ca-locked">Submitted. WOMATE will notify you if a revision is required.</p>}</article>})}</div>{message&&<div className="ca-toast" role="status">{message}</div>}</section>;
}

function Progress({modules,data,done}){
 const completed=done.size,total=modules.reduce((n,m)=>n+m.lessons.length,0),pct=total?Math.round(completed/total*100):0;
 const submitted=new Set((data.submissions||[]).map(s=>s.module_id));
 return <main className="canopyProgressPage"><div className="canopyPageHead"><span className="canopyEyebrow">YOUR LEARNING RECORD</span><h1>Progress</h1></div><section className="canopyProgressHero"><div><strong>{pct}%</strong><span>lesson completion</span></div><div><strong>{completed}/{total}</strong><span>lessons</span></div><div><strong>{submitted.size}/{modules.length}</strong><span>assignments submitted</span></div></section><Journey modules={modules} done={done}/><section className="canopyProgressModules">{modules.map(m=>{const n=m.lessons.filter(l=>done.has(l.id)).length,mp=Math.round(n/m.lessons.length*100);return <article key={m.id}><span>{m.id}</span><div><h3>{m.title}</h3><div className="canopyLine"><span style={{width:`${mp}%`}}/></div><small>{n}/{m.lessons.length} lessons · {submitted.has(m.id)?'assignment submitted':'assignment pending'}</small></div><strong>{mp}%</strong></article>})}</section></main>;
}

function Impact({modules,data,done}){
 return <main className="canopyProgressPage"><div className="canopyPageHead"><span className="canopyEyebrow">MY CANOPY</span><h1>Impact profile</h1><p>Your evidence grows as your WOMATE work is reviewed.</p></div><Journey modules={modules} done={done}/><section className="canopyProgressModules">{modules.map(m=>{const n=m.lessons.filter(l=>done.has(l.id)).length;const sub=(data.submissions||[]).filter(s=>s.module_id===m.id).sort((a,b)=>b.attempt-a.attempt)[0];return <article key={m.id}><span>{m.id}</span><div><h3>{m.title}</h3><div className="canopyLine"><span style={{width:`${Math.round(n/m.lessons.length*100)}%`}}/></div><small>{n}/{m.lessons.length} lessons · {sub?.status==='approved'?'reviewed evidence approved':sub?'assignment '+String(sub.status).replaceAll('_',' '):'evidence pending'}</small></div><strong>{sub?.status==='approved'?<CheckCircle2/>:''}</strong></article>})}</section></main>;
}

function LockedArea({title,copy,icon:Icon=Lock}){
 return <main className="canopyCoursePage"><section className="canopyCourseHero"><div><span className="canopyEyebrow">SHE LEADS CLIMATE MENTORSHIP</span><h1>{title}</h1></div></section><section className="canopyLockedState"><Icon/><div><h2>{title}</h2><p>{copy}</p></div></section></main>;
}

function Certificate({data}){
 const cert=data.certificate;
 return <main className="canopyProgressPage"><div className="canopyPageHead"><span className="canopyEyebrow">CREDENTIAL</span><h1>Certificates</h1></div>{cert?.drive_url?<section className="canopyLockedState"><Award/><div><h2>Your verified certificate is ready.</h2><p>WOMATE has issued your cohort certificate.</p><a className="canopyPrimary" href={cert.drive_url} target="_blank" rel="noopener noreferrer">Open certificate <ExternalLink size={15}/></a></div></section>:<section className="canopyLockedState"><GraduationCap/><div><h2>Your certificate will appear here.</h2><p>Complete the programme and continue responding to WOMATE feedback. Certificate decisions are issued after programme review.</p></div></section>}</main>;
}

export default function Canopy2027Learning({viewer,cohortKey,section='overview',path='/canopy/classroom',tester=false}){
 const cohort=getCanopy2027Curriculum(cohortKey),modules=cohort?.modules||[];
 const [data,setData]=useState({lessons:[],submissions:[],attendance:[],open_modules:[],schedule:{}}),[error,setError]=useState('');
 const load=async()=>{if(tester){setData(d=>({...d,programme_open:true,open_modules:modules.map(m=>m.id)}));return}try{setData(await getCohortWorkspace(cohortKey,viewer.session));setError('')}catch(e){setError(e.message)}};
 useEffect(()=>{load()},[cohortKey,viewer?.session?.access_token,tester]);
 const done=useMemo(()=>new Set(data.lessons||[]),[data.lessons]);
 if(!cohort)return null;
 if(error)return <main className="canopyDashboard"><section className="canopyLockedState"><ShieldCheck/><div><h2>Canopy could not load this cohort.</h2><p>{error}</p></div></section></main>;
 if(!tester&&data.programme_open===false)return <Waiting cohort={cohort} data={data}/>;
 const match=path.match(/^\/canopy\/course\/she-leads\/([^/]+)\/([^/]+)$/);
 if(match){
   const module=modules.find(m=>m.id===match[1]);
   if(!module)return <LockedArea title="Module not found." copy="Return to the course and choose an available module." icon={BookOpen}/>;
   return match[2]==='quiz'?<Quiz module={module}/>:<Lesson cohort={cohort} module={module} lessonId={match[2]} data={data} reload={load} tester={tester} session={viewer?.session}/>;
 }
 if(section==='course')return <Course cohort={cohort} modules={modules} data={data} done={done} tester={tester}/>;
 if(section==='assignments')return <Assignments cohort={cohort} modules={modules} data={data} reload={load} tester={tester} session={viewer?.session}/>;
 if(section==='progress')return <Progress modules={modules} data={data} done={done}/>;
 if(section==='portfolio')return <Impact modules={modules} data={data} done={done}/>;
 if(section==='missions')return <LockedArea title="Missions" copy="Your cohort Mission space will open when WOMATE publishes the Mission cycle. You will be notified in Canopy." icon={Globe2}/>;
 if(section==='graduation')return <LockedArea title="Graduation" copy="Continue through the full programme. WOMATE will publish graduation information here when the cohort closes." icon={Sparkles}/>;
 if(section==='certificate')return <Certificate data={data}/>;
 return <Home cohort={cohort} modules={modules} data={data} done={done} tester={tester}/>;
}
