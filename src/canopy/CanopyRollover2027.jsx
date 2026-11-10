import React,{useEffect,useMemo,useState}from'react';
import {ArrowRight,CheckCircle2,Search,UsersRound,UserRoundCheck,UserRoundX,RefreshCw,Filter,BookOpenCheck,ClipboardCheck,Radio,KeyRound} from 'lucide-react';
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
 if(!data)return <main className="canopyDashboard crOfferShell"><div className="crOfferLoading">Loading your continuation record…</div></main>;
 if(!data.eligible)return <main className="canopyDashboard crOfferShell">
  <section className="crOfferHero crOfferHeroCompact">
   <span className="canopyEyebrow">SHE LEADS 2027</span>
   <h1>Continue your WOMATE journey</h1>
   <p>No automatic rollover offer is attached to this account. You can still register your interest for the next cohort.</p>
   <a className="canopyPrimary crOfferPrimaryLink" href="https://www.womate.org/she-leads">Register interest <ArrowRight size={16}/></a>
  </section>
 </main>;

 const transferred=data.status==='transferred';
 const metrics=[
  {key:'assignments',label:'Reviewed assignments',icon:ClipboardCheck,current:Number(data.reviewed_assignments)||0,target:3,total:5,remaining:Number(data.assignments_remaining)||0},
  {key:'lessons',label:'Lessons',icon:BookOpenCheck,current:Number(data.lessons_completed)||0,target:10,total:20,remaining:Number(data.lessons_remaining)||0},
  {key:'live',label:'Live sessions',icon:Radio,current:Number(data.attendance_count)||0,target:3,total:5,remaining:Number(data.attendance_remaining)||0}
 ];
 return <main className="canopyDashboard crOfferShell">
  <section className="crOfferHero">
   <div className="crOfferHeroCopy">
    <span className="canopyEyebrow">SHE LEADS · CONTINUE TO GRADUATION</span>
    <h1>You do not have to start again.</h1>
    <p>Your verified Cohort 2 progress stays with you. In Cohort 3 · 2027, you only complete the graduation requirements you have not yet met.</p>
   </div>
   <div className="crOfferYearFlow" aria-label="Cohort 2 to Cohort 3"><strong>2026</strong><ArrowRight/><strong>2027</strong></div>
  </section>

  <section className="crOfferProgress" aria-label="Progress carried forward">
   <header>
    <div><span className="canopyEyebrow">YOUR VERIFIED PROGRESS</span><h2>What carries forward</h2></div>
    <p>Graduation minimums are 3 reviewed assignments, 10 lessons and 3 live sessions.</p>
   </header>
   <div className="crOfferProgressRows">
    {metrics.map(m=>{
     const Icon=m.icon;
     const credited=Math.min(m.current,m.target);
     const pct=Math.min(100,Math.round((credited/m.target)*100));
     return <article key={m.key}>
      <div className="crOfferMetricIcon"><Icon/></div>
      <div className="crOfferMetricMain">
       <div className="crOfferMetricTop"><span>{m.label}</span><strong>{m.current}<small> recorded</small></strong></div>
       <div className="crOfferTrack" aria-label={`${credited} of ${m.target} graduation minimum credited`}><span style={{width:`${pct}%`}}/></div>
       <div className="crOfferMetricFoot"><span>{credited}/{m.target} credited toward graduation</span>{m.remaining>0?<b>{m.remaining} remaining</b>:<b className="is-complete">Minimum met</b>}</div>
      </div>
     </article>
    })}
    <article className="crOfferCodeRow">
     <div className="crOfferMetricIcon"><KeyRound/></div>
     <div className="crOfferMetricMain">
      <div className="crOfferMetricTop"><span>Selection code</span><strong>{data.has_selection_code?'Ready':'Needed'}</strong></div>
      <div className="crOfferMetricFoot"><span>{data.has_selection_code?'Your existing selection code remains valid for this record.':'A valid selection code is still required before final graduation review.'}</span></div>
     </div>
    </article>
   </div>
  </section>

  <section className="crOfferRemaining">
   <span className="canopyEyebrow">WHAT YOU STILL NEED</span>
   <h2>{reqLabel(data)}</h2>
   <p>Complete only these remaining requirements in Cohort 3. Your verified 2026 work stays credited.</p>
  </section>

  <section className="crOfferDecision">
   <div>
    <span className="canopyEyebrow">{transferred?'TRANSFER CONFIRMED':'CONTINUE INTO COHORT 3'}</span>
    <h2>{transferred?'Your place is carried forward.':'Ready to continue?'}</h2>
    <p>{transferred?'You are already transferred into She Leads Climate Mentorship · Cohort 3 · 2027.':'Approve automatic transfer to keep your verified progress and continue from where you stopped.'}</p>
   </div>
   <div className="crOfferActions">
    {transferred?<button className="canopyPrimary" disabled><CheckCircle2 size={17}/> Transfer approved</button>:<button className="canopyPrimary" disabled={busy} onClick={approve}>{busy?'Approving…':'Approve automatic transfer'} <ArrowRight size={17}/></button>}
    {!transferred&&<a className="canopySecondary" href="https://www.womate.org/she-leads">Register interest instead</a>}
   </div>
  </section>

  {msg&&<p className="canopyFormMsg crOfferMsg" role="status">{msg}</p>}
 </main>;
}

export function CanopyRolloverAdmin({viewer}){
 const[data,setData]=useState(null),[search,setSearch]=useState(''),[status,setStatus]=useState('all'),[busy,setBusy]=useState('');
 const load=async()=>setData(await getAdminRollover2027(viewer?.session));
 useEffect(()=>{load()},[viewer?.session?.access_token]);
 const rows=useMemo(()=>{const q=search.trim().toLowerCase();return(data?.rows||[]).filter(r=>(status==='all'||r.status===status)&&(!q||[r.full_name,r.email,r.country].some(v=>String(v||'').toLowerCase().includes(q))))},[data,search,status]);
 const counts=useMemo(()=>{
  const list=data?.rows||[];
  return{
   notified:list.filter(r=>r.status==='notified').length,
   approved:list.filter(r=>r.status==='approved').length,
   transferred:list.filter(r=>r.status==='transferred').length,
   declined:list.filter(r=>r.status==='declined').length
  }
 },[data]);
 const change=async(r,s)=>{setBusy(r.id);try{await updateAdminRollover2027(viewer?.session,r.id,s,r.admin_note||'');await load()}finally{setBusy('')}};
 if(!data)return <main className="canopyManager"><p>Loading rollover records…</p></main>;
 return <main className="canopyManager canopyRolloverAdmin">
  <section className="cr2027Hero">
   <div>
    <span className="canopyEyebrow">SHE LEADS · 2027 CONTINUATION</span>
    <h1>Continuation & rollover</h1>
    <p>Manage eligible Cohort 2 learners who are continuing into Cohort 3 with verified 2026 progress carried forward.</p>
   </div>
   <div className="cr2027HeroMark" aria-label="Rollover year"><strong>2026</strong><ArrowRight/><strong>2027</strong></div>
  </section>

  <section className="cr2027Metrics" aria-label="Rollover summary">
   <article><div><UsersRound/></div><span>Eligible learners</span><strong>{data.total}</strong><small>Active rollover records</small></article>
   <article><div><UserRoundCheck/></div><span>Canopy accounts</span><strong>{data.with_account}</strong><small>Ready to respond</small></article>
   <article><div><UserRoundX/></div><span>Need account</span><strong>{data.without_account}</strong><small>Awaiting matched account</small></article>
   <article><div><RefreshCw/></div><span>Transferred</span><strong>{data.transferred}</strong><small>Moved into Cohort 3</small></article>
  </section>

  <section className="cr2027Workspace">
   <header className="cr2027WorkspaceHead">
    <div>
     <span className="canopyEyebrow">LEARNER PIPELINE</span>
     <h2>{rows.length} learner{rows.length===1?'':'s'}</h2>
    </div>
    <div className="cr2027StatusStrip" aria-label="Rollover statuses">
     <button className={status==='all'?'active':''} onClick={()=>setStatus('all')}>All <b>{data.total}</b></button>
     <button className={status==='notified'?'active':''} onClick={()=>setStatus('notified')}>Notified <b>{counts.notified}</b></button>
     <button className={status==='approved'?'active':''} onClick={()=>setStatus('approved')}>Approved <b>{counts.approved}</b></button>
     <button className={status==='transferred'?'active':''} onClick={()=>setStatus('transferred')}>Transferred <b>{counts.transferred}</b></button>
     <button className={status==='declined'?'active':''} onClick={()=>setStatus('declined')}>Declined <b>{counts.declined}</b></button>
    </div>
   </header>

   <div className="cr2027Toolbar">
    <label className="cr2027Search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search learner, email or country"/></label>
    <label className="cr2027Select"><Filter size={15}/><select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option><option value="notified">Notified</option><option value="needs_account">Needs account</option><option value="approved">Approved</option><option value="transferred">Transferred</option><option value="declined">Declined</option></select></label>
   </div>

   <div className="cr2027TableWrap"><table className="cr2027Table"><thead><tr><th>Learner</th><th>2026 progress</th><th>Still required</th><th>Status</th><th></th></tr></thead><tbody>{rows.map(r=>{
    const doneAssignments=Math.min(3,Number(r.reviewed_assignments)||0);
    const doneLessons=Math.min(10,Number(r.lessons_completed)||0);
    const doneLive=Math.min(3,Number(r.attendance_count)||0);
    return <tr key={r.id}>
     <td className="cr2027Learner"><strong>{r.full_name}</strong><span>{r.email}</span>{r.country&&<small>{r.country}</small>}</td>
     <td><div className="cr2027Progress">
      <span><b>Assignments</b><em>{doneAssignments}/3</em></span>
      <span><b>Lessons</b><em>{doneLessons}/10</em></span>
      <span><b>Live</b><em>{doneLive}/3</em></span>
      <span><b>Code</b><em>{r.has_selection_code?'Yes':'No'}</em></span>
     </div></td>
     <td><span className={reqLabel(r)==='No additional baseline work'?'cr2027Done':'cr2027Remaining'}>{reqLabel(r)}</span></td>
     <td><span className={'cr2027Status cr2027Status-'+String(r.status).replace('_','-')}>{String(r.status).replace('_',' ')}</span></td>
     <td className="cr2027Actions">{r.user_id&&r.status!=='transferred'&&<button className="cr2027Transfer" disabled={busy===r.id} onClick={()=>change(r,'transferred')}>{busy===r.id?'Saving…':'Transfer'}</button>}{r.status!=='declined'&&r.status!=='transferred'&&<button className="cr2027Decline" disabled={busy===r.id} onClick={()=>change(r,'declined')}>Decline</button>}</td>
    </tr>
   })}</tbody></table></div>
   {!rows.length&&<div className="cr2027Empty"><UsersRound/><h3>No learners match this view</h3><p>Change the search or status filter.</p></div>}
  </section>
 </main>;
}

