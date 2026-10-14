import React from 'react';
import {ArrowLeft,BookOpen,CalendarDays,CheckCircle2,CreditCard,FileText,Globe2,GraduationCap,LockKeyhole,Radio,ShieldCheck,Sparkles,UsersRound} from 'lucide-react';
import {canopyPost2026Runtime,CANOPY_POST_2026_RUNTIMES} from './canopyCohortRuntime2027';

const go=path=>{window.history.pushState({},'',path);window.dispatchEvent(new PopStateEvent('popstate'));window.scrollTo({top:0,behavior:'smooth'})};

function StatusCard({icon:Icon,title,status,copy}){
  const pending=status==='configuration_pending';
  return <article className="canopyRuntimeStatusCard">
    <div className="canopyRuntimeStatusIcon"><Icon/></div>
    <div><small>{pending?'CONFIGURATION PENDING':'READY'}</small><h3>{title}</h3><p>{copy}</p></div>
  </article>;
}

function RuntimeHeader({runtime,tester=false}){
  return <section className="canopyRuntimeHero">
    <div>
      <span className="canopyEyebrow">{tester?'CANOPY TESTER · PARTICIPANT VIEW':'MY CANOPY · PARTICIPANT'}</span>
      <h1>{runtime.fullName}</h1>
      <p>{runtime.promise}</p>
      <div className="canopyRuntimeTags">
        <span><Globe2/> {runtime.region}</span>
        <span><GraduationCap/> {runtime.track} track</span>
        <span><UsersRound/> competitive entry</span>
        <span>{runtime.accessModel==='paid'?<CreditCard/>:<ShieldCheck/>} {runtime.accessModel==='paid'?'paid programme':'free programme'}</span>
      </div>
    </div>
    <div className="canopyRuntimeShield">
      <ShieldCheck/>
      <b>Cohort-isolated runtime</b>
      <span>No Cohort 2 learning records are used here.</span>
    </div>
  </section>;
}

function RuntimeOverview({runtime}){
  return <>
    <section className="canopyRuntimeIntro">
      <div><small>WHO THIS IS FOR</small><p>{runtime.audience}</p></div>
      {runtime.paymentGate&&<div className="canopyRuntimeGate"><LockKeyhole/><div><b>Payment access layer reserved</b><span>Admission remains competitive. Payment status will be checked before paid programme access is activated.</span></div></div>}
      {runtime.regionalDelivery&&<div className="canopyRuntimeGate"><Globe2/><div><b>Asia-led delivery</b><span>Regional speakers, coordinators, context and timezone-aware delivery are part of this runtime design.</span></div></div>}
    </section>
    <section className="canopyRuntimeGrid">
      <StatusCard icon={BookOpen} title="Curriculum" status={runtime.modulesStatus} copy="Modules will be loaded from this cohort's own curriculum configuration, not from Cohort 2."/>
      <StatusCard icon={FileText} title="Assignments" status={runtime.assignmentsStatus} copy="Assignments, deadlines, revisions and feedback rules will be cohort-specific."/>
      <StatusCard icon={Radio} title="Live sessions" status={runtime.liveSessionsStatus} copy="Speakers, session times, links and resources will be configured for this cohort."/>
      <StatusCard icon={CheckCircle2} title="Completion & certificate" status={runtime.certificateStatus} copy="Completion and certificate rules will activate only after this cohort's requirements are approved."/>
    </section>
  </>;
}

function RuntimePlaceholder({runtime,section}){
  const labels={
    course:['Course','This cohort curriculum is not published yet. When configured, only this cohort’s modules will appear here.',BookOpen],
    assignments:['Assignments','This cohort has no published assignments yet. Cohort 2 assignments are intentionally not reused.',FileText],
    schedule:['Schedule','Dates, live sessions, speakers and deadlines are still being configured for this cohort.',CalendarDays],
    progress:['Progress','Progress starts at zero inside this cohort runtime and will never inherit Cohort 2 completion records.',Sparkles],
    certificate:['Certificate','Certificate eligibility is not active until this cohort’s completion requirements are approved.',CheckCircle2]
  };
  const [title,copy,Icon]=labels[section]||labels.course;
  return <section className="canopyRuntimePlaceholder"><Icon/><span className="canopyEyebrow">{runtime.shortName.toUpperCase()}</span><h2>{title}</h2><p>{copy}</p></section>;
}

export default function CanopyCohortParticipantRuntime({viewer,cohortKey,path='/canopy/classroom',tester=false}){
  const runtime=canopyPost2026Runtime(cohortKey);
  if(!runtime)return null;
  const view=path.includes('/assignments')?'assignments':path.includes('/progress')?'progress':path.includes('/certificate')?'certificate':path.includes('/course')?'course':path.includes('/schedule')?'schedule':'overview';
  return <main className="canopyDashboard canopyCohortRuntime">
    {tester&&<button type="button" className="canopySecondary canopyRuntimeBack" onClick={()=>go('/canopy/test/cohort-preview')}><ArrowLeft/> Back to cohort previews</button>}
    <RuntimeHeader runtime={runtime} tester={tester}/>
    <nav className="canopyRuntimeNav" aria-label={`${runtime.shortName} participant preview`}>
      {[
        ['overview','Workspace','/canopy/classroom'],
        ['course','Course','/canopy/course/she-leads'],
        ['assignments','Assignments','/canopy/assignments'],
        ['schedule','Schedule','/canopy/schedule'],
        ['progress','Progress','/canopy/progress'],
        ['certificate','Certificate','/canopy/certificate']
      ].map(([key,label,target])=><button type="button" key={key} className={view===key?'active':''} onClick={()=>{
        if(tester)go(`/canopy/test/cohort-workspace?cohort=${encodeURIComponent(runtime.cohortKey)}&view=${key}`);
        else go(target);
      }}>{label}</button>)}
    </nav>
    {view==='overview'?<RuntimeOverview runtime={runtime}/>:<RuntimePlaceholder runtime={runtime} section={view}/>}
  </main>;
}

export function CanopyTesterRuntimeRouter(){
  const params=new URLSearchParams(window.location.search);
  const cohortKey=params.get('cohort');
  const view=params.get('view')||'overview';
  const runtime=canopyPost2026Runtime(cohortKey)||Object.values(CANOPY_POST_2026_RUNTIMES)[0];
  const fakePath={
    overview:'/canopy/classroom',course:'/canopy/course/she-leads',assignments:'/canopy/assignments',
    schedule:'/canopy/schedule',progress:'/canopy/progress',certificate:'/canopy/certificate'
  }[view]||'/canopy/classroom';
  return <CanopyCohortParticipantRuntime cohortKey={runtime.cohortKey} path={fakePath} tester viewer={null}/>;
}
