import React,{useEffect,useMemo,useState} from 'react';
import {ArrowRight,BarChart3,CheckCircle2,Clock3,Download,FileText,Mail,RefreshCw,UserCheck,UsersRound} from 'lucide-react';
import {
 getAdmissionsState,listCohortApplications,reviewCohortApplication,setCohortAdmissions,
 scoreCohortApplication,promoteWaitlistedApplication,expireCohortOffers,queueAdmissionsReminders,
 getAdmissionsAnalytics,getAdmissionsEmailQueue,getAdmissionsMailStatus
} from './canopyAdmissionsApi';

const labels={submitted:'Submitted',under_review:'Under review',selected:'Selected',waitlisted:'Waitlisted',not_selected:'Not selected',offer_accepted:'Offer accepted',offer_declined:'Offer declined',account_linked:'Account linked',onboarding_complete:'Onboarding complete',withdrawn:'Withdrawn'};
const rubricMeta=[
 ['motivation','Motivation',30],
 ['climate_alignment','Climate alignment',20],
 ['leadership_community','Leadership & community',20],
 ['commitment','Commitment',20],
 ['cohort_contribution','Cohort contribution',10]
];

function csvEscape(v){const s=String(v??'');return /[",\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s}
function downloadCsv(rows,cohort){
 const cols=[
  ['reference','Reference'],['full_name','Full name'],['email','Email'],['phone_whatsapp','Phone / WhatsApp'],['gender','Gender'],
  ['nationality','Nationality'],['country','Country'],['city_region','City / region'],['age_range','Age range'],['current_status','Current status'],
  ['university_program','University / programme'],['year_of_study','Year of study'],['heard_about','Heard about WOMATE'],['status','Admissions status'],
  ['review_score','Review score'],['submitted_at','Submitted at'],['decision_email_status','Email status']
 ];
 const head=cols.map(([,h])=>csvEscape(h)).join(',');
 const body=rows.map(r=>cols.map(([k])=>csvEscape(r[k])).join(',')).join('\n');
 const blob=new Blob([head+'\n'+body],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='WOMATE-'+String(cohort||'cohort').replace(/[^a-z0-9]+/gi,'-')+'-admissions.csv';a.click();URL.revokeObjectURL(url);
}

export default function CanopyAdmissionsAdmin({viewer,cohort}){
 const [rows,setRows]=useState([]),[state,setState]=useState(null),[analytics,setAnalytics]=useState(null),[mail,setMail]=useState(null),[mailStatus,setMailStatus]=useState(null);
 const [filter,setFilter]=useState('all'),[q,setQ]=useState(''),[busy,setBusy]=useState(''),[msg,setMsg]=useState(''),[drafts,setDrafts]=useState({}),[rubrics,setRubrics]=useState({});
 const [windowForm,setWindowForm]=useState({opens:'',closes:''});
 const key=cohort?.cohort_key||'';

 const load=async()=>{
  if(!key)return;
  try{
   const [apps,st,an,mq,ms]=await Promise.all([
    listCohortApplications(key,viewer.session),getAdmissionsState(key),
    getAdmissionsAnalytics(key,viewer.session),getAdmissionsEmailQueue(key,viewer.session),
    getAdmissionsMailStatus(viewer.session)
   ]);
   setRows(Array.isArray(apps)?apps:[]);setState(st);setAnalytics(an);setMail(mq);setMailStatus(ms);
   setWindowForm({opens:st?.application_opens_at?new Date(st.application_opens_at).toISOString().slice(0,16):'',closes:st?.application_closes_at?new Date(st.application_closes_at).toISOString().slice(0,16):''});
   setMsg('');
  }catch(e){setMsg(e.message)}
 };
 useEffect(()=>{load()},[key,viewer?.session?.access_token]);

 const counts=useMemo(()=>Object.fromEntries(['all',...Object.keys(labels)].map(s=>[s,s==='all'?rows.length:rows.filter(x=>x.status===s).length])),[rows]);
 const filtered=rows.filter(x=>(filter==='all'||x.status===filter)&&[x.full_name,x.email,x.country,x.city_region,x.nationality,x.current_status,x.university_program,x.motivation,x.reference].join(' ').toLowerCase().includes(q.toLowerCase()));
 const accepted=(analytics?.funnel?.accepted||0),capacity=Number(state?.seat_capacity||0),available=capacity?Math.max(0,capacity-accepted):null;

 const draft=x=>drafts[x.id]||{status:x.status==='submitted'?'under_review':x.status,score:x.review_score??'',private_note:x.reviewer_note_private||'',public_note:x.decision_note_public||'',offer_expires_at:x.offer_expires_at?new Date(x.offer_expires_at).toISOString().slice(0,16):''};
 const setDraft=(id,patch)=>setDrafts(d=>({...d,[id]:{...draft(rows.find(x=>x.id===id)||{}),...patch}}));
 const rubric=x=>rubrics[x.id]||{motivation:Number(x.rubric_scores?.motivation||0),climate_alignment:Number(x.rubric_scores?.climate_alignment||0),leadership_community:Number(x.rubric_scores?.leadership_community||0),commitment:Number(x.rubric_scores?.commitment||0),cohort_contribution:Number(x.rubric_scores?.cohort_contribution||0)};
 const setRubric=(id,k,v)=>setRubrics(r=>({...r,[id]:{...rubric(rows.find(x=>x.id===id)||{}),[k]:Math.max(0,Number(v||0))}}));
 const rubricTotal=x=>Object.values(rubric(x)).reduce((a,b)=>a+Number(b||0),0);

 const saveRubric=async x=>{setBusy('rubric:'+x.id);setMsg('');try{await scoreCohortApplication(x.id,rubric(x),draft(x).private_note,viewer.session);setMsg('Rubric saved. Total score: '+rubricTotal(x)+'/100.');await load()}catch(e){setMsg(e.message)}finally{setBusy('')}};
 const save=async x=>{const d=draft(x);setBusy(x.id);setMsg('');try{const r=await reviewCohortApplication(x.id,d.status,d.score,d.private_note,d.public_note,d.offer_expires_at?new Date(d.offer_expires_at).toISOString():null,viewer.session);setMsg(r?.offer_code?'Selected. Offer code generated and queued for WOMATE Gmail delivery.':'Admissions decision saved and communication queued.');await load()}catch(e){setMsg(e.message)}finally{setBusy('')}};
 const promote=async x=>{setBusy('promote:'+x.id);setMsg('');try{const expiry=state?.acceptance_deadline?new Date(state.acceptance_deadline+'T23:59:59Z').toISOString():null;await promoteWaitlistedApplication(x.id,'A place has become available and WOMATE is pleased to offer you admission.',expiry,viewer.session);setMsg('Waitlisted applicant promoted. Offer email queued.');await load()}catch(e){setMsg(e.message)}finally{setBusy('')}};
 const toggle=async open=>{setBusy('window');setMsg('');try{await setCohortAdmissions(key,open,windowForm.opens?new Date(windowForm.opens).toISOString():null,windowForm.closes?new Date(windowForm.closes).toISOString():null,viewer.session);setMsg(open?'Applications opened.':'Applications closed.');await load()}catch(e){setMsg(e.message)}finally{setBusy('')}};
 const expire=async()=>{setBusy('expire');try{const r=await expireCohortOffers(key,viewer.session);setMsg((r?.expired||0)+' expired offer(s) released.');await load()}catch(e){setMsg(e.message)}finally{setBusy('')}};
 const reminders=async()=>{setBusy('reminders');try{const r=await queueAdmissionsReminders(key,viewer.session);setMsg((r?.offer_reminders||0)+' offer reminder(s) and '+(r?.onboarding_reminders||0)+' onboarding reminder(s) queued.');await load()}catch(e){setMsg(e.message)}finally{setBusy('')}};

 return <main className="canopyManager canopyOps canopyAdmissionsAdmin">
  <div className="canopyPageHead"><span className="canopyEyebrow">WOMATE · ADMISSIONS</span><h1>Admissions</h1><p><b>{cohort?.display_name}</b> · One cohort context from application through onboarding.</p></div>
  {msg&&<p className="canopyFormMsg" role="status">{msg}</p>}

  <section className="canopyManagerStats">
   <article><strong>{counts.all||0}</strong><span>applications</span></article>
   <article><strong>{accepted}</strong><span>offers accepted</span></article>
   <article><strong>{capacity||'—'}</strong><span>seat capacity</span></article>
   <article><strong>{available==null?'—':available}</strong><span>places remaining</span></article>
  </section>

  <section className="canopyReviewWorkspace">
   <div className="canopyReviewToolbar">
    <div className="canopyReviewToolbarLead"><span>APPLICATION WINDOW</span><strong>{state?.is_open?'Open':'Closed'}</strong></div>
    <div className="canopyAdminReviewFind">
     <label><span>Opens</span><input type="datetime-local" value={windowForm.opens} onChange={e=>setWindowForm(x=>({...x,opens:e.target.value}))}/></label>
     <label><span>Closes</span><input type="datetime-local" value={windowForm.closes} onChange={e=>setWindowForm(x=>({...x,closes:e.target.value}))}/></label>
     <button className={state?.is_open?'canopyDangerButton':'canopyPrimary'} disabled={busy==='window'} onClick={()=>toggle(!state?.is_open)}>{state?.is_open?'Close applications':'Open applications'}</button>
    </div>
    <div className="canopyAdmissionsTimeline">
     <span><Clock3/> Decision {state?.decision_date||'—'}</span>
     <span>Acceptance {state?.acceptance_deadline||'—'}</span>
     <span>Onboarding {state?.onboarding_deadline||'—'}</span>
    </div>
   </div>
  </section>

  <section className="canopyAdmissionsOps">
   <article><Mail/><div><small>WOMATE GMAIL</small><strong>{mailStatus?.enabled?'Automated delivery active':'Worker ready · Gmail authorization pending'}</strong><span>{mail?.pending||0} pending · {mail?.failed||0} failed · {mail?.sent||0} sent</span></div></article>
   <article><BarChart3/><div><small>REVIEW SCORE</small><strong>{analytics?.average_score??'—'}</strong><span>Average reviewed application score</span></div></article>
   <button className="canopySecondary" disabled={busy==='reminders'} onClick={reminders}><RefreshCw/> Queue reminders</button>
   <button className="canopySecondary" disabled={busy==='expire'} onClick={expire}><Clock3/> Release expired offers</button>
   <button className="canopySecondary" onClick={()=>downloadCsv(rows,cohort?.display_name)}><Download/> Export CSV</button>
  </section>

  <section className="canopyAdmissionsAnalytics">
   <header><span>ADMISSIONS FUNNEL</span><strong>Cohort-specific live view</strong></header>
   <div>{[
    ['Applications',analytics?.funnel?.applications||0],['Under review',analytics?.funnel?.under_review||0],['Selected',analytics?.funnel?.selected||0],
    ['Waitlisted',analytics?.funnel?.waitlisted||0],['Accepted',analytics?.funnel?.accepted||0],['Account linked',analytics?.funnel?.account_linked||0],['Onboarded',analytics?.funnel?.onboarded||0]
   ].map(([l,v])=><article key={l}><strong>{v}</strong><span>{l}</span></article>)}</div>
  </section>

  <section className="canopyReviewWorkspace">
   <div className="canopyReviewToolbar">
    <div className="canopyReviewToolbarLead"><span>APPLICATION REVIEW</span><strong>{filtered.length} shown</strong></div>
    <div className="canopyReviewFilters">{[['all','All'],['submitted','New'],['under_review','Under review'],['selected','Selected'],['waitlisted','Waitlisted'],['not_selected','Not selected'],['offer_accepted','Accepted'],['account_linked','Account linked'],['onboarding_complete','Onboarded']].map(([v,l])=><button type="button" key={v} className={filter===v?'active':''} onClick={()=>setFilter(v)}>{l}<small>{counts[v]||0}</small></button>)}</div>
    <label className="canopyAdminReviewSearch"><span>Search</span><input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Name, email, country, reference"/></label>
   </div>

   <div className="canopyReviewList">{filtered.length?filtered.map(x=>{
    const d=draft(x),r=rubric(x),total=rubricTotal(x);
    return <article className="canopyReviewCard" key={x.id}>
     <header><div><small>{x.reference} · {x.country}{x.city_region?' · '+x.city_region:''}</small><h3>{x.full_name}</h3><p>{x.email} · submitted {new Date(x.submitted_at).toLocaleString()}</p></div><span className={'canopyReviewStatus is-'+String(x.status).replaceAll('_','-')}>{labels[x.status]||x.status}</span></header>
     <div className="canopyReviewEvidence">
      <section><span>PROFILE</span><p>{[x.gender,x.age_range,x.nationality,x.current_status].filter(Boolean).join(' · ')}</p></section>
      <section><span>CONTACT</span><p>{x.phone_whatsapp||'—'} · {[x.city_region,x.country].filter(Boolean).join(', ')}</p></section>
      <section><span>STUDY</span><p>{[x.university_program,x.year_of_study].filter(Boolean).join(' · ')||'Not provided'}</p></section>
      <section><span>MOTIVATION</span><p>{x.motivation}</p></section>
      <section><span>HOPES TO GAIN</span><p>{x.hopes_to_gain||'—'}</p></section>
      <section><span>COMMITMENT</span><p>{x.commitment}</p></section>
      <section><span>ALL SESSIONS & ASSIGNMENTS</span><p>{x.committed_all_sessions?'Yes':'No'}</p></section>
      <section><span>HEARD ABOUT WOMATE</span><p>{x.heard_about||'—'}</p></section>
     </div>

     {['submitted','under_review','selected','waitlisted','not_selected'].includes(x.status)&&<>
      <div className="canopyAdmissionsRubric">
       <header><div><small>WEIGHTED RUBRIC</small><strong>{total}/100</strong></div><span>Motivation 30 · Climate alignment 20 · Leadership/community 20 · Commitment 20 · Cohort contribution 10</span></header>
       <div>{rubricMeta.map(([k,l,max])=><label key={k}><span>{l}<small>/{max}</small></span><input type="number" min="0" max={max} value={r[k]} onChange={e=>setRubric(x.id,k,e.target.value)}/></label>)}</div>
       <button className="canopySecondary" disabled={busy==='rubric:'+x.id||total>100} onClick={()=>saveRubric(x)}>Save rubric</button>
      </div>

      <form className="canopyManualReview" onSubmit={e=>e.preventDefault()}>
       <div className="canopyManualReviewGrid">
        <label>Decision<select value={d.status} onChange={e=>setDraft(x.id,{status:e.target.value})}><option value="under_review">Under review</option><option value="selected">Selected</option><option value="waitlisted">Waitlisted</option><option value="not_selected">Not selected</option></select></label>
        <label>Review score<input type="number" min="0" max="100" value={d.score} onChange={e=>setDraft(x.id,{score:e.target.value})}/></label>
        {d.status==='selected'&&<label>Offer expires<input type="datetime-local" value={d.offer_expires_at} onChange={e=>setDraft(x.id,{offer_expires_at:e.target.value})}/></label>}
        <label className="wide">Private reviewer note<textarea rows="3" value={d.private_note} onChange={e=>setDraft(x.id,{private_note:e.target.value})}/></label>
        <label className="wide">Applicant-facing decision note<textarea rows="3" value={d.public_note} onChange={e=>setDraft(x.id,{public_note:e.target.value})}/></label>
       </div>
       <div className="canopyManualReviewFoot"><div><span>WOMATE ADMISSIONS</span><small>Decisions are cohort-scoped. Selection respects configured seat capacity.</small></div><div className="canopyAccessActions">{x.status==='waitlisted'&&<button type="button" className="canopySecondary" disabled={busy==='promote:'+x.id||available===0} onClick={()=>promote(x)}><UserCheck/> Promote to selected</button>}<button type="button" className="canopyPrimary" disabled={busy===x.id} onClick={()=>save(x)}>{busy===x.id?'Saving…':'Save decision'} <ArrowRight size={15}/></button></div></div>
      </form>
     </>}

     {x.status==='offer_accepted'&&<p className="canopyFormMsg"><CheckCircle2 size={16}/> Offer accepted · waiting for Canopy account link.</p>}
     {x.status==='account_linked'&&<p className="canopyFormMsg"><UsersRound size={16}/> Canopy account linked · onboarding pending.</p>}
     {x.status==='onboarding_complete'&&<p className="canopyFormMsg"><CheckCircle2 size={16}/> Onboarding complete · cohort membership created and waiting for activation.</p>}
    </article>
   }):<div className="canopyReviewEmpty"><FileText/><h3>No applications in this view.</h3><p>Applications will appear here when the public window opens.</p></div>}</div>
  </section>
 </main>;
}
