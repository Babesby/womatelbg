import React,{useEffect,useMemo,useState}from'react';
import{Check,Search,UsersRound}from'lucide-react';
import{getCanopyAttendanceDashboard,setCanopyLiveAttendance}from'./canopyApi';
import'./canopyAttendance.css';

const MODULES=[
  ['module-01','Module 01','Understanding Climate Change'],
  ['module-02','Module 02','Gender & Climate Justice'],
  ['module-03','Module 03','Climate Advocacy & Digital Innovation'],
  ['module-04','Module 04','Climate Governance & Policy'],
  ['module-05','Module 05','Leadership & Professional Pathways']
];

export default function CanopyAttendance({viewer,preview=false}){
 const[data,setData]=useState({learners:[],attendance:[]});
 const[selected,setSelected]=useState('');
 const[query,setQuery]=useState('');
 const[loading,setLoading]=useState(true);
 const[busy,setBusy]=useState('');
 const[msg,setMsg]=useState('');
 const load=async()=>{setLoading(true);setMsg('');try{const x=await getCanopyAttendanceDashboard(viewer?.session);setData(x||{learners:[],attendance:[]})}catch(e){setMsg(e.message||'Attendance could not be loaded.')}finally{setLoading(false)}};
 useEffect(()=>{load()},[viewer?.session?.access_token]);
 const learners=useMemo(()=>{const q=query.trim().toLowerCase();return (data.learners||[]).filter(l=>!q||String(l.full_name||'').toLowerCase().includes(q)||String(l.country||'').toLowerCase().includes(q))},[data.learners,query]);
 const learner=(data.learners||[]).find(l=>l.user_id===selected);
 const records=(data.attendance||[]).filter(a=>a.user_id===selected&&a.attended);
 const attended=new Set(records.map(a=>a.module_id));
 const count=attended.size;
 async function toggle(moduleId,next){if(preview||!selected)return;setBusy(moduleId);setMsg('');try{await setCanopyLiveAttendance(viewer.session,{userId:selected,moduleId,attended:next});await load();setMsg(next?'Attendance marked.':'Attendance removed.')}catch(e){setMsg(e.message||'Attendance could not be updated.')}finally{setBusy('')}}
 return <section className="cattendancePage">
  <div className="cattendanceHead"><div><small>LIVE SESSION ATTENDANCE</small><h2>Thursday attendance</h2><p>Select a learner and mark attendance for each of the five live module sessions.</p></div>{selected&&<strong>{count}/5 attended</strong>}</div>
  {msg&&<p className="cattendanceMsg" role="status">{msg}</p>}
  <div className="cattendancePicker">
   <label><span>Find learner</span><div className="cattendanceSearch"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by name or country"/></div></label>
   <label><span>Learner</span><select value={selected} onChange={e=>setSelected(e.target.value)} disabled={loading}><option value="">Select learner</option>{learners.map(l=><option key={l.user_id} value={l.user_id}>{l.full_name||'Learner'}{l.country?` - ${l.country}`:''}</option>)}</select></label>
  </div>
  {loading&&<div className="cattendanceEmpty">Loading attendance...</div>}
  {!loading&&!selected&&<div className="cattendanceEmpty"><UsersRound/><p>Select a participant to record their Thursday live-session attendance.</p></div>}
  {!loading&&learner&&<div className="cattendanceLearner"><header><div><small>PARTICIPANT</small><h3>{learner.full_name||'Learner'}</h3><p>{learner.country||'Country not listed'}</p></div><b>{count}/5</b></header><div className="cattendanceModules">{MODULES.map(([id,label,title])=>{const checked=attended.has(id);return <label key={id} className={checked?'checked':''}><input type="checkbox" checked={checked} disabled={preview||busy===id} onChange={e=>toggle(id,e.target.checked)}/><span className="box">{checked&&<Check size={16}/>}</span><span><small>{label}</small><strong>{title}</strong></span>{busy===id&&<em>Saving...</em>}</label>})}</div>{preview&&<p className="cattendancePreview">Preview only. Attendance cannot be changed in Admin role preview.</p>}</div>}
 </section>
}
