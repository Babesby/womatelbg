import React,{useEffect,useState} from 'react';
import {getCanopyNotifications,markNotificationRead,markAllNotificationsRead,refreshLearningAutomation} from './canopyApi';

export default function CanopyNotifications({viewer}){
  const[items,setItems]=useState([]);
  const[busy,setBusy]=useState(false);
  const[msg,setMsg]=useState('');
  async function load(){try{await refreshLearningAutomation(viewer.session)}catch{};try{setItems(await getCanopyNotifications(viewer.session)||[]);setMsg('')}catch(e){setMsg(e?.message||'Unable to load notifications.')}}
  useEffect(()=>{load()},[viewer?.session?.access_token]);
  async function open(n){try{if(!n.read_at)await markNotificationRead(viewer.session,n.id);if(n.link&&String(n.link).startsWith('/canopy/')){window.history.pushState({},'',n.link);window.dispatchEvent(new PopStateEvent('popstate'));window.scrollTo({top:0,behavior:'smooth'})}else if(n.link)window.location.assign(n.link);else await load()}catch(e){setMsg(e?.message||'Unable to update this notification.')}}
  async function markAll(){setBusy(true);setMsg('');try{await markAllNotificationsRead(viewer.session);await load();setMsg('All notifications marked as read.')}catch(e){setMsg(e?.message||'Unable to mark notifications as read.')}finally{setBusy(false)}}
  const unread=items.filter(n=>!n.read_at).length;
  return <section className="cn-page">
    <div className="cn-head"><div><span className="cn-kicker">NOTIFICATIONS</span><h1>What needs your attention.</h1></div>{unread>0&&<button className="canopySecondary" disabled={busy} onClick={markAll}>{busy?'Updating…':'Mark all as read'}</button>}</div>
    {msg&&<p className="canopyFormMsg" role="status">{msg}</p>}
    {!items.length&&<div className="cn-empty">You have no notifications yet.</div>}
    <div className="cn-list">{items.map(n=>n.type==='completed_appreciation_music'
      ?<article key={n.id} className={`cn-item ${n.read_at?'':'unread'}`} style={{display:'grid',gap:'12px',width:'100%'}}>
        <button type="button" onClick={()=>open({...n,link:null})} style={{all:'unset',cursor:'pointer',display:'block'}}>
          <div><small>{n.type?.replaceAll('_',' ')}</small><h3>{n.title}</h3><p>{n.body}</p></div>
          <time>{new Date(n.created_at).toLocaleString()}</time>
        </button>
        <div style={{position:'relative',paddingTop:'56.25%',overflow:'hidden',borderRadius:'16px'}}>
          <iframe
            title="African Woman by Becca"
            src="https://www.youtube.com/embed/XnDdJkoEyAk"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{position:'absolute',inset:0,width:'100%',height:'100%',border:0}}
          />
        </div>
      </article>
      :<button key={n.id} className={`cn-item ${n.read_at?'':'unread'}`} onClick={()=>open(n)}>
        <div><small>{n.type?.replaceAll('_',' ')}</small><h3>{n.title}</h3><p>{n.body}</p></div>
        <time>{new Date(n.created_at).toLocaleString()}</time>
      </button>)}</div>
  </section>
}
