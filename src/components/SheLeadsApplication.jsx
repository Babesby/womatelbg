import React,{useEffect,useState} from 'react';
import {ArrowRight,CheckCircle2,Clock,FileText,ShieldCheck} from 'lucide-react';
import {acceptCohortOffer,getAdmissionsState,getApplicationStatus,submitCohortApplication} from '../canopy/canopyAdmissionsApi';
import './she-leads-application.css';

export default function SheLeadsApplication({cohortKey='she-leads-asia-c1-2027'}){
 const [state,setState]=useState(null),[mode,setMode]=useState('apply'),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[result,setResult]=useState(null);
 const [form,setForm]=useState({full_name:'',email:'',country:'',city_region:'',climate_focus:'',motivation:'',experience:'',commitment:'',consent:false,privacy_accepted:false,website:''});
 const [lookup,setLookup]=useState({reference:'',email:'',code:''});
 useEffect(()=>{getAdmissionsState(cohortKey).then(setState).catch(e=>setMessage(e.message))},[cohortKey]);
 const change=(k,v)=>setForm(x=>({...x,[k]:v}));
 const submit=async e=>{e.preventDefault();setBusy(true);setMessage('');try{const r=await submitCohortApplication(cohortKey,form);setResult(r);setLookup(x=>({...x,reference:r.reference,email:form.email}));setMode('status');setMessage('Application received. Save your application reference.')}catch(e){setMessage(e.message)}finally{setBusy(false)}};
 const check=async e=>{e?.preventDefault?.();setBusy(true);setMessage('');try{const r=await getApplicationStatus(lookup.reference,lookup.email);setResult(r);setMessage(r.ok?'Application found.':r.message)}catch(e){setMessage(e.message)}finally{setBusy(false)}};
 const offer=async accept=>{setBusy(true);setMessage('');try{const r=await acceptCohortOffer(lookup.reference,lookup.email,lookup.code,accept);setResult(r);if(accept){localStorage.setItem('womate_admission_reference',lookup.reference.toUpperCase());localStorage.setItem('womate_admission_email',lookup.email.toLowerCase());setMessage('Offer accepted. Create or sign in to Canopy with this same email to continue.')}else setMessage('Offer declined. WOMATE has recorded your decision.')}catch(e){setMessage(e.message)}finally{setBusy(false)}};
 const open=Boolean(state?.is_open);
 return <main className="sla-page">
  <section className="sla-hero"><span>SHE LEADS CLIMATE MENTORSHIP · ASIA · COHORT 1 · 2027</span><h1>Applications.</h1><p>One application. One decision trail. One Canopy account if selected.</p><div><button className={mode==='apply'?'active':''} onClick={()=>setMode('apply')}>Apply</button><button className={mode==='status'?'active':''} onClick={()=>setMode('status')}>Check status</button></div></section>
  {mode==='apply'&&<section className="sla-shell">
   <div className="sla-intro"><FileText/><h2>{open?'Apply for Cohort 1.':'Applications are not open yet.'}</h2><p>{open?'Complete the application in your own words. WOMATE reviews each submission before any selection decision is made.':'The application system is ready, but WOMATE has not opened submissions for this cohort.'}</p>{state?.application_opens_at&&<p><Clock size={16}/> Opens {new Date(state.application_opens_at).toLocaleString()}</p>}</div>
   {open&&<form className="sla-form" onSubmit={submit}>
    <div className="sla-two"><label>Full name<input required maxLength={120} autoComplete="name" value={form.full_name} onChange={e=>change('full_name',e.target.value)}/></label><label>Email address<input required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={e=>change('email',e.target.value)}/></label></div>
    <div className="sla-two"><label>Country<input required maxLength={120} autoComplete="country-name" value={form.country} onChange={e=>change('country',e.target.value)}/></label><label>City / region<input maxLength={160} value={form.city_region} onChange={e=>change('city_region',e.target.value)}/></label></div>
    <label>What climate issue matters most to you?<textarea required minLength={30} maxLength={1500} rows={4} value={form.climate_focus} onChange={e=>change('climate_focus',e.target.value)}/></label>
    <label>Why do you want to join She Leads Climate Mentorship?<textarea required minLength={80} maxLength={3000} rows={6} value={form.motivation} onChange={e=>change('motivation',e.target.value)}/></label>
    <label>Tell us about any leadership, community, study, work or volunteer experience relevant to your application.<textarea required minLength={40} maxLength={2500} rows={5} value={form.experience} onChange={e=>change('experience',e.target.value)}/></label>
    <label>How will you make time for the five-week programme, assignments and live sessions?<textarea required minLength={40} maxLength={1800} rows={4} value={form.commitment} onChange={e=>change('commitment',e.target.value)}/></label>
    <label className="sla-check"><input type="checkbox" required checked={form.consent} onChange={e=>change('consent',e.target.checked)}/><span>I consent to WOMATE storing and reviewing this application for programme admissions.</span></label>
    <label className="sla-check"><input type="checkbox" required checked={form.privacy_accepted} onChange={e=>change('privacy_accepted',e.target.checked)}/><span>I have read and accept WOMATE's Privacy Policy and Terms.</span></label>
    <label className="sla-honey" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={e=>change('website',e.target.value)}/></label>
    <button type="submit" disabled={busy}>{busy?'Submitting…':'Submit application'} <ArrowRight size={17}/></button>
   </form>}
  </section>}
  {mode==='status'&&<section className="sla-shell">
   <div className="sla-intro"><ShieldCheck/><h2>Application status</h2><p>Use the reference issued when you applied and the same email address.</p></div>
   <form className="sla-statusForm" onSubmit={check}><label>Application reference<input required value={lookup.reference} onChange={e=>setLookup(x=>({...x,reference:e.target.value.toUpperCase()}))} placeholder="WOM-XXXXXXXXXX"/></label><label>Email address<input required type="email" value={lookup.email} onChange={e=>setLookup(x=>({...x,email:e.target.value}))}/></label><button disabled={busy}>{busy?'Checking…':'Check status'}</button></form>
   {result?.ok&&result.status&&<article className="sla-statusCard"><small>APPLICATION {result.reference}</small><h3>{String(result.status).replaceAll('_',' ')}</h3>{result.decision_note&&<p>{result.decision_note}</p>}{result.status==='selected'&&<><label>Offer / selection code<input value={lookup.code} onChange={e=>setLookup(x=>({...x,code:e.target.value.toUpperCase()}))} placeholder="Enter your code"/></label><div><button disabled={busy||lookup.code.length<6} onClick={()=>offer(true)}>Accept offer</button><button className="secondary" disabled={busy||lookup.code.length<6} onClick={()=>offer(false)}>Decline</button></div></>}{result.status==='offer_accepted'&&<div className="sla-next"><CheckCircle2/><div><strong>Offer accepted</strong><p>Continue to Canopy using this same email address.</p><a href="/canopy/signup">Create Canopy account <ArrowRight size={15}/></a><a href="/canopy/login">Already have an account? Sign in</a></div></div>}</article>}
  </section>}
  {message&&<p className="sla-message" role="status">{message}</p>}
 </main>;
}
