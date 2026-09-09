import React,{useEffect,useMemo,useState}from'react';
import{
  Award,BarChart3,Bell,BookOpen,ChevronRight,ClipboardCheck,FileText,
  LayoutDashboard,LogOut,Menu,MessageSquare,ShieldAlert,Sparkles,
  Star,UserRound,UsersRound,X
}from'lucide-react';
import'./canopyStaffWorkspace.css';

const ROLE_LABELS={
  programme_manager:'Programme & Monitoring Manager',
  programme_operations:'Programme Operations Deputy',
  module_coordinator:'Learning Experience Coordinator',
  learning_fellow:'Learning Experience Fellow'
};

const ROLE_ROOTS={
  programme_manager:'/canopy/manage',
  programme_operations:'/canopy/operations',
  module_coordinator:'/canopy/coordinator',
  learning_fellow:'/canopy/fellow'
};

const NAV={
  programme_manager:[
    ['overview','Overview',LayoutDashboard],
    ['learners','Learners',UsersRound],
    ['reviews','Assignment reviews',ClipboardCheck],
    ['communications','Communications',MessageSquare],
    ['complaints','Complaints',ShieldAlert],
    ['certificates','Certificates',Award],
    ['reports','Reports',BarChart3],
    ['spotlight','Canopy Spotlight',Star],
    ['team','Team operations',UserRound]
  ],
  programme_operations:[
    ['overview','Overview',LayoutDashboard],
    ['learners','Learner operations',UsersRound],
    ['submissions','Submissions',FileText],
    ['attention','Attention queue',Bell],
    ['communications','Communications',MessageSquare],
    ['complaints','Complaints',ShieldAlert],
    ['spotlight','Spotlight shortlist',Star],
    ['reports','Reports',BarChart3]
  ],
  module_coordinator:[
    ['overview','Module home',LayoutDashboard],
    ['learners','Module learners',UsersRound],
    ['submissions','Submissions',FileText],
    ['attention','Learner attention',Bell],
    ['communications','Module communications',MessageSquare],
    ['spotlight','Spotlight nominations',Star],
    ['activity','Module activity',BarChart3]
  ],
  learning_fellow:[
    ['overview','Module home',LayoutDashboard],
    ['support','Learner support',UsersRound],
    ['submissions','Submission view',FileText],
    ['followups','Follow-ups',Bell],
    ['spotlight','Spotlight nominations',Star],
    ['activity','Activity',BarChart3]
  ]
};

function apiConfig(){
  const env=import.meta.env||{};
  return{
    url:env.VITE_CANOPY_SUPABASE_URL||env.VITE_SUPABASE_URL||'',
    key:env.VITE_CANOPY_SUPABASE_ANON_KEY||env.VITE_SUPABASE_ANON_KEY||''
  };
}
async function rpc(session,name,body={}){
  const{url,key}=apiConfig();
  if(!url||!key)throw new Error('Canopy is temporarily unavailable.');
  const token=session?.access_token||session?.session?.access_token;
  if(!token)throw new Error('Your Canopy session has expired. Sign in again.');
  const res=await fetch(`${url}/rest/v1/rpc/${name}`,{
    method:'POST',
    headers:{
      apikey:key,
      Authorization:`Bearer ${token}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify(body)
  });
  const text=await res.text();
  let data=null;
  try{data=text?JSON.parse(text):null}catch{data=text}
  if(!res.ok){console.error('Canopy team request failed',name,res.status,text);throw new Error('We could not complete that action. Please try again.');}
  return data;
}
function nav(path){
  window.history.pushState({},'',path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({top:0,behavior:'smooth'});
}
function moduleLabel(id){
  if(!id)return'Programme-wide';
  const n=String(id).match(/(\d+)$/)?.[1]||id;
  return`Module ${Number(n)}`;
}
function nameFrom(viewer){
  return viewer?.profile?.full_name||viewer?.user?.user_metadata?.full_name||viewer?.user?.email?.split('@')?.[0]||'WOMATE team';
}
function Stat({value,label}){return <article><strong>{value??0}</strong><span>{label}</span></article>}
function Empty({children='No records here yet.'}){return <div className="cstaffEmpty">{children}</div>}
function Status({children}){return <span className={'cstaffStatus '+String(children||'').replaceAll('_','-')}>{String(children||'—').replaceAll('_',' ')}</span>}

function useWorkspace({viewer,previewRole,previewModule,refreshKey=0}){
  const[data,setData]=useState(null);
  const[error,setError]=useState('');
  const[loading,setLoading]=useState(true);
  useEffect(()=>{
    let live=true;
    (async()=>{
      setLoading(true);setError('');
      try{
        const result=previewRole
          ?await rpc(viewer?.session,'canopy_admin_preview_staff_workspace',{p_role:previewRole,p_module_id:previewModule||null})
          :await rpc(viewer?.session,'canopy_staff_workspace_data',{});
        if(live)setData(result||{});
      }catch(e){if(live)setError('This workspace could not be loaded. Refresh the page or contact WOMATE if the problem continues.')}
      finally{if(live)setLoading(false)}
    })();
    return()=>{live=false};
  },[viewer?.session?.access_token,previewRole,previewModule,refreshKey]);
  return{data,error,loading};
}

function PreviewChooser(){
  const[moduleId,setModuleId]=useState('module-01');
  const open=(role)=>{
    const q=new URLSearchParams({role});
    if(['module_coordinator','learning_fellow'].includes(role))q.set('module',moduleId);
    nav(`/canopy/manage/role-preview?${q}`);
  };
  return <main className="cstaffChooser">
    <div className="cstaffPageHead"><span>ADMIN PREVIEW MODE</span><h1>Preview the complete team workspace.</h1><p>Choose a role to inspect the navigation, pages and permissions that person receives. Preview never consumes a Team Access Code and never changes your Admin account.</p></div>
    <label>Module for Coordinator / Fellow preview
      <select value={moduleId} onChange={e=>setModuleId(e.target.value)}>
        {[1,2,3,4,5].map(n=><option key={n} value={`module-0${n}`}>Module {n}</option>)}
      </select>
    </label>
    <section className="cstaffRoleCards">
      {Object.entries(ROLE_LABELS).map(([role,label])=><button key={role} onClick={()=>open(role)}>
        <small>{role.replaceAll('_',' ')}</small><h2>{label}</h2><p>{role==='programme_manager'?'Full programme oversight and final decisions.':role==='programme_operations'?'Programme-wide delivery, follow-up and coordination.':role==='module_coordinator'?'Module-bound learning experience coordination.':'Module-bound learner support and follow-up.'}</p><span>Open workspace <ChevronRight/></span>
      </button>)}
    </section>
  </main>
}

function Overview({role,moduleId,data}){
  const c=data?.counts||{};
  return <div>
    <section className="cstaffStats">
      <Stat value={c.learners} label="learners"/><Stat value={c.active_access} label="active access"/>
      <Stat value={c.submissions} label="submissions"/><Stat value={c.needs_attention} label="needs attention"/>
      <Stat value={c.revision_required} label="revision required"/><Stat value={c.completed} label="completed"/>
    </section>
    <section className="cstaffPanel cstaffMission"><Sparkles/><div><small>DELIVERY MANDATE</small><h2>{role==='programme_manager'?'Keep the full She Leads learning operation moving with quality and accountability.':role==='programme_operations'?'Keep programme delivery organised, responsive and visible across the cohort.':role==='module_coordinator'?'Make the assigned module feel guided, active and human for every learner.':'Make sure learners do not disappear into an online course.'}</h2><p>{moduleId?`${moduleLabel(moduleId)} scope. `:''}Your navigation reflects only the functions authorised for this role.</p></div></section>
    <RecentSubmissions items={data?.recent_submissions||data?.submissions||[]} compact/>
  </div>
}
function Learners({data,moduleId,title='Learners'}){
  const learners=data?.learners||[];
  return <section className="cstaffPanel"><header><div><small>{moduleId?moduleLabel(moduleId):'PROGRAMME'}</small><h2>{title}</h2></div><span>{learners.length} visible</span></header>
    {learners.length?<div className="cstaffTable">
      <div className="head"><b>Learner</b><b>Country</b><b>Access</b><b>Activity</b></div>
      {learners.map((l,i)=><div key={l.user_id||l.id||i}><span><b>{l.full_name||l.learner_name||'Learner'}</b><small>{l.email||''}</small></span><span>{l.country||'—'}</span><Status>{l.enrollment_status||l.status||'visible'}</Status><span>{l.submission_count??l.activity_count??'—'}</span></div>)}
    </div>:<Empty>No learners are currently visible in this scope.</Empty>}
  </section>
}
function RecentSubmissions({items=[],attentionOnly=false,compact=false}){
  const rows=(items||[]).filter(x=>!attentionOnly||['needs_manual_review','revision_required'].includes(x.assessment_status));
  return <section className={'cstaffPanel '+(compact?'compact':'')}><header><div><small>{attentionOnly?'FOLLOW-UP':'LEARNING WORK'}</small><h2>{attentionOnly?'Attention queue':'Recent submissions'}</h2></div><span>{rows.length}</span></header>
    {rows.length?<div className="cstaffCards">{rows.map((s,i)=><article key={s.id||i}><div><small>{s.module_label||moduleLabel(s.week_key||s.module_id)} · {s.learner_name||'Learner'}</small><h3>{s.score!=null?`${s.score}/100 · ${s.score_band||''}`:'Submission received'}</h3><p>{s.paragraph_excerpt||s.response||'Learner submission is available for review.'}</p></div><Status>{s.assessment_status||s.status||'submitted'}</Status></article>)}</div>:<Empty/>}
  </section>
}
function Communications({data,role}){
  const rows=data?.communications||[];
  return <section className="cstaffPanel"><header><div><small>LEARNER CONTACT</small><h2>{role==='programme_manager'?'Communications':'Communications visibility'}</h2></div></header>
    <p className="cstaffNote">{role==='programme_manager'?'Formal warnings, feedback and reminders remain manager-authorised actions.':'This role can see the communication context needed for learner support. Formal warnings and final decisions remain with the Programme Manager.'}</p>
    {rows.length?<div className="cstaffCards">{rows.map((a,i)=><article key={a.id||i}><div><small>{String(a.action_type||'message').toUpperCase()} · {a.learner_name||'Learner'}</small><h3>{a.subject||'Programme communication'}</h3><p>{a.message||'—'}</p></div><Status>{a.status}</Status></article>)}</div>:<Empty>No communication records are visible in this scope yet.</Empty>}
  </section>
}
function Complaints({data}){
  const rows=data?.complaints||[];
  return <section className="cstaffPanel"><header><div><small>LEARNER CARE</small><h2>Complaints</h2></div><span>{rows.length}</span></header>
    {rows.length?<div className="cstaffCards">{rows.map((a,i)=><article key={a.id||i}><div><small>{a.learner_name||'Learner'}</small><h3>{a.subject||'Learner complaint'}</h3><p>{a.message||'—'}</p></div><Status>{a.status}</Status></article>)}</div>:<Empty>No complaints are visible in this scope.</Empty>}
  </section>
}
function Reports({data,moduleId}){
  const c=data?.counts||{};
  return <div><section className="cstaffStats"><Stat value={c.submissions} label="submissions"/><Stat value={c.completed} label="completed"/><Stat value={c.needs_attention} label="needs attention"/><Stat value={c.revision_required} label="revisions"/></section>
    <section className="cstaffPanel"><header><div><small>{moduleId?moduleLabel(moduleId):'COHORT 2'}</small><h2>Delivery report</h2></div></header><p className="cstaffNote">This view gives the role a quick operational picture without exposing functions outside its authority.</p></section></div>
}
function Spotlight({viewer,data,preview,role,onRefresh}){
  const[note,setNote]=useState('');
  const[busy,setBusy]=useState('');
  const[msg,setMsg]=useState('');
  const subs=data?.recent_submissions||data?.submissions||[];
  const spots=data?.spotlights||[];
  async function nominate(id){
    if(preview)return;
    setBusy(id);setMsg('');
    try{await rpc(viewer.session,'canopy_nominate_spotlight',{p_submission_id:id,p_category:'emerging_leadership',p_note:note||null});setNote('');setMsg('Spotlight nomination saved.');await onRefresh?.()}
    catch(e){setMsg(e.message)}finally{setBusy('')}
  }
  async function shortlist(id){
    if(preview)return;
    setBusy(id);setMsg('');
    try{await rpc(viewer.session,'canopy_update_spotlight_status',{p_nomination_id:id,p_status:'shortlisted'});setMsg('Nomination shortlisted.');await onRefresh?.()}
    catch(e){setMsg(e.message)}finally{setBusy('')}
  }
  return <div><section className="cstaffPanel"><header><div><small>CANOPY SPOTLIGHT</small><h2>Recognise strong learner work.</h2></div></header><p className="cstaffNote">Coordinator and Fellow roles can nominate work from their module. The Operations Deputy may shortlist. Final feature decisions remain with the Programme Manager/WOMATE.</p>{preview&&<p className="cstaffPreviewLock">Preview is read-only. Buttons are intentionally disabled.</p>}{msg&&<p className="cstaffMsg">{msg}</p>}
    <label className="cstaffNomNote">Optional nomination note<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength="600" placeholder="Why should WOMATE notice this work?"/></label>
    <div className="cstaffCards">{subs.slice(0,12).map((s,i)=><article key={s.id||i}><div><small>{s.module_label||moduleLabel(s.week_key)} · {s.learner_name||'Learner'}</small><h3>{s.score!=null?`${s.score}/100 · ${s.score_band||''}`:'Learner submission'}</h3><p>{s.paragraph_excerpt||'Review the submission and nominate exceptional work.'}</p></div><button className="cstaffAction" disabled={preview||busy===s.id||!s.id} onClick={()=>nominate(s.id)}>{busy===s.id?'Saving…':'Nominate'}</button></article>)}</div>
  </section>
  <section className="cstaffPanel"><header><div><small>NOMINATIONS</small><h2>Current Spotlight queue</h2></div><span>{spots.length}</span></header>{spots.length?<div className="cstaffCards">{spots.map((s,i)=><article key={s.id||i}><div><small>{moduleLabel(s.module_id)} · {s.learner_name||'Learner'}</small><h3>{String(s.category||'Spotlight').replaceAll('_',' ')}</h3><p>{s.note||'No nomination note.'}</p></div><div className="cstaffStack"><Status>{s.status}</Status>{role==='programme_operations'&&s.status==='nominated'&&<button className="cstaffAction subtle" disabled={preview||busy===s.id} onClick={()=>shortlist(s.id)}>Shortlist</button>}{role==='programme_manager'&&!preview&&<><button className="cstaffAction subtle" disabled={busy===s.id} onClick={async()=>{setBusy(s.id);try{await rpc(viewer.session,'canopy_update_spotlight_status',{p_nomination_id:s.id,p_status:'featured'});setMsg('Spotlight updated.');onRefresh?.()}catch(e){setMsg(e.message)}finally{setBusy('')}}}>Feature</button><button className="cstaffAction subtle" disabled={busy===s.id} onClick={async()=>{setBusy(s.id);try{await rpc(viewer.session,'canopy_update_spotlight_status',{p_nomination_id:s.id,p_status:'declined'});setMsg('Nomination closed.');onRefresh?.()}catch(e){setMsg(e.message)}finally{setBusy('')}}}>Close</button></>}</div></article>)}</div>:<Empty/>}</section></div>
}

function ActionNotice({text}){return text?<p className="cstaffMsg">{text}</p>:null}
function StaffForm({children}){return <div className="cstaffFunctionalForm">{children}</div>}
function ReviewAssignments({viewer,data,preview,onRefresh}){
 const rows=data?.recent_submissions||[];const[open,setOpen]=useState('');const[score,setScore]=useState('');const[feedback,setFeedback]=useState('');const[decision,setDecision]=useState('completed');const[busy,setBusy]=useState(false);const[msg,setMsg]=useState('');
 async function save(id){const n=Number(score);if(!Number.isFinite(n)||n<0||n>100){setMsg('Enter a score from 0 to 100.');return}setBusy(true);setMsg('');try{await rpc(viewer.session,'canopy_manager_review_assignment',{p_submission_id:id,p_score:n,p_feedback:feedback||'',p_decision:decision});setOpen('');setMsg('Review saved and learner notified.');onRefresh?.()}catch(e){setMsg(e.message)}finally{setBusy(false)}}
 return <section className="cstaffPanel"><header><div><small>ASSIGNMENTS</small><h2>Assignment reviews</h2></div><span>{rows.length}</span></header><ActionNotice text={msg}/>{rows.length?<div className="cstaffCards">{rows.map(s=><article key={s.id}><div><small>{s.module_label||moduleLabel(s.week_key)} · {s.learner_name||'Learner'}</small><h3>{s.score!=null?`${s.score}/100 · ${s.score_band||''}`:'Submission received'}</h3><p className="cstaffLongText">{s.paragraph_response||s.paragraph_excerpt||'Submission received.'}</p><div className="cstaffEvidence">{s.canvas_link&&<a href={s.canvas_link} target="_blank" rel="noreferrer">CanopyCanvas</a>}{s.linkedin_link&&<a href={s.linkedin_link} target="_blank" rel="noreferrer">LinkedIn evidence</a>}</div>{open===s.id&&<StaffForm><label>Score<input type="number" min="0" max="100" value={score} onChange={e=>setScore(e.target.value)}/></label><label>Decision<select value={decision} onChange={e=>setDecision(e.target.value)}><option value="completed">Completed</option><option value="revision_required">Revision required</option><option value="needs_manual_review">Keep under review</option></select></label><label className="wide">Feedback<textarea rows="4" value={feedback} onChange={e=>setFeedback(e.target.value)}/></label><button className="cstaffAction" disabled={busy} onClick={()=>save(s.id)}>{busy?'Saving…':'Save review'}</button></StaffForm>}</div><div className="cstaffStack"><Status>{s.assessment_status||'submitted'}</Status>{preview?<span className="cstaffReadOnly">Preview only</span>:open===s.id?<button className="cstaffAction subtle" onClick={()=>setOpen('')}>Cancel</button>:<button className="cstaffAction" onClick={()=>{setOpen(s.id);setScore(String(s.score??''));setFeedback(s.final_feedback||'');setDecision(s.assessment_status==='revision_required'?'revision_required':'completed')}}>Review</button>}</div></article>)}</div>:<Empty/>}</section>
}
function StaffCommunications({viewer,data,role,preview,onRefresh}){
 const learners=data?.learners||[],rows=data?.communications||[];const types=role==='programme_manager'?['warning','feedback','reminder']:['feedback','reminder'];const[form,setForm]=useState({learner_id:'',type:types[0],subject:'',message:''});const[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 async function send(e){e.preventDefault();if(preview)return;setBusy(true);setMsg('');try{await rpc(viewer.session,'canopy_staff_send_communication',{p_learner_id:form.learner_id,p_type:form.type,p_subject:form.subject,p_message:form.message});setForm({learner_id:'',type:types[0],subject:'',message:''});setMsg('Message sent.');onRefresh?.()}catch(e){setMsg(e.message)}finally{setBusy(false)}}
 return <><section className="cstaffPanel"><header><div><small>LEARNER CONTACT</small><h2>Send a message</h2></div></header><ActionNotice text={msg}/><form onSubmit={send}><StaffForm><label>Learner<select disabled={preview} required value={form.learner_id} onChange={e=>setForm({...form,learner_id:e.target.value})}><option value="">Select learner</option>{learners.map(l=><option key={l.user_id} value={l.user_id}>{l.full_name||'Learner'}</option>)}</select></label><label>Type<select disabled={preview} value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>{types.map(t=><option key={t}>{t}</option>)}</select></label><label className="wide">Subject<input disabled={preview} required value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/></label><label className="wide">Message<textarea disabled={preview} required rows="4" value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/></label><button className="cstaffAction" disabled={preview||busy}>{busy?'Sending…':preview?'Preview only':'Send message'}</button></StaffForm></form></section><section className="cstaffPanel"><header><div><small>RECENT</small><h2>Communications</h2></div><span>{rows.length}</span></header>{rows.length?<div className="cstaffCards">{rows.map(a=><article key={a.id}><div><small>{String(a.action_type||'message').toUpperCase()} · {a.learner_name||'Learner'}</small><h3>{a.subject}</h3><p>{a.message}</p></div><Status>{a.status}</Status></article>)}</div>:<Empty/>}</section></>
}
function StaffComplaints({viewer,data,preview,onRefresh}){
 const rows=data?.complaints||[];const[reply,setReply]=useState({});const[busy,setBusy]=useState('');const[msg,setMsg]=useState('');async function resolve(id){const text=(reply[id]||'').trim();if(!text){setMsg('Add a response before resolving.');return}setBusy(id);setMsg('');try{await rpc(viewer.session,'canopy_staff_resolve_complaint',{p_complaint_id:id,p_response:text,p_status:'resolved'});setMsg('Response saved and learner notified.');onRefresh?.()}catch(e){setMsg(e.message)}finally{setBusy('')}}
 return <section className="cstaffPanel"><header><div><small>LEARNER CARE</small><h2>Complaints</h2></div><span>{rows.length}</span></header><ActionNotice text={msg}/>{rows.length?<div className="cstaffCards">{rows.map(a=><article key={a.id}><div><small>{a.learner_name||'Learner'}</small><h3>{a.subject}</h3><p>{a.message}</p>{a.response_message&&<p className="cstaffResponse"><b>WOMATE response:</b> {a.response_message}</p>}{a.status==='open'&&<textarea className="cstaffReply" disabled={preview} rows="3" value={reply[a.id]||''} onChange={e=>setReply({...reply,[a.id]:e.target.value})} placeholder="Response to learner"/>}</div><div className="cstaffStack"><Status>{a.status}</Status>{a.status==='open'&&<button className="cstaffAction" disabled={preview||busy===a.id} onClick={()=>resolve(a.id)}>{busy===a.id?'Saving…':preview?'Preview only':'Respond & resolve'}</button>}</div></article>)}</div>:<Empty/>}</section>
}
function StaffCertificates({viewer,data,preview,onRefresh}){
 const learners=data?.learners||[],rows=data?.certificates||[];const[learner,setLearner]=useState(''),[url,setUrl]=useState(''),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');async function issue(e){e.preventDefault();if(preview)return;setBusy(true);setMsg('');try{await rpc(viewer.session,'canopy_manager_issue_certificate',{p_user_id:learner,p_drive_url:url});setLearner('');setUrl('');setMsg('Certificate issued and learner notified.');onRefresh?.()}catch(e){setMsg(e.message)}finally{setBusy(false)}}
 return <><section className="cstaffPanel"><header><div><small>COMPLETION</small><h2>Issue certificate</h2></div></header><ActionNotice text={msg}/><form onSubmit={issue}><StaffForm><label>Learner<select disabled={preview} required value={learner} onChange={e=>setLearner(e.target.value)}><option value="">Select learner</option>{learners.map(l=><option key={l.user_id} value={l.user_id}>{l.full_name||'Learner'}</option>)}</select></label><label className="wide">Viewable Google Drive link<input disabled={preview} required type="url" value={url} onChange={e=>setUrl(e.target.value)}/></label><button className="cstaffAction" disabled={preview||busy}>{busy?'Issuing…':preview?'Preview only':'Issue certificate'}</button></StaffForm></form></section><section className="cstaffPanel"><header><div><small>ISSUED</small><h2>Certificate records</h2></div><span>{rows.length}</span></header>{rows.length?<div className="cstaffCards">{rows.map(c=><article key={c.id}><div><small>{c.learner_name||'Learner'}</small><h3>{c.title||'She Leads certificate'}</h3><p>{c.issued_at?new Date(c.issued_at).toLocaleDateString():''}</p></div>{c.drive_url&&<a className="cstaffAction subtle" href={c.drive_url} target="_blank" rel="noreferrer">Open</a>}</article>)}</div>:<Empty/>}</section></>
}
function TeamDirectory({data}){const rows=data?.team_members||[];return <section className="cstaffPanel"><header><div><small>DELIVERY TEAM</small><h2>Team operations</h2></div><span>{rows.length}</span></header>{rows.length?<div className="cstaffTable team"><div className="head"><b>Team member</b><b>Role</b><b>Module</b><b>Status</b></div>{rows.map(m=><div key={m.user_id}><span><b>{m.full_name||'Team member'}</b></span><span>{ROLE_LABELS[m.role]||m.role}</span><span>{m.module_id?moduleLabel(m.module_id):'Programme-wide'}</span><Status>{m.status}</Status></div>)}</div>:<Empty/>}</section>}
function ManagedLearners({viewer,data,role,preview,onRefresh}){const learners=data?.learners||[];const[busy,setBusy]=useState(''),[msg,setMsg]=useState('');async function change(l){setBusy(l.user_id);setMsg('');try{await rpc(viewer.session,'canopy_programme_manager_set_learner_access',{p_user_id:l.user_id,p_status:l.enrollment_status==='active'?'paused':'active'});setMsg('Learner access updated.');onRefresh?.()}catch(e){setMsg(e.message)}finally{setBusy('')}}return <section className="cstaffPanel"><header><div><small>PROGRAMME</small><h2>{role==='programme_manager'?'Learners':'Learner operations'}</h2></div><span>{learners.length}</span></header><ActionNotice text={msg}/>{learners.length?<div className="cstaffTable"><div className="head"><b>Learner</b><b>Country</b><b>Access</b><b>Submissions</b></div>{learners.map(l=><div key={l.user_id}><span><b>{l.full_name||'Learner'}</b></span><span>{l.country||'—'}</span><span><Status>{l.enrollment_status||'waiting'}</Status>{role==='programme_manager'&&!preview&&<button className="cstaffTiny" disabled={busy===l.user_id} onClick={()=>change(l)}>{l.enrollment_status==='active'?'Pause':'Activate'}</button>}</span><span>{l.submission_count??0}</span></div>)}</div>:<Empty/>}</section>}

function CapabilityPage({role,keyName,moduleId}){
  const map={
    certificates:['CERTIFICATES','Certificate oversight','Only authorised Programme Manager/WOMATE controls can issue final completion records.'],
    team:['TEAM OPERATIONS','Team operations','Team Access Codes, staff activation and membership controls remain Admin-only. This page is visible in the Manager preview so you can see the boundary clearly.'],
    activity:['ACTIVITY','Module activity',`Operational activity for ${moduleLabel(moduleId)} stays within this role's module boundary.`],
    support:['LEARNER SUPPORT','Learner support','Use submissions, attention signals and programme communication context to make sure learners stay engaged.'],
    followups:['FOLLOW-UPS','Follow-ups','Prioritise learners whose work needs attention or revision and coordinate support within the assigned module.']
  };
  const [k,h,p]=map[keyName]||['WORKSPACE','Role function','This function is available according to the role boundary.'];
  return <section className="cstaffPanel"><header><div><small>{k}</small><h2>{h}</h2></div></header><p className="cstaffNote">{p}</p></section>
}

export default function CanopyStaffWorkspace({viewer,path,onSignOut}){
  const[locationKey,setLocationKey]=useState(()=>window.location.pathname+window.location.search);
  useEffect(()=>{
    const sync=()=>setLocationKey(window.location.pathname+window.location.search);
    window.addEventListener('popstate',sync);
    return()=>window.removeEventListener('popstate',sync);
  },[]);
  const livePath=window.location.pathname.replace(/\/$/,'')||'/canopy';
  const params=useMemo(()=>new URLSearchParams(window.location.search),[locationKey]);
  const isPreview=livePath==='/canopy/manage/role-preview'||livePath.startsWith('/canopy/manage/role-preview/');
  const previewRole=isPreview?params.get('role'):null;
  const previewModule=isPreview?params.get('module'):null;
  if(isPreview&&!previewRole)return <PreviewChooser/>;

  const{data,error,loading}=useWorkspace({viewer,previewRole,previewModule,refreshKey});
  const role=previewRole||data?.role||null;
  const moduleId=previewModule||data?.module_id||null;
  const [open,setOpen]=useState(false);
  const [refreshKey,setRefreshKey]=useState(0);
  const root=isPreview?'/canopy/manage/role-preview':(ROLE_ROOTS[role]||'/canopy/classroom');
  const requested=isPreview?(params.get('view')||'overview'):(livePath.split('/').filter(Boolean).pop()||'overview');
  const valid=new Set((NAV[role]||[]).map(x=>x[0]));
  const view=valid.has(requested)?requested:'overview';

  const goView=(v)=>{
    if(isPreview){
      const q=new URLSearchParams({role,view:v});
      if(moduleId)q.set('module',moduleId);
      nav(`/canopy/manage/role-preview?${q}`);
    }else{
      const base=ROLE_ROOTS[role]||'/canopy/classroom';
      nav(v==='overview'?base:`${base}/${v}`);
    }
    setOpen(false);
  };
  const refresh=()=>setRefreshKey(v=>v+1);

  if(loading)return <div className="cstaffLoading"><BookOpen/><span>Opening team workspace…</span></div>;
  if(error)return <main className="cstaffError"><ShieldAlert/><h1>Team workspace could not open.</h1><p>{error}</p>{isPreview&&<button onClick={()=>nav('/canopy/manage/role-preview')}>Back to role preview</button>}</main>;
  if(!role||!NAV[role])return <main className="cstaffError"><ShieldAlert/><h1>No active team workspace found.</h1><p>This account does not have an active Canopy staff membership.</p></main>;

  let content;
  if(view==='overview')content=<Overview role={role} moduleId={moduleId} data={data}/>;
  else if(view==='learners')content=<ManagedLearners viewer={viewer} data={data} role={role} preview={isPreview} onRefresh={refresh}/>;
  else if(view==='reviews')content=<ReviewAssignments viewer={viewer} data={data} preview={isPreview} onRefresh={refresh}/>;
  else if(view==='submissions')content=<RecentSubmissions items={data?.recent_submissions||[]}/>;
  else if(['attention','followups'].includes(view))content=<RecentSubmissions items={data?.recent_submissions||[]} attentionOnly/>;
  else if(view==='communications')content=<StaffCommunications viewer={viewer} data={data} role={role} preview={isPreview} onRefresh={refresh}/>;
  else if(view==='complaints')content=<StaffComplaints viewer={viewer} data={data} preview={isPreview} onRefresh={refresh}/>;
  else if(view==='certificates')content=<StaffCertificates viewer={viewer} data={data} preview={isPreview} onRefresh={refresh}/>;
  else if(view==='reports'||view==='activity')content=<Reports data={data} moduleId={moduleId}/>;
  else if(view==='spotlight')content=<Spotlight viewer={viewer} data={data} preview={isPreview} role={role} onRefresh={refresh}/>;
  else if(view==='team')content=<TeamDirectory data={data}/>;
  else if(view==='support')content=<><ManagedLearners viewer={viewer} data={data} role={role} preview={true}/><RecentSubmissions items={data?.recent_submissions||[]} attentionOnly/></>;
  else content=<CapabilityPage role={role} keyName={view} moduleId={moduleId}/>;

  return <div className="cstaffApp">
    {isPreview&&<div className="cstaffPreviewBanner"><strong>ADMIN PREVIEW MODE</strong><span>Viewing {ROLE_LABELS[role]}{moduleId?` · ${moduleLabel(moduleId)}`:''}. No  and preview actions are read-only.</span><button onClick={()=>nav('/canopy/manage/role-preview')}>Change role</button><button onClick={()=>nav('/canopy/manage')}>Exit preview</button></div>}
    <aside className={'cstaffSidebar '+(open?'open':'')}>
      <div className="cstaffBrand"><img src="/assets/canopy/canopy-logo-primary.png" alt="Canopy"/><button onClick={()=>setOpen(false)}><X/></button></div>
      <div className="cstaffRole"><small>WOMATE TEAM</small><b>{ROLE_LABELS[role]}</b><span>{moduleId?moduleLabel(moduleId):'Programme-wide'}</span></div>
      <nav>{NAV[role].map(([k,label,Icon])=><button key={k} className={view===k?'active':''} onClick={()=>goView(k)}><Icon/><span>{label}</span></button>)}</nav>
      <div className="cstaffSideFoot"><small>She Leads Climate Mentorship</small><b>Cohort 2 · 2026</b></div>
    </aside>
    <div className="cstaffMain">
      <header className="cstaffTop"><button className="cstaffMenu" onClick={()=>setOpen(true)}><Menu/></button><div><small>{moduleId?moduleLabel(moduleId):'CANOPY DELIVERY TEAM'}</small><b>{nameFrom(viewer)}</b></div>{!isPreview&&<button className="cstaffSignout" onClick={onSignOut}><LogOut/><span>Sign out</span></button>}</header>
      <main className="cstaffContent"><div className="cstaffPageHead"><span>{ROLE_LABELS[role]}</span><h1>{(NAV[role].find(x=>x[0]===view)||[])[1]||'Workspace'}</h1><p>{isPreview?'This is the same role navigation staff will use after activation.':'Your workspace is limited to the responsibilities and data authorised for your role.'}</p></div>{content}</main>
    </div>
  </div>;
}
