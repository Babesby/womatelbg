import React,{useEffect,useMemo,useState}from'react';
import{Award,BookOpenCheck,Bookmark,BriefcaseBusiness,CalendarDays,CheckCircle2,ClipboardCheck,Compass,ExternalLink,Globe2,GraduationCap,HandCoins,HeartHandshake,Leaf,MapPin,Medal,Plus,Presentation,Search,Sparkles,Sprout,Star,Trash2}from'lucide-react';
import{archiveAdminCanopyOpportunity,getAdminCanopyOpportunities,getCanopyOpportunityFeed,notifyAdminCanopyOpportunity,saveAdminCanopyOpportunity,toggleCanopyOpportunitySave,applyWomateOpportunity,getWomateOpportunityApplications,reviewWomateOpportunityApplication,setWomateOpportunityManaged,getWomateOpportunityApplicationCounts}from'./canopyApi';
import'./canopyOpportunityBoard.css';

const TYPES=['all','job','internship','fellowship','grant','scholarship','consultancy','conference','volunteer','other'];
const titleCase=s=>String(s||'').replaceAll('_',' ').replace(/\b\w/g,m=>m.toUpperCase());

const OPPORTUNITY_ICONS={
 job:BriefcaseBusiness,
 internship:BookOpenCheck,
 fellowship:Medal,
 grant:HandCoins,
 scholarship:GraduationCap,
 consultancy:ClipboardCheck,
 conference:Presentation,
 volunteer:HeartHandshake,
 other:Compass
};
function OpportunityMark({type,title,featured}){
 const kind=OPPORTUNITY_ICONS[type]?type:'other';
 const topic=String(title||'').toLowerCase();
 const Icon=kind==='other'&&/agricultur|farm|food|seed/.test(topic)?Sprout:
  kind==='other'&&/climate|conservation|environment/.test(topic)?Leaf:
  OPPORTUNITY_ICONS[kind];
 return <div className={'co-mark co-mark-'+kind} aria-hidden="true"><Icon size={19} strokeWidth={1.9}/>{featured&&<span className="co-mark-featured"><Star size={10} fill="currentColor"/></span>}</div>;
}

const deadline=d=>{if(!d)return'Open deadline';const dt=new Date(d);return Number.isNaN(dt.getTime())?'Open deadline':dt.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})};
function reasons(o,data){const out=[];if(o.global)out.push('Open globally');else if(o.country&&data.country&&o.country.trim().toLowerCase()===data.country.trim().toLowerCase())out.push('Fits your country');if(Number(o.min_module_no||0)>0&&Number(data.completed_modules||0)>=Number(o.min_module_no))out.push('Your learning progress fits');if(o.requires_spotlight&&Number(data.spotlight_count||0)>0)out.push('Spotlight experience fits');if(o.requires_verified_mission&&data.verified_mission)out.push('Verified mission experience fits');return out.slice(0,3)}

const countryName=v=>{const raw=String(v||'').replace(/[\u{1F1E6}-\u{1F1FF}]/gu,'').trim();const key=raw.toLowerCase();return ({'the gambia':'Gambia','the united republic of tanzania':'Tanzania','sierra leone':'Sierra Leone','ghana':'Ghana','uganda':'Uganda','malawi':'Malawi'}[key]||raw).replace(/\b\w/g,ch=>ch.toUpperCase())};
export default function CanopyOpportunityBoard({viewer}){
 const[data,setData]=useState({opportunities:[]}),[tab,setTab]=useState('for-you'),[type,setType]=useState('all'),[query,setQuery]=useState(''),[countryFilter,setCountryFilter]=useState('all'),[applyId,setApplyId]=useState(null),[draft,setDraft]=useState({pitch:'',plan:'',evidence_url:''}),[busy,setBusy]=useState(''),[msg,setMsg]=useState('');
 const load=async()=>{try{setData(await getCanopyOpportunityFeed(viewer.session)||{opportunities:[]});setMsg('')}catch(e){setMsg(e.message)}};
 useEffect(()=>{load()},[]);
 const rows=useMemo(()=>{let a=[...(data.opportunities||[])];if(tab==='for-you')a=a.filter(x=>x.matched);if(tab==='saved')a=a.filter(x=>x.saved);if(type!=='all')a=a.filter(x=>x.opportunity_type===type);if(countryFilter!=='all')a=a.filter(x=>countryFilter==='global'?x.global:(x.global||(!x.country&&!x.global)||countryName(x.country)===countryFilter));const q=query.trim().toLowerCase();if(q)a=a.filter(x=>[x.title,x.organization,x.summary,x.location,x.country].some(v=>String(v||'').toLowerCase().includes(q)));return a},[data,tab,type,query,countryFilter]);
 const apply=async o=>{setBusy(o.id);try{await applyWomateOpportunity(viewer.session,o.id,draft);setApplyId(null);await load();setMsg('WOMATE application received.')}catch(e){setMsg(e.message)}finally{setBusy('')}};
 const save=async o=>{setBusy(o.id);try{await toggleCanopyOpportunitySave(viewer.session,o.id);await load()}catch(e){setMsg(e.message)}finally{setBusy('')}};
 return <main className="co-page">
  <header className="co-hero"><div><span>OPPORTUNITIES</span><h1>Use what you are building.</h1><p>Explore WOMATE-reviewed opportunities and decide what is worth pursuing.</p></div><div className="co-signal"><b>{(data.opportunities||[]).filter(x=>x.matched).length}</b><span>may fit your Canopy evidence</span></div></header>
  <section className="co-tools"><div className="co-tabs"><button className={tab==='for-you'?'on':''} onClick={()=>setTab('for-you')}>For you</button><button className={tab==='all'?'on':''} onClick={()=>setTab('all')}>All opportunities</button><button className={tab==='saved'?'on':''} onClick={()=>setTab('saved')}>Saved</button></div><div className="co-search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search title, organisation or place"/></div></section>
  <div className="co-filters"><select aria-label="Filter opportunities by country" value={countryFilter} onChange={e=>setCountryFilter(e.target.value)}><option value="all">All countries</option><option value="global">Global</option>{[...new Set([...(data.learner_countries||[]),...(data.opportunities||[]).map(x=>x.country)].filter(Boolean).map(countryName))].sort().map(x=><option value={x} key={x}>{x}</option>)}</select>{TYPES.map(t=><button key={t} className={type===t?'on':''} onClick={()=>setType(t)}>{t==='all'?'All types':titleCase(t)}</button>)}</div>
  {Number(data.priority_points)>0&&<p className="co-msg">Verified Talent Priority · {data.priority_points}/40. Your verified Mission work strengthens consideration for suitable WOMATE opportunities.</p>}
  {msg&&<p className="co-msg">{msg}</p>}
  <section className="co-list">{rows.length?rows.map(o=><article key={o.id} className={o.featured?'featured':''}>
    <OpportunityMark type={o.opportunity_type} title={o.title} featured={o.featured}/>
    <div className="co-copy"><div className="co-meta"><span>{titleCase(o.opportunity_type)}</span>{o.global?<span><Globe2/>Global</span>:o.country?<span><MapPin/>{o.country}</span>:null}<span className={o.deadline_at?'co-deadline':'co-no-deadline'}><CalendarDays/>{o.deadline_at?'Deadline · '+deadline(o.deadline_at):'Closing date not set'}</span></div><h2>{o.title}</h2><h3>{o.organization}</h3><p>{o.summary}</p>{o.compensation&&<strong className="co-pay">{o.compensation}</strong>}{o.application&&<div className="co-app-status">WOMATE application · {o.application.status}{o.application.feedback&&<p>{o.application.feedback}</p>}</div>}{o.matched&&<div className="co-reasons">{reasons(o,data).map(r=><span key={r}><CheckCircle2/>{r}</span>)}</div>}</div>
    <div className="co-actions"><button aria-label={o.saved?'Remove saved opportunity':'Save opportunity'} className={o.saved?'saved':''} disabled={busy===o.id} onClick={()=>save(o)}><Bookmark/></button>{o.url&&!o.managed_by_womate&&<a href={o.url} target="_blank" rel="noreferrer">Official details <ExternalLink/></a>}{o.managed_by_womate&&o.matched&&<button className="co-apply-btn" disabled={busy===o.id||Boolean(o.application&&o.application.status!=='submitted')} onClick={()=>setApplyId(applyId===o.id?null:o.id)}>{o.application?'Edit application':'Apply to WOMATE'}</button>}</div>
  {applyId===o.id&&<div className="co-apply-form"><h3>Apply to WOMATE</h3><label>Why are you a strong candidate?<textarea value={draft.pitch} maxLength={1200} onChange={e=>setDraft({...draft,pitch:e.target.value})}/></label><label>What would you contribute?<textarea value={draft.plan} maxLength={1200} onChange={e=>setDraft({...draft,plan:e.target.value})}/></label><label>Evidence URL (optional)<input type="url" value={draft.evidence_url} onChange={e=>setDraft({...draft,evidence_url:e.target.value})}/></label><button className="co-apply-btn" disabled={busy===o.id} onClick={()=>apply(o)}>Submit application</button></div>}</article>):<div className="co-empty"><Sparkles/><h2>No opportunities here yet.</h2><p>Try another view or check again when WOMATE publishes more opportunities.</p></div>}</section>
 </main>
}

const emptyForm={id:null,title:'',organization:'',opportunity_type:'fellowship',summary:'',url:'',location:'',country:'',global:true,compensation:'',deadline_at:'',min_module_no:0,requires_spotlight:false,requires_verified_mission:false,featured:false,published:false,managed_by_womate:false};
function OpportunityReviewEditor({application,busy,onSave}){
 const[feedback,setFeedback]=useState(application.feedback_public||'');
 const[note,setNote]=useState(application.admin_note_private||'');
 const[status,setStatus]=useState(application.status||'submitted');
 return <div className="coa-feedback-editor">
  <label>Feedback to applicant<textarea rows={4} placeholder="Advice or next steps visible to the applicant" value={feedback} onChange={e=>setFeedback(e.target.value)}/></label>
  <label>Private staff note<textarea rows={2} placeholder="Internal review only — not shared with the applicant" value={note} onChange={e=>setNote(e.target.value)}/></label>
  <div className="coa-review-controls"><label>Decision<select value={status} onChange={e=>setStatus(e.target.value)}>{[['submitted','Under review'],['shortlisted','Shortlisted'],['rejected','Not selected'],['selected','Selected']].map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label><button type="button" disabled={busy} onClick={()=>onSave(application,status,feedback,note)}>Save review and notify applicant</button></div>
 </div>;
}
export function CanopyOpportunityAdmin({viewer,cohortKey='she-leads-climate-c2-2026',cohort=null}){
 const[rows,setRows]=useState([]),[counts,setCounts]=useState({}),[selected,setSelected]=useState(null),[apps,setApps]=useState([]),[form,setForm]=useState(emptyForm),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[tab,setTab]=useState('applications'),[query,setQuery]=useState('');
 const load=async()=>{try{const [list,n]=await Promise.all([getAdminCanopyOpportunities(viewer.session,cohortKey),getWomateOpportunityApplicationCounts(viewer.session).catch(()=>({}))]);setRows(Array.isArray(list)?list:[]);setCounts(n||{})}catch(e){setMsg(e.message)}};
 useEffect(()=>{setForm(emptyForm);setSelected(null);setApps([]);setTab('applications');load()},[cohortKey]);
 const edit=o=>{setForm({...emptyForm,...o,deadline_at:o.deadline_at?new Date(o.deadline_at).toISOString().slice(0,16):''});setTab('create')};
 const save=async e=>{e.preventDefault();setBusy(true);setMsg('');try{const saved=await saveAdminCanopyOpportunity(viewer.session,{...form,url:form.managed_by_womate&&!form.url?'https://www.womate.org/canopy/opportunity-board':form.url,deadline_at:form.deadline_at?new Date(form.deadline_at).toISOString():null},cohortKey);if(cohortKey==='she-leads-climate-c2-2026'&&saved?.id)await setWomateOpportunityManaged(viewer.session,saved.id,form.managed_by_womate);setForm(emptyForm);await load();setTab('published');setMsg('Opportunity saved.')}catch(err){setMsg(err.message)}finally{setBusy(false)}};
 const reviewApps=async o=>{setSelected(o);setTab('applications');setBusy(true);setMsg('');try{setApps(await getWomateOpportunityApplications(viewer.session,o.id)||[])}catch(e){setMsg(e.message)}finally{setBusy(false)}};
 const decide=async(a,status,feedback,note)=>{setBusy(true);setMsg('');try{await reviewWomateOpportunityApplication(viewer.session,a.id,status,feedback,note);setApps(await getWomateOpportunityApplications(viewer.session,selected.id)||[]);setMsg('Review saved and applicant notified.')}catch(e){setMsg(e.message)}finally{setBusy(false)}};
 const archive=async id=>{if(!confirm('Archive this opportunity?'))return;setBusy(true);try{await archiveAdminCanopyOpportunity(viewer.session,id);await load();setMsg('Opportunity archived.')}catch(e){setMsg(e.message)}finally{setBusy(false)}};
 const notify=async id=>{setBusy(true);try{const n=await notifyAdminCanopyOpportunity(viewer.session,id);setMsg('Notification sent to '+Number(n||0)+' matching learners.')}catch(e){setMsg(e.message)}finally{setBusy(false)}};
 const numberOf=o=>Number(counts[o.id]||0);
 const total=rows.reduce((n,o)=>n+numberOf(o),0);
 const listed=rows.filter(o=>(tab==='published'?o.published&&!o.archived:tab==='drafts'?!o.published||o.archived:tab==='applications'?numberOf(o)>0:true)&&[o.title,o.organization,o.country].some(s=>String(s||'').toLowerCase().includes(query.toLowerCase()))).sort((a,b)=>numberOf(b)-numberOf(a));
 const editor=<form onSubmit={save} className="coa-form"><h3>{form.id?'Edit opportunity':'Create opportunity'}</h3><label>Title<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required/></label><label>Organisation<input value={form.organization} onChange={e=>setForm({...form,organization:e.target.value})} required/></label><div className="coa-two"><label>Type<select value={form.opportunity_type} onChange={e=>setForm({...form,opportunity_type:e.target.value})}>{TYPES.filter(x=>x!=='all').map(x=><option key={x} value={x}>{titleCase(x)}</option>)}</select></label><label>Minimum completed module<select value={form.min_module_no} onChange={e=>setForm({...form,min_module_no:Number(e.target.value)})}>{[0,1,2,3,4,5].map(n=><option key={n} value={n}>{n===0?'None':'Module '+n}</option>)}</select></label></div><label>Summary<textarea value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})} required/></label><label>{form.managed_by_womate?'Optional public details URL':'Official opportunity URL'}<input type="url" value={form.url} onChange={e=>setForm({...form,url:e.target.value})} required={!form.managed_by_womate}/></label><div className="coa-two"><label>Location<input value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></label><label>Country<input value={form.country} disabled={form.global} onChange={e=>setForm({...form,country:e.target.value})}/></label></div><div className="coa-two"><label>Compensation / funding<input value={form.compensation} onChange={e=>setForm({...form,compensation:e.target.value})}/></label><label>Deadline<input type="datetime-local" value={form.deadline_at} onChange={e=>setForm({...form,deadline_at:e.target.value})}/></label></div><div className="coa-checks">{[['global','Global'],['requires_spotlight','Spotlight required'],['requires_verified_mission','Verified mission required'],['managed_by_womate','WOMATE-run applications'],['featured','Featured'],['published','Published']].map(([key,label])=><label key={key}><input type="checkbox" checked={Boolean(form[key])} onChange={e=>setForm({...form,[key]:e.target.checked})}/>{label}</label>)}</div><button className="coa-save" disabled={busy}>Save opportunity</button></form>;
 return <section className="coa-page coa-workspace"><header><div><span>OPPORTUNITIES</span><h2>Opportunity management</h2><p>Manage listings, review applications and respond to candidates from one workspace.</p></div></header>
  <nav className="coa-workspace-tabs" aria-label="Opportunity management sections">{[['applications','Applications',total],['published','Published',rows.filter(o=>o.published&&!o.archived).length],['drafts','Drafts',rows.filter(o=>!o.published||o.archived).length],['create',form.id?'Edit listing':'Create new',null]].map(([key,label,n])=><button key={key} type="button" className={tab===key?'active':''} onClick={()=>setTab(key)}>{label}{n!==null&&<span>{n}</span>}</button>)}</nav>
  {msg&&<p className="coa-msg" role="status">{msg}</p>}
  {tab==='create'?editor:<>
   <div className="coa-workspace-tools"><label>Search opportunities<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search title, organisation or country"/></label><button type="button" onClick={load}>Refresh</button></div>
   <div className="coa-list">{listed.map(o=><article key={o.id} className={o.archived?'archived':''}><div><small>{titleCase(o.opportunity_type)} · {o.published?'Published':'Draft'}</small><h3>{o.title}</h3><p>{o.organization}{o.deadline_at?' · '+deadline(o.deadline_at):''}</p><b>{numberOf(o)} application{numberOf(o)===1?'':'s'}</b></div><div className="coa-rowactions"><button type="button" onClick={()=>reviewApps(o)}>Applications</button>{tab!=='applications'&&<button type="button" onClick={()=>edit(o)}>Edit</button>}{tab==='published'&&<button type="button" onClick={()=>notify(o.id)} disabled={busy}>Notify matches</button>}{tab==='drafts'&&!o.archived&&<button type="button" onClick={()=>archive(o.id)}>Archive</button>}</div></article>)}{!listed.length&&<p className="coa-empty">No opportunities in this section.</p>}</div>
   {tab==='applications'&&selected&&<section className="coa-app-review"><header><h3>{selected.title} · Applications</h3><button type="button" onClick={()=>{setSelected(null);setApps([])}}>Close</button></header>{apps.length?apps.map(a=><article key={a.id}><div className="coa-applicant-line"><strong>{a.full_name||'Applicant'}</strong><span>{a.country||'Country not stated'} · Priority {a.priority_points}/40 · {a.status}</span></div><p><b>Fit</b> {a.pitch}</p><p><b>Plan</b> {a.plan}</p>{a.evidence_url&&<a href={a.evidence_url} target="_blank" rel="noreferrer">View evidence</a>}<OpportunityReviewEditor key={a.id} application={a} busy={busy} onSave={decide}/></article>):<p>No applications for this listing.</p>}</section>}
  </>}
 </section>;
}
