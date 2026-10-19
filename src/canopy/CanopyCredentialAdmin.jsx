import React,{useEffect,useMemo,useState} from 'react';
import {Download,RefreshCw,ShieldCheck} from 'lucide-react';
import {getCanopyCredentialCandidates,updateCanopyCredentialStatus} from './canopyApi';
import './CanopyCredentialAdmin.css';
const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
export default function CanopyCredentialAdmin({viewer}){
 const [data,setData]=useState(null),[search,setSearch]=useState(''),[scope,setScope]=useState('baseline'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[note,setNote]=useState('');
 async function load(){setBusy(true);setError('');try{setData(await getCanopyCredentialCandidates(viewer.session))}catch(e){setError(e.message)}finally{setBusy(false)}}
 useEffect(()=>{load()},[viewer?.session?.access_token]);
 const rows=useMemo(()=>((data?.rows||[]).filter(x=> (scope==='all'||scope==='issued'&&['issued','revoked'].includes(x.credential_status)||scope==='baseline'&&x.baseline_met||scope==='pending'&&!x.baseline_met) && (!search.trim()||[x.full_name,x.country,x.credential_id].join(' ').toLowerCase().includes(search.toLowerCase())))),[data,search,scope]);
 const exportCsv=()=>{
 const columns=['rank','full_name','country','assignments_completed','assignments_submitted','lessons','attendance','selection_code','baseline_met','credential_id','credential_status'];
 const csv=[columns.join(','),...rows.map(r=>columns.map(k=>quote(r[k])).join(','))].join('\r\n');
 const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='WOMATE-Cohort2-Prospective-Graduates-'+new Date().toISOString().slice(0,10)+'.csv';a.click();URL.revokeObjectURL(url);
 };
 async function change(row){const revoke=row.credential_status!=='revoked';const reason=revoke?window.prompt('Enter the formal reason for revoking '+row.credential_id+'. Minimum 12 characters.'):'';if(revoke&&(!reason||reason.trim().length<12))return;
 if(!window.confirm((revoke?'Revoke':'Reinstate')+' the credential '+row.credential_id+'?'))return;
 setBusy(true);setError('');setNote('');try{await updateCanopyCredentialStatus(viewer.session,row.credential_id,revoke?'revoked':'issued',reason);setNote('Credential status updated.');await load()}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <main className="wca"><header><span>WOMATE · CONFIDENTIAL ADMIN RECORD</span><h1>Prospective graduate registry</h1><p>Live ranked Cohort 2 candidates. A baseline match is not a certificate or final graduation approval. Scores, emails and student identifiers are not made public.</p></header>
 <div className="wca-stats"><article><strong>{data?.total??'—'}</strong><span>Active learners</span></article><article><strong>{data?.baseline_count??'—'}</strong><span>Baseline met</span></article><article><strong>{data?.reserved_count??'—'}</strong><span>IDs reserved</span></article><article><strong>{data?.issued_count??0}</strong><span>Certificates issued</span></article></div>
 <div className="wca-tools"><input aria-label="Search candidates" placeholder="Search name, country or ID…" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Candidate filter" value={scope} onChange={e=>setScope(e.target.value)}><option value="baseline">Meets baseline</option><option value="pending">Still progressing</option><option value="issued">Credentials issued</option><option value="all">All active learners</option></select><button onClick={load} disabled={busy}><RefreshCw size={16}/> Refresh</button><button onClick={exportCsv} disabled={busy||!rows.length}><Download size={16}/> Export current list</button></div>
 {error&&<p role="alert">{error}</p>}{note&&<p role="status">{note}</p>}
 <p className="wca-count">{rows.length} learners shown · snapshot {data?.as_of?new Date(data.as_of).toLocaleString('en-GB'): 'loading'}. Minimum: 3 satisfactorily reviewed assignments, 10 lessons, at least 3 of 5 recorded live sessions, and a generated selection code. IDs are reserved automatically when the minimum is first met; issuance and verification are separate.</p>
 <div className="wca-scroll"><table><thead><tr>{['Rank','Graduate candidate','Country','Reviewed assignments','Lessons','Attendance','Selection code','Status','Certificate ID'].map(k=><th key={k}>{k}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.user_id}><td>{r.rank}</td><td><strong>{r.full_name}</strong></td><td>{r.country||'—'}</td><td>{r.assignments_completed}/5</td><td>{r.lessons}/20</td><td>{r.attendance}/5</td><td>{r.selection_code?'Generated':'Not generated'}</td><td>{r.credential_id?(r.credential_status==='reserved'?'ID reserved, not issued':r.credential_status):r.baseline_met?'Baseline met':'In progress'}</td><td>{r.credential_id?<><code>{r.credential_id}</code>{['issued','revoked'].includes(r.credential_status)&&<button className="wca-small" onClick={()=>change(r)} disabled={busy}>{r.credential_status==='revoked'?'Reinstate':'Revoke'}</button>}</>:'Not assigned'}</td></tr>)}</tbody></table></div>
 <div className="wca-foot"><ShieldCheck size={17}/> Unique IDs are automatically reserved when learners meet all four minimum requirements. A reserved ID does not authenticate a certificate. WOMATE must separately issue the corresponding certificate through Admin → Certificates before public verification confirms it.</div>
 </main>
}
