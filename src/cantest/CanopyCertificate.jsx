import React,{useEffect,useState} from 'react';
import {getCertificates} from './canopyApi';

export default function CanopyCertificate({viewer}){
  const [items,setItems]=useState([]);
  useEffect(()=>{getCertificates(viewer.session).then(x=>setItems(x||[]))},[]);
  return <section className="ccert-page"><span className="ccert-kicker">CERTIFICATES</span><h1>Your completion records.</h1>
    {!items.length&&<div className="ccert-empty"><h2>No certificate has been issued yet.</h2><p>When WOMATE issues your certificate, the Google Drive file will appear here.</p></div>}
    <div className="ccert-grid">{items.map(c=><article key={c.id}><small>{c.cohort_name}</small><h2>{c.title}</h2><p>Issued {new Date(c.issued_at).toLocaleDateString()}</p><a href={c.drive_url} target="_blank" rel="noreferrer">View / download certificate →</a></article>)}</div>
  </section>
}
