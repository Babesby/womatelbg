import React,{useEffect,useState} from 'react';
import {Award,Check,GraduationCap,Heart,LockKeyhole,ShieldCheck,Send,RefreshCw} from 'lucide-react';
import {PortraitStudio,GraduationDanceWelcome} from './CanopyGraduationPortal';
import {get2027Graduation,save2027GraduationReflection} from './canopyLearningApi';
import {canopyPost2026Runtime} from './canopyCohortRuntime2027';
import {getCanopy2027Curriculum} from './canopyCurricula2027';
import {createPortal} from 'react-dom';
import './canopyGraduation.css';
import './canopyGraduation2027.css';
const pretty=date=>new Date(date+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
export default function Canopy2027Graduation({viewer,cohortKey,tester=false,data:workspace={}}){
 const runtime=canopyPost2026Runtime(cohortKey),curriculum=getCanopy2027Curriculum(cohortKey);
 const [info,setInfo]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(!tester),[danceOpen,setDanceOpen]=useState(false),[now,setNow]=useState(Date.now());
 const [reflection,setReflection]=useState(''),[busy,setBusy]=useState(false),[showNote,setShowNote]=useState(false),[success,setSuccess]=useState('');
 const [displayName,setDisplayName]=useState(viewer?.profile?.full_name||'');
 const cohortLabel=cohortKey==='she-leads-asia-c1-2027'?'ASIA COHORT 1 · CLASS OF 2027':'AFRICA COHORT 3 · CLASS OF 2027';
 const date=runtime?.graduationDate||'2027-12-31';
 const opensAt=Date.parse(date+'T00:00:00Z');
 const opened=now>=opensAt;
 const days=Math.max(0,Math.floor((opensAt-now)/86400000));
 const videoUrl=cohortKey==='she-leads-asia-c1-2027'?(import.meta.env.VITE_CANOPY_GRADUATION_VIDEO_2027_ASIA||''):(import.meta.env.VITE_CANOPY_GRADUATION_VIDEO_2027_AFRICA||'');
 const eligible=tester||(info?.can_enter&&opened);
 useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer)},[]);
 useEffect(()=>{if(tester){setInfo({can_enter:true,approved:true,certificate_url:null,reflections:[]});setLoading(false);return}
  let alive=true;const refresh=()=>get2027Graduation(cohortKey,viewer.session).then(x=>{if(alive){setInfo(x);setError('');setLoading(false)}}).catch(e=>{if(alive){setError(e.message||'Could not load graduation details');setLoading(false)}});
  refresh();return()=>{alive=false};
 },[cohortKey,viewer?.session?.access_token,tester]);
 useEffect(()=>{if(!eligible||tester)return;
  const key='womate-grad-dance-'+cohortKey+'-'+viewer?.user?.id;
  try{if(localStorage.getItem(key))return;localStorage.setItem(key,'seen');setDanceOpen(true)}catch{}
 },[eligible,tester,cohortKey,viewer?.user?.id]);
 const lessons=(workspace.lessons||[]).length;
 const reviewed=new Set((workspace.submissions||[]).filter(s=>s.status==='approved').map(s=>s.module_id)).size;
 const attendance=(workspace.attendance||[]).length;
 const progress=[['LEARNING',lessons,20],['APPROVED ASSIGNMENTS',reviewed,5],['LIVE SESSIONS',attendance,5]];
 const send=async e=>{e.preventDefault();if(tester||!eligible)return;setBusy(true);setSuccess('');setError('');try{await save2027GraduationReflection(cohortKey,displayName,reflection,viewer.session);setSuccess('Your reflection was saved and is awaiting WOMATE review before appearing on the graduation wall.');setReflection('');setShowNote(false)}catch(e){setError(e.message)}finally{setBusy(false)}};
 if(!runtime||!curriculum)return <main className="cgrad-page"><p>Programme unavailable.</p></main>;
 return <main className="cgrad-page cgrad-2027">
  {danceOpen&&createPortal(<GraduationDanceWelcome tester={tester} cohortLabel={cohortLabel} onClose={()=>setDanceOpen(false)}/>,document.body)}
  <div className="cgrad-decor cgrad-decor-ribbon" aria-hidden="true"/><div className="cgrad-decor cgrad-decor-confetti" aria-hidden="true"/><div className="cgrad-decor cgrad-decor-balloons" aria-hidden="true"/><div className="cgrad-decor cgrad-decor-stars" aria-hidden="true"/>
  <div className="cgrad-content"><header className="cgrad-celebrate"><span className="cgrad-kicker">WOMATE · SHE LEADS · {cohortLabel}</span>{eligible?<><span className="cgrad-crown" aria-hidden="true">✦ ♡ ✦</span><h1>CONGRATULATIONS!</h1><p>YOU DID IT! <Heart size={16}/></p></>:<><h1 className="cgrad-wait-title">Your moment is almost here.</h1><p>{pretty(date).toUpperCase()} · GRADUATION DAY</p></>}</header>
   {tester&&<div className="cgrad-test"><ShieldCheck size={17}/> TESTER PREVIEW · Full graduation experience, no learner records changed. <button type="button" onClick={()=>setDanceOpen(true)}><RefreshCw size={15}/> Replay celebration</button></div>}
   {loading&&<p>Verifying graduation eligibility…</p>}{error&&<p className="cgrad-error" role="alert">{error}</p>}
   {!eligible?<section className="cgrad-gated"><LockKeyhole size={29}/><h2>{!opened?'The graduation celebration has not opened yet.':'Your graduation eligibility is being verified.'}</h2><p>Your certificate, five reviewed assignments, 20 completed lessons, attendance record and WOMATE's approval determine graduation access. The target date is {pretty(date)}.</p>{!opened&&<div className="cgrad-countdown" role="timer"><strong>{days}</strong> days until graduation</div>}<section className="c27-gradProgress">{progress.map(([label,actual,total])=><article key={label}><small>{label}</small><strong>{actual}/{total}</strong></article>)}</section><p>When WOMATE issues the official certificate and approves your graduation, the ceremony and portrait studio open here.</p></section>:<>
    <section className="cgrad-main-layout cgrad-main-layout-certificate"><aside className="cgrad-aside">{videoUrl?<div className="cgrad-video-frame"><iframe loading="lazy" src={videoUrl} title={'WOMATE '+cohortLabel+' graduation message'} allow="fullscreen; picture-in-picture"/></div>:<div className="cgrad-video-coming"><strong>A message from WOMATE</strong><p>The official {cohortLabel} graduation film will appear here after WOMATE publishes it.</p></div>}<div className="cgrad-certificate"><Award size={23}/><div className="cgrad-certificate-content"><strong>Your official graduation certificate</strong>{info?.certificate_url?<a href={info.certificate_url} target="_blank" rel="noopener noreferrer">Open / download certificate ↗</a>:<span>{tester?'The verified certificate will appear here when issued.':'Certificate link not yet available.'}</span>}</div></div></aside></section>
    <PortraitStudio graduateName={displayName||viewer?.profile?.full_name||'WOMATE Graduate'} cohortLabel={cohortLabel}/>
    <section className="cgrad-voices"><div className="cgrad-voices-head"><div><span className="cgrad-kicker">THE WOMEN BEHIND THE JOURNEY</span><h2>Our voices. Our next chapter.</h2></div><button type="button" onClick={()=>setShowNote(s=>!s)} aria-expanded={showNote}><Heart size={16}/> {showNote?'Close':'Leave your note'}</button></div>
    {success&&<p role="status">{success}</p>}{showNote&&<form className="cgrad-reflection-form" onSubmit={send}><label>Display name<input required minLength={2} maxLength={100} value={displayName} onChange={e=>setDisplayName(e.target.value)}/></label><label>Your reflection<textarea required minLength={30} maxLength={1200} value={reflection} onChange={e=>setReflection(e.target.value)}/></label><button type="submit" disabled={tester||busy||reflection.length<30}><Send size={16}/>{tester?'Tester · no submissions':busy?'Saving…':'Share my reflection'}</button></form>}
    <div className="cgrad-reflection-list">{(info?.reflections||[]).length?(info.reflections||[]).slice(0,100).map((r,i)=><blockquote key={i}><p>“{r.reflection}”</p><footer>{r.display_name}</footer></blockquote>):<p className="cgrad-no-reflections">Graduation reflections will appear here after WOMATE review.</p>}</div></section>
   </>}
  </div>
 </main>;
}
