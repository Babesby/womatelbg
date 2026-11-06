import React,{useState} from 'react';
import {ArrowUpRight,ChevronDown,Globe2,BookOpen,UsersRound,ShieldCheck,Leaf,CheckCircle2} from 'lucide-react';
import './she-leads-asia.css';

const API=(import.meta.env.VITE_CANOPY_SUPABASE_URL||'').replace(/\/$/,'');
const KEY=import.meta.env.VITE_CANOPY_SUPABASE_ANON_KEY||'';

function InterestForm(){
 const [form,setForm]=useState({name:'',email:'',country:'',interest:'',consent:false,website:''}),[state,setState]=useState('idle'),[error,setError]=useState('');
 const change=(k,v)=>setForm(p=>({...p,[k]:v}));
 const submit=async e=>{
 e.preventDefault();setState('sending');setError('');
 try{
  if(!API||!KEY)throw Error('The expression-of-interest form is temporarily unavailable.');
  const r=await fetch(API+'/rest/v1/rpc/womate_asia_submit_interest_2027',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},body:JSON.stringify({p_name:form.name,p_email:form.email,p_country:form.country,p_interest:form.interest,p_consent:form.consent,p_website:form.website})});
  const res=await r.json();if(!r.ok||!res?.ok)throw Error(res?.message||'We could not submit your interest.');
  setState('success');setForm({name:'',email:'',country:'',interest:'',consent:false,website:''});
 }catch(err){setState('error');setError(err.message)}
 };
 return <section className="sia-interest" id="she-leads-asia-interest" aria-labelledby="sia-interest-title"><div className="sia-interestIntro"><span>THE NEXT CHAPTER · 2027</span><h2 id="sia-interest-title">Your voice belongs in the climate conversation.</h2><p>Share your interest in joining She Leads Asia Cohort 1.</p><div className="sia-micro"><CheckCircle2 size={18}/> Free five-week programme</div><div className="sia-micro"><CheckCircle2 size={18}/> Dedicated regional learning pathway</div></div><form className="sia-form" onSubmit={submit}><div className="sia-formTop"><span>SHE LEADS ASIA · COHORT 01</span><strong>Expression of Interest</strong></div>{state==='success'?<div className="sia-success" role="status"><CheckCircle2 size={35}/><h3>Thank you for raising your hand.</h3><p>Your interest has been recorded.</p><button type="button" onClick={()=>setState('idle')}>Submit another response</button></div>:<div className="sia-formFields"><label>Full name<input required maxLength={120} autoComplete="name" value={form.name} onChange={e=>change('name',e.target.value)} placeholder="Your full name"/></label><label>Email address<input required type="email" autoComplete="email" maxLength={254} value={form.email} onChange={e=>change('email',e.target.value)} placeholder="you@example.com"/></label><label>Country<input required maxLength={120} autoComplete="country-name" value={form.country} onChange={e=>change('country',e.target.value)} placeholder="Where are you based?"/></label><label>What climate issue or leadership goal matters most to you?<textarea required rows={5} minLength={12} maxLength={1500} value={form.interest} onChange={e=>change('interest',e.target.value)} placeholder="Tell us what you want to learn, challenge or change in your community."/></label><label className="sia-consent"><input required type="checkbox" checked={form.consent} onChange={e=>change('consent',e.target.checked)}/><span>I agree that WOMATE may securely store my response and email me about She Leads Asia Cohort 1. I understand this is an expression of interest, not an application.</span></label><label className="sia-honey" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={e=>change('website',e.target.value)}/></label>{state==='error'&&<p role="alert" className="sia-error">{error}</p>}<button className="sia-submit" type="submit" disabled={state==='sending'}>{state==='sending'?'Submitting…':'Express your interest'} <ArrowUpRight size={18}/></button></div>}</form></section>;
}

const modules=[
 ['01','Climate foundations & Asia’s changing risks','Build a grounded understanding of extreme heat, water insecurity, coastal risk and adaptation.'],
 ['02','Gender, justice & meaningful leadership','Explore whose needs and lived experiences shape climate decisions—and whose voices are missing.'],
 ['03','Local resilience, policy & green solutions','Connect regional evidence to climate-smart agriculture, lower-carbon food systems and coastal livelihoods.'],
 ['04','Community practice & Africa–Asia exchange','Test respectful partnership, stakeholder mapping and a realistic local climate action.'],
 ['05','Leadership pathways & your action plan','Translate everything you learn into a documented plan that you can carry beyond your final session.']
];
export default function SheLeadsAsia(){
 const explore=()=>document.getElementById('asia-learning')?.scrollIntoView({behavior:'smooth'});
 return <><section className="hero hero-she sheHero sia-hero"><div className="heroTop"><div className="heroCopy"><h1>She Leads Asia.</h1><p className="sia-heroLead">A new chapter in climate leadership, shaped by the communities, questions and possibilities of Asia.</p><div className="actions"><a className="pill lime" href="#she-leads-asia-interest">Express interest for 2027 <ArrowUpRight size={16}/></a><button type="button" className="pill ghost" onClick={explore}>Explore the programme <ChevronDown size={17}/></button></div></div><div className="sia-heroVisual"><img src="/she-leads-asia-2027-hero.svg" alt="Two Asian women discussing climate leadership"/></div></div></section>
 <main className="shePage sia-page"><div className="sia-tabs" aria-label="She Leads region navigation"><a href="/she-leads">Africa · Cohort 3 <ArrowUpRight size={14}/></a><a href="/she-leads/asia" className="active" aria-current="page">Asia · Cohort 1 <span>Upcoming</span></a></div>
 <section className="sheIntro sia-intro"><div className="sheIntroMark">SHE<br/>LEADS</div><div><h2>Climate leadership crosses borders. Your experience makes it real.</h2></div><p>You do not need to have all the answers. You need curiosity, the courage to ask better questions, and a community that will challenge and support you as you act.</p></section>
 <section className="sia-learning" id="asia-learning"><div className="sia-sectionHeading"><h2>Start with your community. Lead with a wider perspective.</h2><p>You'll explore regional climate priorities, practise making evidence-based decisions and find practical ways to shape change, not just discuss it.</p></div><div className="sia-modules">{modules.map(([n,title,summary])=><article key={n}><span>{n}</span><div><h3>{title}</h3><p>{summary}</p></div><BookOpen size={20}/></article>)}</div></section>
 <section className="sia-experience"><div><h2>Learn. Apply. Lead.</h2><p>Build a practical climate action plan with peers and experts.</p></div><div className="sia-features"><article><UsersRound/><h3>Learn together</h3><p>Exchange perspectives.</p></article><article><ShieldCheck/><h3>Stay grounded</h3><p>Use evidence and lived experience.</p></article><article><Leaf/><h3>Take action</h3><p>Leave with a practical next step.</p></article></div></section>
 <InterestForm/>
 </main></>;
}