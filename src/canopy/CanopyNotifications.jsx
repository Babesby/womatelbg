import React,{useEffect,useState} from 'react';
import {getCanopyNotifications,markNotificationRead,markAllNotificationsRead,refreshLearningAutomation} from './canopyApi';

export default function CanopyNotifications({viewer}){
  const[items,setItems]=useState([]);
  const[busy,setBusy]=useState(false);
  const[msg,setMsg]=useState('');
  async function load(){try{await refreshLearningAutomation(viewer.session)}catch{};setItems(await getCanopyNotifications(viewer.session)||[])}
  useEffect(()=>{load()},[viewer?.session?.access_token]);
  async function open(n){try{if(!n.read_at)await markNotificationRead(viewer.session,n.id);if(n.link)window.location.assign(n.link);else await load()}catch(e){setMsg(e?.message||'Unable to update this notification.')}}
  async function markAll(){setBusy(true);setMsg('');try{await markAllNotificationsRead(viewer.session);await load();setMsg('All notifications marked as read.')}catch(e){setMsg(e?.message||'Unable to mark notifications as read.')}finally{setBusy(false)}}
  const unread=items.filter(n=>!n.read_at).length;
  return <section className="cn-page">
    <div className="cn-head"><div><span className="cn-kicker">NOTIFICATIONS</span><h1>What needs your attention.</h1></div>{unread>0&&<button className="canopySecondary" disabled={busy} onClick={markAll}>{busy?'Updating…':'Mark all as read'}</button>}</div>
    {msg&&<p className="canopyFormMsg" role="status">{msg}</p>}
    {!items.length&&<div className="cn-empty">You have no notifications yet.</div>}
    <div className="cn-list">{items.map(n=><button key={n.id} className={`cn-item ${n.read_at?'':'unread'}`} onClick={()=>open(n)}><div><small>{n.type?.replaceAll('_',' ')}</small><h3>{n.title}</h3><p>{n.body}</p></div><time>{new Date(n.created_at).toLocaleString()}</time></button>)}</div>
  </section>
}
