import React,{useEffect,useMemo,useState} from 'react';
import {ArrowRight,BookOpen,Check,ChevronRight,Clock3,ExternalLink,FileCheck2,GraduationCap,Heart,Play,Sparkles,Star,Volume2} from 'lucide-react';
import './canopyCelebration.css';

export const CANOPY_C2_CELEBRATION_START='2026-10-26T00:00:00Z';
const GRADUATION_DAY='2026-10-29T00:00:00Z';
const VIDEO_ID='VBmMU_iwe6U';
const LESSONS_PER_MODULE=4;
const ASSIGNMENT_KEYS=['module-01','module-02','module-03','module-04','module-05'];
const MODULE_LABELS=['Understand','Empathise','Influence','Advocate','Lead'];
const LOCAL_CHEERS=[
 {countries:['ghana'],cheer:'Ayekoo!',locale:'Ghana'},
 {countries:['kenya','tanzania'],cheer:'Hongera!',locale:'East Africa'},
 {countries:['zimbabwe'],cheer:'Makorokoto!',locale:'Zimbabwe'},
 {countries:['south africa'],cheer:'Halala!',locale:'South Africa'},
 {countries:['malawi','zambia'],cheer:'Mwachita bwino!',locale:'Southern Africa'},
 {countries:['morocco','tunisia','algeria'],cheer:'Mabrouk!',locale:'North Africa'},
 {countries:['senegal','côte d’ivoire','cote d’ivoire','ivory coast'],cheer:'Félicitations!',locale:'West Africa'}
];

function localGreeting(country){
 const key=String(country||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 if(!key)return {cheer:'Congratulations!',locale:''};
 const found=LOCAL_CHEERS.find(item=>item.countries.some(c=>key===c.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()||key.startsWith(c.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()+' ')));
 return found||{cheer:'Congratulations!',locale:''};
}
function countdownParts(now){
 const diff=Math.max(0,Date.parse(GRADUATION_DAY)-now);
 const s=Math.floor(diff/1000);
 return {days:Math.floor(s/86400),hours:Math.floor(s%86400/3600),minutes:Math.floor(s%3600/60),seconds:s%60,ended:diff===0};
}
function CircularMeter({value,total,label,subtext,accent='lime',className=''}) {
 const pct=total?Math.min(100,Math.max(0,value/total*100)):0;
 return <div className={'cce-meter '+className} role="img" aria-label={label+': '+value+' of '+total}>
  <div className={'cce-meter-art cce-'+accent} style={{'--cce-angle':pct*3.6+'deg'}}>
   <div className="cce-meter-core"><strong>{value}<span>/{total}</span></strong><small>{Math.round(pct)}% complete</small></div>
  </div>
  <div className="cce-meter-caption"><b>{label}</b><span>{subtext}</span></div>
 </div>;
}
function NumberCard({icon:Icon,number,total,title,small}) {
 return <article className="cce-stat-card">
  <div className="cce-stat-icon"><Icon size={18}/></div>
  <div><strong>{number}<span> / {total}</span></strong><b>{title}</b><small>{small}</small></div>
 </article>;
}

export default function CanopyCelebration({viewer,progress=[],submissions=[],tester=false,onNavigate}){
 const [now,setNow]=useState(()=>Date.now());
 const [playing,setPlaying]=useState(false);
 const [sampleCountry,setSampleCountry]=useState('');
 const [sampleLessons,setSampleLessons]=useState('actual');
 const [sampleAssignments,setSampleAssignments]=useState('actual');
 const [celebrating,setCelebrating]=useState(false);
 useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer)},[]);
 useEffect(()=>{if(!celebrating)return;const timer=window.setTimeout(()=>setCelebrating(false),2600);return()=>window.clearTimeout(timer)},[celebrating]);
 const validLessons=useMemo(()=>new Set(progress.filter(r=>r.completed&&/^0[1-5]\.[1-4]$/.test(String(r.lesson_id||''))&&r.module_id===String(r.lesson_id).split('.')[0]).map(r=>r.lesson_id)),[progress]);
 const actualLessons=Math.min(20,validLessons.size);
 const actualAssignments=useMemo(()=>new Set(submissions.filter(s=>ASSIGNMENT_KEYS.includes(String(s.week_key||''))&&s.submitted_at).map(s=>s.week_key)).size,[submissions]);
 const totalLessons=tester&&sampleLessons!=='actual'?Number(sampleLessons):actualLessons;
 const totalAssignments=tester&&sampleAssignments!=='actual'?Number(sampleAssignments):actualAssignments;
 const firstName=String(viewer?.profile?.full_name||'').trim().split(/\s+/)[0]||'leader';
 const country=tester&&sampleCountry?sampleCountry:viewer?.profile?.country;
 const greeting=localGreeting(country);
 const until=countdownParts(now);
 const lessonsByModule=ASSIGNMENT_KEYS.map((_,idx)=>{
  if(tester&&sampleLessons!=='actual')return Math.min(4,Math.max(0,totalLessons-idx*4));
  return [...validLessons].filter(id=>id.startsWith('0'+(idx+1)+'.')).length;
 });
 const go=path=>typeof onNavigate==='function'&&onNavigate(path);
 const incomplete=totalLessons<20;
 const initials=String(firstName).slice(0,1).toUpperCase();
 return <main className="canopyDashboard cce-root">
  {tester&&<section className="cce-tester-controls" aria-label="Celebration visual preview controls">
   <div><span className="cce-preview-tag">TESTER ONLY · DESIGN PREVIEW</span><p>Simulate different countries and progress levels. These controls do not change learner records.</p></div>
   <label>Greeting country<select value={sampleCountry} onChange={e=>setSampleCountry(e.target.value)}>
    <option value="">Your profile / English fallback</option><option>Ghana</option><option>Kenya</option><option>Zimbabwe</option><option>South Africa</option><option>Malawi</option><option>Morocco</option><option>Nigeria</option>
   </select></label>
   <label>Lessons<select value={sampleLessons} onChange={e=>setSampleLessons(e.target.value)}><option value="actual">Actual progress</option><option value="4">4 / 20</option><option value="12">12 / 20</option><option value="16">16 / 20</option><option value="20">20 / 20</option></select></label>
   <label>Assignments<select value={sampleAssignments} onChange={e=>setSampleAssignments(e.target.value)}><option value="actual">Actual submissions</option><option value="1">1 / 5</option><option value="3">3 / 5</option><option value="5">5 / 5</option></select></label>
   <button type="button" className="cce-preview-back" onClick={()=>go('/canopy/classroom')}>Back to tester home <ArrowRight size={14}/></button>
  </section>}
  <section className={'cce-hero '+(celebrating?'cce-cheering':'')}>
    <div className="cce-glow cce-glow-one" aria-hidden="true"/><div className="cce-glow cce-glow-two" aria-hidden="true"/>
    <div className="cce-orbit cce-orbit-one" aria-hidden="true"/><div className="cce-orbit cce-orbit-two" aria-hidden="true"/>
    <div className="cce-hero-inner">
      <div className="cce-hero-kicker"><span className="cce-sparkle"><Sparkles size={15}/></span> WOMATE · SHE LEADS CLIMATE · COHORT 2 / 2026</div>
      <div className="cce-hero-heading"><span className="cce-local-cheer">{greeting.cheer}</span><h1>Your next chapter<br/><em>starts here.</em></h1></div>
      <p className="cce-hero-lede">Look how far you've come, {firstName}. Five powerful modules, new perspectives, and a community of women ready to make change. You've earned this moment of celebration.</p>
      <div className="cce-hero-actions">
        <button className="cce-primary" type="button" onClick={()=>setCelebrating(true)}><Star size={17} fill="currentColor"/> Celebrate this moment</button>
        <button className="cce-secondary" type="button" onClick={()=>go('/canopy/progress')}>My learning journey <ArrowRight size={16}/></button>
      </div>
      <p className="cce-cheer-foot"><Heart size={13}/> Progress is worth celebrating. Every next step still matters.</p>
    </div>
    <div className="cce-hero-symbol" aria-hidden="true"><span>W</span><i>★</i></div>
    {celebrating&&<div className="cce-confetti" aria-hidden="true">{Array.from({length:24},(_,i)=><i key={i} style={{'--i':i,'--delay':(i%5)*0.07+'s'}}/>)}</div>}
  </section>
  <section className="cce-overview" aria-label="Your actual learning progress">
   <div className="cce-section-heading"><div><span>01 / YOUR JOURNEY IN NUMBERS</span><h2>A little progress. A lot of possibility.</h2></div><button type="button" onClick={()=>go('/canopy/progress')}>Full progress <ArrowRight size={15}/></button></div>
   <div className="cce-performance">
    <div className="cce-performance-rings">
     <CircularMeter value={totalLessons} total={20} label="Lessons completed" subtext={incomplete?'Keep going. Your 20/20 is within reach.':'Every lesson completed. Beautiful work!'}/>
     <CircularMeter value={totalAssignments} total={5} label="Modules submitted" subtext="At least one recorded assignment submission per module." accent="teal"/>
    </div>
    <div className="cce-performance-list">
     <NumberCard icon={BookOpen} number={totalLessons} total={20} title="Lessons completed" small="Across five climate leadership modules"/>
     <NumberCard icon={FileCheck2} number={totalAssignments} total={5} title="Assignments submitted" small="Submissions recorded, not grading approvals"/>
     <NumberCard icon={GraduationCap} number={5} total={5} title="Modules delivered" small="The entire programme curriculum is now available"/>
    </div>
   </div>
   <div className="cce-module-track" aria-label="Your lesson completion by module">
     {MODULE_LABELS.map((label,i)=><button key={label} type="button" className="cce-module" onClick={()=>go('/canopy/course/she-leads')} title={'Open Module '+(i+1)}>
       <span className="cce-module-top"><span>{String(i+1).padStart(2,'0')}</span><b>{lessonsByModule[i]===LESSONS_PER_MODULE?<Check size={15}/>:lessonsByModule[i]+' / 4'}</b></span>
       <strong>{label}</strong><span className="cce-mini-bar"><i style={{width:(lessonsByModule[i]/4*100)+'%'}}/></span>
     </button>)}
   </div>
   {incomplete?<div className="cce-action-note"><span className="cce-action-icon"><BookOpen size={20}/></span><p><b>Your story is still unfolding.</b> You have {20-totalLessons} lesson{20-totalLessons===1?'':'s'} left. Complete each one, mark it done and reach 20/20 to stay on track.</p><button type="button" onClick={()=>go('/canopy/course/she-leads')}>Finish my lessons <ArrowRight size={16}/></button></div>:<div className="cce-action-note is-complete"><span className="cce-action-icon"><Check size={20}/></span><p><b>20 out of 20. Every lesson.</b> This is a milestone to be proud of. Keep building on what you've learned.</p><button type="button" onClick={()=>go('/canopy/portfolio')}>My impact profile <ArrowRight size={16}/></button></div>}
  </section>
  <section className="cce-countdown" aria-label="Countdown to graduation day">
   <div className="cce-countdown-copy"><span><Clock3 size={16}/> THE NEXT CHAPTER</span><h2>{until.ended?'Graduation day is here.':'The countdown is on.'}</h2><p>{until.ended?'29 October 2026 has arrived. WOMATE will share official graduation and certificate instructions according to the programme process.':'29 October 2026 · The day we celebrate a community of women choosing to lead.'}</p></div>
   <div className="cce-ticker" role="timer" aria-live="off">{[['DAYS',until.days],['HOURS',until.hours],['MINUTES',until.minutes],['SECONDS',until.seconds]].map(([label,value])=><div key={label}><strong>{String(value).padStart(2,'0')}</strong><span>{label}</span></div>)}</div>
  </section>
  <section className="cce-manifesto">
   <div className="cce-manifesto-copy"><span>02 / THIS IS YOUR MOMENT</span><h2>Who runs the world?<br/><em>Women who lead.</em></h2>
   <p>Not because the world is easy to change, but because women like you are willing to begin. To ask harder questions. To listen to communities. To speak up, build together and turn ideas into action.</p>
   <p>Running the world means shaping the future of our farms, cities, classrooms, businesses and institutions. It means making space for the next woman, too. <strong>Take up space. Trust your voice. Lead climate action unapologetically.</strong></p>
   <div className="cce-manifesto-sign"><span>With pride and belief in you,</span><b>WOMATE <Heart size={13} fill="currentColor"/></b></div>
   </div>
   <div className="cce-video-shell">
      <div className="cce-video-label"><span className="cce-video-dot"/> YOUR CELEBRATION SOUNDTRACK <Volume2 size={15}/></div>
      <div className="cce-video-frame">
      {playing?<iframe src={'https://www.youtube-nocookie.com/embed/'+VIDEO_ID+'?autoplay=1&rel=0'} title="Beyoncé — Run the World (Girls), official music video" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen loading="lazy"/>:<button type="button" className="cce-video-cover" onClick={()=>setPlaying(true)} aria-label="Play Beyoncé Run the World official video"><img src={'https://i.ytimg.com/vi/'+VIDEO_ID+'/hqdefault.jpg'} alt="Beyoncé — Run the World (Girls) official video thumbnail" loading="lazy"/><span className="cce-play"><Play size={23} fill="currentColor"/></span><span className="cce-play-caption">PRESS PLAY. CELEBRATE YOU.</span></button>}
      </div>
      <div className="cce-video-footer"><span>Beyoncé · Run the World (Girls) <small>Official music video</small></span><a href={'https://www.youtube.com/watch?v='+VIDEO_ID} target="_blank" rel="noopener noreferrer">Watch on YouTube <ExternalLink size={14}/></a></div>
   </div>
  </section>
  <section className="cce-finish">
   <span><Sparkles size={15}/> KEEP THE MOMENTUM</span><h2>From learning to <em>leading.</em></h2><p>Your climate leadership story does not end with a lesson or a graduation. It begins with what you do next.</p>
   <div><button type="button" onClick={()=>go('/canopy/course/she-leads')}>Explore my lessons <ChevronRight size={16}/></button><button type="button" onClick={()=>go('/canopy/assignments')}>View assignments <ChevronRight size={16}/></button><button type="button" onClick={()=>go('/canopy/portfolio')}>Impact profile <ChevronRight size={16}/></button></div>
  </section>
 </main>;
}
