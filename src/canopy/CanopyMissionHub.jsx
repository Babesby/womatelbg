import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Check,ExternalLink,FolderOpen,Globe2,MessageCircle,Send,ShieldCheck,UsersRound} from 'lucide-react';
import {getCanopyMissionAdmin,getCanopyMissionAdminStats,getMyCanopyMissionHub,respondCanopyMissionInvite,reviewCanopyMissionGroup,sendCanopyMissionMessage,submitCanopyMissionGroup,submitCanopyMissionReport,updateCanopyMissionGroup,submitLearnerComplaint} from './canopyApi';

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

export default function CanopyMissionHub({viewer}){
  const[data,setData]=useState(null),[busy,setBusy]=useState(''),[msg,setMsg]=useState('');
  const[chat,setChat]=useState(''),[folder,setFolder]=useState(''),[report,setReport]=useState({summary:'',proofUrl:''});
  const[missionConcern,setMissionConcern]=useState(''),[concernBusy,setConcernBusy]=useState(false),[concernMsg,setConcernMsg]=useState('');
  const[edit,setEdit]=useState({name:'',choice:'standard',customBrief:''});
  const timer=useRef(null);
  const load=async(silent=false)=>{try{const d=await getMyCanopyMissionHub(viewer.session);setData(d);if(d?.group){setEdit({name:d.group.name||'',choice:d.group.mission_choice||'standard',customBrief:d.group.custom_brief||''});setFolder(d.group.evidence_folder_url||'')}if(!silent)setMsg('')}catch(e){if(!silent)setMsg(e.message)}};
  useEffect(()=>{let live=true;const refresh=()=>{if(live&&document.visibilityState==='visible')load(true)};load();timer.current=window.setInterval(refresh,30000);const onVisibility=()=>{if(document.visibilityState==='visible')refresh()};document.addEventListener('visibilitychange',onVisibility);return()=>{live=false;window.clearInterval(timer.current);document.removeEventListener('visibilitychange',onVisibility)}},[viewer?.session?.access_token]);
  const act=async(key,fn)=>{setBusy(key);setMsg('');try{const d=await fn();setData(d);setMsg('Saved.')}catch(e){setMsg(e.message)}finally{setBusy('')}};
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
  const myMission=STANDARD.find(x=>x.n===member?.mission_no); const myReport=reports.find(r=>r.user_id===myId); const allAccepted=members.filter(m=>m.status==='accepted').length===5; const allReports=new Set(reports.map(r=>r.mission_no)).size===5;
  useEffect(()=>{if(myReport)setReport({summary:myReport.summary||'',proofUrl:myReport.proof_url||''})},[myReport?.submitted_at]);
  if(!data)return <main className="cm-page"><div className="cm-state">Opening your mission space...</div></main>;
  if(data.state==='locked')return <main className="cm-page"><header className="cm-hero"><span>CROSS-COUNTRY MISSION</span><h1>Complete at least one Canopy module.</h1><p>The optional group mission opens after WOMATE has manually marked at least one of your Module 01-05 assignments Completed and your country is saved on your profile.</p></header></main>;
  if(data.state==='waiting')return <main className="cm-page"><header className="cm-hero"><span>CROSS-COUNTRY MISSION</span><h1>You are eligible.</h1><p>Canopy forms five-person groups across different countries when a full cross-country match is available. Watch your notifications for an invitation.</p><small>Optional. Your course progress is not affected if you do not participate.</small></header></main>;
  if(data.state==='declined')return <main className="cm-page"><header className="cm-hero"><span>CROSS-COUNTRY MISSION</span><h1>Invitation declined.</h1><p>Your She Leads course continues normally. The mission is optional and declining does not affect your learning record.</p></header></main>;
  if(data.state==='invited')return <main className="cm-page"><header className="cm-hero cm-invite"><span>YOU HAVE BEEN MATCHED</span><h1>A five-country mission group is waiting.</h1><p>This is optional. If you accept, you are committing to collaborate with four women from other countries, lead one of the five mission stages, report back to your team and help submit the complete group mission by <b>{deadline}</b>.</p><div className="cm-actions"><button disabled={busy} onClick={()=>act('accept',()=>respondCanopyMissionInvite(viewer.session,true))}>Accept mission</button><button className="ghost" disabled={busy} onClick={()=>act('decline',()=>respondCanopyMissionInvite(viewer.session,false))}>Decline</button></div>{msg&&<p className="cm-msg">{msg}</p>}</header></main>;
  return <main className="cm-page">
    <header className="cm-hero"><div><span>PRIVATE CROSS-COUNTRY MISSION</span><h1>{group?.name||'Cross-country climate mission'}</h1><p>Five women. Five countries. Five mission leads. One shared evidence folder.</p></div><div className={`cm-status ${group?.status}`}>{statusText(group?.status)}</div></header>
    <section className="cm-commit"><ShieldCheck/><div><b>Optional to join. A commitment once accepted.</b><p>Your team completes and submits the shared mission by {deadline}. WOMATE verifies the final folder before the mission is added to each member's Impact Profile.</p></div></section>

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

        <section className="cm-section"><header><span>MISSION IDENTITY</span><h2>Make it yours.</h2><p>Name the group mission and choose whether to follow WOMATE's standard five-stage challenge or adapt it around a climate issue your group cares about.</p></header><div className="cm-form"><label>Mission name<input value={edit.name} onChange={e=>setEdit(v=>({...v,name:e.target.value}))}/></label><div className="cm-choice"><button className={edit.choice==='standard'?'on':''} onClick={()=>setEdit(v=>({...v,choice:'standard'}))}>Use standard mission</button><button className={edit.choice==='custom'?'on':''} onClick={()=>setEdit(v=>({...v,choice:'custom'}))}>Choose our own theme</button></div>{edit.choice==='custom'&&<label>Our mission focus<textarea value={edit.customBrief} onChange={e=>setEdit(v=>({...v,customBrief:e.target.value}))} placeholder="What issue will your five-country team explore or act on?"/></label>}<button disabled={busy} onClick={()=>act('group',()=>updateCanopyMissionGroup(viewer.session,edit))}>Save group mission</button></div></section>

        <section className="cm-section"><header><span>YOUR REPORT</span><h2>Mission {member?.mission_no}: {myMission?.title}</h2><p>Lead your stage, report what happened to the group, and add proof. Your teammates can then learn from your country and hold the full mission together.</p></header><div className="cm-form"><label>What happened?<textarea value={report.summary} onChange={e=>setReport(v=>({...v,summary:e.target.value}))} placeholder="Briefly report what you did, what you learned and what the group should know."/></label><label>Proof link (optional here; final folder is required)<input value={report.proofUrl} onChange={e=>setReport(v=>({...v,proofUrl:e.target.value}))} placeholder="https://..."/></label><button disabled={busy} onClick={()=>act('report',()=>submitCanopyMissionReport(viewer.session,report))}>{myReport?'Update my report':'Submit my report'}</button></div></section>

        <section className="cm-section cm-submit"><header><span>ONE GROUP FOLDER</span><h2>Submit the complete mission to WOMATE.</h2><p>Keep all five mission outputs in one shared folder. Make the folder viewable by link before submitting.</p></header><div className="cm-readiness"><span className={allAccepted?'ok':''}>{allAccepted?'5/5':'Not all'} members accepted</span><span className={allReports?'ok':''}>{reports.length}/5 mission reports ready</span></div><div className="cm-form"><label>Shared evidence folder<input value={folder} onChange={e=>setFolder(e.target.value)} placeholder="Google Drive or another viewable folder link"/></label>{folder&&<a href={folder} target="_blank" rel="noreferrer">Open folder <ExternalLink/></a>}<button disabled={busy||!allAccepted||!allReports||group?.status==='submitted'||group?.status==='verified'} onClick={()=>act('submit',()=>submitCanopyMissionGroup(viewer.session,folder))}>{group?.status==='verified'?'WOMATE verified':group?.status==='submitted'?'Submitted for WOMATE verification':'Submit complete group mission'}</button>{group?.verification_remark&&<p className="cm-msg">WOMATE note: {group.verification_remark}</p>}</div></section>
      </div>

      <aside className="cm-chat"><header><div><MessageCircle/><span>PRIVATE GROUP CHAT</span></div><small>Only accepted mission members can read this chat.</small></header><div className="cm-chat-stream">{messages.length?messages.map(m=><div key={m.id} className={m.user_id===myId?'mine':''}><b>{m.sender_name}</b><p>{m.body}</p><small>{new Date(m.created_at).toLocaleString()}</small></div>):<p className="cm-empty">Start with introductions. Share how you would like the group to work together.</p>}</div><div className="cm-chat-compose"><textarea value={chat} onChange={e=>setChat(e.target.value)} placeholder="Message your team. You may voluntarily exchange WhatsApp or phone details here if you choose."/><button disabled={busy||!chat.trim()} onClick={()=>act('chat',async()=>{const d=await sendCanopyMissionMessage(viewer.session,chat);setChat('');return d})}><Send/></button></div><p className="cm-privacy">Canopy does not reveal anyone's phone number automatically. Share contact details only if you want to continue coordination outside Canopy.</p></aside>
    </section>{msg&&<p className="cm-msg cm-global">{msg}</p>}
  </main>
}

export function CanopyMissionAdmin({viewer}){
  const [stats,setStats]=useState(null);
  const[groups,setGroups]=useState([]),[busy,setBusy]=useState(''),[msg,setMsg]=useState(''),[remarks,setRemarks]=useState({}),[acceptanceFilter,setAcceptanceFilter]=useState('all');
  const load=async()=>{try{const [x,s]=await Promise.all([getCanopyMissionAdmin(viewer.session),getCanopyMissionAdminStats(viewer.session)]);setGroups(Array.isArray(x)?x:[]);setStats(s||null)}catch(e){setMsg(e.message)}};
  const acceptedCount=g=>(g.members||[]).filter(m=>m.status==='accepted').length;
  const filteredGroups=acceptanceFilter==='all'?groups:groups.filter(g=>acceptedCount(g)===Number(acceptanceFilter));
  const acceptanceOptions=[['all','All groups'],['5','5/5 accepted'],['4','4/5 accepted'],['3','3/5 accepted'],['2','2/5 accepted'],['1','1/5 accepted'],['0','0/5 accepted']];
  useEffect(()=>{load()},[]);
  const review=async(g,d)=>{setBusy(g.id+d);setMsg('');try{const x=await reviewCanopyMissionGroup(viewer.session,g.id,d,remarks[g.id]||'');setGroups(Array.isArray(x)?x:[]);setMsg(d==='verified'?'Mission verified and added to participant portfolios.':'Group notified to make an update.')}catch(e){setMsg(e.message)}finally{setBusy('')}};
  return <main className="cm-admin"><header><span>PHASE 2</span><h1>Cross-country mission groups</h1><p>Verify only complete five-person group missions. Accepted participants are committing voluntarily to the shared mission.</p></header>{stats&&<div className="cm-admin-summary"><span><b>{stats.eligible||0}</b> Eligible</span><span><b>{stats.groups_formed||0}</b> Groups formed</span><span><b>{stats.invited||0}</b> Invited</span><span><b>{stats.accepted||0}</b> Accepted</span><span><b>{stats.waiting||0}</b> Waiting</span><span><b>{stats.declined||0}</b> Declined</span><span><b>{stats.replacement_needed||0}</b> Replacement needed</span><span><b>{stats.submitted||0}</b> Submitted</span><span><b>{stats.verified||0}</b> Verified</span></div>}<div className="cm-admin-filters" role="tablist" aria-label="Mission group acceptance filter">{acceptanceOptions.map(([value,label])=><button type="button" role="tab" aria-selected={acceptanceFilter===value} className={acceptanceFilter===value?'active':''} key={value} onClick={()=>setAcceptanceFilter(value)}><span>{label}</span><b>{value==='all'?groups.length:groups.filter(g=>acceptedCount(g)===Number(value)).length}</b></button>)}</div>{msg&&<p className="cm-msg">{msg}</p>}<div className="cm-admin-list">{filteredGroups.map(g=><article key={g.id}><header><div><small>{statusText(g.status)}</small><h2>{g.name||'Cross-country climate mission'}</h2></div><span>{(g.members||[]).filter(m=>m.status==='accepted').length}/5 accepted</span></header><div className="cm-admin-members">{(g.members||[]).map(m=><span key={m.user_id}>{m.mission_no}. {m.name} - {m.country} ({statusText(m.status)})</span>)}</div><p>{g.mission_choice==='custom'&&g.custom_brief?g.custom_brief:'Standard five-stage WOMATE cross-country mission.'}</p><div className="cm-admin-reports">{(g.reports||[]).map(r=><details key={r.mission_no}><summary>Mission {r.mission_no} - {r.name}</summary><p>{r.summary}</p>{r.proof_url&&<a href={r.proof_url} target="_blank" rel="noreferrer">Open proof</a>}</details>)}</div>{g.evidence_folder_url&&<a className="cm-folder-link" href={g.evidence_folder_url} target="_blank" rel="noreferrer"><FolderOpen/> Open shared evidence folder</a>}<textarea value={remarks[g.id]||''} onChange={e=>setRemarks(v=>({...v,[g.id]:e.target.value}))} placeholder="Optional WOMATE verification note"/>{g.status==='submitted'&&<div className="cm-actions"><button disabled={busy} onClick={()=>review(g,'verified')}>Verify complete</button><button className="ghost" disabled={busy} onClick={()=>review(g,'revision_required')}>Request update</button></div>}{g.status==='verified'&&<div className="cm-verified"><Check/> Verified</div>}</article>)}{!filteredGroups.length&&<p className="cm-admin-empty">No mission groups match this acceptance filter.</p>}</div></main>
}