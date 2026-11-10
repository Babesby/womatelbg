import React,{useEffect,useMemo,useState}from'react';
import{BarChart3,Download,FileText,Globe2,GraduationCap,ShieldCheck,UsersRound,Award,BookOpen,ClipboardCheck,CalendarCheck2,BriefcaseBusiness,Heart,Handshake}from'lucide-react';
import{getAdminProgrammeEvidenceReport}from'./canopyApi';
import'./CanopyProgrammeReport.css';

const pct=(a,b)=>b?Math.round((Number(a||0)/Number(b))*100):0;
const csvCell=v=>'"'+String(v??'').replaceAll('"','""')+'"';

export default function CanopyProgrammeReport({viewer,snapshot,cohort}){
 const[data,setData]=useState(null),[msg,setMsg]=useState('');
 const key=cohort?.cohort_key||'she-leads-climate-c2-2026';
 useEffect(()=>{let live=true;getAdminProgrammeEvidenceReport(viewer.session,key).then(x=>live&&setData(x)).catch(e=>live&&setMsg(e.message));return()=>{live=false}},[viewer?.session?.access_token,key]);

 const learners=(snapshot?.profiles||[]).filter(x=>x.role==='learner');
 const active=(snapshot?.enrollments||[]).filter(x=>x.status==='active').length;
 const completedLessons=(snapshot?.progress||[]).filter(x=>x.completed).length;
 const uniqueAssignments=new Set((snapshot?.submissions||[]).map(x=>x.user_id+':'+x.week_key)).size;
 const completedAssignments=(snapshot?.submissions||[]).filter(x=>x.assessment_status==='completed').length;
 const revisionAssignments=(snapshot?.submissions||[]).filter(x=>['revision_required','needs_manual_review'].includes(x.assessment_status)).length;
 const certificates=(snapshot?.certificates||[]).length;
 const complaints=(snapshot?.actions||[]).filter(x=>x.action_type==='complaint');
 const openComplaints=complaints.filter(x=>x.status==='open').length;
 const resolvedComplaints=complaints.filter(x=>x.status==='resolved').length;
 const countries=useMemo(()=>{const m=new Map();learners.forEach(x=>{const k=(x.country||'Not recorded').trim()||'Not recorded';m.set(k,(m.get(k)||0)+1)});return [...m.entries()].sort((a,b)=>b[1]-a[1])},[snapshot]);
 const moduleRows=useMemo(()=>{const m=new Map();for(const s of snapshot?.submissions||[]){const k=s.week_key||'Unknown';if(!m.has(k))m.set(k,{module:k,submissions:0,completed:0,revision:0});const r=m.get(k);r.submissions++;if(s.assessment_status==='completed')r.completed++;if(['revision_required','needs_manual_review'].includes(s.assessment_status))r.revision++;}return [...m.values()].sort((a,b)=>a.module.localeCompare(b.module))},[snapshot]);

 const metrics=[
 ['Participation','Learners in cohort',learners.length],['Participation','Active learners',active],['Learning','Completed lessons',completedLessons],['Assessment','Unique weekly assignments',uniqueAssignments],['Assessment','Completed assessment records',completedAssignments],['Assessment','Revision/manual review records',revisionAssignments],['Attendance','Attendance records',data?.attendance?.attended_records||0],['Attendance','Learners with attendance',data?.attendance?.learners_attended||0],['Graduation','Certificates issued',certificates],['Graduation','Completion rate',pct(certificates,learners.length)+'%'],['Talent Discovery','Approved for discovery',data?.talent?.approved||0],['Talent Discovery','Profiles ready',data?.talent?.profile_ready||0],['Talent Discovery','Profiles still needed',data?.talent?.profile_needed||0],['Talent Discovery','Profiles live',data?.talent?.live||0],['Leadership','Mission completed',data?.mission_completed||0],['Recognition','Spotlight features',data?.spotlight_featured||0],['Alumni','Alumni checked in',data?.alumni?.alumni_checked_in||0],['Alumni','Story follow-up opt-ins',data?.alumni?.story_opt_in||0],['Opportunities','Open opportunities',data?.opportunities?.open||0],['Opportunities','Opportunity applications',data?.opportunities?.applications||0],['Funding','Open funding calls',data?.funding?.open||0],['Funding','Funding applications',data?.funding?.applications||0],['Collaboration','Collaboration requests',Number(data?.collaboration?.internal_requests||0)+Number(data?.collaboration?.public_requests||0)],['Safeguarding','Open complaints',openComplaints],['Safeguarding','Resolved complaints',resolvedComplaints],['Continuation','2027 rollover eligible',data?.rollover?.eligible||0],['Continuation','Rollover learner approved',data?.rollover?.learner_approved||0],['Continuation','Transferred to 2027',data?.rollover?.transferred||0]
 ];

 const download=()=>{
  const rows=[['WOMATE Programme Evidence Report'],['Cohort',cohort?.name||cohort?.cohort_name||key],['Generated',data?.generated_at||new Date().toISOString()],[],['Category','Metric','Value'],...metrics,...countries.map(([country,n])=>['Geography','Learners - '+country,n]),...moduleRows.flatMap(r=>[['Module evidence',r.module+' submissions',r.submissions],['Module evidence',r.module+' completed',r.completed],['Module evidence',r.module+' revision/manual review',r.revision]])];
  const blob=new Blob([rows.map(r=>r.map(csvCell).join(',')).join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='WOMATE-'+key+'-programme-report.csv';a.click();URL.revokeObjectURL(a.href);
 };

 return <section className="cpr-root">
  <header className="cpr-hero"><div><span>PROGRAMME EVIDENCE & REPORTING</span><h1>Reports</h1><p>Document delivery, participation, learning, outcomes and post-programme evidence for programme management, funders, partners and audits.</p></div><div className="cpr-actions"><button onClick={download}><Download size={16}/>Download CSV</button><button onClick={()=>window.print()}><FileText size={16}/>Print / Save PDF</button></div></header>
  {msg&&<p className="canopyFormMsg">{msg}</p>}
  <section className="cpr-summary">
   <article><UsersRound/><strong>{learners.length}</strong><span>Cohort learners</span><small>{active} currently active</small></article>
   <article><GraduationCap/><strong>{certificates}</strong><span>Certificates issued</span><small>{pct(certificates,learners.length)}% of cohort</small></article>
   <article><Globe2/><strong>{countries.length}</strong><span>Countries represented</span><small>Based on learner profiles</small></article>
   <article><Heart/><strong>{data?.alumni?.alumni_checked_in||0}</strong><span>Alumni checked in</span><small>Post-programme follow-up</small></article>
  </section>

  <div className="cpr-grid">
   <ReportGroup icon={<BookOpen/>} title="Learning & assessment" rows={[['Completed lessons',completedLessons],['Unique weekly assignments',uniqueAssignments],['Completed assessment records',completedAssignments],['Revision/manual review',revisionAssignments]]}/>
   <ReportGroup icon={<CalendarCheck2/>} title="Participation & attendance" rows={[['Active learners',active],['Attendance records',data?.attendance?.attended_records||0],['Learners with attendance',data?.attendance?.learners_attended||0],['Modules with attendance data',data?.attendance?.modules_recorded||0]]}/>
   <ReportGroup icon={<Award/>} title="Graduation & recognition" rows={[['Certificates issued',certificates],['Mission completed',data?.mission_completed||0],['Spotlight features',data?.spotlight_featured||0],['Completion rate',pct(certificates,learners.length)+'%']]}/>
   <ReportGroup icon={<ShieldCheck/>} title="Talent Discovery" rows={[['Approved',data?.talent?.approved||0],['Profile ready',data?.talent?.profile_ready||0],['Profile needed',data?.talent?.profile_needed||0],['Live profiles',data?.talent?.live||0]]}/>
   <ReportGroup icon={<BriefcaseBusiness/>} title="Opportunities & funding" rows={[['Open opportunities',data?.opportunities?.open||0],['Opportunity applications',data?.opportunities?.applications||0],['Open funding calls',data?.funding?.open||0],['Funding applications',data?.funding?.applications||0]]}/>
   <ReportGroup icon={<Handshake/>} title="Alumni, collaboration & continuation" rows={[['Alumni checked in',data?.alumni?.alumni_checked_in||0],['Story follow-up opt-ins',data?.alumni?.story_opt_in||0],['Collaboration requests',Number(data?.collaboration?.internal_requests||0)+Number(data?.collaboration?.public_requests||0)],['2027 rollover eligible',data?.rollover?.eligible||0]]}/>
   <ReportGroup icon={<ClipboardCheck/>} title="Safeguarding & complaints" rows={[['Complaints recorded',complaints.length],['Open complaints',openComplaints],['Resolved complaints',resolvedComplaints],['Resolution rate',pct(resolvedComplaints,complaints.length)+'%']]}/>
  </div>

  <section className="cpr-breakdowns">
   <article><header><BarChart3/><div><small>GEOGRAPHIC REACH</small><h2>Learners by country</h2></div></header><div className="cpr-table">{countries.map(([name,n])=><div key={name}><span>{name}</span><strong>{n}</strong></div>)}</div></article>
   <article><header><ClipboardCheck/><div><small>ASSESSMENT EVIDENCE</small><h2>Module submission record</h2></div></header><div className="cpr-module-table"><div className="head"><span>Module</span><span>Submitted</span><span>Completed</span><span>Review</span></div>{moduleRows.map(r=><div key={r.module}><span>{r.module.replaceAll('-',' ')}</span><strong>{r.submissions}</strong><strong>{r.completed}</strong><strong>{r.revision}</strong></div>)}</div></article>
  </section>
  <footer className="cpr-foot">Generated from live Canopy programme records. Figures should be interpreted alongside cohort selection criteria, programme timelines and WOMATE's assessment policies.</footer>
 </section>
}

function ReportGroup({icon,title,rows}){return <article className="cpr-group"><header>{icon}<h2>{title}</h2></header>{rows.map(([k,v])=><div key={k}><span>{k}</span><strong>{v}</strong></div>)}</article>}
