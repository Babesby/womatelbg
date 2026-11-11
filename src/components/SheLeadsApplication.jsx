import React,{useEffect,useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,Check,CheckCircle2,ExternalLink,ShieldCheck} from 'lucide-react';
import {acceptCohortOffer,getAdmissionsState,getApplicationStatus,submitCohortApplication} from '../canopy/canopyAdmissionsApi';
import {canopyPost2026Runtime} from '../canopy/canopyCohortRuntime2027';
import './she-leads-application.css';

const AFRICA_BRIEF='https://docs.google.com/document/d/15BxTdNxJvFcWr0-stuOUL1yibeSQHrnnD6YgpYjUO5Q/edit?usp=sharing';
const ASIA_BRIEF='https://docs.google.com/document/d/1gndXwmZCEoW-qAbRgvdyWk5HriIgDw8d_k_8Y4uo3q8/edit?usp=sharing';
const initial={
 full_name:'',email:'',phone_whatsapp:'',gender:'',nationality:'',country:'',city_region:'',
 age_range:'',current_status:'',university_program:'',year_of_study:'',motivation:'',hopes_to_gain:'',
 commitment:'',committed_all_sessions:false,heard_about:'',consent:false,privacy_accepted:false,
 accuracy_confirmed:false,website:''
};
const wordCount=s=>String(s||'').trim().split(/\s+/).filter(Boolean).length;

function Field({label,required=true,hint,children,className=''}){return <label className={'sla-field '+className}><span>{label}{required&&<b>*</b>}</span>{hint&&<small>{hint}</small>}{children}</label>}
function Select({value,onChange,children,required=true,disabled=false}){return <select required={required} disabled={disabled} value={value} onChange={onChange}><option value="">Select one</option>{children}</select>}
function ChoiceGrid({name,value,onChange,options,disabled=false}){return <div className="sla-choiceGrid">{options.map(opt=><label key={opt} className={value===opt?'selected':''}><input type="radio" name={name} value={opt} checked={value===opt} disabled={disabled} onChange={()=>onChange(opt)}/><span>{opt}</span></label>)}</div>}

export default function SheLeadsApplication({cohortKey='she-leads-asia-c1-2027'}){
 const isAsia=cohortKey==='she-leads-asia-c1-2027';
 const cohortLabel=isAsia?'Cohort 1 · 2027 · Asia':'Cohort 3 · 2027 · Africa';
 const [state,setState]=useState(null),[loadError,setLoadError]=useState(false),[mode,setMode]=useState('apply'),[step,setStep]=useState(1),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[result,setResult]=useState(null);
 const [form,setForm]=useState(initial),[lookup,setLookup]=useState({reference:'',email:'',code:''});
 useEffect(()=>{let alive=true;setState(null);setLoadError(false);setStep(1);getAdmissionsState(cohortKey).then(data=>{if(alive)setState(data)}).catch(e=>{if(alive){setLoadError(true);setMessage(e.message)}});return()=>{alive=false}},[cohortKey]);
 const change=(k,v)=>setForm(p=>({...p,[k]:v}));
 const open=Boolean(state?.is_open);
 const loading=state===null&&!loadError;
 const schedule=canopyPost2026Runtime(cohortKey)?.admissions;
 const dateLabel=value=>{if(!value)return null;const d=/^\d{4}-\d{2}-\d{2}$/.test(value)?new Date(value+'T12:00:00Z'):new Date(value);return Number.isNaN(d.getTime())?null:d.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'})};
 const opensOn=dateLabel(state?.application_opens_at||schedule?.opens);
 const closesOn=dateLabel(state?.application_closes_at||schedule?.closes);
 const motivationWords=useMemo(()=>wordCount(form.motivation),[form.motivation]);

 const stepOneValid=form.full_name.trim().length>=2&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())&&form.phone_whatsapp.replace(/[^\d]/g,'').length>=7&&form.gender&&form.nationality.trim()&&form.country.trim()&&form.city_region.trim()&&form.age_range&&form.current_status;
 const stepTwoValid=form.motivation&&motivationWords>=150&&motivationWords<=200&&form.hopes_to_gain.trim().length>=40;
 const stepThreeValid=form.committed_all_sessions&&form.commitment.trim().length>=20&&form.heard_about&&form.accuracy_confirmed&&form.consent&&form.privacy_accepted;
 const next=()=>{setMessage('');if(!open)return;if(step===1&&stepOneValid)setStep(2);else if(step===2&&stepTwoValid)setStep(3)};
 const submit=async e=>{e.preventDefault();if(!open||!stepOneValid||!stepTwoValid||!stepThreeValid){setMessage('Please complete all three sections before submitting.');return;}setBusy(true);setMessage('');try{const r=await submitCohortApplication(cohortKey,form);setResult(r);setLookup(x=>({...x,reference:r.reference,email:form.email}));setMode('status');setMessage('Application received. Save your application reference.')}catch(e){setMessage(e.message)}finally{setBusy(false)}};
 const check=async e=>{e?.preventDefault?.();if(!lookup.reference.trim()||!lookup.email.trim()){setMessage('Enter your application reference and email address.');return;}setBusy(true);setMessage('');setResult(null);try{const r=await getApplicationStatus(lookup.reference.trim(),lookup.email.trim());if(r?.ok){setResult(r);setMessage('Application found.')}else{setMessage(r?.message||'We could not find an application matching those details.')}}catch(e){setMessage(e.message||'Could not check application status. Please try again.')}finally{setBusy(false)}};
 const offer=async accept=>{setBusy(true);setMessage('');try{const r=await acceptCohortOffer(lookup.reference,lookup.email,lookup.code,accept);setResult(r);if(accept){localStorage.setItem('womate_admission_reference',lookup.reference.toUpperCase());localStorage.setItem('womate_admission_email',lookup.email.toLowerCase());setMessage('Offer accepted. Create or sign in to Canopy with this same email to continue.')}else setMessage('Offer declined. WOMATE has recorded your decision.')}catch(e){setMessage(e.message)}finally{setBusy(false)}};

 return <main className="sla-page">
  <section className="sla-masthead">
   <div className="sla-brandMark">W</div>
   <div className="sla-mastCopy">
    <span>WOMATE · SHE LEADS · {cohortLabel.toUpperCase()}</span>
    <h1>{mode==='apply'?'Apply':'Application status'}</h1>
    <div className="sla-mastActions"><a href={isAsia?ASIA_BRIEF:AFRICA_BRIEF} target="_blank" rel="noopener noreferrer">{isAsia?"Asia programme brief":"Africa programme brief"} <ExternalLink size={15}/></a><a href="mailto:womatead@gmail.com">womatead@gmail.com</a></div>
   </div>
   <div className="sla-modeTabs" aria-label="Application pages"><button type="button" aria-current={mode==='apply'?'page':undefined} className={mode==='apply'?'active':''} onClick={()=>{setMessage('');setResult(null);setMode('apply')}}>Apply</button><button type="button" aria-current={mode==='status'?'page':undefined} className={mode==='status'?'active':''} onClick={()=>{setMessage('');setResult(null);setMode('status')}}>Check status</button></div>
  </section>

  {mode==='apply'&&<div className="sla-layout">
   <aside className="sla-programmePanel">
    <div className="sla-cohortIdentity">
     <div className="sla-programmeBadge">WOMATE · SHE LEADS</div>
     <h2>{cohortLabel}</h2>
    </div>
    <div className={'sla-openState '+(open?'is-open':'')} aria-label="Application dates">
     {opensOn&&<p><strong>Opens</strong><span>{opensOn}</span></p>}
     {closesOn&&<p><strong>Closes</strong><span>{closesOn}</span></p>}
    </div>
   </aside>

   <section className="sla-formCard">
    {open&&<div className="sla-progress" aria-label={'Application step '+step+' of 3'}>{[1,2,3].map(n=><div key={n} aria-current={step===n?'step':undefined} className={step===n?'active':step>n?'done':''}><span>{step>n?<Check size={14}/>:n}</span><small>{n===1?'About you':n===2?'Study & motivation':'Commitment'}</small></div>)}</div>}

    {!open?<div className="sla-closedMessage" role="status"><span className="sla-closedEyebrow">{loading?'CHECKING APPLICATION DATES':loadError?'INFORMATION UNAVAILABLE':'UPCOMING APPLICATIONS'}</span><h2>{loading?'Loading…':loadError?'Application details unavailable':'Applications are not open yet'}</h2><p>{loadError?'Please try again shortly.':opensOn&&closesOn?`Applications run from ${opensOn} to ${closesOn}.`:'Application dates will be announced here.'}</p></div>:<form onSubmit={submit}>
     {step===1&&<section className="sla-step">
      <div className="sla-stepHead"><span>01 · ABOUT YOU</span><h2>Tell us who you are.</h2><p>Use the email you plan to use for Canopy.</p></div>
      <div className="sla-grid two">
       <Field label="Full Name"><input disabled={!open} required autoComplete="name" value={form.full_name} onChange={e=>change('full_name',e.target.value)} placeholder="Your full name"/></Field>
       <Field label="Email Address"><input disabled={!open} required type="email" autoComplete="email" value={form.email} onChange={e=>change('email',e.target.value)} placeholder="you@example.com"/></Field>
       <Field label="Phone / WhatsApp Number"><input disabled={!open} required autoComplete="tel" value={form.phone_whatsapp} onChange={e=>change('phone_whatsapp',e.target.value)} placeholder="+233 ..."/></Field>
       <Field label="Gender"><Select disabled={!open} value={form.gender} onChange={e=>change('gender',e.target.value)}><option>Female</option><option>Male</option><option>Other</option><option>Prefer not to say</option></Select></Field>
       <Field label="Nationality"><input disabled={!open} required value={form.nationality} onChange={e=>change('nationality',e.target.value)} placeholder="Nationality"/></Field>
       <Field label="City / Region of Residence"><input disabled={!open} required value={form.city_region} onChange={e=>change('city_region',e.target.value)} placeholder="City / region"/></Field>
       <Field label="Country of Residence"><input disabled={!open} required value={form.country} onChange={e=>change('country',e.target.value)} placeholder="Country"/></Field>
       <Field label="Age Range"><Select disabled={!open} value={form.age_range} onChange={e=>change('age_range',e.target.value)}><option>18–20</option><option>21–25</option><option>26–30</option><option>31+</option></Select></Field>
      </div>
      <Field label="Current Status"><ChoiceGrid disabled={!open} name="current_status" value={form.current_status} onChange={v=>change('current_status',v)} options={['Undergraduate Student','Postgraduate Student','Recent Graduate','Early-Career Professional','Other']}/></Field>
     </section>}

     {step===2&&<section className="sla-step">
      <div className="sla-stepHead"><span>02 · STUDY & MOTIVATION</span><h2>What brings you here?</h2><p>Tell us what motivates you and what you hope to learn.</p></div>
      <div className="sla-grid two">
       <Field label="University & Program of Study" required={false} hint="If not currently studying, enter your most recent programme or leave blank."><input disabled={!open} value={form.university_program} onChange={e=>change('university_program',e.target.value)} placeholder="University · programme"/></Field>
       <Field label="Year of Study" required={false}><Select disabled={!open} required={false} value={form.year_of_study} onChange={e=>change('year_of_study',e.target.value)}><option>First Year</option><option>Second Year</option><option>Third Year</option><option>Final Year</option><option>Recent Graduate</option><option>Post graduate</option><option>Other</option></Select></Field>
      </div>
      <Field label="Why are you interested in the She Leads Climate Mentorship Program?" hint="150–200 words."><textarea disabled={!open} required rows={8} value={form.motivation} onChange={e=>change('motivation',e.target.value)} placeholder="Tell us why this programme matters to you, the climate questions you care about and why now."/>{<div className={'sla-wordCount '+(motivationWords>200?'over':motivationWords>=150?'good':'')}><span>{motivationWords} words</span><small>Target: 150–200</small></div>}</Field>
      <Field label="What do you hope to gain from this program?"><textarea disabled={!open} required minLength={40} rows={5} value={form.hopes_to_gain} onChange={e=>change('hopes_to_gain',e.target.value)} placeholder="What knowledge, confidence, network, skills or practical outcomes would be meaningful to you?"/></Field>
     </section>}

     {step===3&&<section className="sla-step">
      <div className="sla-stepHead"><span>03 · COMMITMENT & DECLARATION</span><h2>Can you show up fully?</h2><p>Please confirm your availability and consent.</p></div>
      <Field label="Are you committed to attending all live sessions and completing all assignments?"><ChoiceGrid disabled={!open} name="commitment" value={form.committed_all_sessions?'Yes':form.committed_all_sessions===false&&form.commitment?'No':''} onChange={v=>{change('committed_all_sessions',v==='Yes');if(v==='No')change('commitment','I am not able to commit to all programme sessions and assignments.')}} options={['Yes','No']}/></Field>
      <Field label="How will you make time for the programme?" hint="Tell us briefly how you will protect time for lessons, live sessions and assignments."><textarea disabled={!open} required minLength={20} rows={4} value={form.commitment} onChange={e=>change('commitment',e.target.value)} placeholder="I will..."/></Field>
      <Field label="How did you hear about this program?"><ChoiceGrid disabled={!open} name="heard_about" value={form.heard_about} onChange={v=>change('heard_about',v)} options={['Social Media','Friend/Colleague','University Notice','WOMATE Community','Other']}/></Field>
      <div className="sla-declarations">
       <label><input disabled={!open} type="checkbox" checked={form.accuracy_confirmed} onChange={e=>change('accuracy_confirmed',e.target.checked)}/><span>By submitting this form, I confirm that the information provided is accurate and that I am committed to actively participating in the program.</span></label>
       <label><input disabled={!open} type="checkbox" checked={form.consent} onChange={e=>change('consent',e.target.checked)}/><span>I consent to WOMATE securely storing and reviewing this application for admissions purposes.</span></label>
       <label><input disabled={!open} type="checkbox" checked={form.privacy_accepted} onChange={e=>change('privacy_accepted',e.target.checked)}/><span>I have read and accept WOMATE's Privacy Policy and Terms.</span></label>
      </div>
      <label className="sla-honey" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={e=>change('website',e.target.value)}/></label>
     </section>}

     <div className="sla-formNav">
      <button type="button" className="secondary" disabled={step===1} onClick={()=>{setMessage('');setStep(s=>Math.max(1,s-1))}}><ArrowLeft size={16}/> Back</button>
      {step<3?<button type="button" disabled={step===1?!stepOneValid:!stepTwoValid} onClick={next}>Continue <ArrowRight size={16}/></button>:<button type="submit" disabled={!open||busy||!stepThreeValid}>{busy?'Submitting…':'Submit application'} <ArrowRight size={16}/></button>}
     </div>
    </form>}
   </section>
  </div>}

  {mode==='status'&&<section className="sla-statusWrap">
   <div className="sla-statusIntro"><div className="sla-statusLabel"><ShieldCheck size={19} aria-hidden="true"/><span>APPLICATION TRACKER</span></div><h2>Check your application.</h2><p>Use the reference issued after submission and the same email address used in your application.</p></div>
   <form className="sla-statusForm" onSubmit={check}><Field label="Application reference"><input required value={lookup.reference} onChange={e=>setLookup(x=>({...x,reference:e.target.value.toUpperCase()}))} placeholder="WOM-XXXXXXXXXX"/></Field><Field label="Email address"><input required type="email" value={lookup.email} onChange={e=>setLookup(x=>({...x,email:e.target.value}))}/></Field><button disabled={busy}>{busy?'Checking…':'Check status'} <ArrowRight size={16}/></button></form>
   {result?.ok&&result.status&&<article className="sla-statusCard"><small>APPLICATION {result.reference}</small><h3>{String(result.status).replaceAll('_',' ')}</h3>{result.decision_note&&<p>{result.decision_note}</p>}{result.status==='selected'&&<><Field label="Offer / selection code"><input value={lookup.code} onChange={e=>setLookup(x=>({...x,code:e.target.value.toUpperCase()}))} placeholder="Enter your code"/></Field><div className="sla-statusActions"><button disabled={busy||lookup.code.length<6} onClick={()=>offer(true)}>Accept offer</button><button className="secondary" disabled={busy||lookup.code.length<6} onClick={()=>offer(false)}>Decline</button></div></>}{result.status==='offer_accepted'&&<div className="sla-next"><CheckCircle2/><div><strong>Offer accepted</strong><p>Continue to Canopy using this same email address.</p><a href="/canopy/signup">Create Canopy account <ArrowRight size={15}/></a><a href="/canopy/login">Already have an account? Sign in</a></div></div>}</article>}
  </section>}

  {message&&<p className="sla-message" role="status">{message}</p>}
 </main>;
}
