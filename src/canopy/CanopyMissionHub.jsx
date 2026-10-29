import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Check,ExternalLink,FolderOpen,Globe2,MessageCircle,Send,ShieldCheck,UsersRound} from 'lucide-react';
import {getCanopyMissionAdmin,getCanopyMissionAdminStats,getMyCanopyMissionCompletion,getMyCanopyMissionHub,respondCanopyMissionInvite,reviewCanopyMissionGroup,reviewCanopyMissionContributor,sendCanopyMissionMessage,submitCanopyMissionGroup,reviseCanopyMissionTeamEvidence,submitCanopyMissionReport,correctApprovedCanopyMissionReport,updateCanopyMissionGroup,submitLearnerComplaint,getLearnerComplaints} from './canopyApi';

const STANDARD=[
  {n:1,title:'Observe locally',brief:'Document one climate issue in your country using direct evidence.'},
  {n:2,title:'Listen to people',brief:'Collect a few community perspectives and identify one shared pattern.'},
  {n:3,title:'Map responsibility',brief:'Identify who can influence the issue and what realistic change is possible.'},
  {n:4,title:'Take public action',brief:'Create or carry out one responsible action that makes the issue visible.'},
  {n:5,title:'Multiply the learning',brief:'Share what the group learned and bring at least one more person into action.'}
];
const deadline='Monday, 26 October 2026 at 11:59 PM GMT';

function go(path){window.history.pushState({},'',path);window.dispatchEvent(new PopStateEvent('popstate'));window.scrollTo({top:0,behavior:'smooth'})}
function statusText(v){return String(v||'').replaceAll('_',' ')}
function meaningfulMissionName(v){const s=String(v||'').trim();return s.length>=4&&s.length<=100&&!['mission','climate mission','womate mission','cross-country climate mission','cross country climate mission'].includes(s.toLowerCase())&&!/^mission\s*[#_-]?\s*\d+$/i.test(s)&&!/^mission\s+(one|two|three|four|five|six|seven|eight|nine|ten)$/i.test(s)}
const MISSION_STAGE_LABELS={1:'Observe locally',2:'Listen to people',3:'Map responsibility',4:'Take public action',5:'Multiply the learning'};
function cleanMissionDriveUrl(value){
  let text=String(value||'').normalize('NFKC').replace(/[“”‘’]/g,'').trim();
  if(!text)return'';
  const found=text.match(/https?:\/\/[^\s<>"']+/i)?.[0];
  let candidate=(found||text).replace(/^[\s(<\[{]+/,'').replace(/[\s)>\]}.,;:]+$/,'');
  if(!/^https?:\/\//i.test(candidate)&&/^(?:www\.)?(?:drive|docs)\.google\.com\//i.test(candidate))candidate='https://'+candidate.replace(/^www\./i,'');
  try{
    const url=new URL(candidate);
    const host=url.hostname.toLowerCase().replace(/^www\./,'');
    if(!['http:','https:'].includes(url.protocol))return'';
    if(host!=='drive.google.com'&&host!=='docs.google.com')return'';
    return url.href;
  }catch{return''}
}

export default function CanopyMissionHub({viewer}){
  const[data,setData]=useState(null),[busy,setBusy]=useState(''),[msg,setMsg]=useState('');
  const[chat,setChat]=useState(''),[folder,setFolder]=useState(''),[report,setReport]=useState({summary:'',proofUrl:''});
  const[reportMsg,setReportMsg]=useState(''),[folderMsg,setFolderMsg]=useState('');
  const[correctionEdit,setCorrectionEdit]=useState(false);
  const[correctedProof,setCorrectedProof]=useState(''),[correctionBusy,setCorrectionBusy]=useState(false),[correctionMessage,setCorrectionMessage]=useState(''),[correctionCase,setCorrectionCase]=useState(null);
  const[missionConcern,setMissionConcern]=useState(''),[concernBusy,setConcernBusy]=useState(false),[concernMsg,setConcernMsg]=useState('');
  const[edit,setEdit]=useState({name:'',choice:'standard',customBrief:''});
  const timer=useRef(null);
  const load=async(silent=false)=>{try{const d=await getMyCanopyMissionHub(viewer.session);setData(d);if(d?.group){setEdit({name:d.group.name||'',choice:d.group.mission_choice||'standard',customBrief:d.group.custom_brief||''});setFolder(d.group.evidence_folder_url||'')}if(!silent)setMsg('')}catch(e){if(!silent)setMsg(e.message)}};
  useEffect(()=>{let live=true;const refresh=()=>{if(live&&document.visibilityState==='visible')load(true)};load();timer.current=window.setInterval(refresh,30000);const onVisibility=()=>{if(document.visibilityState==='visible')refresh()};document.addEventListener('visibilitychange',onVisibility);return()=>{live=false;window.clearInterval(timer.current);document.removeEventListener('visibilitychange',onVisibility)}},[viewer?.session?.access_token]);
  useEffect(()=>{let active=true;getLearnerComplaints(viewer.session).then(rows=>{if(active){const previous=(Array.isArray(rows)?rows:[]).find(x=>x.subject==='Approved Mission proof link correction'&&!['resolved','closed'].includes(String(x.status||'').toLowerCase()));setCorrectionCase(previous||null)}}).catch(()=>{});return()=>{active=false}},[viewer?.session?.access_token]);
  const act=async(key,fn)=>{setBusy(key);setMsg('');try{const d=await fn();setData(d);setMsg('Saved.');return d}catch(e){setMsg(e.message);throw e}finally{setBusy('')}};
  async function saveMissionReport(){
    if(busy)return;
    const summary=String(report.summary||'').trim();
    if(summary.length<20){setReportMsg('Please add at least 20 characters about what happened.');return}if(summary.length>12000){setReportMsg('Your report is too long. Please keep it within 12,000 characters.');return}
    const rawProof=String(report.proofUrl||'').trim();
    const proofUrl=rawProof?cleanMissionDriveUrl(rawProof):'';
    if(!proofUrl){setReportMsg('A valid individual Google Drive or Google Docs proof link is mandatory. Add your evidence before submitting.');return}
    setBusy('report');setReportMsg('Submitting your report…');
    try{
      const d=correctionEdit?await correctApprovedCanopyMissionReport(viewer.session,{summary,proofUrl}):await submitCanopyMissionReport(viewer.session,{summary,proofUrl});
      setData(d);
      const saved=(d?.reports||[]).find(r=>r.user_id===viewer?.user?.id);
      setReport({summary:saved?.summary||summary,proofUrl:saved?.proof_url||proofUrl});
      setReportMsg(correctionEdit?'Your correction was saved with the previous version preserved for WOMATE re-verification.':'Report submitted successfully. Your team progress has been updated.');
      setCorrectionEdit(false);
    }catch(e){setReportMsg(e?.message||'Your report could not be submitted. Please try again.')}
    finally{setBusy('')}
  }
  async function sendApprovedProofCorrection(){
    if(correctionBusy||correctionCase)return;
    if(!myReport||missionReview?.decision!=='approved'){setCorrectionMessage('This correction form is available after WOMATE approves an individual Mission report.');return}
    const newUrl=cleanMissionDriveUrl(correctedProof);
    if(!newUrl){setCorrectionMessage('Enter a valid Google Drive or Google Docs link for the corrected evidence.');return}
    if(newUrl===cleanMissionDriveUrl(myReport.proof_url)){setCorrectionMessage('This is the same link already saved. Paste the correct replacement link.');return}
    setCorrectionBusy(true);setCorrectionMessage('');
    try{
      const cases=await getLearnerComplaints(viewer.session);
      const existing=(Array.isArray(cases)?cases:[]).find(x=>x.subject==='Approved Mission proof link correction'&&!['resolved','closed'].includes(String(x.status||'').toLowerCase()));
      if(existing){setCorrectionCase(existing);setCorrectionMessage('Your earlier correction request is already with WOMATE. Your approved Mission record remains protected.');return}
      const created=await submitLearnerComplaint(viewer.session,{
        subject:'Approved Mission proof link correction',
        message:'I accidentally submitted the wrong evidence link for my approved Mission contribution. Please check this replacement Google Drive/Google Docs link: '+newUrl+'\n\nPlease verify that the replacement opens and contains my actual Mission evidence before changing my saved proof link. My existing report text, original evidence, manual approval and Mission Completed history should be preserved. This is a link correction only.'
      });
      setCorrectionCase(Array.isArray(created)?(created[0]||{status:'open'}):created||{status:'open'});
      setCorrectedProof('');
      setCorrectionMessage('Correction request received by Canopy. WOMATE must check the new link before updating the approved evidence. Your original report and approval have not been changed.');
    }catch(e){setCorrectionMessage(e?.message||'Could not send the correction request. Please try again.')}
    finally{setCorrectionBusy(false)}
  }
  async function saveMissionGroup(){
    if(busy)return;
    const reportCount=new Set(reports.map(r=>r.mission_no)).size;
    if(reportCount<1){setFolderMsg('At least one active mission lead must submit a report before the shared evidence can be sent to WOMATE.');return}
    const folderUrl=cleanMissionDriveUrl(folder);
    if(!folderUrl){setFolderMsg('Paste a Google Drive or Google Docs link for the shared final evidence.');return}
    setBusy('submit');setFolderMsg('Submitting your active team evidence to WOMATE…');
    try{
      const d=['submitted','verified'].includes(group?.status)?await reviseCanopyMissionTeamEvidence(viewer.session,folderUrl):await submitCanopyMissionGroup(viewer.session,folderUrl);
      setData(d);setFolder(folderUrl);
      setFolderMsg(group?.status==='verified'?'Replacement evidence sent for WOMATE re-verification; previously verified work is unchanged until review.':group?.status==='submitted'?'Submitted team evidence link corrected. Previous link preserved in audit.':'Complete group mission submitted successfully for WOMATE verification.');
    }catch(e){setFolderMsg(e?.message||'The complete mission could not be submitted. Please try again.')}
    finally{setBusy('')}
  }
  async function submitMissionConcern(){
    const text=missionConcern.trim();
    if(text.length<10){
      setConcernMsg('Please add a little more detail so WOMATE can understand the challenge.');
      return;
    }
    setConcernBusy(true);setConcernMsg('');
    try{
      await submitLearnerComplaint(viewer.session,{
        subject:'Mission progress check-in / challenge',
        message:text
      });
      setMissionConcern('');
      setConcernMsg('Sent to WOMATE. The team can now see this in Admin > Complaints and follow up.');
    }catch(e){
      setConcernMsg(e?.message||'Could not send your Mission check-in. Please try again.');
    }finally{
      setConcernBusy(false);
    }
  }
  const[completion,setCompletion]=useState(null);
  useEffect(()=>{let live=true;getMyCanopyMissionCompletion(viewer.session).then(x=>{if(live)setCompletion(x||{})}).catch(()=>{if(live)setCompletion({})});return()=>{live=false}},[viewer?.session?.access_token]);
  const myId=viewer?.user?.id; const member=data?.member; const group=data?.group; const members=data?.members||[]; const messages=[...(data?.messages||[])].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)); const reports=data?.reports||[];
  const acceptedCount=members.filter(m=>m.status==='accepted').length; const reportCount=new Set(reports.map(r=>r.mission_no)).size;
  const myMission=STANDARD.find(x=>x.n===member?.mission_no); const myReport=reports.find(r=>r.user_id===myId); const missionReview=data?.my_review; const allAccepted=acceptedCount===5; const allReports=reportCount===5;
  const correctionEligible=Boolean(myReport)&&['6ccc262a-9eb3-44c4-a812-a388efd30441','c4aa3cb3-5a1c-4066-9f82-79a5bcd85659'].includes(myId);
  useEffect(()=>{if(myReport)setReport({summary:myReport.summary||'',proofUrl:myReport.proof_url||''})},[myReport?.submitted_at]);

  // The programme is closed. Learner-facing Mission is now a read-only recognition page.
  if(!data)return <main className="cm-page cm-closed-page"><div className="cm-closed-loading">Loading your Mission record…</div></main>;
  const completed=completion?.status==='completed';
  const groupVerified=group?.status==='verified'||completion?.final_team_completed===true;
  const displayName=meaningfulMissionName(completion?.group_name)?completion.group_name:(meaningfulMissionName(group?.name)?group.name:'Cross-country Climate Mission');
  const firstName=String(viewer?.profile?.full_name||viewer?.user?.user_metadata?.full_name||'Fellow').trim().split(/\s+/)[0];
  return <main className="cm-page cm-closed-page">
   <section className="cm-closed-hero">
    <span className="cm-closed-eyebrow">WOMATE · SHE LEADS CLIMATE · COHORT 2</span>
    <div className="cm-closed-pill"><ShieldCheck size={15}/> Mission phase concluded</div>
    {completed?<><h1>Congratulations, {firstName}.</h1>
     <p>Your climate Mission contribution has been verified by WOMATE and recognised in your Impact Portfolio.</p>
     <div className="cm-closed-achievements"><span><Check size={16}/> Individual Mission · Verified</span>{groupVerified&&<span><Check size={16}/> Final Team Mission · Verified</span>}</div>
     <p className="cm-closed-opportunity">This achievement gives you a stronger advantage when being considered for WOMATE opportunities, funding and paid work. Selection remains subject to each opportunity's requirements.</p>
     <div className="cm-closed-actions"><a href="/canopy/portfolio">View Impact Portfolio <ExternalLink size={16}/></a><button type="button" onClick={()=>window.print()}>Download / print recognition <ExternalLink size={16}/></button><a href="/canopy/talent">Talent Discovery <ExternalLink size={16}/></a></div>
    </>:<><h1>The Mission chapter is complete.</h1><p>Thank you for being part of She Leads Climate. Mission submissions are now closed, and WOMATE is finalising its verified contribution records.</p><a className="cm-closed-simple" href="/canopy/portfolio">View your Impact Portfolio <ExternalLink size={16}/></a></>}
   </section>
   {completed&&<section className="cm-closed-record"><span>YOUR VERIFIED ACHIEVEMENT</span><h2>{displayName}</h2><p>Official WOMATE Mission recognition · She Leads Climate 2026</p>{completion?.approved_at&&<small>Approved {new Date(completion.approved_at).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</small>}</section>}
  </main>;
}

export function CanopyMissionAdmin({viewer,cohortKey='she-leads-climate-c2-2026',cohort=null}){
  const [stats,setStats]=useState(null);
  const[groups,setGroups]=useState([]),[busy,setBusy]=useState(''),[msg,setMsg]=useState(''),[remarks,setRemarks]=useState({}),[contributorNotes,setContributorNotes]=useState({});
  const[view,setView]=useState('individual'),[query,setQuery]=useState(''),[reportFilter,setReportFilter]=useState('pending'),[acceptanceFilter,setAcceptanceFilter]=useState('all'),[completedMissionFilter,setCompletedMissionFilter]=useState('all'),[completedStageFilter,setCompletedStageFilter]=useState('all');
  const load=async()=>{try{const [x,s]=await Promise.all([getCanopyMissionAdmin(viewer.session,cohortKey),getCanopyMissionAdminStats(viewer.session,cohortKey)]);setGroups(Array.isArray(x)?x:[]);setStats(s||null)}catch(e){setMsg(e.message)}};
  const acceptedCount=g=>(g.members||[]).filter(m=>m.status==='accepted').length;
  const acceptanceOptions=[['all','All groups'],['5','5/5 accepted'],['4','4/5 accepted'],['3','3/5 accepted'],['2','2/5 accepted'],['1','1/5 accepted'],['0','0/5 accepted']];
  const reports=groups.flatMap(g=>(g.reports||[]).map(r=>({...r,group:g,completion:(g.completions||[]).find(c=>c.user_id===r.user_id&&c.status==='completed')||null})));
  const completions=groups.flatMap(g=>(g.completions||[]).filter(c=>c.status==='completed').map(c=>({...c,group:g,member:(g.members||[]).find(m=>m.user_id===c.user_id)})));
  const finalGroups=groups.filter(g=>['submitted','verified'].includes(g.status));
  const q=query.trim().toLowerCase();
  const reportRows=reports.filter(r=>(reportFilter==='all'||(reportFilter==='completed'?Boolean(r.completion):reportFilter==='revision_required'?r.review?.decision==='revision_required':reportFilter==='rejected'?r.review?.decision==='rejected':!r.completion&&!['revision_required','rejected'].includes(r.review?.decision)))&&(!q||[r.name,r.country,r.group?.name,r.summary].some(v=>String(v||'').toLowerCase().includes(q))));
  const completedMissionOptions=groups.filter(g=>(g.completions||[]).some(c=>c.status==='completed')).map(g=>({id:g.id,label:meaningfulMissionName(g.name)?g.name:'Name pending'})).sort((a,b)=>a.label.localeCompare(b.label));
  const completedRows=completions.filter(c=>(completedMissionFilter==='all'||c.group?.id===completedMissionFilter)&&(completedStageFilter==='all'||String(c.member?.mission_no||'')===completedStageFilter)&&(!q||[c.member?.name,c.member?.country,c.group?.name].some(v=>String(v||'').toLowerCase().includes(q))));
  const teamRows=(acceptanceFilter==='all'?groups:groups.filter(g=>acceptedCount(g)===Number(acceptanceFilter))).filter(g=>!q||[g.name,...(g.members||[]).flatMap(m=>[m.name,m.country])].some(v=>String(v||'').toLowerCase().includes(q)));
  useEffect(()=>{load()},[cohortKey]);
  const review=async(g,d)=>{setBusy(g.id+d);setMsg('');try{await reviewCanopyMissionGroup(viewer.session,g.id,d,remarks[g.id]||'');await load();setMsg(d==='verified'?'Final team evidence verified. Contributor recognition remains person-by-person.':'Team notified to update the final evidence.')}catch(e){setMsg(e.message)}finally{setBusy('')}};
  const reviewContributor=async(r,d)=>{const reviewNote=String(contributorNotes[`${r.group.id}:${r.user_id}`]||'').trim();if(d!=='approved'&&reviewNote.length<12){setMsg('Enter an explanation of at least 12 characters in this learner’s Review note before requesting revision or rejecting the contribution.');return}const key=`${r.group.id}:${r.user_id}:${d}`;setBusy(key);setMsg('');try{await reviewCanopyMissionContributor(viewer.session,{groupId:r.group.id,userId:r.user_id,decision:d,remark:reviewNote});await load();setMsg(d==='approved'?`${r.name} has been awarded WOMATE Mission Completed.`:d==='revision_required'?`Revision requested and notification sent to ${r.name}.`:`Contribution rejected and notification sent to ${r.name}.`)}catch(e){setMsg(e.message)}finally{setBusy('')}};
  return <main className="cm-admin cm-mission-ops">
    <header><span>MISSION OPERATIONS</span><h1>Review Mission work without the clutter.</h1>{cohort&&<p><b>{cohort.display_name}</b></p>}<p>Individual contribution approval and final team verification are separate. Only learners WOMATE explicitly approves receive the Mission Completed recognition and its opportunity/funding advantage.</p></header>
    {stats&&<div className="cm-admin-summary"><span><b>{reports.length}</b> Individual reports</span><span><b>{reports.filter(r=>!r.completion&&!['revision_required','rejected'].includes(r.review?.decision)).length}</b> Awaiting approval</span><span><b>{finalGroups.filter(g=>g.status==='submitted').length}</b> Final review</span><span><b>{completions.length}</b> Mission completed</span><span><b>{stats.accepted||0}</b> Accepted participants</span></div>}
    <div className="cm-mission-ops-tabs" role="tablist" aria-label="Mission operations views">
      {[['individual','Individual reports',reports.length],['final','Final submissions',finalGroups.length],['completed','Mission completed',completions.length],['teams','All teams',groups.length]].map(([key,label,count])=><button type="button" key={key} className={view===key?'active':''} onClick={()=>setView(key)}><span>{label}</span><b>{count}</b></button>)}
    </div>
    <div className="cm-mission-ops-toolbar"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search learner, country, team or report…"/>{view==='individual'&&<select value={reportFilter} onChange={e=>setReportFilter(e.target.value)}><option value="pending">Awaiting approval</option><option value="revision_required">Revision requested</option><option value="rejected">Rejected</option><option value="completed">Mission completed</option><option value="all">All individual reports</option></select>}{view==='completed'&&<><select value={completedMissionFilter} onChange={e=>setCompletedMissionFilter(e.target.value)}><option value="all">All completed Mission teams</option>{completedMissionOptions.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select><select value={completedStageFilter} onChange={e=>setCompletedStageFilter(e.target.value)}><option value="all">All lead stages</option>{[1,2,3,4,5].map(n=><option key={n} value={String(n)}>Stage {n}: {MISSION_STAGE_LABELS[n]}</option>)}</select></>}{view==='teams'&&<select value={acceptanceFilter} onChange={e=>setAcceptanceFilter(e.target.value)}>{acceptanceOptions.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>}</div>
    {msg&&<p className="cm-msg" role="status">{msg}</p>}
    {view==='individual'&&<section className="cm-mission-review-list">{reportRows.map(r=><article key={r.id||`${r.group.id}-${r.user_id}`} className={r.completion?'is-completed':''}><header><div><small>MISSION {r.mission_no} · {r.country||'Country not saved'}</small><h2>{r.name}</h2><p>{r.group.name||'Cross-country climate mission'}</p></div>{r.completion?<span className="cm-mission-completed-tag"><Check/> Mission Completed</span>:<span className="cm-mission-awaiting">{r.review?.decision==='revision_required'?'Revision requested':r.review?.decision==='rejected'?'Rejected':'Awaiting WOMATE approval'}</span>}</header>{r.review?.reason&&<div className="cm-msg" role="status"><strong>WOMATE review:</strong> {r.review.reason}</div>}<div className="cm-mission-report-copy"><p>{r.summary}</p>{r.proof_url&&<a href={r.proof_url} target="_blank" rel="noreferrer">Open individual proof <ExternalLink size={14}/></a>}</div><textarea value={contributorNotes[`${r.group.id}:${r.user_id}`]||''} onChange={e=>setContributorNotes(v=>({...v,[`${r.group.id}:${r.user_id}`]:e.target.value}))} placeholder="Explain the required corrections or reason for rejection (at least 12 characters)"/><div className="cm-actions">{!r.completion?<><button disabled={Boolean(busy)} onClick={()=>reviewContributor(r,'approved')}>Approve Mission Contribution</button><button type="button" className="ghost" disabled={Boolean(busy)} onClick={()=>reviewContributor(r,'revision_required')}>Request revision</button><button type="button" className="ghost" disabled={Boolean(busy)} onClick={()=>reviewContributor(r,'rejected')}>Reject contribution</button></>:<button className="ghost" disabled={Boolean(busy)} onClick={()=>reviewContributor(r,'rejected')}>Remove completion tag</button>}</div></article>)}{!reportRows.length&&<p className="cm-admin-empty">No individual Mission reports match this view.</p>}</section>}
    {view==='final'&&<section className="cm-admin-list">{finalGroups.filter(g=>!q||[g.name,...(g.members||[]).map(m=>m.name)].some(v=>String(v||'').toLowerCase().includes(q))).map(g=><article key={g.id}><header><div><small>{g.status==='verified'?'FINAL VERIFIED':'FINAL SUBMISSION READY'}</small><h2>{g.name||'Cross-country climate mission'}</h2></div><span>{(g.reports||[]).length}/5 individual reports</span></header><div className="cm-admin-members">{(g.members||[]).filter(m=>m.status==='accepted').map(m=><span key={m.user_id}>{m.mission_no}. {m.name} · {m.country}</span>)}</div>{g.evidence_folder_url?<a className="cm-folder-link" href={g.evidence_folder_url} target="_blank" rel="noreferrer"><FolderOpen/> Open final shared evidence</a>:<p>No final evidence reference saved.</p>}<textarea value={remarks[g.id]||''} onChange={e=>setRemarks(v=>({...v,[g.id]:e.target.value}))} placeholder="WOMATE final verification note"/>{g.status==='submitted'&&<div className="cm-actions"><button disabled={Boolean(busy)} onClick={()=>review(g,'verified')}>Verify final mission</button><button className="ghost" disabled={Boolean(busy)} onClick={()=>review(g,'revision_required')}>Request update</button></div>}{g.status==='verified'&&<div className="cm-verified"><Check/> Final evidence verified</div>}</article>)}{!finalGroups.length&&<p className="cm-admin-empty">No final Mission submissions yet.</p>}</section>}
    {view==='completed'&&<section className="cm-mission-completed-grid">{completedRows.map(c=>{const missionName=meaningfulMissionName(c.group?.name)?c.group.name:null;return <article key={c.id}><span className="cm-mission-completed-tag"><Check/> {missionName?`${missionName} · Mission Completed · WOMATE verified`:'Mission name pending · WOMATE verified'}</span><h2>{c.member?.name||'Learner'}</h2><p>{c.member?.country||'Country not saved'}{c.member?.mission_no?` · Lead stage ${c.member.mission_no}: ${MISSION_STAGE_LABELS[c.member.mission_no]||'Mission contribution'}`:''}</p><small>{missionName||'Team needs to choose a Mission name'}</small><time>{c.approved_at?new Date(c.approved_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):''}</time>{c.remark&&<p>{c.remark}</p>}</article>})}{!completedRows.length&&<p className="cm-admin-empty">No learners match this completed Mission filter.</p>}</section>}
    {view==='teams'&&<section className="cm-admin-list">{teamRows.map(g=><article key={g.id}><header><div><small>{statusText(g.status)}</small><h2>{g.name||'Cross-country climate mission'}</h2></div><span>{acceptedCount(g)}/5 accepted</span></header><div className="cm-admin-members">{(g.members||[]).map(m=><span key={m.user_id}>{m.mission_no}. {m.name} - {m.country} ({statusText(m.status)})</span>)}</div><p>{(g.reports||[]).length} individual report{(g.reports||[]).length===1?'':'s'} · {(g.completions||[]).filter(c=>c.status==='completed').length} Mission Completed</p>{g.evidence_folder_url&&<a className="cm-folder-link" href={g.evidence_folder_url} target="_blank" rel="noreferrer"><FolderOpen/> Open shared evidence</a>}</article>)}{!teamRows.length&&<p className="cm-admin-empty">No Mission teams match this filter.</p>}</section>}
  </main>
}