import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowRight,BookOpen,Check,ChevronRight,Clock3,ExternalLink,Heart,Play,Sparkles,Volume2} from 'lucide-react';
import './canopyCelebration.css';
import {getCanopyMyC2GradeSummary} from './canopyApi';

export const CANOPY_C2_CELEBRATION_START='2026-10-26T00:00:00Z';
const GRADUATION_DAY='2026-10-29T00:00:00Z';
const VIDEO_ID='VBmMU_iwe6U';
const LESSONS_PER_MODULE=4;
const ASSIGNMENT_KEYS=['module-01','module-02','module-03','module-04','module-05'];
const MODULE_LABELS=['Understand','Empathise','Influence','Advocate','Lead'];
const LOCAL_CHEERS=[
 {countries:['ghana'],cheer:'Ayekoo!',locale:'Ghana'},
 {countries:['nigeria'],cheer:'Ẹ kú oríire!',locale:'Yorùbá · Nigeria'},
 {countries:['botswana'],cheer:'O dirile sentle!',locale:'Setswana · Botswana'},
 {countries:['uganda'],cheer:'Gyebale ko!',locale:'Luganda · Uganda'},
 {countries:['ethiopia'],cheer:'እንኳን ደስ አለሽ!',locale:'Amharic · Ethiopia'},
 {countries:['rwanda'],cheer:'Wakoze neza!',locale:'Kinyarwanda · Rwanda'},
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
function useInViewCountUp(a,b){
 const ref=useRef(null);
 const [inView,setInView]=useState(false);
 const [progress,setProgress]=useState(0);
 useEffect(()=>{
  if(!ref.current)return;
  if(!('IntersectionObserver' in window)){setInView(true);return}
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setInView(true);observer.disconnect()}},{threshold:.15,rootMargin:'0px 0px -45px 0px'});
  observer.observe(ref.current);
  return()=>observer.disconnect();
 },[]);
 useEffect(()=>{
  if(!inView)return;
  let frame=0;
  const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if(reduce){setProgress(1);return}
  let start=0;
  setProgress(0);
  const tick=time=>{
   if(!start)start=time;
   const t=Math.min(1,(time-start)/1450);
   setProgress(1-Math.pow(1-t,3));
   if(t<1)frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(frame);
 },[inView,a,b]);
 return {ref,progress};
}
function CircularMeter({value,actual,total,label,subtext,accent='lime'}) {
 const pct=total?Math.min(100,Math.max(0,value/total*100)):0;
 return <div className="cce-meter" role="img" aria-label={label+': '+actual+' of '+total}>
  <div className={'cce-meter-art cce-'+accent} style={{'--cce-angle':pct*3.6+'deg'}}>
   <div className="cce-meter-core"><strong>{Math.round(value)}<span>/{total}</span></strong><small>{Math.round(pct)}% complete</small></div>
  </div>
  <div className="cce-meter-caption"><b>{label}</b><span>{subtext}</span></div>
 </div>;
}

export default function CanopyCelebration({viewer,progress=[],submissions=[],tester=false,onNavigate}){
 const [now,setNow]=useState(()=>Date.now());
 const [playing,setPlaying]=useState(false);
 const [sampleCountry,setSampleCountry]=useState('');
 const [sampleLessons,setSampleLessons]=useState('actual');
 const [sampleAssignments,setSampleAssignments]=useState('actual');
 const [celebrating,setCelebrating]=useState(false);
 const [grades,setGrades]=useState(null);
 const [sampleGrade,setSampleGrade]=useState('actual');
 useEffect(()=>{let cancelled=false;getCanopyMyC2GradeSummary(viewer?.session).then(x=>{if(!cancelled)setGrades(x)}).catch(()=>{if(!cancelled)setGrades(null)});return()=>{cancelled=true}},[viewer?.session?.access_token]);
 const demoGrade=tester&&sampleGrade!=='actual';
 const earned=demoGrade?Number(sampleGrade):Number(grades?.earned||0);
 const gradedCount=demoGrade?5:Number(grades?.graded_modules||0);
 const finalized=demoGrade||Boolean(grades?.finalized);
 const tier=finalized?(earned===500?'ruby':earned>=480?'emerald':earned>=450?'diamond':earned>=430?'gold':'silver'):null;
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
 const {ref:statsRef,progress:reveal}=useInViewCountUp(totalLessons,totalAssignments);
 const animatedLessons=totalLessons*reveal;
 const animatedAssignments=totalAssignments*reveal;
 return <main className="canopyDashboard cce-root">
  {tester&&<section className="cce-tester-controls" aria-label="Celebration visual preview controls">
   <div><span className="cce-preview-tag">TESTER ONLY · DESIGN PREVIEW</span><p>Simulate different countries and progress levels. These controls do not change learner records.</p></div>
   <label>Greeting country<select value={sampleCountry} onChange={e=>setSampleCountry(e.target.value)}>
    <option value="">Your profile / English fallback</option><option>Ghana</option><option>Nigeria</option><option>Kenya</option><option>Botswana</option><option>Uganda</option><option>Ethiopia</option><option>Rwanda</option><option>Zimbabwe</option><option>South Africa</option><option>Malawi</option><option>Morocco</option>
   </select></label>
   <label>Lessons<select value={sampleLessons} onChange={e=>setSampleLessons(e.target.value)}><option value="actual">Actual progress</option><option value="4">4 / 20</option><option value="12">12 / 20</option><option value="16">16 / 20</option><option value="20">20 / 20</option></select></label>
   <label>Assignments<select value={sampleAssignments} onChange={e=>setSampleAssignments(e.target.value)}><option value="actual">Actual submissions</option><option value="1">1 / 5</option><option value="3">3 / 5</option><option value="5">5 / 5</option></select></label>
   <label>Achievement preview<select value={sampleGrade} onChange={e=>setSampleGrade(e.target.value)}><option value="actual">Actual graded scores</option><option value="500">Ruby · 500</option><option value="490">Emerald · 490</option><option value="465">Diamond · 465</option><option value="440">Gold · 440</option><option value="410">Silver · 410</option></select></label>
   <button type="button" className="cce-preview-back" onClick={()=>go('/canopy/classroom')}>Back to tester home <ArrowRight size={14}/></button>
  </section>}
  <section className={'cce-hero '+(celebrating?'cce-cheering':'')}>
    <img className="cce-ribbon" src="/assets/canopy/graduation/satin-ribbon.webp" alt="" aria-hidden="true" loading="eager"/>
    <img className="cce-hero-confetti" src="/assets/canopy/graduation/confetti.webp" alt="" aria-hidden="true" loading="lazy"/>
    <div className="cce-hero-inner">
      <div className="cce-hero-kicker">WOMATE · SHE LEADS CLIMATE · COHORT 2 / 2026</div>
      <div className="cce-hero-heading"><h1 className="cce-local-cheer">{greeting.cheer}</h1><div className="cce-hero-subtitle">Look at how far you have come.</div></div>
      <p className="cce-hero-lede">Look how far you've come, {firstName}. Five powerful modules, new perspectives, and a community of women ready to make change. You've earned this moment of celebration.</p>
      <div className="cce-hero-actions">
        <button className="cce-primary" type="button" onClick={()=>setCelebrating(true)}>Celebrate this moment <Heart size={16}/></button>
        <button className="cce-secondary" type="button" onClick={()=>go('/canopy/progress')}>My learning journey <ArrowRight size={16}/></button>
      </div>
      <p className="cce-cheer-foot"><Heart size={13}/> Progress is worth celebrating. Every next step still matters.</p>
    </div>
    {celebrating&&<div className="cce-confetti" aria-hidden="true"><img src="/assets/canopy/graduation/confetti.webp" alt=""/></div>}
  </section>
  {!tester&&<section className="cce-feedback-invite" aria-label="Programme evaluation">
   <div><strong>Help shape what comes next.</strong><span>Share your She Leads experience with WOMATE.</span></div>
   <a href="https://forms.gle/7pj68kYGBHPnm5mY8" target="_blank" rel="noopener noreferrer">Share feedback <ExternalLink size={15}/></a>
  </section>}
  <section className="cce-overview" aria-label="Your actual learning progress">
   <div className="cce-section-heading"><div><span>01 / YOUR JOURNEY IN NUMBERS</span><h2>A little progress. A lot of possibility.</h2></div><button type="button" onClick={()=>go('/canopy/progress')}>Full progress <ArrowRight size={15}/></button></div>
   <div className="cce-performance" ref={statsRef}>
    <div className="cce-performance-rings">
     <CircularMeter value={animatedLessons} actual={totalLessons} total={20} label="Lessons completed" subtext={incomplete?'Your next lesson is waiting.':'Every lesson completed. Beautiful work!'}/>
     <CircularMeter value={animatedAssignments} actual={totalAssignments} total={5} label="Assignments submitted" subtext="Submitted modules, not grading decisions." accent="teal"/>
    </div>
    <div className="cce-grade-strip" aria-label="Five module achievement score">
      <div className="cce-grade-info"><span>YOUR GRADED ACHIEVEMENT</span><strong>{earned}<small> / 500 points</small></strong><p>{finalized?'All five modules graded · Your earned achievement':gradedCount+' of 5 module scores finalised · Badge pending final review'}</p></div>
      <div className="cce-grade-meter"><span style={{width:Math.min(100,Math.max(0,earned/5))+'%'}}/></div>
      <div className={'cce-grade-award '+(tier?'is-'+tier:'is-pending')}>
        {tier?<><span className="cce-grade-medallion" role="img" aria-label={'WOMATE '+tier+' ornamental medallion'}></span><div><strong>{tier.toUpperCase()} BADGE</strong><small>{tier==='ruby'?'Perfect 500 · Distinction':'Verified WOMATE achievement · '+earned+'/500'}</small></div></>:<div className="cce-grade-pending"><strong>Badge awaiting final grades</strong><small>Earned after all 5 module scores are finalised.</small></div>}
      </div>
    </div>
   </div>
   <div className="cce-track-heading"><span>YOUR LEARNING JOURNEY</span><b>Five steps toward leadership</b></div>
   <div className="cce-module-track" aria-label="Your lesson completion by module">
     {MODULE_LABELS.map((label,i)=><button key={label} type="button" className="cce-module" onClick={()=>go('/canopy/course/she-leads')} title={'Open Module '+(i+1)}>
       <span className="cce-module-top"><span>{String(i+1).padStart(2,'0')}</span><b>{lessonsByModule[i]===LESSONS_PER_MODULE?<Check size={15}/>:lessonsByModule[i]+' / 4'}</b></span>
       <strong>{label}</strong><span className="cce-mini-bar"><i style={{width:(lessonsByModule[i]/4*100*reveal)+'%'}}/></span>
     </button>)}
   </div>
   {incomplete?<div className="cce-action-note"><span className="cce-action-icon"><BookOpen size={20}/></span><p><b>Your story is still unfolding.</b> You have {20-totalLessons} lesson{20-totalLessons===1?'':'s'} left. Complete each one, mark it done and reach 20/20 to stay on track.</p><button type="button" onClick={()=>go('/canopy/course/she-leads')}>Finish my lessons <ArrowRight size={16}/></button></div>:<div className="cce-action-note is-complete"><span className="cce-action-icon"><Check size={20}/></span><p><b>20 out of 20. Every lesson.</b> This is a milestone to be proud of. Keep building on what you've learned.</p><button type="button" onClick={()=>go('/canopy/portfolio')}>My impact profile <ArrowRight size={16}/></button></div>}
  </section>
  <section className="cce-countdown" aria-label="Countdown to graduation day"><img className="cce-countdown-balloons" src="/assets/canopy/graduation/balloons.webp" alt="" aria-hidden="true" loading="lazy"/>
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
