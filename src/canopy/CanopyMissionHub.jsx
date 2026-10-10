import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Check,ExternalLink,FolderOpen,Globe2,MessageCircle,Send,ShieldCheck,UsersRound} from 'lucide-react';
import {getCanopyMissionAdmin,getCanopyMissionAdminStats,getMyCanopyMissionHub,respondCanopyMissionInvite,reviewCanopyMissionGroup,reviewCanopyMissionContributor,sendCanopyMissionMessage,submitCanopyMissionGroup,submitCanopyMissionReport,updateCanopyMissionGroup,submitLearnerComplaint} from './canopyApi';

const STANDARD=[
  {n:1,title:'Observe locally',brief:'Document one climate issue in your country using direct evidence.'},
  {n:2,title:'Listen to people',brief:'Collect a few community perspectives and identify one shared pattern.'},
  {n:3,title:'Map responsibility',brief:'Identify who can influence the issue and what realistic change is possible.'},
  {n:4,title:'Take public action',brief:'Create or carry out one responsible action that makes the issue visible.'},
  {n:5,title:'Multiply the learning',brief:'Share what the group learned and bring at least one more person into action.'}
];
const deadline='Friday, 23 October 2026 at 11:59 PM GMT';

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
  const[missionConcern,setMissionConcern]=useState(''),[concernBusy,setConcernBusy]=useState(false),[concernMsg,setConcernMsg]=useState('');
  const[edit,setEdit]=useState({name:'',choice:'standard',customBrief:''});
  const timer=useRef(null);
  const load=async(silent=false)=>{try{const d=await getMyCanopyMissionHub(viewer.session);setData(d);if(d?.group){setEdit({name:d.group.name||'',choice:d.group.mission_choice||'standard',customBrief:d.group.custom_brief||''});setFolder(d.group.evidence_folder_url||'')}if(!silent)setMsg('')}catch(e){if(!silent)setMsg(e.message)}};
  useEffect(()=>{let live=true;const refresh=()=>{if(live&&document.visibilityState==='visible')load(true)};load();timer.current=window.setInterval(refresh,30000);const onVisibility=()=>{if(document.visibilityState==='visible')refresh()};document.addEventListener('visibilitychange',onVisibility);return()=>{live=false;window.clearInterval(timer.current);document.removeEventListener('visibilitychange',onVisibility)}},[viewer?.session?.access_token]);
  const act=async(key,fn)=>{setBusy(key);setMsg('');try{const d=await fn();setData(d);setMsg('Saved.');return d}catch(e){setMsg(e.message);throw e}finally{setBusy('')}};
  async function saveMissionReport(){
    if(busy)return;
    const summary=String(report.summary||'').trim();
    if(summary.length<20){setReportMsg('Please add at least 20 characters about what happened.');return}
    const rawProof=String(report.proofUrl||'').trim();
    const proofUrl=rawProof?cleanMissionDriveUrl(rawProof):'';
    if(rawProof&&!proofUrl){setReportMsg('That proof link could not be read as a Google Drive or Google Docs link. You can also leave this optional field blank.');return}
    setBusy('report');setReportMsg('Submitting your report…');
    try{
      const d=await submitCanopyMissionReport(viewer.session,{summary,proofUrl});
      setData(d);
      const saved=(d?.reports||[]).find(r=>r.user_id===viewer?.user?.id);
      setReport({summary:saved?.summary||summary,proofUrl:saved?.proof_url||proofUrl});
      setReportMsg('Report submitted successfully. Your team progress has been updated.');
    }catch(e){setReportMsg(e?.message||'Your report could not be submitted. Please try again.')}
    finally{setBusy('')}
  }
  async function saveMissionGroup(){
    if(busy)return;
    const reportCount=new Set(reports.map(r=>r.mission_no)).size;
    if(reportCount<1){setFolderMsg('At least one active mission lead must submit a report before the shared evidence can be sent to WOMATE.');return}
    const folderUrl=cleanMissionDriveUrl(folder);
    if(!folderUrl){setFolderMsg('Paste a Google Drive or Google Docs link for the shared final evidence.');return}
    setBusy('submit');setFolderMsg('Submitting your active team evidence to WOMATE…');
    try{
      const d=await submitCanopyMissionGroup(viewer.session,folderUrl);
      setData(d);setFolder(folderUrl);
      setFolderMsg('Complete group mission submitted successfully for WOMATE verification.');
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
  const myId=viewer?.user?.id; const member=data?.member; const group=data?.group; const members=data?.members||[]; const messages=[...(data?.messages||[])].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)); const reports=data?.reports||[];
  const acceptedCount=members.filter(m=>m.status==='accepted').length; const reportCount=new Set(reports.map(r=>r.mission_no)).size;
  const myMission=STANDARD.find(x=>x.n===member?.mission_no); const myReport=reports.find(r=>r.user_id===myId); const allAccepted=acceptedCount===5; const allReports=reportCount===5;
  useEffect(()=>{if(myReport)setReport({summary:myReport.summary||'',proofUrl:myReport.proof_url||''})},[myReport?.submitted_at]);
  if(!data)return <main className="cm-page"><div className="cm-state">Opening your mission space...</div></main>;
  if(data.state==='locked')return <main className="cm-page"><header className="cm-hero"><span>CROSS-COUNTRY MISSION</span><h1>Complete at least one Canopy module.</h1><p>The optional group mission opens after WOMATE has manually marked at least one of your Module 01-05 assignments Completed and your country is saved on your profile.</p></header></main>;
  if(data.state==='waiting')return <main className="cm-page"><header className="cm-hero"><span>CROSS-COUNTRY MISSION</span><h1>You are eligible.</h1><p>Canopy forms five-person groups across different countries when a full cross-country match is available. Watch your notifications for an invitation.</p><small>Optional. Your course progress is not affected if you do not participate.</small></header></main>;
  if(data.state==='declined')return <main className="cm-page"><header className="cm-hero"><span>CROSS-COUNTRY MISSION</span><h1>Invitation declined.</h1><p>Your She Leads course continues normally. The mission is optional and declining does not affect your learning record.</p></header></main>;
  if(data.state==='invited')return <main className="cm-page"><header className="cm-hero cm-invite"><span>YOU HAVE BEEN MATCHED</span><h1>A five-country mission group is waiting.</h1><p>This is optional. If you accept, you are committing to collaborate with four women from other countries, lead one of the five mission stages, report back to your team and help submit the complete group mission by <b>{deadline}</b>.</p><div className="cm-actions"><button disabled={busy} onClick={()=>act('accept',()=>respondCanopyMissionInvite(viewer.session,true))}>Accept mission</button><button className="ghost" disabled={busy} onClick={()=>act('decline',()=>respondCanopyMissionInvite(viewer.session,false))}>Decline</button></div>{msg&&<p className="cm-msg">{msg}</p>}</header></main>;
  return <main className="cm-page">
    <header className="cm-hero"><div><span>PRIVATE CROSS-COUNTRY MISSION</span><h1>{group?.name||'Cross-country climate mission'}</h1><p>Active women. Five mission stages. One shared evidence folder.</p></div><div className={`cm-status ${group?.status}`}>{statusText(group?.status)}</div></header>
    {!meaningfulMissionName(group?.name)&&<section className="cm-identity-alert"><ShieldCheck/><div><b>Name your Mission team.</b><p>Your team still has a generic label. Agree on one shared descriptive Mission name below. WOMATE will use that name on verified recognition and Talent Discovery.</p></div></section>}
    <section className="cm-commit"><ShieldCheck/><div><b>Optional to join. A commitment once accepted.</b><p>Do not pressure an inactive teammate or wait indefinitely. Work with the people who are active, complete your own parts and findings, and submit the shared evidence by {deadline}. In the folder, include a factual contribution note naming who contributed and which listed members did not contribute. WOMATE verifies the evidence before the mission is added to participating members' Impact Profiles.</p></div></section>

    <section className="cm-section cm-mission-checkin">
      <header>
        <span>MISSION CHECK-IN</span>
        <h2>Is anything blocking your team?</h2>
        <p>Tell WOMATE about a complaint, challenge or support need. This goes directly to the Admin complaints workstream so the team can review and resolve it.</p>
      </header>
      <div className="cm-form">
        <label>Complaint or challenge
          <textarea rows="5" value={missionConcern} onChange={e=>setMissionConcern(e.target.value)} placeholder="Briefly explain what is happening, what your team has tried, and what support you need from WOMATE."/>
        </label>
        <button type="button" disabled={concernBusy||!missionConcern.trim()} onClick={submitMissionConcern}>
          {concernBusy?'Sending...':'Send to WOMATE'}
        </button>
        {concernMsg&&<p className="cm-msg" role="status">{concernMsg}</p>}
        <small>Keep communicating with your team. Progress does not have to be perfect to be meaningful - consistent small steps still move the mission forward.</small>
      </div>
    </section>

    <section className="cm-layout">
      <div className="cm-main">
        <section className="cm-section"><header><span>YOUR TEAM</span><h2>Meet the five mission leads</h2></header><div className="cm-members">{members.map(m=><div key={m.user_id} className={m.user_id===myId?'me':''}><i>{m.mission_no}</i><p><b>{m.name}{m.user_id===myId?' (you)':''}</b><span><Globe2/> {m.country}</span></p><em>{m.status==='accepted'?'Accepted':'Awaiting reply'}</em></div>)}</div></section>

        <section className="cm-section"><header><span>THE FIVE MISSIONS</span><h2>Each member leads one and teaches the rest.</h2><p>Use these standard stages, or adapt them around your group's chosen climate issue. Accountability happens inside the group.</p></header><div className="cm-missions">{STANDARD.map(x=>{const lead=members.find(m=>m.mission_no===x.n);const done=reports.some(r=>r.mission_no===x.n);return <details key={x.n} open={x.n===member?.mission_no}><summary><i>{done?<Check/>:x.n}</i><div><b>{x.title}</b><span>{lead?`Lead: ${lead.name} - ${lead.country}`:'Lead seat reserved'}</span></div></summary><p>{x.brief}</p></details>})}</div></section>

        <section className="cm-section"><header><span>MISSION IDENTITY</span><h2>Give your Mission one shared name.</h2><p>Agree on one clear team Mission name. Do not use Mission 1, Mission 2 or another number as the team identity. WOMATE uses this shared name on verified Mission recognition and Talent Discovery.</p></header><div className="cm-form"><label>Mission name<input maxLength="100" placeholder="e.g. Water Conservation Champions" value={edit.name} onChange={e=>setEdit(v=>({...v,name:e.target.value}))}/><small>{meaningfulMissionName(edit.name)?`Recognition preview: ${edit.name.trim()} · Mission Completed · WOMATE verified`:'Choose a descriptive shared Mission name before final submission.'}</small></label><div className="cm-choice"><button className={edit.choice==='standard'?'on':''} onClick={()=>setEdit(v=>({...v,choice:'standard'}))}>Use standard mission</button><button className={edit.choice==='custom'?'on':''} onClick={()=>setEdit(v=>({...v,choice:'custom'}))}>Choose our own theme</button></div>{edit.choice==='custom'&&<label>Our mission focus<textarea value={edit.customBrief} onChange={e=>setEdit(v=>({...v,customBrief:e.target.value}))} placeholder="What issue will your five-country team explore or act on?"/></label>}<button disabled={busy||!meaningfulMissionName(edit.name)} onClick={()=>act('group',()=>updateCanopyMissionGroup(viewer.session,edit))}>Save Mission name</button></div></section>

        <section className="cm-section"><header><span>YOUR REPORT</span><h2>Mission {member?.mission_no}: {myMission?.title}</h2><p>Lead your stage and report what happened to the group. Proof is optional here; your team will submit one final shared evidence link later.</p></header><div className="cm-form"><label>What happened?<textarea value={report.summary} onChange={e=>{setReportMsg('');setReport(v=>({...v,summary:e.target.value}))}} placeholder="Briefly report what you did, what you learned and what the group should know."/></label><label>Proof link <small>(optional — Google Drive / Google Docs)</small><input inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck="false" value={report.proofUrl} onChange={e=>{setReportMsg('');setReport(v=>({...v,proofUrl:e.target.value}))}} onBlur={e=>{const cleaned=cleanMissionDriveUrl(e.target.value);if(cleaned)setReport(v=>({...v,proofUrl:cleaned}))}} placeholder="Paste a Drive link, or leave blank"/></label><button type="button" disabled={busy==='report'} onClick={saveMissionReport}>{busy==='report'?'Submitting…':myReport?'Update my report':'Submit my report'}</button>{reportMsg&&<p className={`cm-msg cm-inline-result ${/successfully/i.test(reportMsg)?'ok':''}`} role="status" aria-live="polite">{reportMsg}</p>}{myReport&&<small className="cm-saved-note"><Check/> This mission report is already saved. You can update it until the deadline.</small>}</div></section>

        <section className="cm-section cm-submit"><header><span>ONE GROUP FOLDER</span><h2>Submit your active team's mission evidence to WOMATE.</h2><p>Put the completed outputs and findings in one shared Drive folder or document set and make it viewable by link. If some listed members did not contribute, add a short factual contribution note in the folder naming the contributors and non-contributors. Do not delay active work while waiting for an unresponsive teammate.</p></header><div className="cm-readiness"><span className={acceptedCount>0?'ok':''}>{acceptedCount}/5 accepted</span><span className={reportCount>0?'ok':''}>{reportCount}/5 mission reports ready</span></div><div className="cm-form"><label>Shared final evidence link<input inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck="false" value={folder} onChange={e=>{setFolderMsg('');setFolder(e.target.value)}} onBlur={e=>{const cleaned=cleanMissionDriveUrl(e.target.value);if(cleaned)setFolder(cleaned)}} placeholder="Paste any Google Drive or Google Docs share link"/></label>{cleanMissionDriveUrl(folder)&&<a href={cleanMissionDriveUrl(folder)} target="_blank" rel="noreferrer">Open final evidence <ExternalLink/></a>}<button type="button" disabled={busy==='submit'||group?.status==='submitted'||group?.status==='verified'||reportCount<1} onClick={saveMissionGroup}>{group?.status==='verified'?'WOMATE verified':group?.status==='submitted'?'Submitted for WOMATE verification':busy==='submit'?'Submitting…':'Submit active team mission'}</button>{reportCount<1&&group?.status!=='submitted'&&group?.status!=='verified'&&<small className="cm-submit-hint">Submit at least one mission report first. After that, active contributors can send the shared evidence without waiting for inactive teammates.</small>}{reportCount>0&&!allReports&&group?.status!=='submitted'&&group?.status!=='verified'&&<small className="cm-submit-hint">You can submit with the work completed by active contributors. WOMATE will review the folder and contribution note.</small>}{folderMsg&&<p className={`cm-msg cm-inline-result ${/successfully/i.test(folderMsg)?'ok':''}`} role="status" aria-live="polite">{folderMsg}</p>}{group?.verification_remark&&<p className="cm-msg">WOMATE note: {group.verification_remark}</p>}</div></section>
      </div>

      <aside className="cm-chat"><header><div><MessageCircle/><span>PRIVATE GROUP CHAT</span></div><small>Only accepted mission members can read this chat.</small></header><div className="cm-chat-stream">{messages.length?messages.map(m=><div key={m.id} className={m.user_id===myId?'mine':''}><b>{m.sender_name}</b><p>{m.body}</p><small>{new Date(m.created_at).toLocaleString()}</small></div>):<p className="cm-empty">Start with introductions. Share how you would like the group to work together.</p>}</div><div className="cm-chat-compose"><textarea value={chat} onChange={e=>setChat(e.target.value)} placeholder="Message your team. You may voluntarily exchange WhatsApp or phone details here if you choose."/><button disabled={busy||!chat.trim()} onClick={()=>act('chat',async()=>{const d=await sendCanopyMissionMessage(viewer.session,chat);setChat('');return d})}><Send/></button></div><p className="cm-privacy">Canopy does not reveal anyone's phone number automatically. Share contact details only if you want to continue coordination outside Canopy.</p></aside>
    </section>{msg&&<p className="cm-msg cm-global">{msg}</p>}
  </main>
}

export function CanopyMissionAdmin({viewer}){
  const [stats,setStats]=useState(null);
  const[groups,setGroups]=useState([]),[busy,setBusy]=useState(''),[msg,setMsg]=useState(''),[remarks,setRemarks]=useState({}),[contributorNotes,setContributorNotes]=useState({});
  const[view,setView]=useState('individual'),[query,setQuery]=useState(''),[reportFilter,setReportFilter]=useState('pending'),[acceptanceFilter,setAcceptanceFilter]=useState('all'),[completedMissionFilter,setCompletedMissionFilter]=useState('all'),[completedStageFilter,setCompletedStageFilter]=useState('all');
  const load=async()=>{try{const [x,s]=await Promise.all([getCanopyMissionAdmin(viewer.session),getCanopyMissionAdminStats(viewer.session)]);setGroups(Array.isArray(x)?x:[]);setStats(s||null)}catch(e){setMsg(e.message)}};
  const acceptedCount=g=>(g.members||[]).filter(m=>m.status==='accepted').length;
  const acceptanceOptions=[['all','All groups'],['5','5/5 accepted'],['4','4/5 accepted'],['3','3/5 accepted'],['2','2/5 accepted'],['1','1/5 accepted'],['0','0/5 accepted']];
  const reports=groups.flatMap(g=>(g.reports||[]).map(r=>({...r,group:g,completion:(g.completions||[]).find(c=>c.user_id===r.user_id&&c.status==='completed')||null})));
  const completions=groups.flatMap(g=>(g.completions||[]).filter(c=>c.status==='completed').map(c=>({...c,group:g,member:(g.members||[]).find(m=>m.user_id===c.user_id)})));
  const finalGroups=groups.filter(g=>['submitted','verified'].includes(g.status));
  const q=query.trim().toLowerCase();
  const reportRows=reports.filter(r=>(reportFilter==='all'||(reportFilter==='completed'?Boolean(r.completion):!r.completion))&&(!q||[r.name,r.country,r.group?.name,r.summary].some(v=>String(v||'').toLowerCase().includes(q))));
  const completedMissionOptions=groups.filter(g=>(g.completions||[]).some(c=>c.status==='completed')).map(g=>({id:g.id,label:meaningfulMissionName(g.name)?g.name:'Name pending'})).sort((a,b)=>a.label.localeCompare(b.label));
  const completedRows=completions.filter(c=>(completedMissionFilter==='all'||c.group?.id===completedMissionFilter)&&(completedStageFilter==='all'||String(c.member?.mission_no||'')===completedStageFilter)&&(!q||[c.member?.name,c.member?.country,c.group?.name].some(v=>String(v||'').toLowerCase().includes(q))));
  const teamRows=(acceptanceFilter==='all'?groups:groups.filter(g=>acceptedCount(g)===Number(acceptanceFilter))).filter(g=>!q||[g.name,...(g.members||[]).flatMap(m=>[m.name,m.country])].some(v=>String(v||'').toLowerCase().includes(q)));
  useEffect(()=>{load()},[]);
  const review=async(g,d)=>{setBusy(g.id+d);setMsg('');try{const x=await reviewCanopyMissionGroup(viewer.session,g.id,d,remarks[g.id]||'');setGroups(Array.isArray(x)?x:[]);setMsg(d==='verified'?'Final team evidence verified. Contributor recognition remains person-by-person.':'Team notified to update the final evidence.')}catch(e){setMsg(e.message)}finally{setBusy('')}};
  const reviewContributor=async(r,d)=>{const key=`${r.group.id}:${r.user_id}:${d}`;setBusy(key);setMsg('');try{const x=await reviewCanopyMissionContributor(viewer.session,{groupId:r.group.id,userId:r.user_id,decision:d,remark:contributorNotes[r.user_id]||''});setGroups(Array.isArray(x)?x:[]);setMsg(d==='completed'?`${r.name} now has the WOMATE Mission Completed recognition.`:`${r.name}'s Mission Completed recognition was removed.`)}catch(e){setMsg(e.message)}finally{setBusy('')}};
  return <main className="cm-admin cm-mission-ops">
    <header><span>MISSION OPERATIONS</span><h1>Review Mission work without the clutter.</h1><p>Individual contribution approval and final team verification are separate. Only learners WOMATE explicitly approves receive the Mission Completed recognition and its opportunity/funding advantage.</p></header>
    {stats&&<div className="cm-admin-summary"><span><b>{reports.length}</b> Individual reports</span><span><b>{reports.filter(r=>!(groups.find(g=>g.id===r.group.id)?.completions||[]).some(c=>c.user_id===r.user_id&&c.status==='completed')).length}</b> Awaiting approval</span><span><b>{finalGroups.filter(g=>g.status==='submitted').length}</b> Final review</span><span><b>{completions.length}</b> Mission completed</span><span><b>{stats.accepted||0}</b> Accepted participants</span></div>}
    <div className="cm-mission-ops-tabs" role="tablist" aria-label="Mission operations views">
      {[['individual','Individual reports',reports.length],['final','Final submissions',finalGroups.length],['completed','Mission completed',completions.length],['teams','All teams',groups.length]].map(([key,label,count])=><button type="button" key={key} className={view===key?'active':''} onClick={()=>setView(key)}><span>{label}</span><b>{count}</b></button>)}
    </div>
    <div className="cm-mission-ops-toolbar"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search learner, country, team or report…"/>{view==='individual'&&<select value={reportFilter} onChange={e=>setReportFilter(e.target.value)}><option value="pending">Awaiting approval</option><option value="completed">Mission completed</option><option value="all">All individual reports</option></select>}{view==='completed'&&<><select value={completedMissionFilter} onChange={e=>setCompletedMissionFilter(e.target.value)}><option value="all">All completed Mission teams</option>{completedMissionOptions.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select><select value={completedStageFilter} onChange={e=>setCompletedStageFilter(e.target.value)}><option value="all">All lead stages</option>{[1,2,3,4,5].map(n=><option key={n} value={String(n)}>Stage {n}: {MISSION_STAGE_LABELS[n]}</option>)}</select></>}{view==='teams'&&<select value={acceptanceFilter} onChange={e=>setAcceptanceFilter(e.target.value)}>{acceptanceOptions.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>}</div>
    {msg&&<p className="cm-msg" role="status">{msg}</p>}
    {view==='individual'&&<section className="cm-mission-review-list">{reportRows.map(r=><article key={r.id||`${r.group.id}-${r.user_id}`} className={r.completion?'is-completed':''}><header><div><small>MISSION {r.mission_no} · {r.country||'Country not saved'}</small><h2>{r.name}</h2><p>{r.group.name||'Cross-country climate mission'}</p></div>{r.completion?<span className="cm-mission-completed-tag"><Check/> Mission Completed</span>:<span className="cm-mission-awaiting">Awaiting WOMATE approval</span>}</header><div className="cm-mission-report-copy"><p>{r.summary}</p>{r.proof_url&&<a href={r.proof_url} target="_blank" rel="noreferrer">Open individual proof <ExternalLink size={14}/></a>}</div><textarea value={contributorNotes[r.user_id]||''} onChange={e=>setContributorNotes(v=>({...v,[r.user_id]:e.target.value}))} placeholder="Optional recognition / review note"/><div className="cm-actions">{!r.completion?<button disabled={Boolean(busy)} onClick={()=>reviewContributor(r,'completed')}>Approve Mission Contribution</button>:<button className="ghost" disabled={Boolean(busy)} onClick={()=>reviewContributor(r,'revoked')}>Remove completion tag</button>}</div></article>)}{!reportRows.length&&<p className="cm-admin-empty">No individual Mission reports match this view.</p>}</section>}
    {view==='final'&&<section className="cm-admin-list">{finalGroups.filter(g=>!q||[g.name,...(g.members||[]).map(m=>m.name)].some(v=>String(v||'').toLowerCase().includes(q))).map(g=><article key={g.id}><header><div><small>{g.status==='verified'?'FINAL VERIFIED':'FINAL SUBMISSION READY'}</small><h2>{g.name||'Cross-country climate mission'}</h2></div><span>{(g.reports||[]).length}/5 individual reports</span></header><div className="cm-admin-members">{(g.members||[]).filter(m=>m.status==='accepted').map(m=><span key={m.user_id}>{m.mission_no}. {m.name} · {m.country}</span>)}</div>{g.evidence_folder_url?<a className="cm-folder-link" href={g.evidence_folder_url} target="_blank" rel="noreferrer"><FolderOpen/> Open final shared evidence</a>:<p>No final evidence reference saved.</p>}<textarea value={remarks[g.id]||''} onChange={e=>setRemarks(v=>({...v,[g.id]:e.target.value}))} placeholder="WOMATE final verification note"/>{g.status==='submitted'&&<div className="cm-actions"><button disabled={Boolean(busy)} onClick={()=>review(g,'verified')}>Verify final mission</button><button className="ghost" disabled={Boolean(busy)} onClick={()=>review(g,'revision_required')}>Request update</button></div>}{g.status==='verified'&&<div className="cm-verified"><Check/> Final evidence verified</div>}</article>)}{!finalGroups.length&&<p className="cm-admin-empty">No final Mission submissions yet.</p>}</section>}
    {view==='completed'&&<section className="cm-mission-completed-grid">{completedRows.map(c=>{const missionName=meaningfulMissionName(c.group?.name)?c.group.name:null;return <article key={c.id}><span className="cm-mission-completed-tag"><Check/> {missionName?`${missionName} · Mission Completed · WOMATE verified`:'Mission name pending · WOMATE verified'}</span><h2>{c.member?.name||'Learner'}</h2><p>{c.member?.country||'Country not saved'}{c.member?.mission_no?` · Lead stage ${c.member.mission_no}: ${MISSION_STAGE_LABELS[c.member.mission_no]||'Mission contribution'}`:''}</p><small>{missionName||'Team needs to choose a Mission name'}</small><time>{c.approved_at?new Date(c.approved_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):''}</time>{c.remark&&<p>{c.remark}</p>}</article>})}{!completedRows.length&&<p className="cm-admin-empty">No learners match this completed Mission filter.</p>}</section>}
    {view==='teams'&&<section className="cm-admin-list">{teamRows.map(g=><article key={g.id}><header><div><small>{statusText(g.status)}</small><h2>{g.name||'Cross-country climate mission'}</h2></div><span>{acceptedCount(g)}/5 accepted</span></header><div className="cm-admin-members">{(g.members||[]).map(m=><span key={m.user_id}>{m.mission_no}. {m.name} - {m.country} ({statusText(m.status)})</span>)}</div><p>{(g.reports||[]).length} individual report{(g.reports||[]).length===1?'':'s'} · {(g.completions||[]).filter(c=>c.status==='completed').length} Mission Completed</p>{g.evidence_folder_url&&<a className="cm-folder-link" href={g.evidence_folder_url} target="_blank" rel="noreferrer"><FolderOpen/> Open shared evidence</a>}</article>)}{!teamRows.length&&<p className="cm-admin-empty">No Mission teams match this filter.</p>}</section>}
  </main>
}