import React,{useState,useEffect} from 'react';
import {ArrowUpRight,ChevronDown,UsersRound,ShieldCheck,Leaf,CheckCircle2,ThermometerSun,Scale,Sprout,Handshake,Compass,X} from 'lucide-react';
import './she-leads-asia.css';

const modules=[
 {n:'01',label:'Climate risks',title:'Climate foundations & Asia’s changing risks',summary:'Build a grounded understanding of extreme heat, water insecurity, coastal risk and adaptation.',Icon:ThermometerSun,themes:['Extreme heat','Water insecurity','Coastal adaptation']},
 {n:'02',label:'Justice & leadership',title:'Gender, justice & meaningful leadership',summary:'Explore whose needs and lived experiences shape climate decisions—and whose voices are missing.',Icon:Scale,themes:['Climate justice','Gendered impacts','Inclusive leadership']},
 {n:'03',label:'Resilience & policy',title:'Local resilience, policy & green solutions',summary:'Connect regional evidence to climate-smart agriculture, lower-carbon food systems and coastal livelihoods.',Icon:Sprout,themes:['Climate-smart agriculture','Food systems','Policy pathways']},
 {n:'04',label:'Community exchange',title:'Community practice & Africa–Asia exchange',summary:'Test respectful partnership, stakeholder mapping and a realistic local climate action.',Icon:Handshake,themes:['Stakeholder mapping','Africa–Asia exchange','Community action']},
 {n:'05',label:'Leadership pathways',title:'Leadership pathways & your action plan',summary:'Translate everything you learn into a documented plan that you can carry beyond your final session.',Icon:Compass,themes:['Leadership pathways','Action planning','Next-step roadmap']}
];

function AsiaLearningPillars(){
 const [active,setActive]=useState(null);
 useEffect(()=>{
  if(!active)return;
  const onKey=e=>{if(e.key==='Escape')setActive(null)};
  window.addEventListener('keydown',onKey);
  return()=>window.removeEventListener('keydown',onKey);
 },[active]);
 const current=modules.find(m=>m.n===active);
 return <section className="sia-learning" id="asia-learning">
  <div className="sia-sectionHeading">
   <h2>Start with your community. Lead with a wider perspective.</h2>
   <p>Read the climate realities around you, connect them to the wider region, and build the judgement to act with evidence.</p>
  </div>
  <div className="sia-pillarShell">
   <div className="sia-pillarGrid" aria-label="She Leads Asia learning pillars">
    {modules.map(({n,label,title,Icon})=><button className="sia-pillarCard" type="button" key={n} onClick={()=>setActive(n)} aria-label={`Explore ${title}`}>
     <span className="sia-pillarNo">{n}</span>
     <span className="sia-pillarIcon"><Icon size={29}/></span>
     <strong>{label}</strong>
     <span className="sia-pillarExplore">Explore</span>
    </button>)}
   </div>
  </div>
  {current&&<div className="sia-pillarModal" role="dialog" aria-modal="true" aria-labelledby="sia-pillar-title">
   <button className="sia-pillarBackdrop" type="button" aria-label="Close learning pillar" onClick={()=>setActive(null)}/>
   <div className="sia-pillarDialog">
    <button className="sia-pillarClose" type="button" aria-label="Close" onClick={()=>setActive(null)}><X size={19}/></button>
    <span className="sia-pillarDialogIcon"><current.Icon size={28}/></span>
    <span className="sia-pillarDialogNo">MODULE {current.n}</span>
    <h3 id="sia-pillar-title">{current.title}</h3>
    <p>{current.summary}</p>
    <div className="sia-pillarThemes">{current.themes.map(theme=><span key={theme}>{theme}</span>)}</div>
   </div>
  </div>}
 </section>;
}
export default function SheLeadsAsia(){
 const explore=()=>document.getElementById('asia-learning')?.scrollIntoView({behavior:'smooth'});
 return <><section className="hero hero-she sheHero sia-hero"><div className="heroTop"><div className="heroCopy"><h1>She Leads Asia.</h1><p className="sia-heroLead">A new chapter in climate leadership, shaped by the communities, questions and possibilities of Asia.</p><div className="actions"><a className="pill lime" href="/she-leads/asia/apply">Applications & status <ArrowUpRight size={16}/></a><button type="button" className="pill ghost" onClick={explore}>Explore the programme <ChevronDown size={17}/></button></div></div><div className="sia-heroVisual"><img src="/she-leads-asia-2027-hero.svg" alt="Two Asian women discussing climate leadership"/></div></div></section>
 <main className="shePage sia-page"><div className="sia-tabs" aria-label="She Leads region navigation"><a href="/she-leads">Africa · Cohort 3 <ArrowUpRight size={14}/></a><a href="/she-leads/asia" className="active" aria-current="page">Asia · Cohort 1 <span>Upcoming</span></a></div>
 <section className="sheIntro sia-intro"><div className="sheIntroMark">SHE<br/>LEADS</div><div><h2>Asia is already living the climate future. Leadership begins where you are.</h2></div><p>Bring what you know of your community, its heat, water, food systems, livelihoods and people. She Leads Asia helps you turn that lived reality into sharper climate judgement, stronger leadership and practical action.</p></section>
 <AsiaLearningPillars/>
 <section className="sia-experience"><div><h2>Learn. Apply. Lead.</h2><p>Build a practical climate action plan with peers and experts.</p></div><div className="sia-features"><article><UsersRound/><h3>Learn together</h3><p>Exchange perspectives.</p></article><article><ShieldCheck/><h3>Stay grounded</h3><p>Use evidence and lived experience.</p></article><article><Leaf/><h3>Take action</h3><p>Leave with a practical next step.</p></article></div></section>
 <section className="sia-applyCta" aria-labelledby="sia-applyHeading"><div><span>SHE LEADS ASIA · COHORT 1 · 2027</span><h2 id="sia-applyHeading">Your next chapter starts here.</h2><p>See the application dates, programme details and application status in one place.</p></div><a href="/she-leads/asia/apply">Applications &amp; status <ArrowUpRight size={18}/></a></section>
 </main></>;
}