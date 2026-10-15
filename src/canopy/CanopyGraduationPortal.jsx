import React,{useEffect,useRef,useState} from 'react';
import {Award,Download,Heart,LockKeyhole,Send,ShieldCheck,UsersRound} from 'lucide-react';
import {getCertificates,getCanopyGraduationOverview,submitCanopyGraduationReflection} from './canopyApi';
import './canopyGraduation.css';

const OPEN_AT=Date.UTC(2026,9,29,0,0,0);
const fmt=n=>String(n).padStart(2,'0');
const SAMPLE=[{id:'sample-1',display_name:'Graduate preview',reflection:'This programme strengthened my confidence to turn climate knowledge into community action.',created_at:'2026-10-29T12:00:00Z'}];

export default function CanopyGraduationPortal({viewer,tester=false}){
 const [now,setNow]=useState(Date.now());
 const [data,setData]=useState(null),[certs,setCerts]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [reflection,setReflection]=useState(''),[displayName,setDisplayName]=useState(viewer?.profile?.full_name||'');
 const [portrait,setPortrait]=useState(null);const canvasRef=useRef(null);
 const days=Math.max(0,OPEN_AT-now),opened=now>=OPEN_AT;
 const eligible=tester||Boolean(data?.can_enter);
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(id)},[]);
 useEffect(()=>{if(tester){setData({accepted_count:990,enrolled_count:null,graduated_count:null,can_enter:true,reflections:SAMPLE});return}
   let live=true;
   async function load(){try{const [overview,items]=await Promise.all([getCanopyGraduationOverview(viewer.session),getCertificates(viewer.session)]);if(live){setData(overview);setCerts(items||[]);setError('')}}catch(e){if(live)setError(e.message||'Graduation information is temporarily unavailable.')}}
   load();const timer=setInterval(load,30000);return()=>{live=false;clearInterval(timer)};
 },[viewer?.session?.access_token,tester]);
 async function submit(e){e.preventDefault();if(tester){setData(v=>({...v,reflections:[{id:'tester-preview',display_name:displayName||'Tester',reflection,created_at:new Date().toISOString()},...(v.reflections||[]).filter(x=>x.id!=='tester-preview')]}));setReflection('');return}
 if(!eligible||!opened||reflection.trim().length<30)return;setBusy(true);setError('');try{await submitCanopyGraduationReflection(viewer.session,{displayName,reflection});const next=await getCanopyGraduationOverview(viewer.session);setData(next);setReflection('')}catch(e){setError(e.message)}finally{setBusy(false)}}
 function upload(e){const f=e.target.files?.[0];if(!f)return;if(!f.type.startsWith('image/')||f.size>8*1024*1024){setError('Choose an image under 8 MB.');return}const u=URL.createObjectURL(f);const img=new Image();img.onload=()=>{const c=canvasRef.current;if(!c){URL.revokeObjectURL(u);return}const ctx=c.getContext('2d');c.width=1080;c.height=1350;ctx.fillStyle='#073B39';ctx.fillRect(0,0,1080,1350);const scale=Math.max(870/img.width,870/img.height),w=img.width*scale,h=img.height*scale;ctx.drawImage(img,105+(870-w)/2,110+(870-h)/2,w,h);ctx.fillStyle='rgba(7,59,57,.94)';ctx.fillRect(0,960,1080,390);ctx.fillStyle='#C6FF52';ctx.font='bold 32px Arial';ctx.fillText('WOMATE · SHE LEADS',90,1020);ctx.fillStyle='#FFFFFF';ctx.font='bold 52px Arial';ctx.fillText('I AM A COHORT 2 GRADUATE',90,1105);ctx.font='32px Arial';ctx.fillText('2026 · CLIMATE MENTORSHIP',90,1170);ctx.fillStyle='#C6FF52';ctx.fillRect(90,1225,900,8);setPortrait(c.toDataURL('image/png'));URL.revokeObjectURL(u)};img.onerror=()=>{setError('Unable to read this image.');URL.revokeObjectURL(u)};img.src=u}
 const unlocked=tester||(eligible&&opened);
 return <main className="cgrad-page"><section className="cgrad-hero"><span>WOMATE · SHE LEADS · COHORT 2</span><h1>The next chapter starts with you.</h1><p>Graduation celebration · 29 October 2026. An on-Canopy celebration, not a live session.</p>
 {!opened&&<div className="cgrad-countdown" role="timer"><div><strong>{Math.floor(days/86400000)}</strong><span>Days</span></div><div><strong>{fmt(Math.floor(days%86400000/3600000))}</strong><span>Hours</span></div><div><strong>{fmt(Math.floor(days%3600000/60000))}</strong><span>Minutes</span></div></div>}
 <div className="cgrad-stats"><div><strong>990</strong><span>Accepted to Cohort 2</span></div><div><strong>{data?.enrolled_count??'—'}</strong><span>Currently enrolled</span></div><div><strong>{data?.graduated_count??'—'}</strong><span>Graduated</span></div></div></section>
 {tester&&<div className="cgrad-banner"><ShieldCheck size={20}/> Tester simulation only. Nothing on this page issues a certificate, stores a photograph, or changes learner records.</div>}
 {error&&<p role="alert" className="cgrad-error">{error}</p>}
 {!unlocked?<section className="cgrad-locked"><LockKeyhole size={32}/><h2>{!opened?'Your graduation day is approaching.':'Graduation access is being verified.'}</h2><p>Before graduation, you can see the countdown. On 29 October, learners marked graduated by WOMATE who have been issued an official certificate gain access automatically. If your status is incorrect, contact <a href="mailto:womatead@gmail.com">womatead@gmail.com</a>.</p></section>:<>
 <section className="cgrad-intro"><Award size={32}/><h2>Congratulations, graduate!</h2><p>You showed up, learned, reflected and took steps toward climate leadership. This is your space to celebrate and share what the experience has meant to you.</p></section>
 <section className="cgrad-grid"><article className="cgrad-panel"><h2>Your official certificate</h2>{tester?<p>Official certificate link appears here after an eligible learner has been issued a certificate.</p>:certs.length?certs.map(c=><a key={c.id} className="cgrad-action" href={c.drive_url} target="_blank" rel="noopener noreferrer"><Award size={17}/> View official certificate</a>):<p>No issued certificate is available. Contact WOMATE if this appears incorrect.</p>}
 <h3>Your graduate portrait</h3><p>Choose a picture to create a shareable graduate card. Your photo stays on your device and is never uploaded to WOMATE.</p><input type="file" accept="image/*" aria-label="Choose your graduate portrait" onChange={upload}/><canvas ref={canvasRef} hidden/>{portrait&&<><img className="cgrad-portrait" src={portrait} alt="Preview of your graduate portrait"/><a className="cgrad-action" href={portrait} download="WOMATE-She-Leads-Cohort-2-Graduate.png"><Download size={17}/> Download your card</a></>}</article>
 <article className="cgrad-panel"><h2>Your voice, your journey</h2><p>Share what you learned or how She Leads influenced your confidence, actions or ambitions. Your approved-to-enter graduation message appears on this page immediately after submission.</p><form onSubmit={submit}><label>Your name<input value={displayName} onChange={e=>setDisplayName(e.target.value)} minLength={2} maxLength={100} required/></label><label>Your reflection<textarea value={reflection} onChange={e=>setReflection(e.target.value)} minLength={30} maxLength={1200} required placeholder="What did you learn? What will you do differently?"/></label><button type="submit" disabled={busy||reflection.trim().length<30}><Send size={17}/> {busy?'Publishing…':'Share my reflection'}</button></form></article></section>
 <section className="cgrad-reflections"><h2>Voices of Cohort 2 <Heart size={20}/></h2><div>{(data?.reflections||[]).length?(data.reflections||[]).map(r=><article key={r.id}><p>“{r.reflection}”</p><strong>{r.display_name}</strong></article>):<p>Graduate reflections will appear here as participants share them.</p>}</div></section>
 </>}
 </main>;
}
