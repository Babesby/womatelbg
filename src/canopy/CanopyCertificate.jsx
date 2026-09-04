import React,{useEffect,useState} from 'react';
import {getCertificates} from './canopyApi';

export default function CanopyCertificate({viewer}){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  useEffect(()=>{let live=true;setLoading(true);setError('');getCertificates(viewer?.session).then(x=>{if(live)setItems(x||[])}).catch(err=>{if(live)setError(err?.message||'Unable to load certificates.')}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[viewer?.session?.access_token]);
  return <section className="ccert-page"><span className="ccert-kicker">CERTIFICATES</span><h1>Your completion records.</h1>
    {loading&&<div className="ccert-empty"><p>Loading your certificate records…</p></div>}
    {!loading&&error&&<div className="ccert-empty"><h2>Certificates could not be loaded.</h2><p>{error}</p></div>}
    {!loading&&!error&&!items.length&&<div className="ccert-empty"><h2>No certificate has been issued yet.</h2><p>When WOMATE issues your certificate, the Google Drive file will appear here.</p></div>}
    {!loading&&!error&&<div className="ccert-grid">{items.map(c=><article key={c.id}><small>{c.cohort_name||'She Leads · Cohort 2 · 2026'}</small><h2>{c.title||'She Leads Climate Mentorship 2026'}</h2><p>Issued {c.issued_at?new Date(c.issued_at).toLocaleDateString():'by WOMATE'}</p><a href={c.drive_url} target="_blank" rel="noopener noreferrer">View certificate →</a></article>)}</div>}
  </section>
}
