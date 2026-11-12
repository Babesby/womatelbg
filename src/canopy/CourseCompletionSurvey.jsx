import React,{useState} from 'react';
import {Star,CheckCircle2} from 'lucide-react';
const keyFor=course=>'womate_course_feedback_'+String(course.id||course.slug);
export default function CourseCompletionSurvey({course,viewer}){
 const [done,setDone]=useState(()=>{try{return localStorage.getItem(keyFor(course))==='submitted'}catch{return false}});
 const [rating,setRating]=useState(0),[recommend,setRecommend]=useState(''),[comment,setComment]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(e){e.preventDefault();if(!rating||!recommend||busy)return;setBusy(true);setError('');
  try{const response=await fetch('/api/engagement',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(viewer.session?.access_token||'')},body:JSON.stringify({event:'course_feedback',course_id:course.id,course_slug:course.slug,course:course.title,rating,recommend,comment:comment.trim()})});const result=await response.json().catch(()=>({}));if(!response.ok||!result.ok)throw new Error(result.error||'Could not submit feedback');try{localStorage.setItem(keyFor(course),'submitted')}catch{}setDone(true)}
  catch(err){setError(err.message)}finally{setBusy(false)}
 }
 return <section style={{marginTop:30,padding:'clamp(22px,4vw,34px)',background:'#eef7f1',border:'1px solid #d3e5d9',borderRadius:18,color:'#073b39'}} aria-labelledby="course-survey-title">
 {done?<p role="status"><CheckCircle2 size={20} style={{verticalAlign:'middle',marginRight:8}}/>Thank you for sharing your course feedback.</p>:<><small style={{fontWeight:800,letterSpacing:2}}>YOUR VOICE MATTERS</small><h2 id="course-survey-title" style={{fontSize:28,margin:'12px 0'}}>You did it. How was the journey?</h2><p>Congratulations on completing the learning requirements. Your feedback helps WOMATE make the next course even better.</p><form onSubmit={submit} style={{display:'grid',gap:16,maxWidth:560}}>
 <fieldset style={{border:0,padding:0,margin:0}}><legend style={{fontWeight:700,marginBottom:9}}>How would you rate this course?</legend><div role="radiogroup" aria-label="Course rating" style={{display:'flex',gap:8}}>{[1,2,3,4,5].map(n=><button type="button" key={n} onClick={()=>setRating(n)} aria-label={n+' out of 5 stars'} aria-pressed={rating===n} style={{padding:10,borderRadius:8,border:'1px solid #b5d4c2',background:rating>=n?'#c6ff52':'white',cursor:'pointer'}}><Star size={21} fill={rating>=n?'#073b39':'none'}/></button>)}</div></fieldset>
 <label style={{display:'grid',gap:7,fontWeight:700}}>Would you recommend this course?<select required value={recommend} onChange={e=>setRecommend(e.target.value)} style={{padding:12,borderRadius:8,border:'1px solid #b5d4c2'}}><option value="">Choose an answer</option><option value="yes">Yes</option><option value="maybe">Maybe</option><option value="no">No</option></select></label>
 <label style={{display:'grid',gap:7,fontWeight:700}}>What worked well, and what could improve? <span style={{fontWeight:400}}>(optional)</span><textarea maxLength={1500} rows={4} value={comment} onChange={e=>setComment(e.target.value)} style={{padding:12,borderRadius:8,border:'1px solid #b5d4c2'}}/></label>
 {error&&<p role="alert" style={{color:'#aa2333'}}>{error}</p>}
 <button type="submit" disabled={busy||!rating||!recommend} style={{background:'#073b39',color:'white',padding:14,border:0,borderRadius:9,fontWeight:800,cursor:'pointer'}}>{busy?'Sending feedback…':'Send feedback'}</button>
 </form></>}
 </section>;
}