import React,{useEffect,useState} from 'react';
import CanopyTalentFinance from './CanopyTalentFinance';
import {getAdminCollaborationOverview,getAdminFacilitationAgreements,proposeAdminFacilitationTerms,getAdminCollaborationSafetyQueue,reviewAdminCollaborationSafety,getAdminVisitorSafetyQueue,reviewAdminVisitorSafety,getAdminRequesterVerificationQueue,reviewAdminRequesterOrganisation,reportCollaborationSafety,recordCollaborationMilestone} from './canopyApi';

const safeText=value=>String(value||'').trim();
const date=value=>value?new Date(value).toLocaleDateString(): '—';
export function CollaborationControls({session,channel,requestId,status}){
 const [reason,setReason]=useState('scam'),[description,setDescription]=useState(''),[milestone,setMilestone]=useState('discussion'),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[reportOpen,setReportOpen]=useState(false);
 const submitReport=async()=>{if(description.trim().length<10){setNotice('Please describe the concern in at least 10 characters.');return}
 setBusy(true);try{await reportCollaborationSafety(session,channel,requestId,reason,description);setNotice('Safety report submitted to WOMATE for review.');setReportOpen(false);setDescription('')}catch(e){setNotice(e.message)}finally{setBusy(false)}};
 const save=async()=>{setBusy(true);try{await recordCollaborationMilestone(session,channel,requestId,milestone);setNotice('Collaboration milestone saved. This does not create a fee.')}catch(e){setNotice(e.message)}finally{setBusy(false)}};
 return <div style={{marginTop:12,padding:12,border:'1px solid #d6e6dc',borderRadius:12}}>
  {status==='accepted'&&<div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
    <label>Progress <select aria-label="Collaboration progress" value={milestone} onChange={e=>setMilestone(e.target.value)}><option value="discussion">Discussion</option><option value="proposal">Proposal shared</option><option value="agreed">Agreement reached</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
    <button type="button" disabled={busy} onClick={save}>Save progress</button>
   </div>}
  <button type="button" className="ghost" onClick={()=>setReportOpen(v=>!v)} aria-expanded={reportOpen}>{reportOpen?'Close safety report':'Report a safety concern'}</button>
  {reportOpen&&<div style={{display:'grid',gap:8,marginTop:8}}>
   <label>Concern <select value={reason} onChange={e=>setReason(e.target.value)}><option value="scam">Suspected scam</option><option value="harassment">Harassment</option><option value="impersonation">Impersonation</option><option value="payment_pressure">Payment pressure</option><option value="other">Other concern</option></select></label>
   <label>Describe the concern (do not paste private messages unless needed)<textarea value={description} maxLength={1500} rows={3} onChange={e=>setDescription(e.target.value)}/></label>
   <button type="button" disabled={busy||description.trim().length<10} onClick={submitReport}>Send confidential report</button>
  </div>}
  {notice&&<p role="status">{notice}</p>}
 </div>
}
export default function CanopyCollaborationOversight({session}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[query,setQuery]=useState(''),[status,setStatus]=useState('all'),[loading,setLoading]=useState(false);
 const load=async()=>{setLoading(true);try{setData(await getAdminCollaborationOverview(session));setError('')}catch(e){setError(e.message)}finally{setLoading(false)}};
 useEffect(()=>{load()},[session?.access_token]);
 const [cases,setCases]=useState([]),[caseStatus,setCaseStatus]=useState({}),[caseNotes,setCaseNotes]=useState({}),[reviewError,setReviewError]=useState('');
 const loadCases=async()=>{try{const x=await getAdminCollaborationSafetyQueue(session);setCases(Array.isArray(x)?x:[])}catch(e){setReviewError(e.message)}};
 const review=async item=>{const next=caseStatus[item.id]||'reviewing',note=(caseNotes[item.id]||'').trim();if(note.length<12){setReviewError('Enter at least 12 characters explaining the decision.');return}
 try{await reviewAdminCollaborationSafety(session,item.id,next,note);setReviewError('');await loadCases();await load()}catch(e){setReviewError(e.message)}};
 useEffect(()=>{loadCases()},[session?.access_token]);
 const [visitorCases,setVisitorCases]=useState([]),[visitorNotes,setVisitorNotes]=useState({}),[visitorStatus,setVisitorStatus]=useState({}),[visitorError,setVisitorError]=useState('');
 const loadVisitorCases=async()=>{try{const x=await getAdminVisitorSafetyQueue(session);setVisitorCases(Array.isArray(x)?x:[])}catch(e){setVisitorError(e.message)}};
 useEffect(()=>{loadVisitorCases()},[session?.access_token]);
 const reviewVisitor=async x=>{const note=(visitorNotes[x.id]||'').trim(),status=visitorStatus[x.id]||x.status;if(note.length<12||!['reviewing','resolved','dismissed'].includes(status)){setVisitorError('Select a review decision and enter 12 or more characters.');return}
 try{await reviewAdminVisitorSafety(session,x.id,status,note);setVisitorError('');await loadVisitorCases()}catch(e){setVisitorError(e.message)}};
 const[organisations,setOrganisations]=useState([]),[organisationStatus,setOrganisationStatus]=useState({}),[organisationNotes,setOrganisationNotes]=useState({}),[organisationError,setOrganisationError]=useState('');
 const loadOrganisations=async()=>{try{const x=await getAdminRequesterVerificationQueue(session);setOrganisations(Array.isArray(x)?x:[])}catch(e){setOrganisationError(e.message)}};
 useEffect(()=>{loadOrganisations()},[session?.access_token]);
 const reviewOrganisation=async x=>{const next=organisationStatus[x.request_id]||x.status,note=(organisationNotes[x.request_id]||'').trim();if(!['reviewing','verified','rejected'].includes(next)||note.length<12){setOrganisationError('Select a decision and explain it in at least 12 characters.');return}
 try{await reviewAdminRequesterOrganisation(session,x.request_id,next,note);setOrganisationError('');await loadOrganisations()}catch(e){setOrganisationError(e.message)}};

 const [agreementOpen,setAgreementOpen]=useState(''),[agreementDraft,setAgreementDraft]=useState({scope:'',value:'',currency:'GHS',rate:'5'}),[agreementInfo,setAgreementInfo]=useState('');
 const propose=async requestId=>{setAgreementInfo('');
  if(agreementDraft.scope.trim().length<20||!Number(agreementDraft.value)||Number(agreementDraft.value)<=0||Number(agreementDraft.rate)<0||Number(agreementDraft.rate)>15){setAgreementInfo('Provide scope (20+ characters), positive deal value and fee between 0% and 15%.');return}
  try{await proposeAdminFacilitationTerms(session,requestId,agreementDraft.scope.trim(),agreementDraft.value,agreementDraft.currency,agreementDraft.rate);
   setAgreementInfo('Proposal saved. Learner and requester must separately consent. No payment taken.');setAgreementOpen('');}
  catch(e){setAgreementInfo(e.message)}
 };
 const[agreements,setAgreements]=useState([]),[agreementError,setAgreementError]=useState('');
 const loadAgreements=async()=>{try{const a=await getAdminFacilitationAgreements(session);setAgreements(Array.isArray(a)?a:[])}catch(e){setAgreementError(e.message)}};
 useEffect(()=>{loadAgreements()},[session?.access_token]);
 const rows=(data?.rows||[]).filter(r=>(status==='all'||r.status===status)&&(!query||[r.learner,r.requester,r.organisation].some(s=>safeText(s).toLowerCase().includes(query.toLowerCase()))));
 return <><CanopyTalentFinance session={session}/><section className="ct-directory" style={{marginBottom:32}}>
  <div className="ct-sectionHead"><div><small>PRIVACY-FIRST OVERSIGHT</small><h2>Collaborations and safety</h2><p>Request metadata only. Private messages and contact details are not shown.</p></div><button type="button" className="ghost" onClick={load} disabled={loading}>Refresh</button></div>
  {error?<p role="alert" className="ct-msg">Administrative overview unavailable: {error}</p>:<div>
   {agreementInfo&&<p role="status">{agreementInfo}</p>}<div className="ct-adminSummary"><span><b>{data?.total??'—'}</b> requests</span><span><b>{data?.unique_learners??'—'}</b> learners contacted</span><span><b>{data?.pending??'—'}</b> pending</span><span><b>{data?.accepted??'—'}</b> accepted</span><span><b>{data?.open_safety_cases??'—'}</b> flagged</span></div>
   <div className="ct-filterBar"><input aria-label="Search collaborations" placeholder="Search learner, requester, organisation" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="Filter collaboration status" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All requests</option><option value="pending">Pending</option><option value="accepted">Accepted</option><option value="declined">Declined</option></select></div>
   <div className="ct-adminRows">{rows.map(r=><article key={r.channel+':'+r.id}>
     <div><b>{r.learner}</b><span>From {r.requester} · {r.organisation||r.channel} · {date(r.created_at)}</span>
     <small>{r.channel==='public'?'Public visitor':'WOMATE member'} · {r.status} · {r.milestone}{r.flagged?' · Safety review required':''}</small>
     {r.channel==='public'&&<p style={{fontSize:12}}>Requester email: {r.email_verified?'Ownership confirmed':'Unconfirmed'} · Organisation: {r.organisation_review||'Not submitted'}</p>}
     </div>
     {r.channel==='public'&&r.status==='accepted'&&r.email_verified&&r.organisation_review==='verified'&&<div>
      <button type="button" className="ghost" onClick={()=>{setAgreementOpen(v=>v===r.id?'':r.id);setAgreementInfo('')}}>Propose optional commercial terms</button>
      {agreementOpen===r.id&&<div style={{display:'grid',gap:8,marginTop:8}}>
        <p>Organisation-paid fee only. Both parties must agree; no automatic payment or deduction.</p>
        <label>Project scope<textarea maxLength={1000} rows={3} value={agreementDraft.scope} onChange={e=>setAgreementDraft(v=>({...v,scope:e.target.value}))}/></label>
        <label>Prospective deal value<input type="number" min="1" value={agreementDraft.value} onChange={e=>setAgreementDraft(v=>({...v,value:e.target.value}))}/></label>
        <label>Currency<select value={agreementDraft.currency} onChange={e=>setAgreementDraft(v=>({...v,currency:e.target.value}))}>{['GHS','NGN','KES','ZAR','RWF','ZMW','USD'].map(v=><option key={v}>{v}</option>)}</select></label>
        <label>Proposed fee (%)<input type="number" min="0" max="15" step="0.5" value={agreementDraft.rate} onChange={e=>setAgreementDraft(v=>({...v,rate:e.target.value}))}/></label>
        <button type="button" onClick={()=>propose(r.id)}>Submit for two-party consent</button>
      </div>}
     </div>}
    </article>)} {!rows.length&&<div className="ct-empty">No collaborations match this view.</div>}</div>
  </div>}
  <div style={{marginTop:24}}>
   <h3>Prospective facilitation agreements</h3>
   <p>Audit-only register of proposals and consent from both parties. No automatic charges or payments.</p>
   {agreementError&&<p role="alert">{agreementError}</p>}
   <button type="button" className="ghost" onClick={loadAgreements}>Refresh agreements</button>
   {agreements.map(a=><article key={a.id} style={{padding:14,border:'1px solid #d6e6dc',borderRadius:12,marginTop:10}}>
     <b>{a.learner} · {a.requester}</b>
     <p>{a.scope}</p><small>{a.currency} {Number(a.deal_value).toLocaleString()} · {a.fee_rate}% prospective organisation-paid fee · {a.status}</small>
     <p style={{fontSize:12}}>Learner consent: {a.learner_accepted_at?'Recorded':'Not recorded'} · Requester consent: {a.requester_accepted_at?'Recorded':'Not recorded'}</p>
   </article>)}
   {!agreements.length&&<p>No commercial terms have been proposed.</p>}
  </div>
  <div style={{marginTop:24}}>
   <h3>Organisation evidence review</h3>
   <p>Review public organisation information submitted voluntarily. Marking an organisation reviewed does not verify its requester's personal identity or email ownership.</p>
   {organisationError&&<p role="alert">{organisationError}</p>}
   {organisations.map(x=><article key={x.request_id} style={{border:'1px solid #d6e6dc',padding:16,borderRadius:12,marginBottom:12}}>
    <strong>{x.requester} · {x.organisation||'Organisation not given'}</strong><p>For {x.learner}</p>
    <p><a href={x.website} target="_blank" rel="noopener noreferrer">Submitted website</a>{x.proof_url&&<> · <a href={x.proof_url} target="_blank" rel="noopener noreferrer">Supporting reference</a></>}</p>
    <small>Status: {x.status} · {date(x.submitted_at)}</small>
    <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:10}}>
      <select aria-label="Organisation review decision" value={organisationStatus[x.request_id]||x.status} onChange={e=>setOrganisationStatus(v=>({...v,[x.request_id]:e.target.value}))}>
       <option value="submitted">Submitted</option><option value="reviewing">Reviewing</option><option value="verified">Organisation reviewed</option><option value="rejected">Rejected</option>
      </select>
      <input aria-label="Organisation review note" placeholder="Document verification rationale" value={organisationNotes[x.request_id]||''} onChange={e=>setOrganisationNotes(v=>({...v,[x.request_id]:e.target.value}))}/>
      <button type="button" disabled={(organisationNotes[x.request_id]||'').trim().length<12||!['reviewing','verified','rejected'].includes(organisationStatus[x.request_id]||x.status)} onClick={()=>reviewOrganisation(x)}>Save review</button>
    </div>
   </article>)}
   {!organisations.length&&<p>No organisation evidence submitted yet.</p>}
  </div>
  <div style={{marginTop:24}}>
   <h3>Confidential safety reviews</h3><p>Only learner-submitted reports are shown. Report descriptions are provided voluntarily, not copied from private conversations.</p>
   {reviewError&&<p role="alert" className="ct-msg">{reviewError}</p>}
   {cases.map(x=><article key={x.id} style={{border:'1px solid #d6e6dc',borderRadius:12,padding:16,marginBottom:12}}>
    <strong>{x.learner} · {x.reason}</strong><p>{x.description}</p><small>{x.channel} request · {x.status} · {date(x.created_at)}</small>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:10}}>
     <select aria-label={'Case status for '+x.learner} value={caseStatus[x.id]||x.status} onChange={e=>setCaseStatus(s=>({...s,[x.id]:e.target.value}))}>
      <option value="open">Open</option><option value="reviewing">Reviewing</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option>
     </select>
     <input aria-label={'Review note for '+x.learner} placeholder="Reason for decision (12+ characters)" value={caseNotes[x.id]||''} onChange={e=>setCaseNotes(s=>({...s,[x.id]:e.target.value}))}/>
     <button type="button" onClick={()=>review(x)} disabled={(caseNotes[x.id]||'').trim().length<12||!(caseStatus[x.id]||x.status)||((caseStatus[x.id]||x.status)==='open')}>Record review</button>
    </div>
   </article>)}
   {!cases.length&&<p>No signed-in learner reports submitted yet.</p>}
   <h3 style={{marginTop:24}}>External requester reports</h3>
   <p>Confidential reports from visitors using their private request access. No automatic chat disclosure.</p>
   {visitorError&&<p role="alert">{visitorError}</p>}
   {visitorCases.map(x=><article key={x.id} style={{border:'1px solid #d6e6dc',padding:16,borderRadius:12,marginBottom:12}}>
     <strong>{x.requester} → {x.learner}</strong>
     <p>{x.reason}: {x.description}</p><small>{x.status} · {date(x.created_at)}</small>
     <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:10}}>
       <select aria-label="Review visitor report" value={visitorStatus[x.id]||x.status} onChange={e=>setVisitorStatus(s=>({...s,[x.id]:e.target.value}))}>
         <option value="open">Open</option><option value="reviewing">Reviewing</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option>
       </select>
       <input aria-label="Visitor safety review note" placeholder="Decision rationale (12+ characters)" value={visitorNotes[x.id]||''} onChange={e=>setVisitorNotes(s=>({...s,[x.id]:e.target.value}))}/>
       <button type="button" disabled={(visitorNotes[x.id]||'').trim().length<12||!['reviewing','resolved','dismissed'].includes(visitorStatus[x.id]||x.status)} onClick={()=>reviewVisitor(x)}>Record review</button>
     </div>
   </article>)}
   {!visitorCases.length&&<p>No external requester reports submitted yet.</p>}
  </div>
 </section></>
}
