import React,{useEffect,useState} from 'react';
import {getCanopyAdminGraduationReflections2026,moderateCanopyGraduationReflection2026,getCanopyAdminInactivityCases2026,decideCanopyAdminInactivityCase2026,sendCanopyAdminInactivityReviewNotice2026} from './canopyApi';
export default function CanopyClosingReviewTools({viewer,area}){
 const [rows,setRows]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [reason,setReason]=useState(''),[search,setSearch]=useState('');
 const graduation=area==='graduation';
 async function load(){setBusy(true);setError('');try{const result=await (graduation?getCanopyAdminGraduationReflections2026(viewer.session):getCanopyAdminInactivityCases2026(viewer.session));setRows(Array.isArray(result)?result:[])}catch(e){setError(e?.message||'Unable to load review records')}finally{setBusy(false)}}
 useEffect(()=>{load()},[area,viewer?.session?.access_token]);
 async function action(row,kind){const note=reason.trim();if(kind!=='visible'&&note.length<15){setError('Enter an explanation of at least 15 characters before proceeding.');return}
 if(!window.confirm(`Confirm ${kind.replaceAll('_',' ')} for this individual record?`))return;
 setBusy(true);setError('');try{if(graduation)await moderateCanopyGraduationReflection2026(viewer.session,row.user_id,kind,note);
 else if(kind==='notice')await sendCanopyAdminInactivityReviewNotice2026(viewer.session,row.user_id,note);
 else await decideCanopyAdminInactivityCase2026(viewer.session,row.user_id,kind,note);
 await load()}catch(e){setError(e?.message||'Action failed')}finally{setBusy(false)}}
 const filtered=rows.filter(x=>JSON.stringify(x).toLowerCase().includes(search.toLowerCase()));
 return <section className="cac-page" aria-label={graduation?'Graduation reflection moderation':'Inactivity case controls'}>
 <div className="cac-head"><h2>{graduation?'Graduate reflection moderation':'Inactivity case decisions and notices'}</h2><p>{graduation?'Hide inappropriate reflections or restore them. Every change is recorded.':'A queued case is not proof of inactivity. Verify staff roles, submissions, attendance, certificate and technical complaints before notifying or deciding.'}</p></div>
 <div className="cac-toolbar"><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find records" aria-label="Search review records"/><button disabled={busy} onClick={load}>Refresh</button></div>
 <label style={{display:'block',margin:'14px 0'}}>Reason or case notes<textarea style={{display:'block',width:'100%',minHeight:80,marginTop:5}} value={reason} onChange={e=>setReason(e.target.value)} maxLength={900} placeholder="State the verified grounds; do not enter private medical or sensitive information"/></label>
 {error&&<p role="alert" className="cac-error">{error}</p>}
 <div className="cac-list">{filtered.map(row=><article key={row.user_id}><div><h3>{graduation?row.display_name:row.user_id}</h3><p>{graduation?row.reflection:`Case status: ${row.status}; identified ${new Date(row.identified_at).toLocaleDateString()}`}</p><small>{graduation?`Visibility: ${row.state}`:`Decision: ${row.decision_reason||'Not yet reviewed'}`}</small></div><div style={{display:'flex',flexWrap:'wrap',gap:8}}>{graduation?<><button disabled={busy||row.state==='hidden'} onClick={()=>action(row,'hidden')}>Hide</button><button disabled={busy||row.state==='visible'} onClick={()=>action(row,'visible')}>Restore</button></>:<><button disabled={busy||row.status!=='review'} onClick={()=>action(row,'notice')}>Send review notice</button><button disabled={busy||row.status==='withdrawn'} onClick={()=>action(row,'retained')}>Retain</button><button disabled={busy||row.status==='withdrawn'} onClick={()=>action(row,'appealed')}>Record appeal</button></>}</div></article>)}{!busy&&!filtered.length&&<p>No matching records.</p>}</div>
 </section>;
}
