import React,{useEffect,useState}from'react';
import{Check,Clock,FileCheck2,UsersRound}from'lucide-react';
import{getCanopyCertificateEligibility}from'./canopyApi';
import'./canopyAttendance.css';

export default function CanopyEligibilitySummary({viewer,userId=null,compact=false,onData}){
 const[data,setData]=useState(null),[error,setError]=useState('');
 useEffect(()=>{let live=true;if(!viewer?.session?.access_token){setData(null);return}setError('');getCanopyCertificateEligibility(viewer.session,userId).then(x=>{if(live){setData(x||null);onData?.(x||null)}}).catch(e=>{if(live)setError(e.message||'Completion status could not be loaded.')});return()=>{live=false}},[viewer?.session?.access_token,userId]);
 if(!userId&&data===null&&!error)return null;
 if(userId&&!data&&!error)return <div className="celigibilityLoading">Loading completion status...</div>;
 if(error)return <div className="celigibilityError">{error}</div>;
 if(!data)return null;
 const cards=[
  ['LEARNING',`${data.lesson_done||0}/${data.total_lessons||20} lessons`,Number(data.lesson_done||0)>=Number(data.total_lessons||20),'Complete the remaining lessons in the course.',Clock],
  ['ASSIGNMENTS',`${data.assignments_submitted||0}/${data.total_assignments||5} submitted`,Number(data.assignments_submitted||0)>=Number(data.total_assignments||5),'WOMATE reviews satisfactory completion and any required revisions.',FileCheck2],
  ['CLIMATE ACTION NOTE',data.climate_action_note?'Submitted':'Pending',Boolean(data.climate_action_note),'The Module 05 submission contains the one-page Climate Action Note requirement.',FileCheck2],
  ['LIVE ATTENDANCE',`${data.attendance_count||0}/${data.total_attendance||5} sessions`,Number(data.attendance_count||0)>=Number(data.total_attendance||5),'Thursday live-session attendance recorded by WOMATE.',UsersRound]
 ];
 return <div className={'celigibility '+(compact?'compact':'')}>{cards.map(([k,v,done,p,Icon])=><article key={k} className={done?'done':''}><div>{done?<Check/>:<Icon/>}</div><small>{k}</small><strong>{v}</strong><p>{done&&k==='LEARNING'?'All lesson learning is complete.':p}</p></article>)}</div>
}
