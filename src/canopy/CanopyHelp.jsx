import React,{useEffect,useState} from 'react';
import {ArrowRight,LifeBuoy,ShieldAlert} from 'lucide-react';
import {getLearnerComplaints,submitLearnerComplaint} from './canopyApi';

export default function CanopyHelp({viewer}){
  const[complaints,setComplaints]=useState([]);
  const[loading,setLoading]=useState(true);
  const[form,setForm]=useState({subject:'',message:''});
  const[busy,setBusy]=useState(false);
  const[msg,setMsg]=useState('');

  async function loadComplaints(){
    setLoading(true);
    try{setComplaints(await getLearnerComplaints(viewer.session)||[])}
    catch(err){setMsg(err?.message||'Your complaint history could not be loaded.')}
    finally{setLoading(false)}
  }

  useEffect(()=>{loadComplaints()},[viewer?.session?.access_token]);

  async function submit(e){
    e.preventDefault();
    const subject=form.subject.trim(),message=form.message.trim();
    if(subject.length<3||message.length<10){setMsg('Add a short subject and enough detail for WOMATE to understand the concern.');return}
    setBusy(true);setMsg('');
    try{
      await submitLearnerComplaint(viewer.session,{subject,message});
      setForm({subject:'',message:''});
      setMsg('Your complaint has been sent to WOMATE. You can track its status and response here.');
      await loadComplaints();
    }catch(err){setMsg(err?.message||'Your complaint could not be sent. Please try again.')}
    finally{setBusy(false)}
  }

  return <main className="canopyHelp">
    <div className="canopyPageHead">
      <span className="canopyEyebrow">LEARNER HELP & COMPLAINTS</span>
      <h1>Tell WOMATE what needs attention.</h1>
      <p>Submit a programme or Canopy concern here. Authorised WOMATE staff can review it, respond and resolve it from the existing Complaints workspace.</p>
    </div>

    <div className="canopyHelpGrid">
      <form className="canopyHelpForm" onSubmit={submit}>
        <div><span>NEW COMPLAINT</span><h2>Submit a concern</h2><p>Give enough detail for the WOMATE team to understand what happened and what support you need.</p></div>
        <label>Subject<input required minLength="3" maxLength="120" value={form.subject} onChange={e=>setForm(x=>({...x,subject:e.target.value}))} placeholder="What is this about?"/></label>
        <label>Details<textarea required minLength="10" maxLength="2000" value={form.message} onChange={e=>setForm(x=>({...x,message:e.target.value}))} placeholder="Explain what happened, where you were in Canopy, and any relevant details."/></label>
        <div className="canopyHelpSubmit"><small>This complaint is saved to Canopy so WOMATE can review and respond.</small><button className="canopyPrimary" disabled={busy}>{busy?'Sending…':'Submit complaint'} <ArrowRight size={15}/></button></div>
        {msg&&<p className="canopyHelpMessage" role="status">{msg}</p>}
      </form>

      <section className="canopyHelpHistory">
        <div><span>YOUR COMPLAINTS</span><h2>Status & responses</h2></div>
        {loading?<div className="canopyHelpEmpty"><LifeBuoy/><p>Loading your complaints…</p></div>:complaints.length?complaints.map(item=><article key={item.id}>
          <header><div><small>{item.created_at?new Date(item.created_at).toLocaleString():'Complaint'}</small><h3>{item.subject}</h3></div><span className={`canopyHelpStatus is-${item.status}`}>{item.status}</span></header>
          <p>{item.message}</p>
          {item.response_message&&<div className="canopyHelpResponse"><b>WOMATE response</b><p>{item.response_message}</p></div>}
        </article>):<div className="canopyHelpEmpty"><ShieldAlert/><p>You have not submitted a complaint yet.</p></div>}
      </section>
    </div>
  </main>;
}
