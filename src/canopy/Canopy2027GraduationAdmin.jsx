import React,{useEffect,useState} from 'react';
import {Award,CheckCircle2,Heart,ShieldCheck} from 'lucide-react';
import {get2027AdminGraduationReflections,moderate2027GraduationReflection} from './canopyLearningApi';
import {canopyPost2026Runtime} from './canopyCohortRuntime2027';
export default function Canopy2027GraduationAdmin({viewer,cohort,progress=[],requirements={}}){
 const key=cohort?.cohort_key||'',schedule=canopyPost2026Runtime(key);
 const [items,setItems]=useState([]),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(''),[loading,setLoading]=useState(true);
 const load=async()=>{setLoading(true);try{setItems(await get2027AdminGraduationReflections(key,viewer.session)||[]);setError('')}catch(e){setError(e.message)}finally{setLoading(false)}};
 useEffect(()=>{if(key)load()},[key,viewer?.session?.access_token]);
 const act=async(user,state)=>{setBusy(user);setError('');try{await moderate2027GraduationReflection(key,user,state,viewer.session);setNotice('Moderation decision saved.');await load()}catch(e){setError(e.message)}finally{setBusy('')}};
 const countEligible=progress.filter(p=>p.lessons>=(requirements.lessons??20)&&p.approved_assignments>=(requirements.approved_assignments??5)&&p.attendance>=(requirements.attendance??5)&&p.selection_code).length;
 return <section className="c27-gradAdmin"><header className="c27-opsHeader"><div><span className="c27-kicker">WOMATE · COHORT GRADUATION</span><h1>Graduation & reflection wall</h1><p>{cohort?.display_name} · Planned {schedule?.graduationDate}</p></div></header>
 <div className="c27-opsMetrics"><div><strong>{progress.length}</strong><span>Cohort members</span></div><div><strong>{countEligible}</strong><span>Requirements met</span></div><div><strong>{progress.filter(p=>p.approved_certificate).length}</strong><span>Approved for eligibility</span></div><div><strong>{progress.filter(p=>p.certificate_url).length}</strong><span>Certificate issued</span></div></div>
 <p className="canopyFormMsg"><ShieldCheck size={17}/> Preserve the same 2026 graduation gates. For 2027 the configured thresholds are {requirements.lessons??20} lessons, {requirements.approved_assignments??5} approved assignments, {requirements.attendance??5} verified sessions and a valid selection code. Manual approval and certificate issuance remain separate steps.</p>
 <h2>Graduation wall moderation</h2><p>Review each reflection before it appears publicly to the selected cohort. Reject inappropriate submissions; learners can revise their message.</p>
 {error&&<p className="canopyFormMsg error" role="alert">{error}</p>}{notice&&<p role="status" className="canopyFormMsg">{notice}</p>}
 {loading?<p>Loading reflections…</p>:items.length===0?<div className="canopyLockedState"><Heart/><div><h3>No reflections yet</h3><p>Once eligible learners graduate and submit a reflection, it appears here for approval.</p></div></div>:<div className="c27-gradReflections">{items.map(x=><article key={x.user_id}><header><strong>{x.display_name}</strong><span>{x.state}</span></header><blockquote>{x.reflection}</blockquote><div><button type="button" disabled={busy===x.user_id} onClick={()=>act(x.user_id,'approved')}><CheckCircle2 size={16}/> Approve</button><button type="button" disabled={busy===x.user_id} onClick={()=>act(x.user_id,'rejected')}>Reject</button></div></article>)}</div>}
 </section>;
}
