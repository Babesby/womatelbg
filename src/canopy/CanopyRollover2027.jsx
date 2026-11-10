import React,{useEffect,useMemo,useState}from'react';
import {ArrowRight,CheckCircle2,Search,UsersRound} from 'lucide-react';
import {acceptMyRollover2027,getAdminRollover2027,getMyRollover2027,updateAdminRollover2027} from './canopyApi';

const reqLabel=(r)=>{
 const parts=[];
 if(Number(r.assignments_remaining)>0)parts.push(`${r.assignments_remaining} more reviewed assignment${Number(r.assignments_remaining)===1?'':'s'}`);
 if(Number(r.lessons_remaining)>0)parts.push(`${r.lessons_remaining} more lesson${Number(r.lessons_remaining)===1?'':'s'}`);
 if(Number(r.attendance_remaining)>0)parts.push(`${r.attendance_remaining} more live session${Number(r.attendance_remaining)===1?'':'s'}`);
 if(r.selection_code_remaining)parts.push('a generated selection code');
 return parts.length?parts.join(' · '):'No additional baseline work';
};

export function CanopyRolloverOffer({viewer}){
 const[data,setData]=useState(null),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 const load=async()=>{try{setData(await getMyRollover2027(viewer?.session))}catch(e){setMsg(e.message)}};
 useEffect(()=>{load()},[viewer?.session?.access_token]);
 const approve=async()=>{setBusy(true);setMsg('');try{setData(await acceptMyRollover2027(viewer?.session));setMsg('Approved. You have been added to She Leads Cohort 3 · 2027.')}catch(e){setMsg(e.message)}finally{setBusy(false)}};
 if(!data)return <main className="canopyDashboard"><p>{msg||'Loading your continuation offer…'}</p></main>;
 if(!data.eligible)return <main className="canopyDashboard"><div className="canopyPageHead"><span className="canopyEyebrow">SHE LEADS 2027</span><h1>Continue your WOMATE journey</h1><p>No automatic rollover offer is attached to this account. You can still register your interest for the next cohort.</p></div><a className="canopyPrimary" href="https://www.womate.org/she-leads">Register interest <ArrowRight size={16}/></a></main>;
 const transferred=data.status==='transferred';
 return <main className="canopyDashboard">
  <div className="canopyPageHead"><span className="canopyEyebrow">SHE LEADS · CONTINUE TO GRADUATION</span><h1>You do not have to start again.</h1><p>Your verified Cohort 2 work will carry forward. In Cohort 3 · 2027, you only complete what is still missing from the graduation minimum.</p></div>
  <div className="canopyStatsGrid">
   <article><span>Reviewed assignments</span><strong>{data.reviewed_assignments}/5</strong><small>Minimum carried forward: 3</small></article>
   <article><span>Lessons completed</span><strong>{data.lessons_completed}/20</strong><small>Minimum carried forward: 10</small></article>
   <article><span>Live sessions</span><strong>{data.attendance_count}/5</strong><small>Minimum carried forward: 3</small></article>
   <article><span>Selection code</span><strong>{data.has_selection_code?'Generated':'Still needed'}</strong></article>
  </div>
  <section className="canopyCard"><span className="canopyEyebrow">WHAT YOU STILL NEED</span><h2>{reqLabel(data)}</h2><p>Previous verified progress remains credited. New Cohort 3 work only needs to close these remaining minimums before final graduation review.</p></section>
  <div className="canopyActions">
   {transferred?<button className="canopyPrimary" disabled><CheckCircle2 size={17}/> Automatic transfer approved</button>:<button className="canopyPrimary" disabled={busy} onClick={approve}>{busy?'Approving…':'Approve automatic transfer'} <ArrowRight size={17}/></button>}
   <a className="canopySecondary" href="https://www.womate.org/she-leads">Register interest instead</a>
  </div>
  {msg&&<p className="canopyFormMsg" role="status">{msg}</p>}
 </main>;
}

export function CanopyRolloverAdmin({viewer}){
 const[data,setData]=useState(null),[search,setSearch]=useState(''),[status,setStatus]=useState('all'),[busy,setBusy]=useState('');
 const load=async()=>setData(await getAdminRollover2027(viewer?.session));
 useEffect(()=>{load()},[viewer?.session?.access_token]);
 const rows=useMemo(()=>{const q=search.trim().toLowerCase();return(data?.rows||[]).filter(r=>(status==='all'||r.status===status)&&(!q||[r.full_name,r.email,r.country].some(v=>String(v||'').toLowerCase().includes(q))))},[data,search,status]);
 const change=async(r,s)=>{setBusy(r.id);try{await updateAdminRollover2027(viewer?.session,r.id,s,r.admin_note||'');await load()}finally{setBusy('')}};
 if(!data)return <main className="canopyManager"><p>Loading rollover records…</p></main>;
 return <main className="canopyManager">
  <div className="canopyPageHead"><span className="canopyEyebrow">COHORT 2 → COHORT 3</span><h1>Continuation & rollover</h1><p>Track learners who did not graduate in 2026, preserve verified progress, and manage automatic transfer into She Leads Cohort 3 · 2027.</p></div>
  <div className="canopyStatsGrid">
   <article><span>Total rollover records</span><strong>{data.total}</strong></article>
   <article><span>Canopy accounts</span><strong>{data.with_account}</strong></article>
   <article><span>Need account</span><strong>{data.without_account}</strong></article>
   <article><span>Transferred</span><strong>{data.transferred}</strong></article>
  </div>
  <div className="canopyFilters">
   <label><Search size={15}/> Search<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, email or country"/></label>
   <label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All</option><option value="notified">Notified</option><option value="needs_account">Needs account</option><option value="approved">Approved</option><option value="transferred">Transferred</option><option value="declined">Declined</option></select></label>
  </div>
  <p><UsersRound size={15}/> {rows.length} learner{rows.length===1?'':'s'} shown</p>
  <div className="canopyTableWrap"><table className="canopyTable"><thead><tr><th>Learner</th><th>2026 record</th><th>Remaining minimum</th><th>Status</th><th>Manage</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}>
   <td><strong>{r.full_name}</strong><br/><small>{r.email}{r.country?` · ${r.country}`:''}</small></td>
   <td>{r.reviewed_assignments}/5 assignments · {r.lessons_completed}/20 lessons · {r.attendance_count}/5 live · {r.has_selection_code?'code ✓':'no code'}</td>
   <td>{reqLabel(r)}</td>
   <td><strong>{String(r.status).replace('_',' ')}</strong></td>
   <td><div className="canopyActions">{r.user_id&&r.status!=='transferred'&&<button className="canopyPrimary" disabled={busy===r.id} onClick={()=>change(r,'transferred')}>Transfer</button>}<button className="canopySecondary" disabled={busy===r.id} onClick={()=>change(r,'declined')}>Decline</button></div></td>
  </tr>)}</tbody></table></div>
 </main>;
}
