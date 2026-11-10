import React,{useMemo} from 'react';
import {BarChart3,Download,Globe2,GraduationCap,CalendarCheck2,ClipboardCheck,UsersRound,BookOpen,Award,ShieldCheck} from 'lucide-react';
import './CanopyProgrammeReport.css';

const csvCell=value=>{
 const v=String(value??'');
 // Prevent spreadsheet formula injection in exported applicant/learner fields.
 return '"'+(/^[\s]*[=+@-]/.test(v)?"'"+v:v).replaceAll('"','""')+'"';
};
const percent=(part,total)=>total?Math.round(100*part/total)+'%':'0%';
const sum=(rows,predicate)=>rows.filter(predicate).length;

export default function Canopy2027EvidenceReport({cohort,members=[],submissions=[],progress=[]}){
 const cohortKey=cohort?.cohort_key||'2027';
 const active=sum(members,m=>m.status==='active');
 const completedLessons=progress.reduce((n,p)=>n+Number(p.lessons||0),0);
 const acceptedAssessments=submissions.filter(s=>s.status==='approved');
 const revisionAssessments=submissions.filter(s=>s.status==='needs_revision');
 const attendance=progress.reduce((n,p)=>n+Number(p.attendance||0),0);
 const attendedLearners=sum(progress,p=>Number(p.attendance||0)>0);
 const approvedCertificates=sum(progress,p=>p.approved_certificate===true);
 const issuedCertificates=sum(progress,p=>Boolean(p.certificate_url));
 const eligible=sum(progress,p=>Number(p.lessons)>=10&&Number(p.approved_assignments)>=3&&Number(p.attendance)>=3&&Boolean(p.selection_code));
 const countries=useMemo(()=>{
  const map=new Map();
  members.forEach(m=>{const k=(m.country||'Not recorded').trim()||'Not recorded';map.set(k,(map.get(k)||0)+1)});
  return [...map.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
 },[members]);
 const moduleRows=useMemo(()=>['01','02','03','04','05'].map(n=>{
  const rows=submissions.filter(s=>String(s.module_id||'').padStart(2,'0')===n);
  return {module:n,attempts:rows.length,approved:sum(rows,s=>s.status==='approved'),revision:sum(rows,s=>s.status==='needs_revision'),pending:sum(rows,s=>s.status==='submitted')};
 }),[submissions]);
 const groups=[
  ['Participation','Learners',members.length],['Participation','Active learners',active],
  ['Learning','Completed lessons',completedLessons],
  ['Assessment','Assignment attempts',submissions.length],['Assessment','Approved attempts',acceptedAssessments.length],
  ['Assessment','Revision requests',revisionAssessments.length],
  ['Attendance','Attendance records',attendance],['Attendance','Learners with attendance',attendedLearners],
  ['Graduation','Eligible candidates',eligible],['Graduation','Eligibility approved',approvedCertificates],['Graduation','Certificates issued',issuedCertificates],
  ['Graduation','Certificate issuance rate',percent(issuedCertificates,members.length)]
 ];
 const exportCSV=()=>{
  const lines=[
   ['WOMATE · She Leads programme evidence'],['Cohort',cohort?.display_name||cohortKey],['Generated UTC',new Date().toISOString()],
   [],['Category','Metric','Value'],...groups,
   ...countries.map(([country,n])=>['Geography',country,n]),
   ...moduleRows.flatMap(r=>[['Module '+r.module,'Attempts',r.attempts],['Module '+r.module,'Approved',r.approved],['Module '+r.module,'Revisions',r.revision],['Module '+r.module,'Pending review',r.pending]]),
   [],['Learner','Country','Status','Lessons','Approved assignments','Attendance','Selection code','Eligibility approved','Certificate issued'],
   ...progress.map(p=>{const m=members.find(x=>x.user_id===p.user_id)||{};return [p.name,m.country||'',m.status||'',p.lessons||0,p.approved_assignments||0,p.attendance||0,p.selection_code?'Yes':'No',p.approved_certificate?'Yes':'No',p.certificate_url?'Yes':'No']})
  ];
  const blob=new Blob([lines.map(r=>r.map(csvCell).join(',')).join('\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='WOMATE-'+cohortKey+'-evidence-report.csv';a.click();URL.revokeObjectURL(url);
 };
 return <section className="cpr-root" aria-label="Cohort-specific programme evidence">
  <header className="cpr-hero"><div><span>PROGRAMME EVIDENCE & REPORTING · 2027</span><h1>Reports</h1><p>Live evidence for {cohort?.display_name||cohortKey}. Counts are restricted to the selected cohort, never merged with Cohort 2 or another region.</p></div><div className="cpr-actions"><button type="button" onClick={exportCSV}><Download size={16}/>Download CSV</button><button type="button" onClick={()=>window.print()}><BarChart3 size={16}/>Print / Save PDF</button></div></header>
  <section className="cpr-summary">
   <article><UsersRound/><strong>{members.length}</strong><span>People enrolled</span><small>{active} active</small></article>
   <article><BookOpen/><strong>{completedLessons}</strong><span>Lessons completed</span><small>Across this cohort</small></article>
   <article><Globe2/><strong>{countries.length}</strong><span>Countries represented</span><small>From cohort member profiles</small></article>
   <article><GraduationCap/><strong>{issuedCertificates}</strong><span>Certificates issued</span><small>{percent(issuedCertificates,members.length)} of cohort members</small></article>
  </section>
  <div className="cpr-grid">
   <ReportGroup icon={<UsersRound/>} title="Participation" rows={[['Enrolled',members.length],['Active',active],['Other membership statuses',members.length-active],['Countries represented',countries.length]]}/>
   <ReportGroup icon={<BookOpen/>} title="Lessons & assessment" rows={[['Lessons completed',completedLessons],['Assignment attempts',submissions.length],['Approved attempts',acceptedAssessments.length],['Pending review',sum(submissions,s=>s.status==='submitted')],['Needs revision',revisionAssessments.length]]}/>
   <ReportGroup icon={<CalendarCheck2/>} title="Live attendance" rows={[['Attendance records',attendance],['Learners with attendance',attendedLearners],['Learners meeting three-session minimum',sum(progress,p=>Number(p.attendance)>=3)]]}/>
   <ReportGroup icon={<Award/>} title="Graduation & certificates" rows={[['Graduation minimum met',eligible],['Eligibility approved',approvedCertificates],['Certificates issued',issuedCertificates],['Issued share',percent(issuedCertificates,members.length)]]}/>
  </div>
  <section className="cpr-breakdowns">
   <article><header><Globe2/><div><small>GEOGRAPHIC REACH</small><h2>Learners by country</h2></div></header><div className="cpr-table">{countries.map(([name,n])=><div key={name}><span>{name}</span><strong>{n}</strong></div>)}{!countries.length&&<p>No learners enrolled yet.</p>}</div></article>
   <article><header><ClipboardCheck/><div><small>ASSESSMENT EVIDENCE</small><h2>Module outcomes</h2></div></header><div className="cpr-module-table"><div className="head"><span>Module</span><span>Attempts</span><span>Approved</span><span>Review</span></div>{moduleRows.map(r=><div key={r.module}><span>{r.module}</span><strong>{r.attempts}</strong><strong>{r.approved}</strong><strong>{r.pending+ r.revision}</strong></div>)}</div></article>
  </section>
  <p className="cpr-foot"><ShieldCheck size={14}/> These metrics use cohort-scoped learner, lesson, assignment, attendance and certificate records. Complaints, Talent Discovery, opportunities, funding, Mission groups, Spotlight and alumni evidence require cohort-linked records before trustworthy cohort totals can be published; this report deliberately does not invent or mix those totals.</p>
 </section>;
}
function ReportGroup({icon,title,rows}){return <article className="cpr-group"><header>{icon}<h2>{title}</h2></header>{rows.map(([k,v])=><div key={k}><span>{k}</span><strong>{v}</strong></div>)}</article>}
