import React,{useEffect,useState} from 'react';
import {getAdminTalentFinanceLedger,getAdminTalentFinanceReporting,getAdminTalentWeeklyReports,confirmAdminTalentDealCompletion,createAdminTalentFeeInvoice,issueAdminTalentFeeInvoice,getMyTalentDealCloseouts,respondMyTalentDealCloseout} from './canopyApi';

export default function CanopyTalentFinance({session}){
 const [ledger,setLedger]=useState({agreements:[],invoices:[]}),[report,setReport]=useState(null),[weekly,setWeekly]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const refresh=async()=>{try{const [l,r,w]=await Promise.all([getAdminTalentFinanceLedger(session),getAdminTalentFinanceReporting(session),getAdminTalentWeeklyReports(session)]);setLedger(l);setReport(r);setWeekly(Array.isArray(w)?w:[]);setError('')}catch(e){setError(e.message)}};
 useEffect(()=>{refresh()},[session?.access_token]);
 const run=async fn=>{setBusy(true);try{await fn();await refresh()}catch(e){setError(e.message)}finally{setBusy(false)}};
 return <section className="ct-directory">
  <div className="ct-sectionHead"><div><small>TALENT DISCOVERY FINANCE</small><h2>Completed engagements and invoices</h2><p>Two-party confirmation and WOMATE approval are required before an invoice is issued. Payments are not active.</p></div><button type="button" onClick={refresh}>Refresh</button></div>
  {error&&<p role="alert">{error}</p>}
  <div className="ct-adminSummary"><span><b>{report?.public_requests??'—'}</b> public requests</span><span><b>{report?.member_requests??'—'}</b> member requests</span><span><b>{report?.safety_reports??'—'}</b> safety reports</span><span><b>{report?.completed_deals??'—'}</b> completed</span><span><b>{report?.paid_invoices??'—'}</b> paid invoices</span></div>
  <h3>Revenue by currency</h3>{(report?.revenue_by_currency||[]).map(x=><p key={x.currency}>{x.currency} {x.amount} · {x.paid_count} paid invoices</p>)}{!(report?.revenue_by_currency||[]).length&&<p>No verified payments yet.</p>}
  <h3>Completion queue</h3><div className="ct-adminRows">{(ledger?.agreements||[]).map(x=><article key={x.id}><div><b>{x.learner} · {x.requester}</b><span>{x.status} · completion: {x.closeout}</span><small>Talent: {x.learner_confirmed?'confirmed':'pending'} · Requester: {x.requester_confirmed?'confirmed':'pending'}</small></div>{x.status==='agreed'&&x.closeout==='awaiting_confirmations'&&x.learner_confirmed&&x.requester_confirmed&&<button disabled={busy} onClick={()=>run(()=>confirmAdminTalentDealCompletion(session,x.id))}>Verify completion</button>}{x.status==='agreed'&&x.closeout==='confirmed'&&!(ledger?.invoices||[]).some(i=>i.agreement_id===x.id)&&<button disabled={busy} onClick={()=>run(()=>createAdminTalentFeeInvoice(session,x.id,14))}>Create invoice draft</button>}</article>)}{!(ledger?.agreements||[]).length&&<p>No commercial agreements yet.</p>}</div>
  <h3>Invoice ledger</h3><div className="ct-adminRows">{(ledger?.invoices||[]).map(x=><article key={x.id}><div><b>{x.invoice_number}</b><span>{x.currency} {x.amount} · {x.status}</span><small>Due: {x.due_at||'—'}</small></div>{x.status==='draft'&&<button disabled={busy} onClick={()=>run(()=>issueAdminTalentFeeInvoice(session,x.id))}>Issue invoice</button>}</article>)}{!(ledger?.invoices||[]).length&&<p>No invoices issued.</p>}</div>
  <h3>Weekly performance</h3>{weekly.slice(0,8).map(x=><p key={x.week_start}>{x.week_start}: {x.total_requests} requests · {x.completed_deals} completions · {x.paid_invoices} paid invoices</p>)}{!weekly.length&&<p>First weekly snapshot not yet due.</p>}
 </section>;
}

export function CanopyTalentFinanceLearner({session}){
 const [items,setItems]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(''),[reasons,setReasons]=useState({});
 const load=async()=>{try{const x=await getMyTalentDealCloseouts(session);setItems(Array.isArray(x)?x:[]);setError('')}catch(e){setError(e.message)}};
 useEffect(()=>{load()},[session?.access_token]);
 const act=async(item,confirm)=>{setBusy(item.agreement_id);try{await respondMyTalentDealCloseout(session,item.agreement_id,confirm,reasons[item.agreement_id]||'');await load()}catch(e){setError(e.message)}finally{setBusy('')}};
 if(!items.length&&!error)return null;
 return <section className="ct-requests"><div className="ct-sectionHead"><div><small>PAID COLLABORATION</small><h2>Confirm delivery of agreed work</h2><p>A facilitation invoice can only follow both parties' completion confirmations and WOMATE's review. Raise a dispute if work is not complete.</p></div></div>
 {error&&<p role="alert">{error}</p>}
 {items.map(x=><article key={x.agreement_id}><div><b>{x.scope}</b><span>Status: {x.closeout} · requester {x.requester_confirmed?'confirmed':'awaiting'}</span></div>
 {!x.learner_confirmed&&x.closeout!=='disputed'&&<div><button type="button" disabled={!!busy} onClick={()=>act(x,true)}>Confirm completed</button>
 <textarea rows={2} maxLength={1500} placeholder="Describe a concern (at least 12 characters)" value={reasons[x.agreement_id]||''} onChange={e=>setReasons(v=>({...v,[x.agreement_id]:e.target.value}))}/>
 <button type="button" className="ghost" disabled={!!busy||(reasons[x.agreement_id]||'').trim().length<12} onClick={()=>act(x,false)}>Report a dispute</button></div>}</article>)}</section>;
}
