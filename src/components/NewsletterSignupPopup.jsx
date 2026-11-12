import React,{useEffect,useRef,useState} from 'react';
import {X,ArrowRight,CheckCircle2} from 'lucide-react';
import './NewsletterSignupPopup.css';

const KEY='womate_newsletter_v1';
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
const write=x=>{try{localStorage.setItem(KEY,JSON.stringify(x))}catch{}};
const MILLIS_DAY=86400000;
export default function NewsletterSignupPopup({enabled=true}){
 const [open,setOpen]=useState(false),[done,setDone]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [name,setName]=useState(''),[email,setEmail]=useState(''),[consent,setConsent]=useState(false);
 const shown=useRef(false);
 useEffect(()=>{
  if(!enabled||shown.current||window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches&&document.visibilityState==='hidden')return;
  const state=read(),now=Date.now();
  if(state.converted||state.impressions>=2||(state.lastImpressionAt||state.closedAt)&&now-(state.lastImpressionAt||state.closedAt)<MILLIS_DAY)return;
  // Only show to first-time visitors, not people who have previously browsed WOMATE.
  const seen=localStorage.getItem('womate_visited');
  if(!seen)localStorage.setItem('womate_visited',String(now));
  if(seen&&state.impressions===undefined)return;
  const timer=window.setTimeout(()=>{if(document.visibilityState!=='visible')return;const next=read();if(next.converted||next.impressions>=2||(next.lastImpressionAt||next.closedAt)&&Date.now()-(next.lastImpressionAt||next.closedAt)<MILLIS_DAY)return;shown.current=true;write({...next,impressions:(next.impressions||0)+1,lastImpressionAt:Date.now()});setOpen(true)},10000);
  return()=>window.clearTimeout(timer);
 },[enabled]);
 useEffect(()=>{if(!open)return;const onKey=e=>{if(e.key==='Escape')close()};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[open,done]);
 function close(){write({...read(),closedAt:Date.now()});setOpen(false)}
 async function submit(e){
  e.preventDefault();if(busy||!consent)return;
  setBusy(true);setError('');
  try{
   const res=await fetch('/api/engagement',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event:'newsletter_submit',name:name.trim(),email:email.trim(),consent,honey:''})});
   const result=await res.json().catch(()=>({}));
   if(!res.ok||!result.ok)throw new Error(result.error||'We could not complete your signup. Please try again.');
   write({...read(),converted:true});setDone(true);
  }catch(err){setError(err.message)}finally{setBusy(false)}
 }
 if(!enabled||!open)return null;
 return <div className="wn-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}>
  <section className="wn-modal" role="dialog" aria-modal="true" aria-labelledby="wn-title">
   <button className="wn-close" type="button" onClick={close} aria-label="Close newsletter signup"><X size={21}/></button>
   <div className="wn-copy">
    <img className="wn-logo" src="/assets/img/logo.svg" alt="WOMATE"/>
    {done?<><div className="wn-done-icon"><CheckCircle2 size={34}/></div><h2 id="wn-title">You're in!</h2><p>Welcome to the WOMATE circle. Look out for stories, opportunities and climate leadership news.</p><button type="button" className="wn-success-cta" onClick={close}>Explore WOMATE <ArrowRight size={17}/></button></>:<>
     <span className="wn-eyebrow">THE WOMATE NEWSLETTER</span><h2 id="wn-title">Join the circle.</h2><p>Ideas, opportunities and stories from women shaping our climate future. Straight to your inbox.</p>
     <form onSubmit={submit}><label htmlFor="wn-name">First name</label><input id="wn-name" value={name} onChange={e=>setName(e.target.value)} maxLength={70} autoComplete="given-name" required placeholder="Your first name"/>
      <label htmlFor="wn-email">Email address</label><input id="wn-email" type="email" value={email} onChange={e=>setEmail(e.target.value)} maxLength={254} autoComplete="email" required placeholder="you@example.com"/>
      <label className="wn-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>Yes, send me WOMATE newsletters. I can unsubscribe anytime. <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy policy</a>.</span></label>
      {error&&<p role="alert" className="wn-error">{error}</p>}
      <button className="wn-submit" type="submit" disabled={!consent||busy}>{busy?'Subscribing…':'Subscribe'} <ArrowRight size={18}/></button>
     </form><small className="wn-foot">No spam. Just meaningful updates.</small></>}
   </div>
   <div className="wn-art" aria-hidden="true"><div className="wn-orbit"></div><img src="/assets/newsletter/womate-community-globe.avif" alt="" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src="/assets/hero/circle.png"}}/></div>
  </section>
 </div>;
}
