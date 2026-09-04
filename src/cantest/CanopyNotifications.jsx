import React,{useEffect,useState} from 'react';
import {getCanopyNotifications,markNotificationRead,refreshLearningAutomation} from './canopyApi';

export default function CanopyNotifications({viewer}){
  const [items,setItems]=useState([]);
  async function load(){try{await refreshLearningAutomation(viewer.session)}catch{};setItems(await getCanopyNotifications(viewer.session)||[])}
  useEffect(()=>{load()},[]);
  async function open(n){if(!n.read_at)await markNotificationRead(viewer.session,n.id);if(n.link)window.location.assign(n.link);else load()}
  return <section className="cn-page"><span className="cn-kicker">NOTIFICATIONS</span><h1>What needs your attention.</h1>
    {!items.length&&<div className="cn-empty">You have no notifications yet.</div>}
    <div className="cn-list">{items.map(n=><button key={n.id} className={`cn-item ${n.read_at?'':'unread'}`} onClick={()=>open(n)}>
      <div><small>{n.type?.replaceAll('_',' ')}</small><h3>{n.title}</h3><p>{n.body}</p></div><time>{new Date(n.created_at).toLocaleString()}</time>
    </button>)}</div>
  </section>
}
