import React,{useEffect,useState} from 'react';
import {getCanopySimpleInactivity2026,unenrollCanopySimple2026,getCanopyC2StatusIndex,restoreCanopyWithdrawn2026} from './canopyApi';
import './canopyAdminClosing.css';

const DEFAULT_RESTORE_REASON='Re-enrolled to Cohort 2 following WOMATE administrator review.';
function dueDate(value){
 if(!value)return 'Date unavailable';
 const date=new Date(value);
 return Number.isNaN(date.getTime())?'Date unavailable':date.toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'UTC'})+' GMT';
}

export default function CanopySimpleInactivity({viewer}){
 const [active,setActive]=useState([]);
 const [withdrawn,setWithdrawn]=useState([]);
 const [tab,setTab]=useState('active');
 const [query,setQuery]=useState('');
 const [busy,setBusy]=useState('');
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [restoreUser,setRestoreUser]=useState('');
 const [reason,setReason]=useState(DEFAULT_RESTORE_REASON);

 async function load(){
  setBusy('load');setError('');
  try{
   const [candidateRows,statusRows]=await Promise.all([
    getCanopySimpleInactivity2026(viewer.session),
    getCanopyC2StatusIndex(viewer.session)
   ]);
   setActive(Array.isArray(candidateRows)?candidateRows:[]);
   // Status index is admin-only. Deleted identities are NOT eligible for restoration.
   setWithdrawn((Array.isArray(statusRows)?statusRows:[]).filter(r=>r.status==='unenrolled'));
  }catch(e){setError(e?.message||'Unable to load Cohort 2 learner records.')}
  finally{setBusy('')}
 }
 useEffect(()=>{load()},[viewer?.session?.access_token]);

 async function unenroll(row){
  const name=row.full_name||row.email||'this learner';
  if(!window.confirm('Unenrol '+name+' from Cohort 2? Confirm you have checked the learner\'s attendance forms and other participation evidence. Their account will enter the seven-day withdrawal period.'))return;
  setBusy(row.user_id);setError('');setNotice('');
  try{
   await unenrollCanopySimple2026(viewer.session,row.user_id);
   setNotice(name+' has been unenrolled. The seven-day withdrawal period has started.');
   await load();
  }catch(e){setError(e?.message||'Unenrolment failed. No status change was confirmed.')}
  finally{setBusy('')}
 }
 function startRestore(row){
  setError('');setNotice('');setReason(DEFAULT_RESTORE_REASON);
  setRestoreUser(row.user_id);
 }
 async function restore(row){
  const name=row.full_name||row.email||'this learner';
  const note=reason.trim();
  if(note.length<15){setError('Enter a restoration reason of at least 15 characters.');return}
  if(!window.confirm('Restore '+name+' to active Cohort 2 enrolment? This cancels their pending seven-day deletion.'))return;
  setBusy(row.user_id);setError('');setNotice('');
  try{
   await restoreCanopyWithdrawn2026(viewer.session,row.user_id,note);
   setRestoreUser('');
   setNotice(name+' has been restored to active Cohort 2 enrolment. Their pending deletion has been cancelled.');
   await load();
  }catch(e){setError(e?.message||'Restore access failed. No restoration was confirmed.')}
  finally{setBusy('')}
 }

 const list=(tab==='active'?active:withdrawn).filter(row=>
  ((row.full_name||'')+' '+(row.email||'')+' '+(row.user_id||'')).toLowerCase().includes(query.trim().toLowerCase())
 );
 const loading=Boolean(busy);
 return <main className="cac-page cac-enrolment">
  <header className="cac-head">
   <span className="canopyEyebrow">WOMATE · COHORT 2 · 2026</span>
   <h1>Manage learner enrolment</h1>
   <p>Review inactive learners, unenrol individually or restore a withdrawn learner before their account is deleted. All changes are recorded.</p>
  </header>
  <div className="cac-enrolment-tabs" role="tablist" aria-label="Cohort 2 enrolment status">
   <button type="button" role="tab" id="cac-tab-active" aria-controls="cac-enrolment-panel" aria-selected={tab==='active'} className={tab==='active'?'is-active':''} onClick={()=>{setTab('active');setQuery('');setRestoreUser('');setError('')}}>
    Active learners <strong>{active.length}</strong>
   </button>
   <button type="button" role="tab" id="cac-tab-withdrawn" aria-controls="cac-enrolment-panel" aria-selected={tab==='withdrawn'} className={tab==='withdrawn'?'is-active':''} onClick={()=>{setTab('withdrawn');setQuery('');setRestoreUser('');setError('')}}>
    Withdrawn learners <strong>{withdrawn.length}</strong>
   </button>
  </div>
  <section id="cac-enrolment-panel" role="tabpanel" aria-labelledby={tab==='active'?'cac-tab-active':'cac-tab-withdrawn'}>
   <div className="cac-enrolment-description">
    {tab==='active'
     ?<p><strong>{active.length} candidates for inactivity review.</strong> These are not all active Cohort 2 learners: only those with no recorded lessons, live attendance or assignment submissions. Confirm other evidence before unenrolling.</p>
     :<p><strong>{withdrawn.length} withdrawn learner{withdrawn.length===1?'':'s'}.</strong> Restore access before the deletion date to reactivate the original enrolment and cancel the pending account deletion. Accounts already deleted cannot be restored here.</p>}
   </div>
   <div className="cac-toolbar">
    <input type="search" aria-label="Find learner" placeholder="Search name, email or learner ID" value={query} onChange={e=>setQuery(e.target.value)}/>
    <button type="button" onClick={load} disabled={loading}> {busy==='load'?'Refreshing…':'Refresh'}</button>
   </div>
   {error&&<p className="cac-error" role="alert">{error}</p>}
   {notice&&<p className="cac-enrolment-success" role="status">{notice}</p>}
   <div className="cac-list">
    {list.map(row=><article key={row.user_id} className="cac-enrolment-row">
     <div className="cac-enrolment-info">
      <h2>{row.full_name||'Learner'}</h2>
      <p>{row.email||row.user_id}</p>
      {tab==='withdrawn'&&<small>Deletion scheduled: <strong>{dueDate(row.action_at)}</strong></small>}
      {tab==='active'&&<small>Zero recorded Canopy lesson, attendance and assignment activity</small>}
     </div>
     {tab==='active'
      ?<button type="button" disabled={loading} onClick={()=>unenroll(row)}>{busy===row.user_id?'Unenrolling…':'Unenrol'}</button>
      :<div className="cac-restore-area">
        {restoreUser!==row.user_id
         ?<button type="button" disabled={loading} onClick={()=>startRestore(row)}>Restore access</button>
         :<div className="cac-restore-form">
           <label htmlFor={'cac-reason-'+row.user_id}>Reason for restoring access</label>
           <textarea id={'cac-reason-'+row.user_id} value={reason} onChange={e=>setReason(e.target.value)} maxLength={900} rows={3} disabled={loading}/>
           <div className="cac-restore-actions">
            <button type="button" disabled={loading||reason.trim().length<15} onClick={()=>restore(row)}>{busy===row.user_id?'Restoring…':'Confirm restore'}</button>
            <button type="button" className="cac-secondary-action" disabled={loading} onClick={()=>setRestoreUser('')}>Cancel</button>
           </div>
         </div>}
       </div>}
    </article>)}
    {!loading&&!list.length&&<p className="cac-enrolment-empty">{query?'No learners match your search.':tab==='active'?'No learners currently meet the inactivity criteria.':'No withdrawn learners are awaiting restoration.'}</p>}
   </div>
  </section>
 </main>;
}
