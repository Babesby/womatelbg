import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {evaluationVoices} from './evaluationVoices2026.js';
import {ArrowUpRight,ChevronLeft,ChevronRight,ChevronDown,Quote,ShieldCheck,X} from 'lucide-react';
import './voices-impact.css';

// Source: WOMATE She Leads Africa Cohort 2 (2026) programme evaluation.
// One explicitly labelled test row excluded; only "Yes" consent responses used.
// The quotations below are verbatim excerpts; no email addresses or invented outcomes.
export const voicesMetrics={responses:208,rating:'4.72/5',recommend:'98%'};
export const participantVoices=[
 {name:'Mary Phale',country:'Malawi',theme:'Action',quote:'I came in as a passive climate receptor and I\'m going out as an active climate activist.',full:'The program has been engaging and insightful. I came in as a passive climate receptor and I\'m going out as an active climate activist. WOMATE has given me the knowledge and ways to drive positive climate change. I will start in my community and I hope to drive change across my country and Africa'},
 {name:'Leah Mwiba',profileSlug:'leah-mwiba-6037e27abb0f2dbf',avatarPath:'03cc2a39-fa2c-4f80-8fef-08b675538395/avatar.webp',country:'Malawi',theme:'Confidence',quote:'I feel much more confident and ready to take action in climate leadership now.',full:'Thank you so much for this amazing programme! Every session was very helpful, inspiring, and well-organized, and I feel much more confident and ready to take action in climate leadership now. A huge thank you to the entire WOMATE team for this wonderful opportunity and support!'},
 {name:'Jane Chinyavu Toya',profileSlug:'jane-chinyavu-toya-0dd6bf6b51026d4f',avatarPath:'fd5b9959-f439-4ec7-a2be-5d96d6a8e4ec/avatar.webp',country:'Kenya',theme:'Community',quote:'The programme has been insightful and enriching, expanding my understanding of climate action and the importance of collaboration.',full:'The programme has been insightful and enriching, expanding my understanding of climate action and the importance of collaboration. I appreciate the knowledge shared and look forward to applying it in meaningful ways.'},
 {name:'Chisomo Kaunda',profileSlug:'chisomo-kaunda-ea3103d98ff7e4b8',avatarPath:'e9fb9228-a864-4543-afdf-e90211104cab/avatar.webp',country:'Malawi',theme:'Knowledge',quote:'It has strengthened my understanding of climate justice, gender equality, and community led climate action.',full:'It is an insightful and empowering experience. It has strengthened my understanding of climate justice, gender equality, and community led climate action. I appreciate the facilitators and the valuable knowledge shared, which I look forward to applying in my community.'},
 {name:'Christina Milanda',profileSlug:'christina-milanda-32372f0ba7d9e62a',avatarPath:'00c67ca3-1073-4ef7-815b-ff7c0a1f2ca9/avatar.webp',country:'Malawi',theme:'Leadership',quote:'I\'ve gained a lot of knowledge and skills through this program.',full:'The program has been good from the start. Honestly I\'ve gained a lot of knowledge and skills through this program and if someone want to join in next Cohort I would encourage to do so because the person will gain more knowledge on climate change, action,advocacy and moreover the leadership skill as well.'},
 {name:'Jessica Amma Boanuh',profileSlug:'jessica-amma-boanuh-7bd275f63e60c510',avatarPath:'47e3868b-5700-4dc6-aed9-538873740b01/avatar.webp',country:'Ghana',theme:'Community',quote:'I got to meet women from different countries, share ideas with them and build relationships with them.',full:'the WOMATE SHE LEADS MENTORSHIP PROGRAM has been very educative, interactive and very informative. i got to meet women from different countries, share ideas with them and build relationships with them. i also got to learn from professional people in the climate field and for all that, i am very grateful'},
 {name:'Chisomo Banda',profileSlug:'chisomo-banda-b93f08999e9a2892',avatarPath:'ef0ec3ae-d88a-403c-9025-d03f216c199a/avatar.webp',country:'Malawi',theme:'Leadership',quote:'I gained valuable skills and feel motivated to make a positive impact in my community.',full:'The WOMATE program was an inspiring and educational experience that improved my knowledge of climate change, leadership, and advocacy. I gained valuable skills and feel motivated to make a positive impact in my community.'},
 {name:'Rachel Evelyn Wanjiru',country:'Kenya',theme:'Knowledge',quote:'The platform is well organized, it was really fun to learn from it.',full:'Extremely good! The platform is well organized, it was really fun to learn from it. The sessions were also really educative. I enjoyed every bit of the learning process and I\'m really happy to be part of the cohort.'}
];
const themes=['All voices','Confidence','Knowledge','Action','Community','Leadership'];

function Metric({value,label}){return <div className="vix-metric"><strong>{value}</strong><span>{label}</span></div>}
function VoiceCard({voice,featured=false}){return <article className={'vix-card '+(featured?'vix-card-featured':'')}><div className="vix-card-top"><span>{voice.theme} · {voice.country}</span><Quote size={22} aria-hidden="true"/></div><blockquote>“{voice.quote}”</blockquote><div className="vix-card-person">{voice.avatarPath?<a href={'/talent/'+voice.profileSlug} className="vix-profilePhoto" aria-label={'View '+voice.name+' on Talent Discovery'}><img src={'https://bwnwhsvssgponrzvwlpt.supabase.co/storage/v1/object/public/canopy-profile-images/'+voice.avatarPath} alt={voice.name+' profile photograph'} loading="lazy" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.style.display='none';e.currentTarget.parentElement.classList.add('vix-photo-unavailable')}}/><span aria-hidden="true">{voice.name.charAt(0)}</span></a>:<span className="vix-initial" aria-hidden="true">{voice.name.charAt(0)}</span>}<div><strong>{voice.name}</strong><small>She Leads Africa · Cohort 2, 2026</small></div></div></article>}
export function VoicesProofStrip(){return <section className="vix-proof" aria-label="She Leads participant evaluation"><div className="vix-proof-intro"><span className="vix-overline">In their own words</span><strong>Women who learned. Women ready to lead.</strong></div><div className="vix-proof-metrics"><Metric value={voicesMetrics.rating} label="Average quality rating"/><Metric value={voicesMetrics.recommend} label="Would recommend"/><Metric value="208" label="Evaluation responses"/></div><a href="/voices-impact" className="vix-proof-link">Read participant voices <ArrowUpRight size={18}/></a></section>}
export function VoicesShowcase(){
 const [theme,setTheme]=useState('All voices');
 const [index,setIndex]=useState(0);
 const list=theme==='All voices'?participantVoices:participantVoices.filter(v=>v.theme===theme);
 const featured=list[index%list.length];
 const others=list.filter(v=>v!==featured).slice(0,1);
 const choose=v=>{setTheme(v);setIndex(0)};
 const shift=d=>setIndex(i=>(i+d+list.length)%list.length);
 return <section className="vix-showcase" id="participant-voices" aria-labelledby="vix-showcase-title">
 <div className="vix-showcase-head"><div><h2 id="vix-showcase-title">Voices of She Leads.</h2><p>Personal reflections from women who joined the programme.</p></div><div className="vix-showcase-index"><strong>Voices that move climate action forward.</strong></div></div>
 <div className="vix-chips" role="group" aria-label="Filter participant voices">{themes.map(t=><button type="button" key={t} className={theme===t?'active':''} aria-pressed={theme===t} onClick={()=>choose(t)}>{t}</button>)}</div>
 <div className="vix-cards" aria-live="polite"><VoiceCard voice={featured} featured/>{others.length>0&&<div className="vix-stack">{others.map(v=><VoiceCard key={v.name} voice={v}/>)}</div>}</div>
 <div className="vix-showcase-footer"><div className="vix-controls"><button type="button" aria-label="Previous participant voice" onClick={()=>shift(-1)}><ChevronLeft/></button><span>{index%list.length+1} / {list.length}</span><button type="button" aria-label="Next participant voice" onClick={()=>shift(1)}><ChevronRight/></button></div><div className="vix-showcase-links"><a className="vix-pill" href="/she-leads/apply">Applications & status <ArrowUpRight size={16}/></a><a className="vix-textlink" href="/voices-impact">Explore all participant voices <ArrowUpRight size={16}/></a></div></div>
 
 </section>
}
export function VoicesDrawer(){
 const [open,setOpen]=useState(false);
 const closeRef=useRef(null),triggerRef=useRef(null);
 useEffect(()=>{
  if(!open)return;
  const onKey=e=>{if(e.key==='Escape')setOpen(false)};
  const oldOverflow=document.body.style.overflow;
  document.addEventListener('keydown',onKey);
  document.body.style.overflow='hidden';
  closeRef.current?.focus({preventScroll:true});
  return()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow=oldOverflow;triggerRef.current?.focus()};
 },[open]);
 // Portal both the trigger and dialog to document.body so positioned parent
 // sections and their stacking contexts cannot intercept the first click.
 return createPortal(<div className="vix-drawer-shell">
  {!open&&<button ref={triggerRef} className="vix-drawer-tab" type="button" onPointerDown={e=>{if(e.pointerType==='touch'||e.pointerType==='pen'){e.preventDefault();setOpen(true)}}} onClick={()=>setOpen(true)} aria-label="Open participant voices" aria-expanded={false}><Quote size={17}/> <span>Participant voices</span></button>}
  {open&&<div className="vix-drawer-overlay">
   <button className="vix-drawer-scrim" type="button" aria-label="Close participant voices" onClick={()=>setOpen(false)}/>
   <aside className="vix-drawer" id="vix-drawer-panel" role="dialog" aria-modal="true" aria-labelledby="vix-drawer-title">
    <header><span className="vix-overline">She Leads · Participant voices</span><button type="button" ref={closeRef} onClick={()=>setOpen(false)} aria-label="Close participant voices"><X/></button></header>
    <h2 id="vix-drawer-title">Hear it from the women.</h2><p>First-hand reflections from programme participants.</p>
    <div className="vix-drawer-stats"><Metric value={voicesMetrics.rating} label="Average rating"/><Metric value={voicesMetrics.recommend} label="Would recommend"/></div>
    <div className="vix-drawer-quotes">{participantVoices.slice(0,3).map(v=><VoiceCard key={v.name} voice={v}/>)}</div>
    <div className="vix-drawer-actions"><a href="/voices-impact" onClick={()=>setOpen(false)}>Explore participant voices <ArrowUpRight size={16}/></a><a href="/she-leads/apply" onClick={()=>setOpen(false)}>Applications & status <ArrowUpRight size={16}/></a></div>
   </aside>
  </div>}
 </div>,document.body);
}

const countryMap={Ghanaian:'Ghana',Malawian:'Malawi',Kenyan:'Kenya',Ugandan:'Uganda',Zambian:'Zambia',Rwandan:'Rwanda',Nigerian:'Nigeria',Tanzanian:'Tanzania',Zimbabwean:'Zimbabwe',Gambian:'The Gambia',Beninese:'Benin',Moroccan:'Morocco',Somali:'Somalia'};
const avatarByName=new Map(participantVoices.filter(v=>v.avatarPath).map(v=>[v.name.toLowerCase(),v]));
function AnimatedStatistic({value,label,format}){
 const [display,setDisplay]=useState(format==='rating'?'0.00/5':format==='percent'?'0%':'0');
 const [complete,setComplete]=useState(false);
 const ref=useRef(null);
 useEffect(()=>{
  if(!ref.current||typeof window==='undefined')return;
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){setComplete(true);return;}
  let frame=0;const obs=new IntersectionObserver(entries=>{if(!entries.some(x=>x.isIntersecting))return;obs.disconnect();const started=performance.now();const tick=now=>{const progress=Math.min((now-started)/950,1);const eased=1-Math.pow(1-progress,3);setDisplay(format==='rating'?(value*eased).toFixed(2)+'/5':format==='percent'?Math.round(value*eased)+'%':String(Math.round(value*eased)));if(progress<1)frame=requestAnimationFrame(tick);else setComplete(true)};frame=requestAnimationFrame(tick);},{threshold:.25});
  obs.observe(ref.current);return()=>{obs.disconnect();cancelAnimationFrame(frame)};
 },[value,format]);
 return <div ref={ref} className="vix-liveMetric" aria-label={label+': '+(format==='rating'?value.toFixed(2)+'/5':format==='percent'?value+'%':value)}><strong aria-hidden="true">{complete?(format==='rating'?value.toFixed(2)+'/5':format==='percent'?value+'%':String(value)):display}</strong><span>{label}</span></div>
}
function VoiceBubble({voice,i}){
 const linked=voice.avatarPath?voice:avatarByName.get(voice.name.toLowerCase());const [imageBroken,setImageBroken]=useState(false);
 return <article className={'vix-bubble vix-bubble-'+(i%6)}><div className="vix-bubbleTop"><span className="vix-bubbleGlyph" aria-hidden="true">“</span><span className="vix-bubbleCountry">{countryMap[voice.country]||voice.country}</span></div><blockquote>{voice.quote}</blockquote><div className="vix-bubblePerson">{linked&&!imageBroken?<a className="vix-profilePhoto" href={'/talent/'+linked.profileSlug} title={'View '+voice.name+' profile'}><img loading="lazy" alt={voice.name} src={'https://bwnwhsvssgponrzvwlpt.supabase.co/storage/v1/object/public/canopy-profile-images/'+linked.avatarPath} onError={()=>setImageBroken(true)}/></a>:<span className="vix-initial" aria-hidden="true">{voice.name.charAt(0).toUpperCase()}</span>}<div><strong>{voice.name}</strong><span>She Leads Africa participant</span></div></div></article>
}
export function VoicesImpactPage(){
 const [shown,setShown]=useState(18);
 const [country,setCountry]=useState('All countries');
 const countries=['All countries',...new Set(evaluationVoices.map(v=>countryMap[v.country]||v.country))].sort((a,b)=>a==='All countries'?-1:b==='All countries'?1:a.localeCompare(b));
 const filtered=evaluationVoices.filter(v=>country==='All countries'||(countryMap[v.country]||v.country)===country);
 const visible=filtered.slice(0,shown);
 const updateCountry=e=>{setCountry(e.target.value);setShown(18)};
 return <main className="vix-page vix-reimagined" id="content">
  <header className="vix-newHero"><div className="vix-newHero-copy"><h1>Reflections <em>&amp; Experiences.</em></h1><p>Personal reflections from women who joined the She Leads programme.</p><a href="/she-leads" className="vix-hero-link">Discover She Leads <ArrowUpRight size={18}/></a></div><div className="vix-heroMark" aria-hidden="true"><span>“</span></div></header>
  <section className="vix-numbers" aria-label="She Leads Africa Cohort 2 programme evaluation">
   <AnimatedStatistic value={4.72} format="rating" label="Average programme rating"/>
   <AnimatedStatistic value={98} format="percent" label="Would recommend"/>
   <AnimatedStatistic value={208} label="Evaluation responses"/>
  </section>
  <section className="vix-bubbleLibrary" aria-labelledby="vix-library-title">
    <div className="vix-bubbleLibrary-head"><div><h2 id="vix-library-title">In their own words.</h2><p>{filtered.length} participant reflections</p></div><label className="vix-countryFilter"><span>Browse by country</span><select value={country} onChange={updateCountry}>{countries.map(x=><option key={x} value={x}>{x}</option>)}</select></label></div>
    <div className="vix-bubbleGrid">{visible.map((voice,i)=><VoiceBubble key={voice.name+'-'+i} voice={voice} i={i}/>)}</div>
    {shown<filtered.length&&<div className="vix-loadRow"><button type="button" className="vix-more" onClick={()=>setShown(n=>Math.min(n+18,filtered.length))}>Show more voices <ChevronDown size={19}/></button><span>Showing {Math.min(shown,filtered.length)} of {filtered.length}</span></div>}
    <div className="vix-libraryEnd"><p>Curious about the next chapter?</p><a href="/she-leads/apply" className="vix-pill">Explore application dates <ArrowUpRight size={17}/></a></div>
  </section>
 </main>;
}
