import React,{useEffect,useRef,useState} from 'react';
import {ArrowRight,CheckCircle2,ExternalLink,LockKeyhole} from 'lucide-react';
import {revealSelectionScratch,acceptCohortOffer} from '../canopy/canopyAdmissionsApi.js';
import './selection-scratch.css';
const YOUTUBE='https://www.youtube.com/@womategh';
const GROUP='https://chat.whatsapp.com/Kl9MuJX2TrVEzKoCSx8DOU';
const CHANNEL='https://whatsapp.com/channel/0029Vb8vqDA0rGiKGUnnDA3A';
export default function SelectionScratchCard(){
 const [offer,setOffer]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(true),[revealed,setRevealed]=useState(false),[finished,setFinished]=useState(false),[requirements,setRequirements]=useState({youtube:false,group:false}),[status,setStatus]=useState('');
 const canvas=useRef(null),painting=useRef(false),scratches=useRef(0);
 useEffect(()=>{
  const token=new URLSearchParams(window.location.hash.replace(/^#/,'')).get('token')||'';
  window.history.replaceState(window.history.state,'',window.location.pathname);
  let active=true;
  if(!/^[a-f0-9]{64}$/.test(token)){setError('Open the private selection link from your official WOMATE email.');setBusy(false);return}
  revealSelectionScratch(token).then(x=>{if(!active)return;if(x?.ok)setOffer(x);else setError(x?.message||'We could not verify the selection link.')}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setBusy(false)});
  return()=>{active=false};
 },[]);
 useEffect(()=>{
  if(!offer||revealed||!canvas.current)return;
  const el=canvas.current,b=el.getBoundingClientRect(),ratio=Math.min(window.devicePixelRatio||1,2);
  el.width=Math.round(b.width*ratio);el.height=Math.round(b.height*ratio);
  const ctx=el.getContext('2d');ctx.scale(ratio,ratio);
  const coating=ctx.createLinearGradient(0,0,b.width,b.height);coating.addColorStop(0,'#d7dfdc');coating.addColorStop(.5,'#aebfba');coating.addColorStop(1,'#e3e8df');
  ctx.fillStyle=coating;ctx.fillRect(0,0,b.width,b.height);ctx.fillStyle='#29564d';ctx.font='600 13px Arial';ctx.textAlign='center';ctx.fillText('SCRATCH TO REVEAL',b.width/2,b.height/2+4);scratches.current=0;
 },[offer,revealed]);
 const scratch=e=>{
  if(!canvas.current||revealed)return;const c=canvas.current,b=c.getBoundingClientRect(),ratio=c.width/b.width;
  const x=e.clientX-b.left,y=e.clientY-b.top,ctx=c.getContext('2d');
  ctx.save();ctx.scale(ratio,ratio);ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.arc(x,y,21,0,Math.PI*2);ctx.fill();ctx.restore();
  if(++scratches.current>=28)setRevealed(true);
 };
 const down=e=>{painting.current=true;e.currentTarget.setPointerCapture(e.pointerId);scratch(e)};
 async function decide(accept){
  if(!offer||busy)return;setBusy(true);setStatus('');setError('');
  if(offer.preview){setBusy(false);if(accept)setFinished(true);else setStatus('Preview declined. No real admission was affected.');return;}
  try{const r=await acceptCohortOffer(offer.reference,offer.email,offer.code,accept);
   if(!r?.ok)throw Error(r?.message||'Your response could not be saved');
   if(accept){localStorage.setItem('womate_admission_reference',offer.reference);localStorage.setItem('womate_admission_email',offer.email);setFinished(true)}
   else setStatus('Your decision has been recorded.');}
  catch(e){setError(e.message)}finally{setBusy(false)}
 }
 const asia=offer?.cohort_key!=='she-leads-climate-c3-2027';
 const expiry=value=>value?new Date(value).toLocaleString(undefined,{dateStyle:'long',timeStyle:'short'}):'';
 return <main className="wsc-shell"><section className="wsc-panel" aria-labelledby="wsc-title">
  <a href="/" className="wsc-brand"><span>WOMATE<span className="wsc-leaf">✦</span></span><small>WOMEN IN CLIMATE</small></a>
  <div className="wsc-body"><span className="wsc-kicker">{asia?'SHE LEADS ASIA · COHORT 1, 2027':'SHE LEADS AFRICA · COHORT 3, 2027'}</span>
  <h1 id="wsc-title">Your selection card.</h1><p className="wsc-intro">A new chapter in climate leadership starts here.</p>
  {busy&&!offer&&<p role="status">Verifying your invitation…</p>}
  {error&&<p className="wsc-error" role="alert">{error}</p>}
  {offer&&<><p>Dear {offer.name?.split(' ')[0]||'participant'}, {offer.preview?'congratulations on your selection.':'congratulations on your selection.'}</p>
   <div className="wsc-card"><span>YOUR PERSONAL OFFER CODE</span><div className="wsc-reveal"><strong aria-label={revealed?'Your offer code':'Offer code concealed'}>{revealed?offer.code:'••••••••••••'}</strong>{!revealed&&<canvas ref={canvas} className="wsc-canvas" aria-label="Scratch to reveal your offer code" onPointerDown={down} onPointerMove={e=>{if(painting.current)scratch(e)}} onPointerUp={()=>painting.current=false} onPointerCancel={()=>painting.current=false}/>}</div>
   {!revealed?<button type="button" className="wsc-textButton" onClick={()=>setRevealed(true)}>Reveal without scratching</button>:<small role="status">Code revealed. Keep it private.</small>}
   {revealed&&!offer.preview&&<p className="wsc-selectionCardAction"><a href="/selected" className="wsc-primary">Create my “I’m Selected” card <ArrowRight size={16}/></a><small>Use your application email and the code revealed above. Upload your photo, then download or share your official selection image—the same process used by Cohort 2.</small></p>}
   </div>
   <div className="wsc-expiry"><LockKeyhole size={17}/> Accept before <strong>{expiry(offer.expires_at)}</strong></div>
   <div className="wsc-requirements"><h2>Before you continue</h2>
    <label><input type="checkbox" checked={requirements.youtube} onChange={e=>setRequirements(v=>({...v,youtube:e.target.checked}))}/><span>I have subscribed to the <a href={YOUTUBE} target="_blank" rel="noopener noreferrer">official WOMATE YouTube channel <ExternalLink size={13}/></a> <b>Required</b></span></label>
    {asia?<label><input type="checkbox" checked={requirements.group} onChange={e=>setRequirements(v=>({...v,group:e.target.checked}))}/><span>I have joined the <a href={GROUP} target="_blank" rel="noopener noreferrer">Asia Cohort WhatsApp group <ExternalLink size={13}/></a> <b>Required</b></span></label>:<p>Your official Africa cohort community invitation will be shared by WOMATE separately.</p>}
    <p>Optional: <a href={CHANNEL} target="_blank" rel="noopener noreferrer">Follow the WOMATE WhatsApp channel <ExternalLink size={13}/></a></p>
   </div>
   {!finished&&<div className="wsc-actions"><button type="button" disabled={busy||!revealed||!requirements.youtube||(asia&&!requirements.group)} onClick={()=>decide(true)} className="wsc-primary">Accept my offer <ArrowRight size={17}/></button><button type="button" disabled={busy||!revealed} className="wsc-decline" onClick={()=>decide(false)}>Decline offer</button></div>}
   {finished&&<div className="wsc-success"><CheckCircle2/><h2>Offer accepted.</h2><p>Continue to Canopy with the same application email to complete onboarding.</p>{!offer.preview&&<a href="/canopy/signup" className="wsc-primary">Continue to Canopy <ArrowRight size={16}/></a>}</div>}
   {status&&<p role="status">{status}</p>}
  </>}
  </div><footer>WOMATE · Women in Climate · <a href="https://www.womate.org">womate.org</a></footer>
 </section></main>
}