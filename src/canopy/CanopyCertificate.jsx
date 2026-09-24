import React,{useEffect,useMemo,useState} from 'react';
import {Award,Check,Clock,FileCheck2,UsersRound} from 'lucide-react';
import {getCertificates} from './canopyApi';
import {modules} from './canopyData';
import {CANOPY_ASSIGNMENT_SCHEDULE} from './canopySchedule';

export default function CanopyCertificate({viewer,progress=[],submissions=[]}){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  useEffect(()=>{let live=true;setLoading(true);setError('');getCertificates(viewer?.session).then(x=>{if(live)setItems(x||[])}).catch(err=>{if(live)setError(err?.message||'Unable to load certificates.')}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[viewer?.session?.access_token]);

  const completion=useMemo(()=>{
    const done=new Set((progress||[]).filter(x=>x.completed).map(x=>x.lesson_id));
    const totalLessons=modules.reduce((sum,m)=>sum+m.lessons.length,0);
    const latestByWeek={};
    (submissions||[]).forEach(s=>{const current=latestByWeek[s.week_key];if(!current||new Date(s.submitted_at)>new Date(current.submitted_at))latestByWeek[s.week_key]=s});
    const submitted=CANOPY_ASSIGNMENT_SCHEDULE.filter(item=>latestByWeek[item.weekKey]).length;
    const finalNote=Boolean(latestByWeek['module-05']);
    return {lessonDone:done.size,totalLessons,submitted,finalNote};
  },[progress,submissions]);

  const issued=items.length>0;
  return <section className="ccert-page">
    <span className="ccert-kicker">CERTIFICATES</span><h1>Your completion journey.</h1><p className="ccert-lead">See what Canopy can verify now and what WOMATE confirms separately before certificate issue.</p>

    <section className="ccert-journey">
      <article className={completion.lessonDone===completion.totalLessons?'is-done':''}><div>{completion.lessonDone===completion.totalLessons?<Check/>:<Clock/>}</div><small>LEARNING</small><h2>{completion.lessonDone}/{completion.totalLessons} lessons</h2><p>{completion.lessonDone===completion.totalLessons?'All lesson learning is complete.':'Complete the remaining lessons in the course.'}</p></article>
      <article className={completion.submitted===CANOPY_ASSIGNMENT_SCHEDULE.length?'is-done':''}><div>{completion.submitted===CANOPY_ASSIGNMENT_SCHEDULE.length?<Check/>:<FileCheck2/>}</div><small>ASSIGNMENTS</small><h2>{completion.submitted}/5 submitted</h2><p>WOMATE reviews satisfactory completion and any required revisions.</p></article>
      <article className={completion.finalNote?'is-done':''}><div>{completion.finalNote?<Check/>:<FileCheck2/>}</div><small>CLIMATE ACTION NOTE</small><h2>{completion.finalNote?'Submitted':'Pending'}</h2><p>The Module 05 submission contains your one-page Climate Action Note requirement.</p></article>
      <article className="is-admin"><div><UsersRound/></div><small>WOMATE VERIFICATION</small><h2>Attendance + graduation</h2><p>Live-session attendance and graduation participation are verified by WOMATE outside this progress screen.</p></article>
    </section>

    {issued&&<div className="ccert-ready"><Award/><div><small>COMPLETION RECORD ISSUED</small><h2>Your certificate is ready.</h2><p>Use the official WOMATE-issued file below.</p></div></div>}
    {loading&&<div className="ccert-empty"><p>Loading your certificate records…</p></div>}
    {!loading&&error&&<div className="ccert-empty"><h2>Certificates could not be loaded.</h2><p>{error}</p></div>}
    {!loading&&!error&&!items.length&&<div className="ccert-empty"><h2>No certificate has been issued yet.</h2><p>Complete the learning requirements and allow WOMATE to verify attendance, satisfactory assignments and graduation participation. When your certificate is issued, the Google Drive file will appear here.</p></div>}
    {!loading&&!error&&<div className="ccert-grid">{items.map(c=><article key={c.id}><small>{c.cohort_name||'She Leads · Cohort 2 · 2026'}</small><h2>{c.title||'She Leads Climate Mentorship 2026'}</h2><p>Issued {c.issued_at?new Date(c.issued_at).toLocaleDateString():'by WOMATE'}</p><a href={c.drive_url} target="_blank" rel="noopener noreferrer">View certificate →</a></article>)}</div>}
  </section>
}
