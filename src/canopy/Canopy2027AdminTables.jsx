import React,{useEffect,useMemo,useState} from 'react';
import {Search,ChevronDown,ArrowUpRight,UsersRound,CheckCircle2,AlertCircle,ClipboardCheck,CalendarCheck2,Award,SlidersHorizontal} from 'lucide-react';
import './Canopy2027AdminTables.css';

const clean=x=>String(x??'').toLowerCase().trim();
const label=x=>String(x||'').replaceAll('_',' ');
const badge=status=><span className={'c27-badge c27-badge-'+(status==='active'||status==='approved'||status==='issued'?'success':status==='submitted'||status==='paused'||status==='needs_revision'?'warning':status==='withdrawn'||status==='rejected'?'danger':'neutral')}>{label(status)}</span>;
function Empty({title,description}){return <div className="c27-empty"><ClipboardCheck size={27}/><strong>{title}</strong><p>{description}</p></div>}
export function AdminList({title,description,rows=[],kind,cohortKey,busy,onAccess,onReview,onAttendance,onApprove,onIssue,requirements,notes,scores,modules,urls,update}){
 const [query,setQuery]=useState('');
 const [filter,setFilter]=useState('all');
 const [moduleFilter,setModuleFilter]=useState('all');
 const [shown,setShown]=useState(25);
 const [expanded,setExpanded]=useState('');
 const [sort,setSort]=useState('name');
 useEffect(()=>{setQuery('');setFilter('all');setModuleFilter('all');setShown(25);setExpanded('')},[kind,cohortKey]);
 const statuses=kind==='access'?['all','active','paused','withdrawn']:kind==='reviews'?['all','submitted','approved','needs_revision','rejected']:kind==='certificates'?['all','ready','not_ready','approved','issued']:['all','active','paused','withdrawn'];
 const getStatus=row=>{
   if(kind==='certificates'){
     if(row.certificate_url)return 'issued';
     if(row.approved_certificate)return 'approved';
     if(Number(row.lessons)>=requirements.lessons&&Number(row.approved_assignments)>=requirements.approved_assignments&&Number(row.attendance)>=requirements.attendance&&Boolean(row.selection_code))return 'ready';
     return 'not_ready';
   }
   return row.status||'unknown';
 };
 const moduleOptions=kind==='reviews'?['all','01','02','03','04','05']:[];
 const filtered=useMemo(()=>rows.filter(row=>{
  const match=!query||[row.name,row.country,row.status,row.module_id,row.response].some(x=>clean(x).includes(clean(query)));
  const status=filter==='all'||getStatus(row)===filter;
  const mod=moduleFilter==='all'||String(row.module_id||'').padStart(2,'0')===moduleFilter;
  return match&&status&&mod;
 }).sort((a,b)=>sort==='recent'&&kind==='reviews'?new Date(b.created_at||0)-new Date(a.created_at||0):String(a.name||'').localeCompare(String(b.name||''))),[rows,query,filter,moduleFilter,sort,kind,requirements]);
 const visible=filtered.slice(0,shown);
 const rowKey=r=>kind==='reviews'?r.id:r.user_id;
 return <section className="c27-list" aria-label={title}>
  <div className="c27-listHead"><div><h2>{title}</h2><p>{description}</p></div><span className="c27-total">{filtered.length} of {rows.length}</span></div>
  <div className="c27-filterBar" role="search" aria-label={'Filter '+title}>
   <label className="c27-search"><Search size={17} aria-hidden="true"/><span className="sr-only">Search learner, country or response</span><input type="search" value={query} onChange={e=>{setQuery(e.target.value);setShown(25)}} placeholder={kind==='reviews'?'Search learner or submission':'Search name or country'}/></label>
   <label className="c27-control"><span>Status</span><select value={filter} onChange={e=>{setFilter(e.target.value);setShown(25)}}>{statuses.map(status=><option value={status} key={status}>{status==='all'?'All statuses':label(status)}</option>)}</select></label>
   {moduleOptions.length>0&&<label className="c27-control"><span>Module</span><select value={moduleFilter} onChange={e=>{setModuleFilter(e.target.value);setShown(25)}}>{moduleOptions.map(m=><option key={m} value={m}>{m==='all'?'All modules':'Module '+m}</option>)}</select></label>}
   <label className="c27-control"><span>Order</span><select value={sort} onChange={e=>setSort(e.target.value)}><option value="name">Name A–Z</option>{kind==='reviews'&&<option value="recent">Most recent</option>}</select></label>
   {(query||filter!=='all'||moduleFilter!=='all')&&<button type="button" className="c27-reset" onClick={()=>{setQuery('');setFilter('all');setModuleFilter('all')}}>Clear filters</button>}
  </div>
  {rows.length===0?<Empty title="No records in this cohort yet" description="Records will appear when participants join and programme activities begin."/>:filtered.length===0?<Empty title="No matching records" description="Try another search or clear your filters."/>:
  <div className="c27-listTableWrap"><table className="c27-listTable">
   <thead><tr><th scope="col">Participant</th>{kind==='reviews'?<><th scope="col">Module</th><th scope="col">Attempt</th></>:kind==='certificates'?<><th scope="col">Lessons</th><th scope="col">Assignments</th><th scope="col">Sessions</th></>:kind==='attendance'?<th scope="col">Country</th>:<th scope="col">Country</th>}<th scope="col">Status</th><th scope="col" className="c27-actionHeader">Action</th></tr></thead>
   <tbody>{visible.map(row=>{
    const open=expanded===rowKey(row),status=getStatus(row);
    return <React.Fragment key={rowKey(row)}>
     <tr className={open?'is-open':''}>
      <td><strong>{row.name||'Learner'}</strong>{kind==='reviews'&&<small>{row.created_at?new Date(row.created_at).toLocaleDateString('en-GB'):'Submission'}</small>}</td>
      {kind==='reviews'?<><td>Module {String(row.module_id||'').padStart(2,'0')}</td><td>{row.attempt||1}</td></>:kind==='certificates'?<><td>{Number(row.lessons||0)}/20</td><td>{Number(row.approved_assignments||0)}/5</td><td>{Number(row.attendance||0)}/5</td></>:<td>{row.country||'Not recorded'}</td>}
      <td>{badge(status)}</td>
      <td className="c27-rowAction"><button type="button" aria-expanded={open} aria-label={(open?'Close':'Open')+' controls for '+(row.name||'learner')} onClick={()=>setExpanded(open?'':rowKey(row))}>{open?'Close':'Review'} <ChevronDown size={16} className={open?'rotated':''}/></button></td>
     </tr>
     {open&&<tr className="c27-expandedRow"><td colSpan={kind==='reviews'||kind==='certificates'?6:4}>
      <div className="c27-expanded" role="region" aria-label={'Manage '+row.name}>
       {kind==='access'&&<><p className="c27-detailTitle">Learner access · {row.country||'Country not specified'}</p><p>Changes apply only to the selected 2027 cohort. Withdrawn records are retained.</p><div className="c27-inlineActions">{['active','paused','withdrawn'].map(s=><button type="button" key={s} disabled={busy||row.status===s} className={s==='withdrawn'?'c27-danger':''} onClick={()=>onAccess(row,s)}>{s==='active'?'Activate':s==='paused'?'Pause':'Withdraw'}</button>)}</div></>}
       {kind==='reviews'&&<><p className="c27-detailTitle">Module {String(row.module_id||'').padStart(2,'0')} · Attempt {row.attempt||1}</p><div className="c27-submissionText">{row.response||'No written response'}</div>{row.evidence_url&&/^https:\/\/[^\s]+$/i.test(row.evidence_url)&&<a href={row.evidence_url} target="_blank" rel="noopener noreferrer" className="c27-evidenceLink">View attached evidence <ArrowUpRight size={15}/></a>}{row.feedback&&<p className="c27-oldFeedback"><strong>Recorded feedback:</strong> {row.feedback}</p>}
        {row.status==='submitted'?<div className="c27-editPanel"><label>Score (0–100)<input type="number" min="0" max="100" value={scores[row.id]??80} onChange={e=>update('score',row.id,Number(e.target.value))}/></label><label>Constructive feedback<textarea rows={4} placeholder="What was strong? What needs more evidence? What should they improve?" value={notes[row.id]||''} onChange={e=>update('note',row.id,e.target.value)}/></label><div className="c27-inlineActions">{[['approved','Approve'],['needs_revision','Request revision'],['rejected','Reject']].map(([decision,label])=><button type="button" key={decision} disabled={busy||String(notes[row.id]||'').trim().length<20||Number(scores[row.id]??80)<0||Number(scores[row.id]??80)>100} onClick={()=>onReview(row,decision)}>{label}</button>)}</div><small>Feedback of at least 20 characters is required for each decision.</small></div>:<p>Decision recorded. This submission remains available for review history.</p>}
       </>}
       {kind==='attendance'&&<><p className="c27-detailTitle">Verify live attendance</p><p>Five sessions per learner; a minimum of three is required for graduation. Choose the actual session before recording attendance.</p><div className="c27-inlineActions"><label>Session<select value={modules[row.user_id]||'01'} onChange={e=>update('module',row.user_id,e.target.value)}>{['01','02','03','04','05'].map(n=><option value={n} key={n}>Module {n}</option>)}</select></label><button type="button" disabled={busy||row.status!=='active'} onClick={()=>onAttendance(row,true)}>Mark attended</button><button type="button" disabled={busy||row.status!=='active'} onClick={()=>onAttendance(row,false)}>Mark absent</button></div></>}
       {kind==='certificates'&&<><div className="c27-eligibility"><span>{Number(row.lessons||0)} / {requirements.lessons} lessons</span><span>{Number(row.approved_assignments||0)} / {requirements.approved_assignments} assignments</span><span>{Number(row.attendance||0)} / {requirements.attendance} sessions</span><span>{row.selection_code?'Selection code confirmed':'Selection code missing'}</span></div>
       {row.certificate_url&&<a href={row.certificate_url} target="_blank" rel="noopener noreferrer" className="c27-evidenceLink">View issued certificate <ArrowUpRight size={15}/></a>}
       {!row.certificate_url&&<div className="c27-editPanel"><label>Eligibility review rationale<textarea rows={3} placeholder="Document the evidence reviewed before approving." value={notes[row.user_id]||''} onChange={e=>update('note',row.user_id,e.target.value)}/></label><button type="button" disabled={busy||status!=='ready'||String(notes[row.user_id]||'').trim().length<12} onClick={()=>onApprove(row)}>Approve eligibility</button>{row.approved_certificate&&<><label>Certificate Google Drive link<input type="url" placeholder="https://drive.google.com/..." value={urls[row.user_id]||''} onChange={e=>update('url',row.user_id,e.target.value)}/></label><button type="button" disabled={busy||!/^https:\/\/(drive|docs)\.google\.com\//.test(urls[row.user_id]||'')} onClick={()=>onIssue(row)}>Issue certificate</button></>}</div>}
       </>}
      </div>
     </td></tr>}
    </React.Fragment>
   })}</tbody>
  </table></div>}
  {shown<filtered.length&&<div className="c27-pagination"><span>Showing {visible.length} of {filtered.length} matching records</span><button type="button" onClick={()=>setShown(v=>Math.min(v+25,filtered.length))}>Show 25 more <ChevronDown size={16}/></button></div>}
 </section>;
}
