import React,{useEffect,useState} from 'react';
import {GraduationCap,ShieldCheck,ExternalLink} from 'lucide-react';
import {getCourseCertificateQueue,approveCourseCertificate,issueCourseCertificate} from './canopyLearningApi';

export default function CanopyCourseCertificateAdmin({viewer}){
 const [items,setItems]=useState([]),[notes,setNotes]=useState({}),[urls,setUrls]=useState({}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const load=()=>getCourseCertificateQueue(viewer.session).then(x=>setItems(Array.isArray(x)?x:[])).catch(e=>setError(e.message));
 useEffect(()=>{load()},[viewer.session?.access_token]);
 const set=(setter,key,val)=>setter(v=>({...v,[key]:val}));
 const act=async fn=>{setBusy(true);try{await fn();await load();setError('Saved and recorded.')}catch(e){setError(e.message)}finally{setBusy(false)}};
 return <section className="wcl-form"><div><GraduationCap size={30}/><h2>Course certificates</h2><p>Each course has its own completion requirements. Issue only after every required course lesson and assessment is approved, verified enrolment is recorded, and WOMATE signs off.</p></div>
 {error&&<p role="status">{error}</p>}
 {items.map(item=>{
  const eligible=item.lessons_total>=3&&item.assessments_total>=1&&item.lessons_complete>=item.lessons_total&&item.assessments_approved>=item.assessments_total;
  return <article key={item.course_id+item.user_id}><h3>{item.learner} · {item.title}</h3><p>{item.lessons_complete}/{item.lessons_total} lessons · {item.assessments_approved}/{item.assessments_total} assignments approved</p>
  <p>Decision: {item.certificate_approved?'Eligible — approved':'Awaiting final review'}</p>
  {!item.certificate_approved&&<><label>Documented review<textarea rows={2} value={notes[item.course_id+item.user_id]||''} onChange={e=>set(setNotes,item.course_id+item.user_id,e.target.value)} placeholder="Explain how this learner met every course completion standard."/></label><button type="button" disabled={busy||!eligible||(notes[item.course_id+item.user_id]||'').trim().length<20} onClick={()=>act(()=>approveCourseCertificate(item.course_id,item.user_id,notes[item.course_id+item.user_id],viewer.session))}>Approve eligibility</button></>}
  {item.certificate_approved&&!item.certificate_id&&<><label>Final certificate Google Drive URL<input value={urls[item.course_id+item.user_id]||''} onChange={e=>set(setUrls,item.course_id+item.user_id,e.target.value)} placeholder="https://drive.google.com/..."/></label><button disabled={busy||!/^https:\/\/(drive|docs)\.google\.com\//.test(urls[item.course_id+item.user_id]||'')} onClick={()=>act(()=>issueCourseCertificate(item.course_id,item.user_id,urls[item.course_id+item.user_id],viewer.session))}>Issue certificate</button></>}
  {item.certificate_id&&<p>Issued — verified certificate recorded in Canopy.</p>}</article>;
 })}
 {!items.length&&<div className="wcl-note"><ShieldCheck size={20}/><p>No learners are ready for certification yet.</p></div>}
 </section>;
}