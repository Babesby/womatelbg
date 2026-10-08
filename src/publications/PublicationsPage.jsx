import React,{useEffect,useState} from 'react';
import {ArrowUpRight,BookOpen,ChevronDown,Check,FileText,Search,X,LockKeyhole} from 'lucide-react';
import './publications.css';

const BASE=(import.meta.env.VITE_CANOPY_SUPABASE_URL||'').replace(/\/$/,'');
const KEY=import.meta.env.VITE_CANOPY_SUPABASE_ANON_KEY||'';
const ENDPOINT=BASE?`${BASE}/functions/v1/womate-publications`:'';
const TYPES=['Research paper','Article','Policy brief','Case study','Position paper','Editorial','Annual report','Blog','Other'];
const LIBRARY_TYPES=[...TYPES,'Perspective'];
const REVIEWERS=['Ruby Damenshie Brown','Asaa','Phillipa Aidoo','Hamza Abubakar'];
async function request(action,payload={},token=''){
 if(!ENDPOINT)throw new Error('Publication service is not configured yet. Please contact WOMATE.');
 let r;
 try{r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',...(KEY?{'apikey':KEY}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({action,...payload})});}catch{throw new Error('Could not connect. Please try again.');}
 const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'Request unsuccessful. Please try again.');return data;
}
const empty={name:'',email:'',phone:'',country:'',affiliation:'',title:'',kind:TYPES[0],summary:'',document_url:'',consent:false};
function cleanPublicationText(value){
 return String(value??'').replace(/[\u200B-\u200D\uFEFF]/g,'').trim();
}
function cleanPublicationUrl(value){
 let text=cleanPublicationText(value).normalize('NFKC').replace(/[“”‘’]/g,'').trim();
 if(!text)return'';

 // Prefer a Google Drive / Docs identifier even when the user pasted Markdown,
 // rich-text wrappers, copied punctuation or surrounding prose.
 const driveId=text.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/i)?.[1]
   ||text.match(/drive\.google\.com\/open\?[^\s)]*\bid=([A-Za-z0-9_-]+)/i)?.[1];
 if(driveId)return `https://drive.google.com/file/d/${driveId}/view`;

 const docs=text.match(/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([A-Za-z0-9_-]+)/i);
 if(docs)return `https://docs.google.com/${docs[1]}/d/${docs[2]}/edit`;

 const markdown=text.match(/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/i)?.[1];
 const angle=text.match(/<\s*(https?:\/\/[^>\s]+)\s*>/i)?.[1];
 const plain=text.match(/https?:\/\/[^\s<>"'\]\)]+/i)?.[0];
 let candidate=(markdown||angle||plain||text)
   .replace(/^[\s(<\[{]+/,'')
   .replace(/[\s)>\]}.,;:]+$/,'');
 if(!/^https?:\/\//i.test(candidate)&&/^(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/|$)/i.test(candidate)){
   candidate='https://'+candidate.replace(/^www\./i,'');
 }
 return candidate;
}
function publicationProblem(entry){
 if(entry.name.length<2)return 'Please enter your full name.';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.email))return 'Please enter a valid email address.';
 if(entry.phone.length<3)return 'Please enter a valid phone number.';
 if(!entry.country)return 'Please enter your country.';
 if(entry.title.length<5)return 'Publication title must be at least 5 characters.';
 if(!TYPES.includes(entry.kind))return 'Please choose a valid publication type.';
 if(entry.summary.length<40)return 'Abstract / summary must be at least 40 characters.';
 if(entry.summary.length>2500)return 'Abstract / summary is too long.';
 if(!entry.document_url)return 'Please add your document link.';
 if(entry.consent!==true)return 'Please confirm the publication consent checkbox.';
 return '';
}
function publicationEmbed(raw){
 try{
  const u=new URL(raw);
  if(u.protocol!=='https:')return null;
  const host=u.hostname.toLowerCase();
  if(host==='drive.google.com'){
   const id=u.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]+)/)?.[1]||u.searchParams.get('id');
   if(id&&/^[A-Za-z0-9_-]+$/.test(id))return `https://drive.google.com/file/d/${id}/preview`;
  }
  if(host==='docs.google.com'){
   const m=u.pathname.match(/^\/(document|spreadsheets|presentation)\/d\/([A-Za-z0-9_-]+)/);
   if(m)return `https://docs.google.com/${m[1]}/d/${m[2]}/${m[1]==='presentation'?'embed':'preview'}`;
  }
  if(/\.pdf$/i.test(u.pathname)&&!u.username&&!u.password)return u.href;
 }catch{}
 return null;
}
const niceDate=s=>s?new Date(s).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'';
export default function PublicationsPage(){
 const[posts,setPosts]=useState([]),[loading,setLoading]=useState(true),[formOpen,setFormOpen]=useState(false),[form,setForm]=useState(empty),[sending,setSending]=useState(false),[success,setSuccess]=useState(false),[notice,setNotice]=useState('');
 const[query,setQuery]=useState(''),[kind,setKind]=useState('All'),[selected,setSelected]=useState(null),[adminOpen,setAdminOpen]=useState(false),[reviewer,setReviewer]=useState(REVIEWERS[0]),[code,setCode]=useState(''),[token,setToken]=useState(''),[reviewItems,setReviewItems]=useState([]),[reviewFilter,setReviewFilter]=useState('pending'),[reviewSearch,setReviewSearch]=useState(''),[feedback,setFeedback]=useState({}),[working,setWorking]=useState('');
 const refresh=()=>request('list').then(d=>setPosts(d.items||[])).catch(e=>setNotice(e.message)).finally(()=>setLoading(false));
 useEffect(()=>{refresh()},[]);
 const submit=async e=>{
  e.preventDefault();setNotice('');
  const entry={...form,name:cleanPublicationText(form.name),email:cleanPublicationText(form.email).toLowerCase(),phone:cleanPublicationText(form.phone),country:cleanPublicationText(form.country),affiliation:cleanPublicationText(form.affiliation),title:cleanPublicationText(form.title),kind:cleanPublicationText(form.kind),summary:cleanPublicationText(form.summary),document_url:cleanPublicationUrl(form.document_url),consent:form.consent===true};
  const problem=publicationProblem(entry);
  if(problem){setNotice(problem);return}
  setSending(true);
  try{await request('submit',{entry});setForm(empty);setSuccess(true)}catch(err){setNotice(err.message)}finally{setSending(false)}
 };
 const login=async e=>{e.preventDefault();setNotice('');setWorking('login');try{const d=await request('login',{reviewer,code});setToken(d.token);setCode('');const q=await request('queue',{},d.token);setReviewItems(q.items||[])}catch(e){setNotice(e.message)}finally{setWorking('')}};
 const refreshQueue=async t=>{const d=await request('queue',{},t||token);setReviewItems(d.items||[])};
 const decide=async(id,status)=>{setNotice('');setWorking(id);try{await request('review',{id,status,feedback:(feedback[id]||'').trim()},token);await Promise.all([refreshQueue(),refresh()]);setNotice(status==='approved'?'Publication is now live.':'Editorial decision saved.')}catch(e){setNotice(e.message)}finally{setWorking('')}};
 const shown=posts.filter(p=>(kind==='All'||p.kind===kind)&&`${p.title} ${p.name} ${p.summary}`.toLowerCase().includes(query.toLowerCase()));
 const queue=reviewItems.filter(p=>(reviewFilter==='all'||p.status===reviewFilter)&&`${p.title} ${p.name} ${p.email}`.toLowerCase().includes(reviewSearch.toLowerCase()));
 return <main className="wpub"><section className="wpubHero"><div className="wpubEyebrow">WOMATE / KNOWLEDGE & RESEARCH</div><div className="wpubHeroLayout"><div><h1>Ideas worth<br/><em>sharing.</em></h1><p>Research, perspectives and practical knowledge advancing women's leadership, climate action and inclusive development.</p><div className="wpubHeroActions"><button className="wpubLime" onClick={()=>{setFormOpen(true);setSuccess(false);setNotice('')}}>Submit your work <ArrowUpRight size={17}/></button><a href="#wpubLibrary">Explore publications <ChevronDown size={16}/></a></div></div><div className="wpubHeroArt"><div className="wpubArtLine">KNOWLEDGE<br/>IN MOTION<span>↗</span></div><div className="wpubArtFoot">Women's voices. Grounded evidence. New perspectives.</div></div></div></section>
 <section id="wpubLibrary" className="wpubLibrary"><div className="wpubSectionTop"><div><span>THE LIBRARY</span><h2>Published perspectives.</h2><p>Explore work reviewed and published by WOMATE.</p></div><div className="wpubTools"><label className="wpubSearch"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search publications" aria-label="Search publications"/></label><select aria-label="Publication category" value={kind} onChange={e=>setKind(e.target.value)}><option>All</option>{LIBRARY_TYPES.map(t=><option key={t}>{t}</option>)}</select></div></div>
 {loading?<div className="wpubEmpty">Loading publications…</div>:shown.length?<div className="wpubGrid">{shown.map(p=><article key={p.id} className="wpubCard"><div className="wpubCardMeta"><span>{p.kind}</span><time>{niceDate(p.published_at)}</time></div><div className="wpubDocIcon"><BookOpen size={28}/></div><h3>{p.title}</h3><p className="wpubCardSummary">{p.summary}</p><div className="wpubCardFoot"><span>{p.name}{p.affiliation?` · ${p.affiliation}`:''}</span><button onClick={()=>setSelected(p)}>Explore <ArrowUpRight size={16}/></button></div></article>)}</div>:<div className="wpubEmpty"><FileText size={28}/><h3>{query||kind!=='All'?'No matching publications.':'Our publications library is taking shape.'}</h3><p>{query||kind!=='All'?'Try another search or category.':'Have work worth sharing? Submit it for editorial review.'}</p><button className="wpubOutline" onClick={()=>{setFormOpen(true);setSuccess(false)}}>Submit a publication</button></div>}
 <div className="wpubInvite"><div><span>CONTRIBUTE TO THE CONVERSATION</span><h2>Your research has a place here.</h2><p>We welcome original articles, case studies, policy perspectives and research from She Leads, The Circle and the wider community.</p></div><button className="wpubLime" onClick={()=>{setFormOpen(true);setSuccess(false);setNotice('')}}>Submit a publication <ArrowUpRight size={17}/></button></div>
 <div className="wpubAdminEntry"><button aria-label="Editorial access" title="Editorial access" onClick={()=>{setAdminOpen(true);setNotice('')}}><ChevronDown size={14}/> Editorial access</button></div></section>
 {selected&&<div className="wpubOverlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><section className="wpubDialog wpubReaderDialog" role="dialog" aria-modal="true" aria-label={selected.title}><button className="wpubClose" onClick={()=>setSelected(null)} aria-label="Close"><X/></button><span className="wpubKicker">{selected.kind} · {niceDate(selected.published_at)}</span><h2>{selected.title}</h2><p className="wpubAuthor">{selected.name}{selected.affiliation?` · ${selected.affiliation}`:''}</p><p className="wpubAbstract">{selected.summary}</p><div className="wpubReader"><div className="wpubReaderHead"><span><BookOpen size={16}/> Publication reader</span><a href={selected.document_url} target="_blank" rel="noopener noreferrer">Open original <ArrowUpRight size={14}/></a></div>{publicationEmbed(selected.document_url)?<iframe key={selected.id} src={publicationEmbed(selected.document_url)} title={`Read ${selected.title}`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>:<div className="wpubReaderFallback"><FileText size={27}/><p>This document's provider does not support an automatic preview. Open the original publication to read it.</p><a className="wpubLime" href={selected.document_url} target="_blank" rel="noopener noreferrer">Open original document <ArrowUpRight size={16}/></a></div>}</div></section></div>}
 {formOpen&&<div className="wpubOverlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setFormOpen(false)}}><section className="wpubDialog wpubFormDialog" role="dialog" aria-modal="true" aria-label="Submit a publication"><button className="wpubClose" onClick={()=>setFormOpen(false)} aria-label="Close"><X/></button>{success?<div className="wpubSuccess"><Check size={37}/><h2>Submission received.</h2><p>Thank you for contributing. The WOMATE editorial team will review your work. Submission does not guarantee publication; we will contact you using the details provided if further information is required.</p><button className="wpubLime" onClick={()=>setFormOpen(false)}>Back to publications</button></div>:<><span className="wpubKicker">CONTRIBUTE</span><h2>Submit your work.</h2><p className="wpubIntro">Share original work using a Google Drive, Google Docs or other readable HTTPS link. Set document access so both the WOMATE editorial team and public readers can view it without requesting permission. Google Drive/Docs or a direct PDF works best for the embedded reader. Do not submit sensitive personal information within your document.</p><form className="wpubForm" onSubmit={submit}><div className="wpubFields"><label>Full name *<input required maxLength={120} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Email *<input required type="email" maxLength={200} value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Phone number *<input required type="tel" maxLength={40} value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>Country *<input required maxLength={100} value={form.country} onChange={e=>setForm({...form,country:e.target.value})}/></label><label>Affiliation / programme (optional)<input maxLength={160} value={form.affiliation} onChange={e=>setForm({...form,affiliation:e.target.value})} placeholder="She Leads, The Circle, institution…"/></label><label>Publication type *<select required value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></label></div><label>Publication title *<input required maxLength={180} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Abstract / summary *<textarea required rows={5} minLength={40} maxLength={2500} value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})} placeholder="Explain the main question, approach and key insights (at least 40 characters)."/></label><label>Viewable document link *<input required type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck="false" value={form.document_url} onChange={e=>setForm({...form,document_url:e.target.value})} onBlur={e=>setForm({...form,document_url:cleanPublicationUrl(e.target.value)})} placeholder="Paste a Google Drive, Google Docs or HTTPS link"/></label><label className="wpubConsent"><input type="checkbox" required checked={form.consent} onChange={e=>setForm({...form,consent:e.target.checked})}/><span>I confirm this is original work, I have permission from any co-authors, and I consent to WOMATE reviewing the submission and publishing the approved title, summary, author details and document link. My private contact information is for editorial follow-up only.</span></label>{notice&&<p className="wpubError" role="alert">{notice}</p>}<button className="wpubLime" disabled={sending}>{sending?'Submitting…':'Send for editorial review'} <ArrowUpRight size={16}/></button></form></>}</section></div>}
 {adminOpen&&<div className="wpubOverlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget){setAdminOpen(false);setToken('')}}}><section className="wpubDialog wpubAdminDialog" role="dialog" aria-modal="true" aria-label="WOMATE editorial dashboard"><button className="wpubClose" onClick={()=>{setAdminOpen(false);setToken('');setNotice('')}} aria-label="Close"><X/></button>{!token?<><span className="wpubKicker"><LockKeyhole size={13}/> RESTRICTED EDITORIAL ACCESS</span><h2>Editorial sign in.</h2><p className="wpubIntro">For authorised WOMATE reviewers only.</p><form className="wpubForm" onSubmit={login}><label>Reviewer<select value={reviewer} onChange={e=>setReviewer(e.target.value)}>{REVIEWERS.map(n=><option key={n}>{n}</option>)}</select></label><label>Editorial access code<input type="password" required value={code} onChange={e=>setCode(e.target.value)} autoComplete="off"/></label>{notice&&<p className="wpubError" role="alert">{notice}</p>}<button className="wpubLime" disabled={working==='login'}>{working==='login'?'Checking…':'Enter dashboard'}</button></form></>:<><span className="wpubKicker">WOMATE / EDITORIAL DESK</span><h2>Publication reviews.</h2><p className="wpubIntro">Check that the document can be publicly viewed and embedded before publishing. Decisions do not automatically send external email; follow up with contributors from your team mailbox.</p><div className="wpubReviewTools"><label className="wpubSearch"><Search size={16}/><input value={reviewSearch} onChange={e=>setReviewSearch(e.target.value)} placeholder="Search title, author or email"/></label><select value={reviewFilter} onChange={e=>setReviewFilter(e.target.value)}><option value="pending">Pending</option><option value="approved">Approved</option><option value="declined">Declined</option><option value="all">All submissions</option></select><button onClick={()=>refreshQueue().catch(e=>setNotice(e.message))}>Refresh</button></div><div className="wpubReviewList">{queue.length?queue.map(p=><article key={p.id}><div className="wpubCardMeta"><span>{p.kind} · {p.status}</span><time>{niceDate(p.created_at)}</time></div><h3>{p.title}</h3><p>{p.summary}</p><p className="wpubReviewerMeta"><b>{p.name}</b> · {p.country} {p.affiliation?` · ${p.affiliation}`:''}<br/><a href={`mailto:${p.email}`}>{p.email}</a> · {p.phone}</p><a href={p.document_url} target="_blank" rel="noopener noreferrer">Open submitted document <ArrowUpRight size={14}/></a><label>Editorial notes / feedback<textarea rows={2} value={feedback[p.id]??p.feedback??''} onChange={e=>setFeedback({...feedback,[p.id]:e.target.value})} placeholder="Optional internal decision note or feedback for follow-up"/></label><div className="wpubReviewActions"><button disabled={working===p.id} onClick={()=>decide(p.id,'approved')}>Approve & publish</button><button disabled={working===p.id} onClick={()=>decide(p.id,'declined')}>Decline</button></div></article>):<div className="wpubEmpty">No submissions in this view.</div>}</div>{notice&&<p className="wpubError" role="status">{notice}</p>}<button className="wpubLogout" onClick={()=>{setToken('');setReviewItems([])}}>Sign out</button></>}</section></div>}
 </main>;
}
