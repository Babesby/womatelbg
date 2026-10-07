import React,{useEffect,useMemo,useState}from'react';
import{Check,Search,UsersRound}from'lucide-react';
import{getCanopyAttendanceDashboard,setCanopyLiveAttendance}from'./canopyApi';
import'./canopyAttendance.css';

const MODULES=[
  ['module-01','M01','Understanding Climate Change','24 Sep 2026'],
  ['module-02','M02','Gender & Climate Justice','1 Oct 2026'],
  ['module-03','M03','Climate Advocacy & Digital Innovation','8 Oct 2026'],
  ['module-04','M04','Climate Governance & Policy','15 Oct 2026'],
  ['module-05','M05','Leadership & Professional Pathways','22 Oct 2026']
];

export default function CanopyAttendance({viewer,preview=false}){
 const[data,setData]=useState({learners:[],attendance:[]});
 const[selected,setSelected]=useState('');
 const[query,setQuery]=useState('');
 const[countFilter,setCountFilter]=useState('all');
 const[moduleFilter,setModuleFilter]=useState('all');
 const[loading,setLoading]=useState(true);
 const[busy,setBusy]=useState('');
 const[msg,setMsg]=useState('');

 const load=async(silent=false)=>{
  if(!silent)setLoading(true);
  if(!silent)setMsg('');
  try{const x=await getCanopyAttendanceDashboard(viewer?.session);setData(x||{learners:[],attendance:[]})}
  catch(e){setMsg(e.message||'Attendance could not be loaded.')}
  finally{if(!silent)setLoading(false)}
 };
 useEffect(()=>{load()},[viewer?.session?.access_token]);

 const attendanceMap=useMemo(()=>{
  const map=new Map();
  for(const row of data.attendance||[]){
   if(!map.has(row.user_id))map.set(row.user_id,new Map());
   map.get(row.user_id).set(row.module_id,!!row.attended);
  }
  return map;
 },[data.attendance]);

 const attendanceCount=userId=>MODULES.reduce((n,[id])=>n+(attendanceMap.get(userId)?.get(id)?1:0),0);
 const totalLearners=(data.learners||[]).length;
 const recordedLearners=(data.learners||[]).filter(l=>(data.attendance||[]).some(a=>a.user_id===l.user_id)).length;
 const totalPresent=(data.attendance||[]).filter(a=>a.attended).length;
 const distribution=useMemo(()=>Object.fromEntries(Array.from({length:6},(_,n)=>[n,(data.learners||[]).filter(l=>attendanceCount(l.user_id)===n).length])),[data.learners,attendanceMap]);
 const moduleTotals=useMemo(()=>Object.fromEntries(MODULES.map(([id])=>[id,(data.learners||[]).filter(l=>attendanceMap.get(l.user_id)?.get(id)).length])),[data.learners,attendanceMap]);

 const learners=useMemo(()=>{
  const q=query.trim().toLowerCase();
  return (data.learners||[]).filter(l=>{
   const count=attendanceCount(l.user_id);
   const searchOk=!q||String(l.full_name||'').toLowerCase().includes(q)||String(l.country||'').toLowerCase().includes(q);
   const countOk=countFilter==='all'||count===Number(countFilter);
   const moduleOk=moduleFilter==='all'||!!attendanceMap.get(l.user_id)?.get(moduleFilter);
   return searchOk&&countOk&&moduleOk;
  }).sort((a,b)=>attendanceCount(b.user_id)-attendanceCount(a.user_id)||String(a.full_name||'').localeCompare(String(b.full_name||'')));
 },[data.learners,query,countFilter,moduleFilter,attendanceMap]);

 const learner=(data.learners||[]).find(l=>l.user_id===selected);
 const attended=new Set(MODULES.filter(([id])=>attendanceMap.get(selected)?.get(id)).map(([id])=>id));
 const count=attended.size;

 async function toggleFor(userId,moduleId,next){
  if(preview||!userId)return;
  const key=`${userId}:${moduleId}`;
  setBusy(key);setMsg('');
  try{
   await setCanopyLiveAttendance(viewer.session,{userId,moduleId,attended:next});
   await load(true);
   setMsg(next?'Attendance marked.':'Attendance removed.');
  }catch(e){setMsg(e.message||'Attendance could not be updated.')}
  finally{setBusy('')}
 }

 return <section className="cattendancePage">
  <div className="cattendanceHead"><div><small>LIVE SESSION ATTENDANCE</small><h2>Thursday attendance</h2><p>Full-cohort attendance register for all five She Leads live sessions.</p></div><strong>{totalPresent} marks</strong></div>
  {msg&&<p className="cattendanceMsg" role="status">{msg}</p>}

  <div className="cattendanceSummary">
   <article><strong>{totalLearners}</strong><span>Total learners</span></article>
   <article><strong>{recordedLearners}</strong><span>Attendance records started</span></article>
   <article><strong>{totalLearners-recordedLearners}</strong><span>No record yet</span></article>
   <article><strong>{distribution[5]||0}</strong><span>5/5 attendance</span></article>
  </div>

  <div className="cattendanceDistribution" aria-label="Attendance totals">
   {Array.from({length:6},(_,n)=><button type="button" key={n} className={String(countFilter)===String(n)?'active':''} onClick={()=>setCountFilter(String(countFilter)===String(n)?'all':String(n))}><strong>{distribution[n]||0}</strong><span>{n}/5</span></button>)}
  </div>

  <div className="cattendanceSessions">
   {MODULES.map(([id,label,title,date])=><button type="button" key={id} className={moduleFilter===id?'active':''} onClick={()=>setModuleFilter(moduleFilter===id?'all':id)}><span>{label}</span><strong>{moduleTotals[id]||0}/{totalLearners}</strong><small>{date} · {title}</small></button>)}
  </div>

  <div className="cattendanceTools">
   <label><span>Find learner</span><div className="cattendanceSearch"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name or country"/></div></label>
   <button type="button" className={(countFilter==='all'&&moduleFilter==='all'&&!query)?'muted':''} onClick={()=>{setQuery('');setCountFilter('all');setModuleFilter('all')}}>Clear filters</button>
   <span>{learners.length} shown</span>
  </div>

  {loading?<div className="cattendanceEmpty">Loading attendance...</div>:<div className="cattendanceMatrixWrap">
   <div className="cattendanceMatrix">
    <div className="head"><b>Participant</b><b>Country</b>{MODULES.map(([id,label,,date])=><b key={id} title={date}>{label}</b>)}<b>Total</b><b>Open</b></div>
    {learners.map(l=>{const n=attendanceCount(l.user_id);return <div key={l.user_id} className={selected===l.user_id?'selected':''}>
     <span><b>{l.full_name||'Learner'}</b></span><span>{l.country||'—'}</span>
     {MODULES.map(([id,label])=>{const checked=!!attendanceMap.get(l.user_id)?.get(id);const key=`${l.user_id}:${id}`;return <span className="mark" key={id}><label className={checked?'checked':''} title={`${l.full_name||'Learner'} · ${label}`}><input type="checkbox" checked={checked} disabled={preview||busy===key} onChange={e=>toggleFor(l.user_id,id,e.target.checked)}/><i>{checked?<Check size={14}/>:''}</i></label></span>})}
     <span><strong className={`cattendanceCount c${n}`}>{n}/5</strong></span>
     <span><button type="button" onClick={()=>setSelected(l.user_id)}>Details</button></span>
    </div>})}
   </div>
  </div>}

  {!loading&&!learners.length&&<div className="cattendanceEmpty"><UsersRound/><p>No learners match these attendance filters.</p></div>}

  {learner&&<div className="cattendanceLearner"><header><div><small>PARTICIPANT DETAIL</small><h3>{learner.full_name||'Learner'}</h3><p>{learner.country||'Country not listed'}</p></div><b>{count}/5</b></header><div className="cattendanceModules">{MODULES.map(([id,label,title,date])=>{const checked=attended.has(id),key=`${learner.user_id}:${id}`;return <label key={id} className={checked?'checked':''}><input type="checkbox" checked={checked} disabled={preview||busy===key} onChange={e=>toggleFor(learner.user_id,id,e.target.checked)}/><span className="box">{checked&&<Check size={16}/>}</span><span><small>{label} · {date}</small><strong>{title}</strong></span>{busy===key&&<em>Saving...</em>}</label>})}</div>{preview&&<p className="cattendancePreview">Preview only. Attendance cannot be changed in Admin role preview.</p>}</div>}
 </section>
}
