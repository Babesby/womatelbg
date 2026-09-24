import React,{useEffect,useMemo,useState} from 'react';
import {ArrowRight,BriefcaseBusiness,Check,ExternalLink,Printer,Sparkles,Star} from 'lucide-react';
import {modules} from './canopyData';
import {CANOPY_ASSIGNMENT_SCHEDULE,formatCanopyDate,getLiveSessionAt} from './canopySchedule';
import {getFeaturedSpotlights} from './canopyApi';

export const CANOPY_JOURNEY_STAGES=[
  {moduleId:'01',verb:'DISCOVER',label:'Understand',short:'Build the climate foundation.'},
  {moduleId:'02',verb:'STORY',label:'Empathise',short:'See who is affected and why.'},
  {moduleId:'03',verb:'INFLUENCE',label:'Influence',short:'Turn evidence into a policy ask.'},
  {moduleId:'04',verb:'ADVOCATE',label:'Advocate',short:'Move an audience toward action.'},
  {moduleId:'05',verb:'LEAD',label:'Lead',short:'Turn learning into your next move.'}
];

const REFLECTION_PROMPTS={
  '02.1':'Whose experience is easy to miss when we describe this climate issue?',
  '02.2':'What barrier could stop an otherwise good climate solution from benefiting women equally?',
  '02.3':'Where do you see agency, knowledge or leadership that should be recognised rather than “rescued”?',
  '02.4':'What would make participation in this decision genuinely meaningful?',
  '03.1':'Who actually has the authority to change the issue you are thinking about?',
  '03.2':'What evidence would make your policy ask harder to ignore?',
  '03.3':'Where could a young woman realistically enter this decision-making process?',
  '03.4':'Write the one sentence you would want a decision-maker to remember.',
  '04.1':'What single action do you want your audience to take after seeing your message?',
  '04.2':'What evidence would make your advocacy credible rather than just loud?',
  '04.3':'What ethical risk should you avoid when telling this story?',
  '04.4':'Which result would prove your campaign worked beyond views and likes?',
  '05.1':'What kind of climate leader do you want people to experience you as?',
  '05.2':'Which strength do you already have that could become climate leadership evidence?',
  '05.3':'Who should be in your professional climate network six months from now?',
  '05.4':'What is one credible action you can complete in the next 30 days?'
};

const NOTES_KEY='womate_canopy_reflection_notes_v1';

export function getCanopyReflectionNotes(){
  try{return JSON.parse(localStorage.getItem(NOTES_KEY)||'{}')||{}}catch{return {}}
}
function persistCanopyReflectionNotes(notes){
  try{localStorage.setItem(NOTES_KEY,JSON.stringify(notes))}catch{}
}

export function CanopyJourneyMap({progress=[],compact=false}){
  const done=new Set((progress||[]).filter(x=>x.completed).map(x=>x.lesson_id));
  return <section className={`cx-journey ${compact?'is-compact':''}`} aria-label="She Leads learning journey">
    <div className="cx-journey-head"><div><span>YOUR JOURNEY</span><h2>{compact?'Five moves from learning to leadership':'From climate knowledge to climate leadership'}</h2></div>{!compact&&<p>Each module changes the kind of work you do — from understanding the issue to leading your next action.</p>}</div>
    <div className="cx-journey-track">
      {CANOPY_JOURNEY_STAGES.map((stage,index)=>{
        const module=modules.find(m=>m.id===stage.moduleId);
        const count=module?.lessons.filter(l=>done.has(l.id)).length||0;
        const total=module?.lessons.length||1;
        const complete=count===total;
        const active=!complete&&count>0;
        return <div className={`cx-journey-stop ${complete?'is-complete':active?'is-active':''}`} key={stage.moduleId}>
          <div className="cx-journey-node">{complete?<Check size={16}/>:String(index+1).padStart(2,'0')}</div>
          <div><small>{stage.verb}</small><strong>{stage.label}</strong><span>{stage.short}</span></div>
        </div>;
      })}
    </div>
  </section>;
}

function useCountdown(target){
  const[now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const t=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(t)},[]);
  const targetTime=target?new Date(target).getTime():now;
  const distance=Math.max(0,targetTime-now);
  return {
    ended:distance<=0,
    days:Math.floor(distance/86400000),
    hours:Math.floor((distance%86400000)/3600000),
    minutes:Math.floor((distance%3600000)/60000),
    seconds:Math.floor((distance%60000)/1000)
  };
}

export function CanopyLiveCountdown({item}){
  const liveAt=getLiveSessionAt(item);
  const countdown=useCountdown(liveAt);
  if(!item)return null;
  const speakerAt=new Date(item.speakerOpensAt);
  const now=new Date();
  const liveEnded=now>=speakerAt;
  return <section className={`cx-live ${liveEnded?'is-complete':countdown.ended?'is-live':''}`}>
    <div className="cx-live-pulse" aria-hidden="true"><span/></div>
    <div className="cx-live-copy"><small>{liveEnded?'SESSION COMPLETE':countdown.ended?'LIVE SESSION · NOW':'NEXT LIVE SESSION'}</small><h3>Module {item.moduleId} · {item.title}</h3><p>Thursday · 4:00 PM GMT{liveEnded?' · Speaker Challenge is now available.':''}</p></div>
    {!liveEnded&&!countdown.ended&&<div className="cx-countdown" aria-label={`${countdown.days} days ${countdown.hours} hours ${countdown.minutes} minutes until live session`}>
      {[['DAYS',countdown.days],['HRS',countdown.hours],['MIN',countdown.minutes],['SEC',countdown.seconds]].map(([label,value])=><div key={label}><strong>{String(value).padStart(2,'0')}</strong><span>{label}</span></div>)}
    </div>}
    <button type="button" className="cx-link" onClick={()=>{window.history.pushState({},'','/canopy/notifications');window.dispatchEvent(new PopStateEvent('popstate'))}}>Session details <ArrowRight size={14}/></button>
  </section>;
}

function currentAssignment(now=new Date()){
  const started=CANOPY_ASSIGNMENT_SCHEDULE.filter(x=>now>=new Date(x.weekStartsAt));
  const current=started.find(x=>now<=new Date(x.dueAt));
  if(current)return current;
  return CANOPY_ASSIGNMENT_SCHEDULE.find(x=>now<new Date(x.weekStartsAt))||started.at(-1)||null;
}

export function CanopyThisWeek({progress=[],submissions=[],next}){
  const item=currentAssignment();
  if(!item)return null;
  const submission=(submissions||[]).filter(s=>s.week_key===item.weekKey).sort((a,b)=>new Date(b.submitted_at)-new Date(a.submitted_at))[0];
  const now=new Date();
  const speakerOpen=now>=new Date(item.speakerOpensAt);
  const duePassed=now>new Date(item.dueAt);
  return <section className="cx-week">
    <header><div><span>THIS WEEK</span><h2>Know exactly what matters now.</h2></div><small>Module {item.moduleId}</small></header>
    <div className="cx-week-grid">
      <article className="cx-week-primary"><small>CONTINUE</small><h3>{next?next.l.title:item.title}</h3><p>{next?`Continue ${next.m.title}.`:'Your current learning is caught up.'}</p><button className="canopyPrimary" onClick={()=>{const path=next?`/canopy/course/she-leads/${next.m.id}/${next.l.id}`:'/canopy/course/she-leads';window.history.pushState({},'',path);window.dispatchEvent(new PopStateEvent('popstate'));window.scrollTo({top:0,behavior:'smooth'})}}>{next?'Continue where I left off':'Open course'} <ArrowRight size={15}/></button></article>
      <article><small>WEEKLY WORK</small><h3>{submission?'Submitted':duePassed?'Week closed':'Assignment in progress'}</h3><p>{submission?`Latest status: ${(submission.assessment_status||submission.status||'submitted').replaceAll('_',' ')}.`:`Due ${formatCanopyDate(item.dueAt)}.`}</p><button className="cx-text-action" onClick={()=>{window.history.pushState({},'','/canopy/assignments');window.dispatchEvent(new PopStateEvent('popstate'))}}>Open assignment <ArrowRight size={14}/></button></article>
      <article><small>SPEAKER CHALLENGE</small><h3>{speakerOpen?'Open now':'Unlocks Thursday'}</h3><p>{speakerOpen?'Add your LinkedIn challenge when ready.':'It unlocks after the live expert session at 6:00 PM GMT.'}</p><button className="cx-text-action" onClick={()=>{window.history.pushState({},'','/canopy/assignments');window.dispatchEvent(new PopStateEvent('popstate'))}}>View challenge <ArrowRight size={14}/></button></article>
    </div>
    <CanopyLiveCountdown item={item}/>
  </section>;
}

export function CanopyReflectionPrompt({moduleId,lessonId}){
  if(!['02','03','04','05'].includes(String(moduleId)))return null;
  const prompt=REFLECTION_PROMPTS[lessonId];
  if(!prompt)return null;
  const[notes,setNotes]=useState(()=>getCanopyReflectionNotes());
  const[value,setValue]=useState(()=>notes[lessonId]?.text||'');
  const[saved,setSaved]=useState(Boolean(notes[lessonId]?.text));
  function save(){
    const next={...notes,[lessonId]:{lessonId,moduleId,text:value.trim(),savedAt:new Date().toISOString()}};
    setNotes(next);persistCanopyReflectionNotes(next);setSaved(true);
  }
  return <aside className="cx-reflect">
    <div className="cx-reflect-icon"><Sparkles size={17}/></div>
    <div className="cx-reflect-main"><small>PAUSE & APPLY · PRIVATE NOTE</small><h3>{prompt}</h3><p>Not graded. Keep one thought for yourself and watch your thinking evolve across the programme.</p><textarea rows="3" value={value} onChange={e=>{setValue(e.target.value);setSaved(false)}} placeholder="Write one honest thought…" maxLength={360}/><div><button type="button" onClick={save} disabled={!value.trim()}>{saved?'Saved on this device':'Save reflection'}</button><span>{value.length}/360</span></div></div>
  </aside>;
}

export function CanopyReflectionTimeline(){
  const[notes]=useState(()=>getCanopyReflectionNotes());
  const rows=Object.values(notes).filter(x=>x?.text).sort((a,b)=>String(a.lessonId).localeCompare(String(b.lessonId)));
  if(!rows.length)return null;
  return <section className="cx-reflection-timeline"><header><div><span>YOUR THINKING</span><h2>What changed along the way</h2></div><p>Private reflections saved on this device.</p></header><div>{rows.map(note=><article key={note.lessonId}><span>{note.lessonId}</span><div><small>MODULE {note.moduleId}</small><p>{note.text}</p></div></article>)}</div></section>;
}

export function CanopyModuleComplete({module,onClose}){
  const stage=CANOPY_JOURNEY_STAGES.find(x=>x.moduleId===module.id);
  return <div className="cx-complete-backdrop" role="dialog" aria-modal="true" aria-label={`Module ${module.id} completed`}>
    <section className="cx-complete"><div className="cx-complete-mark"><Check/></div><small>MODULE {module.id} COMPLETE</small><h2>{stage?.verb||'KEEP GOING'}.</h2><p>You completed the learning in <b>{module.title}</b>. Next, turn the ideas into the weekly practical work and speaker challenge.</p><div><button className="canopyPrimary" onClick={()=>{onClose?.();window.history.pushState({},'','/canopy/assignments');window.dispatchEvent(new PopStateEvent('popstate'))}}>Go to assignment <ArrowRight size={15}/></button><button className="canopySecondary" onClick={onClose}>Stay here</button></div></section>
  </div>;
}

export function CanopySpotlight({session}){
  const[items,setItems]=useState([]);
  useEffect(()=>{let live=true;getFeaturedSpotlights(session).then(x=>{if(live)setItems(x||[])}).catch(()=>{});return()=>{live=false}},[session?.access_token]);
  if(!items.length)return null;
  return <section className="cx-spotlight"><header><div><span>CANOPY SPOTLIGHT</span><h2>Work worth seeing.</h2></div><p>Selected by the WOMATE learning team for insight, application or leadership — not popularity.</p></header><div className="cx-spotlight-row">{items.slice(0,5).map(item=><article key={item.id}><div className="cx-spotlight-star"><Star size={16}/></div><small>MODULE {String(item.module_id||'').replace('module-','')}</small><h3>{item.learner_name||'She Leads fellow'}</h3><p>{item.note||'Featured learner work selected by WOMATE.'}</p>{item.artifact_url&&<a href={item.artifact_url} target="_blank" rel="noreferrer">View featured work <ExternalLink size={13}/></a>}</article>)}</div></section>;
}

function latestByWeek(submissions=[]){
  const map={};
  [...submissions].sort((a,b)=>new Date(a.submitted_at)-new Date(b.submitted_at)).forEach(s=>{map[s.week_key]=s});
  return map;
}

export function CanopyPortfolioPage({viewer,submissions=[]}){
  const latest=useMemo(()=>latestByWeek(submissions),[submissions]);
  const profile=viewer?.profile||{};
  const name=profile.full_name||viewer?.user?.user_metadata?.full_name||'She Leads Fellow';
  const country=profile.country||viewer?.user?.user_metadata?.country||'';
  const submitted=CANOPY_ASSIGNMENT_SCHEDULE.filter(item=>latest[item.weekKey]);
  function print(){window.print()}
  return <main className="cx-portfolio">
    <header className="cx-portfolio-hero"><div><span>MY SHE LEADS PORTFOLIO</span><h1>{name}</h1><p>{country?`${country} · `:''}She Leads Climate Mentorship · Cohort 2 · 2026</p></div><button className="canopyPrimary cx-print" onClick={print}><Printer size={16}/> Export / Save as PDF</button></header>
    <section className="cx-portfolio-intro"><BriefcaseBusiness/><div><h2>Evidence of learning, communication and climate leadership.</h2><p>This page organises your submitted practical work into a clean professional record. Keep your Google Drive links viewable before sharing the PDF with an employer, fellowship, internship or climate network.</p></div></section>
    <section className="cx-portfolio-grid">
      {CANOPY_ASSIGNMENT_SCHEDULE.map(item=>{const sub=latest[item.weekKey];const module=modules.find(m=>m.id===item.moduleId);const practical=module?.assignment||{};return <article className={sub?'is-ready':'is-pending'} key={item.weekKey}><div className="cx-portfolio-no">{item.moduleId}</div><div><small>{practical?.portfolioLabel||'PRACTICAL WORK'}</small><h2>{practical?.practicalTitle||module?.title}</h2><p>{practical?.portfolioSummary||practical?.practicalBrief||module?.summary}</p>{sub?<div className="cx-portfolio-links">{sub.canvas_link&&<a href={sub.canvas_link} target="_blank" rel="noreferrer">Open practical work <ExternalLink size={13}/></a>}{sub.linkedin_link&&<a href={sub.linkedin_link} target="_blank" rel="noreferrer">Open LinkedIn challenge <ExternalLink size={13}/></a>}</div>:<span className="cx-portfolio-pending">Not submitted yet</span>}</div></article>})}
    </section>
    {!submitted.length&&<p className="cx-portfolio-empty">Your portfolio will build automatically as you submit the weekly practical work.</p>}
    <footer className="cx-portfolio-footer"><span>WOMATE · SHE LEADS CLIMATE MENTORSHIP</span><span>Portfolio links point to participant-owned Google Drive / LinkedIn work.</span></footer>
  </main>;
}
