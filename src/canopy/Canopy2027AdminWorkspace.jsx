import React,{useEffect,useMemo,useState} from 'react';
import {ArrowRight,ShieldCheck,UsersRound,ClipboardCheck,Radio,GraduationCap,BarChart3,CalendarDays} from 'lucide-react';
import {getCohortAdminWorkspace,reviewCohortAssignment,approveCohortCertificate,issueCohortCertificate,setCohortAttendance,getCohortMissionGroups,getCohortFundingCalls} from './canopyLearningApi';
import {getAdmissionsEmailQueue,getAdmissionsMailStatus,queueAdmissionsReminders} from './canopyAdmissionsApi';
import {setAdminCohortMembership} from './canopyApi';
import Canopy2027EvidenceReport from './Canopy2027EvidenceReport';
import {AdminList,AdminResourceList,AdminMailList} from './Canopy2027AdminTables';
import {canopyPost2026Runtime} from './canopyCohortRuntime2027';
import './Canopy2027Learning.css';

const go=path=>{const current=window.location.pathname+window.location.search+window.location.hash;if(current!==path)window.history.pushState({},'',path);window.dispatchEvent(new CustomEvent('womate:navigate',{detail:{path}}));window.scrollTo({top:0,behavior:'smooth'})};
const adminTabs=[['overview','Operations'],['access','Learner access'],['reviews','Review assignments'],['attendance','Live attendance'],['certificates','Certificates'],['reports','Reports'],['communications','Communications'],['mission','Mission groups'],['funding','Funding']];
const validate=x=>String(x||'').trim().length>=12;
export default function Canopy2027AdminWorkspace({viewer,cohort,view='overview'}){
 const key=cohort?.cohort_key||'';const [data,setData]=useState({members:[],submissions:[],progress:[]}),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[notes,setNotes]=useState({}),[scores,setScores]=useState({}),[module,setModule]=useState({}),[urls,setUrls]=useState({}),[loading,setLoading]=useState(true);
 const load=async()=>{if(!key)return;setLoading(true);try{const result=await getCohortAdminWorkspace(key,viewer.session);setData({...result,cohortKey:key});setError('')}catch(e){setError(e.message)}finally{setLoading(false)}};
 useEffect(()=>{load()},[key,viewer.session?.access_token]);
 const [extra,setExtra]=useState({mail:null,mailStatus:null,missions:[],funding:[]}),[extraLoading,setExtraLoading]=useState(false);
 const validCohortData=data.cohortKey===key;
 const members=validCohortData?(data.members||[]):[],progress=validCohortData?(data.progress||[]):[],subs=validCohortData?(data.submissions||[]):[];
 const loadExtra=async()=>{if(!key)return;setExtraLoading(true);try{
   const [mail,mailStatus,missions,funding]=await Promise.all([
    getAdmissionsEmailQueue(key,viewer.session),
    getAdmissionsMailStatus(viewer.session),
    getCohortMissionGroups(key,viewer.session),
    getCohortFundingCalls(key,viewer.session)
   ]);
   setExtra({cohortKey:key,mail,mailStatus,missions:Array.isArray(missions)?missions:[],funding:Array.isArray(funding)?funding:[]});
  }catch(e){setError(e.message)}finally{setExtraLoading(false)}
 };
 useEffect(()=>{if(['communications','mission','funding'].includes(view))loadExtra()},[key,view,viewer.session?.access_token]);
 const cohortExtra=extra.cohortKey===key?extra:{mail:null,mailStatus:null,missions:[],funding:[]};
 const selected=adminTabs.some(([id])=>id===view)?view:'overview';
 const update=(setter,id,val)=>setter(s=>({...s,[id]:val}));
 const act=async fn=>{setBusy(true);setNotice('');try{await fn();await load();setNotice('Saved for the selected cohort. The update has been saved.')}catch(e){setError(e.message)}finally{setBusy(false)}};
 const counts={active:members.filter(m=>m.status==='active').length,pending:members.filter(m=>m.status!=='active').length,review:subs.filter(s=>s.status==='submitted').length,approved:progress.filter(p=>p.approved_certificate).length};
 const requirements=data.graduation_requirements||{lessons:10,approved_assignments:3,attendance:3,selection_code:true};
 const certificateReady=x=>x.lessons>=requirements.lessons&&x.approved_assignments>=requirements.approved_assignments&&x.attendance>=requirements.attendance&&Boolean(x.selection_code);
 const updateField=(kind,id,value)=>({note:setNotes,score:setScores,module:setModule,url:setUrls})[kind]?.(s=>({...s,[id]:value}));
 const onAccess=(row,status)=>{if(status==='withdrawn'&&!window.confirm('Withdraw '+row.name+' from this cohort? The cohort record will be retained.'))return;act(()=>setAdminCohortMembership(viewer.session,{userId:row.user_id,cohortKey:key,status}))};
 const onReview=(row,decision)=>act(()=>reviewCohortAssignment(row.id,decision,Number(scores[row.id]??80),notes[row.id],viewer.session));
 const onAttendance=(row,attended)=>act(()=>setCohortAttendance(key,row.user_id,module[row.user_id]||'01',attended,viewer.session));
 const onApprove=row=>act(()=>approveCohortCertificate(key,row.user_id,true,notes[row.user_id],viewer.session));
 const onIssue=row=>{if(!window.confirm('Issue a certificate to '+row.name+' using this Drive link?'))return;act(()=>issueCohortCertificate(key,row.user_id,urls[row.user_id],viewer.session))};

 return <main className="canopyManager canopyOps">
  <header className="c27-opsHeader"><div><span className="c27-kicker">WOMATE CANOPY · 2027 OPERATIONS</span><h1>{({overview:'Cohort overview',access:'Learner access',reviews:'Assignment reviews',attendance:'Live attendance',certificates:'Certificates',communications:'Communications',mission:'Mission groups',funding:'Funding opportunities',reports:'Programme reports'})[selected]||'Cohort management'}</h1><p>{cohort?.display_name||'2027 cohort'}</p></div><span className="c27-currentCohort">{cohort?.region||'Regional cohort'} · {String(cohort?.status||'planning').replaceAll('_',' ')}</span></header>
  
  {error&&<p className="canopyFormMsg error" role="alert">{error}</p>}{notice&&<p className="canopyFormMsg" role="status">{notice}</p>}
  {loading&&<div className="c27-loading" role="status">Loading cohort records…</div>}
  {selected==='overview'&&<section className="c27-opsOverview" aria-label="Cohort dashboard">
    <div className="c27-opsMetrics">
      {[['Members',members.length],['Active',counts.active],['Needs review',counts.review],['Eligibility approved',counts.approved],['Issued certificates',progress.filter(p=>p.certificate_url).length]].map(([label,value])=><div key={label}><strong>{value}</strong><span>{label}</span></div>)}
    </div>
    <div className="c27-opsNext">
      <div><span className="c27-kicker">COHORT OPERATIONS</span><h2>What needs attention</h2><p>Review your live queues and open the relevant workflow. Each record belongs to this cohort only.</p></div>
      <div className="c27-opsQueue">
       {[[counts.review,'Assignments awaiting assessment','/canopy/manage/reviews'],[counts.pending,'Memberships to review','/canopy/manage/access'],[progress.filter(p=>certificateReady(p)&&!p.approved_certificate).length,'Learners ready for eligibility review','/canopy/manage/certificates']].map(([value,label,path])=><button type="button" key={path} onClick={()=>go(path)}><strong>{value}</strong><span>{label}</span><ArrowRight size={17}/></button>)}
      </div>
    </div>
    <details className="c27-opsSchedule"><summary><span><CalendarDays size={19}/> Programme timeline</span><span>Milestones and module releases</span></summary>{(()=>{const s=canopyPost2026Runtime(key);if(!s)return <p>Schedule unavailable.</p>;const dates=[['Applications open',s.admissions.opens],['Applications close',s.admissions.closes],['Decisions',s.admissions.decision],['Offer acceptance',s.admissions.acceptanceDaysAfterEmail+' days after each email'],['Orientation',s.programmeOpenDate],['Onboarding deadline',s.admissions.onboardingDeadline],['Graduation',s.graduationDate]];const pretty=d=>/^\d{4}-\d{2}-\d{2}$/.test(String(d))?new Date(d+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}):d;return <div className="c27-timelineBody"><p>Planning dates only; live session times and assignment grace periods await coordination.</p><dl>{dates.map(([label,date])=><div key={label}><dt>{label}</dt><dd>{pretty(date)}</dd></div>)}</dl><h3>Weekly module releases</h3><div className="c27-weeklyReleases">{Object.entries(s.moduleReleaseDates||{}).map(([week,date])=><span key={week}>Module {week}<strong>{pretty(date)}</strong></span>)}</div></div>})()}</details>
  </section>}
  {selected==='access'&&<AdminList key={key+'-access'} title="Learner access" description="Search by learner or country, filter cohort membership and manage access." kind="access" rows={members} cohortKey={key} busy={busy} onAccess={onAccess} requirements={requirements} update={updateField}/>}
  {selected==='reviews'&&<AdminList key={key+'-reviews'} title="Assignment reviews" description="Filter submissions by module or status, examine evidence and record constructive decisions." kind="reviews" rows={subs} cohortKey={key} busy={busy} scores={scores} notes={notes} onReview={onReview} requirements={requirements} update={updateField}/>}
  {selected==='attendance'&&<AdminList key={key+'-attendance'} title="Live attendance" description="Find an active learner, choose a session and record verified attendance." kind="attendance" rows={members} cohortKey={key} busy={busy} modules={module} onAttendance={onAttendance} requirements={requirements} update={updateField}/>}
  {selected==='certificates'&&<AdminList key={key+'-certificates'} title="Eligibility & certificates" description="Review graduation minimums, approve eligible learners, and issue their certificate links." kind="certificates" rows={progress} cohortKey={key} busy={busy} requirements={requirements} notes={notes} urls={urls} onApprove={onApprove} onIssue={onIssue} update={updateField}/>}
  {selected==='reports'&&<Canopy2027EvidenceReport cohort={cohort} members={members} submissions={subs} progress={progress}/>}
  {selected==='communications'&&<section className="c27-comms"><div className="c27-commsHeader"><div><h2>Admissions communications</h2><p>Review queue health, delivery attempts and reminders only for {cohort?.display_name}.</p></div><div className="c27-inlineActions"><button type="button" disabled={busy||extraLoading} onClick={loadExtra}>Refresh delivery status</button><button type="button" disabled={busy||extraLoading} onClick={()=>act(async()=>{await queueAdmissionsReminders(key,viewer.session);await loadExtra()})}>Queue due reminders</button></div></div><div className="c27-opsMetrics c27-commsMetrics">{[['Queued',cohortExtra.mail?.pending??0],['Sent',cohortExtra.mail?.sent??0],['Failed',cohortExtra.mail?.failed??0],['Mail worker',cohortExtra.mailStatus?.enabled?'Enabled':'Disabled']].map(([name,value])=><div key={name}><strong>{value}</strong><span>{name}</span></div>)}</div><p className="c27-policyNote">Admissions email limits remain 200 per rolling 24 hours, 20 per hour and 2 per worker cycle. Messages must be sent through the verified queue.</p><AdminMailList rows={cohortExtra.mail?.latest||[]}/></section>}
  {selected==='mission'&&<AdminResourceList key={key+'-missions'} title="Mission groups" description="Cohort-specific mission groups with searchable names and status filters. Historical Cohort 2 groups remain separate." kind="missions" rows={cohortExtra.missions||[]} onRefresh={loadExtra} loading={extraLoading} busy={busy}/>}

  {selected==='funding'&&<AdminResourceList key={key+'-funding'} title="Funding opportunities" description="Funding calls linked to this cohort, with publication status and applicant totals." kind="funding" rows={cohortExtra.funding||[]} onRefresh={loadExtra} loading={extraLoading} busy={busy}/>}

  
  <div className="canopyFormMsg"><ShieldCheck size={19}/><span>Admissions and module dates are listed in the cohort schedule. Live session times and assignment grace periods remain to be confirmed. Certificate issuance requires a complete eligibility review.</span></div>
 </main>;
}