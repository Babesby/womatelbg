import React,{useEffect,useMemo,useState} from 'react';
import {ArrowRight,CheckCircle2,CreditCard,Globe2,GraduationCap,ShieldCheck,UsersRound} from 'lucide-react';
import {getAdmin2027Portfolio} from './canopyApi';
import {SHE_LEADS_2027_PROGRAMMES} from './canopyProgrammes2027';

const go=path=>{window.history.pushState({},'',path);window.dispatchEvent(new PopStateEvent('popstate'));window.scrollTo({top:0,behavior:'smooth'})};
const modelLabel=value=>value==='paid'?'Paid':'Free';

function CohortCard({cohort,preview=false}){
  const paid=cohort.access_model==='paid'||cohort.accessModel==='paid';
  const name=cohort.display_name||cohort.name;
  const region=cohort.region||'Global';
  const status=cohort.status||'planning';
  const key=cohort.cohort_key||cohort.cohortKey;
  return <article className="canopy2027Card">
    <header><div><small>{region} · 2027</small><h2>{name}</h2></div><span className={`canopy2027Pill ${paid?'isPaid':'isFree'}`}>{modelLabel(paid?'paid':'free')}</span></header>
    <div className="canopy2027Meta">
      <span><ShieldCheck size={15}/> {String(status).replaceAll('_',' ')}</span>
      <span><UsersRound size={15}/> Competitive entry</span>
      {paid&&<span><CreditCard size={15}/> Installments enabled</span>}
    </div>
    {key==='she-leads-advanced-c1-2027'&&<p>Premium track for experienced professionals, with Masters/PhD-level profiles and equivalent senior experience prioritised. It will use distinct advanced assignments, premium speakers and direct feedback.</p>}
    {key==='she-leads-asia-c1-2027'&&<p>Free regional cohort designed for Asia-led delivery: Asian speakers, coordinators and regional examples, with WOMATE coordinating standards, systems and quality.</p>}
    {key==='she-leads-climate-c3-2027'&&<p>Free flagship cohort for undergraduates, recent graduates, early-career participants and emerging women climate leaders.</p>}
    {preview&&<div className="canopy2027PreviewActions"><button className="canopySecondary" type="button" onClick={()=>go(`/canopy/test/cohort-preview?cohort=${encodeURIComponent(key)}`)}>Preview identity <ArrowRight size={15}/></button><button className="canopyPrimary" type="button" onClick={()=>go(`/canopy/test/cohort-workspace?cohort=${encodeURIComponent(key)}`)}>Open participant workspace <ArrowRight size={15}/></button></div>}
  </article>
}

export function CanopyAdmin2027Portfolio({viewer}){
  const[data,setData]=useState([]);const[busy,setBusy]=useState(true);const[msg,setMsg]=useState('');
  useEffect(()=>{let live=true;(async()=>{try{const rows=await getAdmin2027Portfolio(viewer?.session);if(live)setData(Array.isArray(rows)?rows:[])}catch(e){if(live)setMsg(e.message||'Unable to load the 2027 cohort portfolio.')}finally{if(live)setBusy(false)}})();return()=>{live=false}},[viewer?.session?.access_token]);
  return <main className="canopyManager canopy2027Portfolio">
    <div className="canopyPageHead"><span className="canopyEyebrow">WOMATE · 2027 PORTFOLIO</span><h1>Three She Leads programmes. One Canopy.</h1><p>This control view is cohort-aware and does not change Cohort 2 records.</p></div>
    {msg&&<p className="canopyFormMsg error">{msg}</p>}
    {busy?<section className="canopy2027Loading">Loading 2027 portfolio…</section>:<section className="canopy2027Grid">{data.map(c=><CohortCard key={c.cohort_key} cohort={c}/>)}</section>}
    <section className="canopy2027RoutingNote"><CheckCircle2/><div><h2>Routing model</h2><p>Learners do not choose a cohort at sign-in. WOMATE assigns the cohort after selection. Canopy reads the authenticated account's active cohort membership and opens the correct cohort workspace.</p></div></section>
  </main>
}

export function CanopyTester2027Preview(){
  const params=new URLSearchParams(window.location.search);
  const chosen=params.get('cohort');
  const rows=Object.values(SHE_LEADS_2027_PROGRAMMES);
  const active=useMemo(()=>rows.find(x=>x.cohortKey===chosen)||null,[chosen]);
  if(active)return <main className="canopyDashboard canopy2027Tester">
    <section className="canopyWelcome"><div><span className="canopyEyebrow">CANOPY TESTER · COHORT PREVIEW</span><h1>{active.name}</h1><p>Safe identity/routing preview. It does not enrol the tester or change any learner's cohort.</p></div></section>
    <section className="canopy2027PreviewIdentity">
      <article><Globe2/><span><small>REGION</small><strong>{active.region}</strong></span></article>
      <article><GraduationCap/><span><small>TRACK</small><strong>{active.curriculumTrack}</strong></span></article>
      <article><CreditCard/><span><small>ACCESS</small><strong>{modelLabel(active.accessModel)}</strong></span></article>
    </section>
    <CohortCard cohort={active}/>
    <div className="canopy2027PreviewActions"><button className="canopySecondary" type="button" onClick={()=>go('/canopy/test/cohort-preview')}>Back to all 2027 cohorts</button><button className="canopyPrimary" type="button" onClick={()=>go(`/canopy/test/cohort-workspace?cohort=${encodeURIComponent(active.cohortKey)}`)}>Open participant workspace <ArrowRight size={15}/></button></div>
  </main>;
  return <main className="canopyDashboard canopy2027Tester">
    <section className="canopyWelcome"><div><span className="canopyEyebrow">CANOPY TESTER · 2027</span><h1>Preview every 2027 cohort identity.</h1><p>The tester can inspect cohort routing without consuming access, changing memberships or touching Cohort 2.</p></div></section>
    <section className="canopy2027Grid">{rows.map(c=><CohortCard key={c.cohortKey} cohort={c} preview/>)}</section>
  </main>
}
