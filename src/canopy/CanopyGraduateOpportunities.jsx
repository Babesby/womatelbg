import React,{useEffect,useState} from 'react';
import {ArrowRight,BriefcaseBusiness,CheckCircle2,ExternalLink,HeartHandshake,X,ShieldCheck} from 'lucide-react';
import {getGraduatePlacementOpportunity,applyGraduatePlacement} from './canopyApi';
import './canopyGraduateOpportunities.css';

export const GRADUATE_TRACKS=['Climate advocacy & campaigns','Social media & digital communications','Marketing & partnerships','Research & policy support','Programme coordination','Community engagement','Design & multimedia','Data, technology & reporting','Climate education'];
export const GRADUATE_TYPES=['Remote internship','Remote volunteering','Project-based assignment'];
const initial={full_name:'',country:'',skills:[],work_areas:[],placement_types:[],experience:'',motivation:'',available_hours:'8',availability:'',portfolio_url:'',cv_url:'',remote_only:true,consent_share:false};
const go=route=>{if(window.location.pathname!==route)window.history.pushState({},'',route);window.dispatchEvent(new CustomEvent('womate:navigate',{detail:{path:route}}));window.scrollTo({top:0,behavior:'smooth'})};
function Multi({label,items,selected,onChange}){return <fieldset className="cgo-group"><legend>{label}</legend><div className="cgo-chips">{items.map(item=><label key={item}><input type="checkbox" checked={selected.includes(item)} onChange={e=>onChange(e.target.checked?[...selected,item]:selected.filter(x=>x!==item))}/>{item}</label>)}</div></fieldset>}
export function GraduateOpportunitiesNotice({viewer,onOpen=()=>go('/canopy/graduate-opportunities')}){
 const [status,setStatus]=useState(null),[open,setOpen]=useState(false);
 const tester=viewer?.profile?.role==='tester';
 useEffect(()=>{
  if(!viewer?.session||tester)return;
  let active=true;
  getGraduatePlacementOpportunity(viewer.session).then(r=>{
   if(!active)return;setStatus(r);
   if(!r?.eligible||r?.applied)return;
   try{const last=Number(localStorage.getItem('womate_grad_opportunity_dismissed')||0);if(Date.now()-last<86400000)return}catch{}
   setOpen(true);
  }).catch(()=>{});
  return()=>{active=false};
 },[viewer?.user?.id,viewer?.session?.access_token,tester]);
 if(!status?.eligible||status.applied||!open)return null;
 const close=()=>{setOpen(false);try{localStorage.setItem('womate_grad_opportunity_dismissed',String(Date.now()))}catch{}};
 return <div className="cgo-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}>
  <section className="cgo-modal" role="dialog" aria-modal="true" aria-labelledby="cgo-modal-title">
   <button className="cgo-close" type="button" aria-label="Close graduate opportunities notice" onClick={close}><X size={18}/></button>
   <span className="cgo-kicker">WOMATE · AFTER GRADUATION</span><h2 id="cgo-modal-title">Your climate journey continues.</h2>
   <p>We are connecting verified WOMATE graduates with organisations seeking remote interns, volunteers and project support. <strong>Beyond the Science (BTS Ghana)</strong> is our first participating host.</p>
   <p>Tell us your interests and skills. WOMATE will review every profile before sharing any suitable, consented details with an organisation.</p>
   <div className="cgo-actions"><button type="button" className="cgo-primary" onClick={()=>{close();onOpen()}}>Explore graduate opportunities <ArrowRight size={17}/></button><button type="button" onClick={close}>Maybe later</button></div>
   <small>Applications express interest; they do not guarantee an offer. There is no application fee.</small>
  </section>
 </div>;
}
export default function CanopyGraduateOpportunities({viewer,tester=false}){
 const [eligibility,setEligibility]=useState(tester?{eligible:true,applied:false}:null);
 const [form,setForm]=useState({...initial,full_name:viewer?.profile?.full_name||'',country:viewer?.profile?.country||''});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
 useEffect(()=>{if(tester)return;let mounted=true;getGraduatePlacementOpportunity(viewer.session).then(x=>{if(mounted)setEligibility(x)}).catch(e=>{if(mounted)setError(e?.message||'Could not verify graduate status')});return()=>{mounted=false}},[tester,viewer?.session?.access_token]);
 const update=(key,value)=>setForm(f=>({...f,[key]:value}));
 const submit=async e=>{e.preventDefault();if(tester)return;setBusy(true);setError('');setSuccess('');
  try{const x=await applyGraduatePlacement(viewer.session,form);if(!x?.ok)throw new Error('Application not confirmed');setSuccess('Your interest has been submitted. WOMATE will review your details and contact you when a suitable host has a defined opportunity.');setEligibility({eligible:true,applied:true,state:'submitted'})}
  catch(e){setError(e?.message||'Could not submit interest')}finally{setBusy(false)}
 };
 return <main className="cgo-page"><div className="cgo-hero"><span>WOMATE · GRADUATE NETWORK</span><h1>Keep growing. Keep creating change.</h1><p>Remote climate-focused internships, volunteering and project opportunities curated for WOMATE graduates.</p><div className="cgo-heroTag"><HeartHandshake size={16}/> Beyond the Science · Ghana · Initial host partner</div></div>
 {tester&&<p className="cgo-test"><ShieldCheck size={16}/> Canopy Tester · Full form preview. Your actions cannot create a real application or referral.</p>}
 {!eligibility&&!error&&<div className="cgo-state">Confirming your graduate eligibility…</div>}
 {eligibility&&!eligibility.eligible&&!tester&&<div className="cgo-state"><h2>For verified WOMATE graduates</h2><p>This opportunity is only for participants who have graduated. If your graduate record is missing, contact WOMATE support.</p></div>}
 {eligibility?.applied&&!tester&&<div className="cgo-state"><CheckCircle2 size={28}/><h2>Interest recorded</h2><p>{success||'Your application is on file. WOMATE will review it and contact you when a relevant opportunity is available.'}</p><p>Status: <strong>{eligibility.state||'submitted'}</strong></p></div>}
 {(eligibility?.eligible||tester)&&(!eligibility?.applied||tester)&&<form className="cgo-form" onSubmit={submit}>
  <div><small>YOUR EXPRESSION OF INTEREST</small><h2>Tell us where you could contribute.</h2><p>We will shortlist based on a host's needs, availability and consent, then contact you before making introductions.</p></div>
  <div className="cgo-fields"><label>Full name<input required minLength={2} maxLength={160} value={form.full_name} onChange={e=>update('full_name',e.target.value)}/></label>
   <label>Country of residence<input required minLength={2} maxLength={100} value={form.country} onChange={e=>update('country',e.target.value)}/></label></div>
  <Multi label="Opportunity type (choose at least one)" items={GRADUATE_TYPES} selected={form.placement_types} onChange={value=>update('placement_types',value)}/>
  <Multi label="Areas of interest (choose at least one)" items={GRADUATE_TRACKS} selected={form.work_areas} onChange={value=>update('work_areas',value)}/>
  <label>Relevant skills (comma-separated)<input placeholder="e.g. Canva, community outreach, research, writing" value={form.skills.join(', ')} onChange={e=>update('skills',e.target.value.split(',').map(s=>s.trim()).filter(Boolean).slice(0,12))}/></label>
  <label>Your experience<textarea maxLength={2500} rows={3} value={form.experience} onChange={e=>update('experience',e.target.value)} placeholder="Voluntary work, school or community projects, relevant tools…"/></label>
  <label>Why would you like to join a climate organisation? <small>(40–2500 characters)</small><textarea minLength={40} maxLength={2500} rows={5} required value={form.motivation} onChange={e=>update('motivation',e.target.value)}/></label>
  <div className="cgo-fields"><label>Hours available per week<input type="number" min="1" max="40" required value={form.available_hours} onChange={e=>update('available_hours',e.target.value)}/></label><label>Earliest availability / time zone<input required maxLength={120} placeholder="e.g. From January, GMT" value={form.availability} onChange={e=>update('availability',e.target.value)}/></label></div>
  <div className="cgo-fields"><label>Portfolio or LinkedIn HTTPS link (optional)<input type="url" value={form.portfolio_url} onChange={e=>update('portfolio_url',e.target.value)}/></label><label>Viewable CV HTTPS link (optional)<input type="url" value={form.cv_url} onChange={e=>update('cv_url',e.target.value)}/></label></div>
  <label className="cgo-checkbox"><input type="checkbox" checked={form.remote_only} onChange={e=>update('remote_only',e.target.checked)}/> I am interested in remote opportunities.</label>
  <label className="cgo-checkbox"><input type="checkbox" required checked={form.consent_share} onChange={e=>update('consent_share',e.target.checked)}/> I consent to WOMATE reviewing my information and, after curation, sharing relevant application details with prospective host organisations for placement consideration. I understand that participation is voluntary and no placement is guaranteed.</label>
  {error&&<p className="cgo-error" role="alert">{error}</p>}
  {tester?<button className="cgo-primary" type="button" disabled>Tester preview · submission disabled</button>:<button className="cgo-primary" type="submit" disabled={busy||form.placement_types.length===0||form.work_areas.length===0||!form.consent_share}>{busy?'Submitting…':'Submit expression of interest'} <ArrowRight size={17}/></button>}
  <small>Only authorised WOMATE administrators can access your full application. WOMATE will not automatically email your details to a partner.</small>
 </form>}
 <footer className="cgo-footer"><BriefcaseBusiness size={17}/> Relevant work. Responsible introductions. A stronger future for women in climate.</footer>
 </main>;
}
