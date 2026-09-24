import React,{useEffect,useRef,useState} from 'react';
import {ArrowRight,ChevronDown,Send} from 'lucide-react';
import {CANOPY_HELP_COPY,CANOPY_HELP_QUICK_TOPICS} from './canopyHelpData';
import {matchCanopyHelpQuestion} from './canopyHelpMatcher';

const firstMessage={role:'assistant',title:'Canopy Help',text:CANOPY_HELP_COPY.welcome};

export default function AskCanopyWidget(){
  const[open,setOpen]=useState(false);
  const[question,setQuestion]=useState('');
  const[messages,setMessages]=useState([firstMessage]);
  const transcriptRef=useRef(null);

  useEffect(()=>{if(open)transcriptRef.current?.scrollTo({top:transcriptRef.current.scrollHeight,behavior:'smooth'})},[messages,open]);

  function go(path){
  if(!path)return;
  if(!String(path).startsWith('/canopy')){window.location.assign(path);return}
  window.history.pushState({},'',path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({top:0,behavior:'smooth'});
}

  function ask(raw){
    const text=String(raw||'').trim();
    if(!text)return;
    const result=matchCanopyHelpQuestion(text);
    setMessages(current=>[...current.slice(-7),{role:'user',text},{role:'assistant',title:result.title,text:result.answer,route:result.route,actionLabel:result.actionLabel}]);
    setQuestion('');
  }

  return <div className={`askCanopyWidget ${open?'isOpen':''}`}>
    {open&&<section className="askCanopyPanel" aria-label="Ask Canopy help assistant">
      <header className="askCanopyHead">
        <div className="askCanopyAvatar" aria-hidden="true"><img src="/assets/canopy/canopy-help-avatar.webp" alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/></div>
        <div><small>WOMATE · CANOPY</small><strong>Ask Canopy</strong><em>Verified programme guide</em></div>
        <button type="button" className="askCanopyClose" onClick={()=>setOpen(false)} aria-label="Close Ask Canopy"><ChevronDown size={20}/></button>
      </header>

      <div className="askCanopyQuick" aria-label="Quick help topics">
        {CANOPY_HELP_QUICK_TOPICS.slice(0,8).map(item=><button type="button" key={item.label} onClick={()=>ask(item.question)}>{item.label}</button>)}
      </div>

      <div className="askCanopyTranscript" ref={transcriptRef} aria-live="polite">
        {messages.map((message,index)=><article key={`${message.role}-${index}`} className={`askCanopyBubble is-${message.role}`}>
          <small>{message.role==='assistant'?(message.title||'Canopy Help'):'You'}</small>
          <p>{message.text}</p>
          {message.role==='assistant'&&message.actionLabel&&<button type="button" onClick={()=>go(message.route)}>{message.actionLabel} <ArrowRight size={13}/></button>}
        </article>)}
      </div>

      <form className="askCanopyAsk" onSubmit={e=>{e.preventDefault();ask(question)}}>
        <input value={question} onChange={e=>setQuestion(e.target.value)} placeholder={CANOPY_HELP_COPY.placeholder} aria-label="Ask Canopy a question" autoComplete="off"/>
        <button type="submit" disabled={!question.trim()} aria-label="Send question"><Send size={16}/></button>
      </form>
    </section>}

    <button type="button" className="askCanopyLauncher" onClick={()=>setOpen(value=>!value)} aria-expanded={open} aria-label={open?'Close Ask Canopy':'Open Ask Canopy'}>
      <span className="askCanopyLauncherAvatar" aria-hidden="true"><img src="/assets/canopy/canopy-help-avatar.webp" alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/></span>
      {!open&&<span className="askCanopyLauncherText"><small>Need help?</small><b>Ask Canopy</b></span>}
    </button>
  </div>;
}
