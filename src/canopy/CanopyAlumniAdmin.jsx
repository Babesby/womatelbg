import React,{useEffect,useMemo,useState}from'react';
import{CalendarDays,ExternalLink,Search,UsersRound,UserRoundCheck,UserRoundX,Heart}from'lucide-react';
import{getAdminAlumniCheckins}from'./canopyApi';
import'./CanopyAlumniAdmin.css';

const fmt=v=>v?new Date(v).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';

export default function CanopyAlumniAdmin({viewer}){
 const[data,setData]=useState(null),[query,setQuery]=useState(''),[scope,setScope]=useState('all'),[period,setPeriod]=useState('all'),[msg,setMsg]=useState('');
 const load=async()=>{try{setData(await getAdminAlumniCheckins(viewer.session));setMsg('')}catch(e){setMsg(e.message)}};
 useEffect(()=>{load()},[viewer?.session?.access_token]);

 const rows=useMemo(()=>{let a=[...(data?.rows||[])];
  if(scope==='checked')a=a.filter(x=>x.checked_in);
  if(scope==='missing')a=a.filter(x=>!x.checked_in);
  if(scope==='stories')a=a.filter(x=>x.share_story);
  if(period!=='all')a=a.filter(x=>x.period===period);
  const q=query.trim().toLowerCase();
  if(q)a=a.filter(x=>[x.full_name,x.email,x.country,x.period,...(x.achievements||[])].some(v=>String(v||'').toLowerCase().includes(q)));
  return a;
 },[data,query,scope,period]);

 if(!data)return <main className="caa-page"><p>Loading alumni check-ins…</p></main>;

 return <main className="caa-page">
  <header className="caa-hero">
   <div><span className="canopyEyebrow">PROGRAMME OPERATIONS · ALUMNI</span><h1>Alumni check-ins</h1><p>Track post-graduation progress, quarterly responses and follow-up opportunities across WOMATE alumni.</p></div>
  </header>

  <section className="caa-metrics">
   <article><UsersRound/><div><strong>{data.total_graduates}</strong><span>Graduates</span></div></article>
   <article><UserRoundCheck/><div><strong>{data.checked_in}</strong><span>Checked in</span></div></article>
   <article><UserRoundX/><div><strong>{data.not_checked_in}</strong><span>Not checked in</span></div></article>
   <article><Heart/><div><strong>{data.story_opt_in}</strong><span>Open to story follow-up</span></div></article>
  </section>

  <section className="caa-workspace">
   <div className="caa-toolbar">
    <label className="caa-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search graduate, email, country or update"/></label>
    <select value={scope} onChange={e=>setScope(e.target.value)}><option value="all">All graduates</option><option value="checked">Checked in</option><option value="missing">Not checked in</option><option value="stories">Story follow-up allowed</option></select>
    <select value={period} onChange={e=>setPeriod(e.target.value)}><option value="all">All periods</option>{(data.periods||[]).map(p=><option key={p} value={p}>{p}</option>)}</select>
    <button type="button" onClick={load}>Refresh</button>
   </div>

   {msg&&<p className="canopyFormMsg">{msg}</p>}
   <p className="caa-count">{rows.length} graduate{rows.length===1?'':'s'} shown</p>

   <div className="caa-list">{rows.map(r=><article key={r.user_id} className={r.checked_in?'checked':'missing'}>
    <div className="caa-person">
     <div><strong>{r.full_name}</strong><span>{r.email||'No email'}{r.country?' · '+r.country:''}</span></div>
     <span className={'caa-status '+(r.checked_in?'yes':'no')}>{r.checked_in?'Checked in':'No check-in'}</span>
    </div>
    {r.checked_in?<div className="caa-response">
      <div className="caa-meta"><span><CalendarDays size={14}/>{r.period}</span><span>{fmt(r.submitted_at)}</span>{r.updated_at&&r.updated_at!==r.submitted_at&&<span>Updated {fmt(r.updated_at)}</span>}</div>
      <div className="caa-tags">{(r.achievements||[]).map(x=><span key={x}>{x}</span>)}</div>
      {r.reflection&&<div className="caa-reflection"><b>Update</b><p>{r.reflection}</p></div>}
      <div className="caa-foot">{r.proof_url?<a href={r.proof_url} target="_blank" rel="noreferrer">Supporting link <ExternalLink size={14}/></a>:<span>No supporting link</span>}<span>{r.share_story?'May contact for story permission':'No story follow-up consent'}</span></div>
    </div>:<p className="caa-missing-note">No alumni check-in has been submitted yet.</p>}
   </article>)}</div>

   {!rows.length&&<div className="caa-empty">No alumni records match this view.</div>}
  </section>
 </main>;
}
