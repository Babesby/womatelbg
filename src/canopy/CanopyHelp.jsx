import React,{useEffect,useRef,useState} from 'react';
import {ArrowRight,CheckCircle2,LifeBuoy,MessageCircle,Search,Send,ShieldCheck} from 'lucide-react';
import {getLearnerComplaints,submitLearnerComplaint} from './canopyApi';
import {CANOPY_HELP_COPY,CANOPY_HELP_QUICK_TOPICS} from './canopyHelpData';
import {matchCanopyHelpQuestion} from './canopyHelpMatcher';

const firstMessage={role:'assistant',text:CANOPY_HELP_COPY.welcome,title:'Canopy Help'};

export default function CanopyHelp({viewer}){
  const[question,setQuestion]=useState('');
  const[messages,setMessages]=useState([firstMessage]);
  const[supportOpen,setSupportOpen]=useState(false);
  const[supportLoaded,setSupportLoaded]=useState(false);
  const[complaints,setComplaints]=useState([]);
  const[supportForm,setSupportForm]=useState({subject:'',message:''});
  const[supportBusy,setSupportBusy]=useState(false);
  const[supportMessage,setSupportMessage]=useState('');
  const transcriptRef=useRef(null);

  useEffect(()=>{transcriptRef.current?.scrollTo({top:transcriptRef.current.scrollHeight,behavior:'smooth'})},[messages]);

  async function loadSupport(){
    if(supportLoaded)return;
    setSupportLoaded(true);
    try{setComplaints(await getLearnerComplaints(viewer.session)||[])}catch(err){setSupportMessage(err?.message||'Support history could not be loaded.')}
  }

  async function openSupport(){
    setSupportOpen(true);
    await loadSupport();
    window.setTimeout(()=>document.getElementById('canopy-help-support')?.scrollIntoView({behavior:'smooth',block:'start'}),40);
  }

  function followAction(route){
    if(route?.startsWith('#')){openSupport();return}
    if(route)window.location.assign(route);
  }

  function ask(raw){
    const text=String(raw||'').trim();
    if(!text)return;
    const result=matchCanopyHelpQuestion(text);
    setMessages(current=>[
      ...current.slice(-7),
      {role:'user',text},
      {role:'assistant',text:result.answer,title:result.title,route:result.route,actionLabel:result.actionLabel,matched:result.matched}
    ]);
    setQuestion('');
  }

  async function submitSupport(e){
    e.preventDefault();
    const subject=supportForm.subject.trim(),message=supportForm.message.trim();
    if(subject.length<3||message.length<10){setSupportMessage('Add a short subject and enough detail for WOMATE to understand the issue.');return}
    setSupportBusy(true);setSupportMessage('');
    try{
      await submitLearnerComplaint(viewer.session,{subject,message});
      setSupportForm({subject:'',message:''});
      setSupportMessage('Support request sent to WOMATE.');
      setComplaints(await getLearnerComplaints(viewer.session)||[]);
    }catch(err){setSupportMessage(err?.message||'Your support request could not be sent. Please try again.')}
    finally{setSupportBusy(false)}
  }

  return <main className="canopyHelp canopyHelpNative">
    <div className="canopyPageHead canopyHelpPageHead">
      <span className="canopyEyebrow">{CANOPY_HELP_COPY.eyebrow}</span>
      <h1>{CANOPY_HELP_COPY.title}</h1>
      <p>{CANOPY_HELP_COPY.intro}</p>
    </div>

    <section className="canopyHelpAssistant">
      <header className="canopyHelpAssistantHead">
        <div className="canopyHelpMark"><MessageCircle/></div>
        <div><small>CANOPY HELP</small><h2>Answers from the programme, not a chatbot guess.</h2></div>
        <span className="canopyHelpVerified"><ShieldCheck size={14}/> Verified</span>
      </header>

      <div className="canopyHelpQuick" aria-label="Quick help topics">
        {CANOPY_HELP_QUICK_TOPICS.map(item=><button type="button" key={item.label} onClick={()=>ask(item.question)}>{item.label}</button>)}
      </div>

      <div className="canopyHelpTranscript" ref={transcriptRef} aria-live="polite">
        {messages.map((message,index)=><article key={`${message.role}-${index}`} className={`canopyHelpBubble is-${message.role}`}>
          <small>{message.role==='assistant'?(message.title||'Canopy Help'):'You'}</small>
          <p>{message.text}</p>
          {message.role==='assistant'&&message.actionLabel&&<button type="button" className="canopyHelpAnswerAction" onClick={()=>followAction(message.route)}>{message.actionLabel} <ArrowRight size={14}/></button>}
        </article>)}
      </div>

      <form className="canopyHelpAsk" onSubmit={e=>{e.preventDefault();ask(question)}}>
        <Search size={18}/>
        <input value={question} onChange={e=>setQuestion(e.target.value)} placeholder={CANOPY_HELP_COPY.placeholder} aria-label="Ask Canopy a question" autoComplete="off"/>
        <button type="submit" disabled={!question.trim()} aria-label="Ask question"><Send size={17}/></button>
      </form>
      <footer><span><CheckCircle2 size={14}/> {CANOPY_HELP_COPY.localNote}</span><button type="button" onClick={openSupport}><LifeBuoy size={14}/> {CANOPY_HELP_COPY.supportButton}</button></footer>
    </section>

    {supportOpen&&<section id="canopy-help-support" className="canopyHelpSupportWrap">
      <div className="canopyHelpGrid">
        <form className="canopyHelpForm" onSubmit={submitSupport}>
          <div><span>WOMATE SUPPORT</span><h2>{CANOPY_HELP_COPY.supportTitle}</h2><p>{CANOPY_HELP_COPY.supportIntro}</p></div>
          <label>Subject<input value={supportForm.subject} onChange={e=>setSupportForm(x=>({...x,subject:e.target.value}))} maxLength="120" placeholder="What do you need help with?"/></label>
          <label>Details<textarea value={supportForm.message} onChange={e=>setSupportForm(x=>({...x,message:e.target.value}))} maxLength="2000" placeholder="Tell WOMATE what happened, where you were in Canopy, and any error message you saw."/></label>
          <div className="canopyHelpSubmit"><small>Only support requests are saved to Canopy. Ask Canopy questions are not stored.</small><button className="canopyPrimary" disabled={supportBusy}>{supportBusy?'Sending…':'Send support request'} <ArrowRight size={15}/></button></div>
          {supportMessage&&<p className="canopyHelpMessage" role="status">{supportMessage}</p>}
        </form>

        <section className="canopyHelpHistory">
          <div><span>YOUR REQUESTS</span><h2>Support history</h2></div>
          {!supportLoaded?<div className="canopyHelpEmpty"><LifeBuoy/><p>Loading your support requests…</p></div>:complaints.length?complaints.map(item=><article key={item.id}>
            <header><div><small>{item.created_at?new Date(item.created_at).toLocaleString():'Support request'}</small><h3>{item.subject}</h3></div><span className={`canopyHelpStatus is-${item.status}`}>{item.status}</span></header>
            <p>{item.message}</p>
            {item.response_message&&<div className="canopyHelpResponse"><b>WOMATE response</b><p>{item.response_message}</p></div>}
          </article>):<div className="canopyHelpEmpty"><LifeBuoy/><p>You have not submitted a WOMATE Support request yet.</p></div>}
        </section>
      </div>
    </section>}
  </main>;
}
