import React,{useEffect,useState}from'react';
import{Helmet}from'react-helmet-async';
import{ArrowLeft,ArrowUpRight,BadgeCheck,Copy,Handshake,Search,ShieldCheck,Sparkles}from'lucide-react';
import{getPublicTalentDirectory,getPublicTalentFilterOptions,getPublicTalentProfile,getPublicCollaborationThread,publicTalentPhotoUrl,sendPublicCollaborationMessage,submitPublicCollaborationRequest,submitPublicCollaborationSafetyReport,submitPublicOrganisationReview,verifyPublicRequesterEmail,getPublicRequesterVerificationStatus,getPublicFacilitationTerms,decidePublicFacilitationTerms}from'./publicTalentApi';
import'./publicTalentDiscovery.css';

const clean=v=>String(v||'').trim();
const interests=x=>Array.isArray(x)?x:[];
const accessKey=id=>`womate_public_talent_chat:${id}`;
const privateChatUrl=(id,token)=>`${window.location.origin}/talent/chat/${id}#${token}`;
const BADGE_BANNERS={
 ruby:'/assets/talent/badges/womate-verified-ruby.webp',
 emerald:'/assets/talent/badges/womate-verified-emerald.webp',
 diamond:'/assets/talent/badges/womate-verified-diamond.webp',
 gold:'/assets/talent/badges/womate-verified-gold.webp',
 silver:'/assets/talent/badges/womate-verified-silver.webp'
};
const badgeKey=x=>BADGE_BANNERS[String(x||'').toLowerCase()]?String(x).toLowerCase():'';
const badgeBanner=x=>BADGE_BANNERS[badgeKey(x)]||'';
const badgeTitle=x=>{const k=badgeKey(x);return k?k[0].toUpperCase()+k.slice(1):''};
function VerifiedBanner({badge,name='',profile=false}){
 const src=badgeBanner(badge);
 if(!src)return <div className={profile?'pt-profileBanner pt-profileBanner--neutral':'pt-networkBanner pt-networkBanner--neutral'} aria-hidden="true"><span>WOMATE · TALENT DISCOVERY</span></div>;
 return <div className={profile?'pt-profileBanner':'pt-networkBanner'}><img src={src} alt={name?badgeTitle(badge)+' WOMATE Verified banner for '+name:badgeTitle(badge)+' WOMATE Verified banner'} loading={profile?'eager':'lazy'}/></div>;
}

const PUB_BASE=(import.meta.env.VITE_CANOPY_SUPABASE_URL||'').replace(/\/$/,'');
const PUB_KEY=import.meta.env.VITE_CANOPY_SUPABASE_ANON_KEY||'';
const normName=v=>clean(v).toLowerCase().replace(/\s+/g,' ');
async function getAuthorPublications(name){
 if(!PUB_BASE||!name)return[];
 try{
  const r=await fetch(PUB_BASE+'/functions/v1/womate-publications',{method:'POST',headers:{'Content-Type':'application/json',...(PUB_KEY?{apikey:PUB_KEY}:{})},body:JSON.stringify({action:'list'})});
  if(!r.ok)return[];
  const data=await r.json();
  return (data.items||[]).filter(p=>normName(p.name)===normName(name));
 }catch{return[]}
}
function Badges({x}){return <div className="pt-badges" aria-label="WOMATE verified achievements">{x.mission_completed&&<span className="strong"><ShieldCheck size={14} aria-hidden="true"/>Mission completed · Verified</span>}{x.all_modules_completed&&<span><BadgeCheck size={14} aria-hidden="true"/>All modules completed</span>}{x.final_team_completed&&<span>Final Mission team</span>}{Number(x.spotlight_count)>0&&<span><Sparkles size={14} aria-hidden="true"/>Canopy Spotlight</span>}</div>}
function TalentCard({x}){
 const topics=interests(x.climate_interests).map(t=>clean(t)).filter(Boolean);
 const shown=topics.slice(0,2),extra=topics.length-shown.length;
 const badge=badgeKey(x.badge),badgeName=badgeTitle(badge);
 return <article className={'pt-card pt-card--network'+(badge?' has-badge badge-'+badge:'')}>
  <a className="pt-networkBannerLink" href={`/talent/${x.slug}`} aria-label={`View ${x.full_name}'s WOMATE profile`}><VerifiedBanner badge={badge} name={x.full_name}/></a>
  <div className="pt-networkAvatarWrap"><a href={`/talent/${x.slug}`} className="pt-networkAvatar" aria-label={`${x.full_name} profile`}><img src={publicTalentPhotoUrl(x.avatar_path)} alt={`${x.full_name} profile`} loading="lazy"/></a></div>
  <div className="pt-cardBody pt-networkBody">
   <div className="pt-networkIdentity">
    {badge?<span className="pt-verifiedTier">WOMATE VERIFIED · {badgeName.toUpperCase()}</span>:<span className="pt-verifiedTier neutral">WOMATE TALENT</span>}
    <h3><a href={`/talent/${x.slug}`}>{x.full_name}</a>{badge&&<BadgeCheck size={17} aria-label="WOMATE verified"/>}</h3>
    <p className="pt-country">{x.country||'Africa'}</p>
   </div>
   <p className="pt-headline">{x.headline||'Climate leadership professional'}</p>
   <div className="pt-networkSignals">
    {x.mission_completed&&<span><ShieldCheck size={13}/>Verified mission</span>}
    {Number(x.spotlight_count)>0&&<span><Sparkles size={13}/>Canopy Spotlight</span>}
    {x.collaboration_open&&<span className="open">Open to collaborate</span>}
   </div>
   {topics.length>0&&<div className="pt-tags" aria-label="Climate interests">{shown.map((topic,i)=><span key={topic+i} title={topic}>{topic}</span>)}{extra>0&&<span className="pt-extra" title={topics.slice(2).join(', ')}>+{extra}</span>}</div>}
  </div>
  <div className="pt-cardFoot pt-networkFoot"><a className="pt-link" href={`/talent/${x.slug}`} aria-label={`View ${x.full_name}'s professional profile`}>View profile <ArrowUpRight size={17} aria-hidden="true"/></a></div>
 </article>
}
function SEO({profile,publications=[],chat=false}){
 if(chat)return <Helmet><title>Private collaboration | WOMATE</title><meta name="robots" content="noindex,nofollow,noarchive"/><meta name="referrer" content="no-referrer"/></Helmet>;
 const directory=!profile;
 const title=directory?'African Women Climate Leaders & Talent Directory | WOMATE':`${profile.full_name} | ${clean(profile.headline)||'Climate Leader'} | WOMATE`;
 const description=directory?'Discover African women climate leaders, researchers and professionals through the WOMATE talent network.':`${profile.full_name} · ${profile.country||'Africa'} · ${profile.headline||'Climate leadership professional'}`.slice(0,158);
 const url=directory?'https://www.womate.org/talent-discovery':`https://www.womate.org/talent/${profile.slug}`;
 const awards=profile?[profile.badge?badgeTitle(profile.badge)+' WOMATE Verified badge':'',profile.mission_completed?'Verified climate mission completed':'',profile.all_modules_completed?'All She Leads learning modules completed':'',profile.final_team_completed?'Final Mission team':'',Number(profile.spotlight_count)>0?'WOMATE Canopy Spotlight':''].filter(Boolean):[];
 const schema=profile?{'@context':'https://schema.org','@type':'ProfilePage',url,name:`${profile.full_name} | WOMATE Talent Discovery`,mainEntity:{'@type':'Person',name:profile.full_name,homeLocation:profile.country?{'@type':'Place',name:profile.country}:undefined,description:profile.headline||undefined,url,image:publicTalentPhotoUrl(profile.avatar_path)||undefined,knowsAbout:interests(profile.climate_interests),award:awards.length?awards:undefined,subjectOf:publications.map(p=>({'@type':'Article',headline:p.title,url:`https://www.womate.org/publications/${p.id}`}))}}:{'@context':'https://schema.org','@type':'CollectionPage',name:'WOMATE Talent Discovery',url,description};
 return <Helmet><title>{title}</title><meta name="description" content={description}/><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"/><link rel="canonical" href={url}/><meta property="og:title" content={title}/><meta property="og:description" content={description}/><meta property="og:url" content={url}/><meta property="og:type" content={profile?'profile':'website'}/>{profile?.avatar_path&&<meta property="og:image" content={publicTalentPhotoUrl(profile.avatar_path)}/>}<meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content={title}/><meta name="twitter:description" content={description}/><script type="application/ld+json">{JSON.stringify(schema)}</script></Helmet>
}
export default function PublicTalentDiscovery(){
 const path=window.location.pathname.replace(/\/$/,'')||'/';
 const chatMatch=path.match(/^\/talent\/chat\/([0-9a-f-]{36})$/i);
 if(chatMatch)return <ChatRoute id={chatMatch[1]}/>;
 const slug=path.startsWith('/talent/')?decodeURIComponent(path.slice('/talent/'.length)):null;
 return slug?<Profile slug={slug}/>:<Directory/>;
}
function Directory(){
 const initialAfter=new URLSearchParams(window.location.search).get('after');
 const[items,setItems]=useState([]),[query,setQuery]=useState(''),[country,setCountry]=useState(''),[achievement,setAchievement]=useState(''),[missionGroupId,setMissionGroupId]=useState(''),[stageFilter,setStageFilter]=useState('all'),[collabOnly,setCollabOnly]=useState(false),[filterOptions,setFilterOptions]=useState({countries:[],missions:[]}),[cursor,setCursor]=useState(initialAfter),[hasMore,setHasMore]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const fetchPage=async({reset=false}={})=>{setLoading(true);setError('');try{const r=await getPublicTalentDirectory({query,country,achievement,missionGroupId,collaborationOpen:collabOnly?true:null,after:reset?null:cursor,limit:24});const next=Array.isArray(r?.items)?r.items:[];setItems(v=>reset?next:[...v,...next]);setCursor(r?.next_cursor||null);setHasMore(Boolean(r?.has_more))}catch(e){setError(e.message)}finally{setLoading(false)}};
 useEffect(()=>{let active=true;getPublicTalentFilterOptions().then(r=>{if(active)setFilterOptions(r||{countries:[],missions:[]})}).catch(()=>{});return()=>{active=false}},[]);
 useEffect(()=>{let active=true;const timer=setTimeout(()=>{setLoading(true);getPublicTalentDirectory({query,country,achievement,missionGroupId,collaborationOpen:collabOnly?true:null,after:null,limit:24}).then(r=>{if(!active)return;setItems(Array.isArray(r?.items)?r.items:[]);setCursor(r?.next_cursor||null);setHasMore(Boolean(r?.has_more));setError('')}).catch(e=>active&&setError(e.message)).finally(()=>active&&setLoading(false))},300);return()=>{active=false;clearTimeout(timer)}},[query,country,achievement,missionGroupId,collabOnly]);
 const nextHref=cursor?`/talent-discovery?after=${encodeURIComponent(cursor)}`:'/talent-discovery';
 return <main className="pt-page"><SEO/><section className="pt-hero pt-heroClean"><div className="pt-heroCopy"><h1>WOMATE TALENT DISCOVERY</h1><p>Meet WOMATE-approved climate talent whose profiles are backed by verified programme achievement and professional readiness.</p></div><div className="pt-heroVisual" aria-hidden="true"><img src="/assets/img/womate-talent-discovery-hero.webp" alt=""/></div></section><section className="pt-discoveryControls" aria-label="Talent Discovery filters"><div className="pt-searchWrap"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, country, climate focus, Mission or headline"/></div><div className="pt-filterRow"><label><span>Country</span><select value={country} onChange={e=>setCountry(e.target.value)}><option value="">All countries</option>{(filterOptions.countries||[]).map(x=><option key={x} value={x}>{x}</option>)}</select></label><label><span>Verified achievement</span><select value={achievement} onChange={e=>setAchievement(e.target.value)}><option value="">All verified talent</option><option value="mission">Mission completed</option><option value="modules">All modules completed</option><option value="spotlight">Canopy Spotlight</option><option value="final">Final Mission team</option></select></label><label><span>Mission team</span><select value={missionGroupId} onChange={e=>setMissionGroupId(e.target.value)}><option value="">All Mission teams</option>{(filterOptions.missions||[]).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="pt-collabToggle"><span>Availability</span><button type="button" className={collabOnly?'active':''} onClick={()=>setCollabOnly(v=>!v)}><Handshake size={15}/>{collabOnly?'Open to collaboration':'Any availability'}</button></label>{(query||country||achievement||missionGroupId||collabOnly)&&<button type="button" className="pt-clearFilters" onClick={()=>{setQuery('');setCountry('');setAchievement('');setMissionGroupId('');setCollabOnly(false)}}>Clear filters</button>}</div></section>{error&&<p className="pt-error">{error}</p>}<section className="pt-grid">{items.length?items.map(x=><TalentCard key={x.slug} x={x}/>):!loading&&<div className="pt-empty">No public Talent Discovery profiles match your search.</div>}</section>{hasMore&&<div className="pt-loadMore"><a className="pt-button secondary" href={nextHref} onClick={e=>{e.preventDefault();fetchPage()}}>{loading?'Loading...':'Load more profiles'}</a></div>}</main>
}
function Profile({slug}){
 const[profile,setProfile]=useState(null),[publications,setPublications]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[form,setForm]=useState({name:'',email:'',organization:'',message:'',website:'',consent:false}),[sending,setSending]=useState(false),[access,setAccess]=useState(null),[thread,setThread]=useState(null),[chat,setChat]=useState(''),[copied,setCopied]=useState(false);
 const loadThread=async a=>{if(!a?.id||!a?.token)return;try{setThread(await getPublicCollaborationThread(a.id,a.token));setError('')}catch(e){setError(e.message)}};
 useEffect(()=>{getPublicTalentProfile(slug).then(async x=>{const next=x&&Object.keys(x).length?x:null;setProfile(next);if(next)setPublications(await getAuthorPublications(next.full_name));setLoading(false)}).catch(e=>{setError(e.message);setLoading(false)})},[slug]);
 useEffect(()=>{if(!access)return;loadThread(access);const timer=setInterval(()=>{if(document.visibilityState==='visible')loadThread(access)},15000);return()=>clearInterval(timer)},[access?.id,access?.token]);
 const submit=async e=>{e.preventDefault();if(form.website||!form.consent)return;setError('');setSending(true);try{const r=await submitPublicCollaborationRequest({slug,name:clean(form.name),email:clean(form.email),organization:clean(form.organization),message:clean(form.message)});const a={id:r.id,token:r.token};localStorage.setItem(accessKey(r.id),r.token);setAccess(a);setForm(v=>({...v,message:''}));await loadThread(a)}catch(err){setError(err.message)}finally{setSending(false)}};
 const send=async()=>{const body=clean(chat);if(!body||!access)return;setSending(true);setError('');try{await sendPublicCollaborationMessage(access.id,access.token,body);setChat('');await loadThread(access)}catch(e){setError(e.message)}finally{setSending(false)}};
 const copy=async()=>{if(!access)return;try{await navigator.clipboard.writeText(privateChatUrl(access.id,access.token));setCopied(true);setTimeout(()=>setCopied(false),1800)}catch{setError('Copy failed. Please copy the private link manually.')}};
 if(loading)return <main className="pt-page"><p>Loading Talent Discovery profile...</p></main>;
 if(!profile)return <main className="pt-page"><Helmet><title>Profile unavailable | WOMATE</title><meta name="robots" content="noindex,nofollow"/></Helmet><a className="pt-back" href="/talent-discovery"><ArrowLeft size={16}/> Talent Discovery</a><h1>Profile unavailable</h1><p>This profile is not currently public in WOMATE Talent Discovery.</p>{error&&<p className="pt-error">{error}</p>}</main>;
 const badge=badgeKey(profile.badge),badgeName=badgeTitle(badge);
 const firstName=profile.full_name?.split(/\s+/)[0]||'this WOMATE talent';
 const achievements=[
  profile.mission_completed&&{icon:<ShieldCheck size={18}/>,title:'Verified climate mission',detail:profile.mission_name||'Completed WOMATE climate mission'},
  profile.all_modules_completed&&{icon:<BadgeCheck size={18}/>,title:'She Leads learning completed',detail:'Completed all programme learning modules'},
  profile.final_team_completed&&{icon:<BadgeCheck size={18}/>,title:'Final Mission team',detail:'Completed the final collaborative Mission stage'},
  Number(profile.spotlight_count)>0&&{icon:<Sparkles size={18}/>,title:'Canopy Spotlight',detail:'Recognised through WOMATE Canopy Spotlight'}
 ].filter(Boolean);

 return <main className="pt-page pt-profilePage"><SEO profile={profile} publications={publications}/>
  <a className="pt-back" href="/talent-discovery"><ArrowLeft size={16}/> Talent Discovery</a>

  <header className="pt-profileHero pt-profileHero--editorial">
   <VerifiedBanner badge={badge} name={profile.full_name} profile/>
   <div className="pt-profileIdentityPanel">
    <div className="pt-profilePhoto"><img src={publicTalentPhotoUrl(profile.avatar_path)} alt={`${profile.full_name} profile`}/></div>
    <div className="pt-profileIdentityCopy">
     <div className="pt-profileNameLine"><h1>{profile.full_name}</h1>{badge&&<BadgeCheck size={24} aria-label="WOMATE verified"/>}</div>
     <p className="pt-headline">{profile.headline||'Climate leadership professional'}</p>
     <div className="pt-profileMetaLine">
      <span>{profile.country||'Africa'}</span>
      {badge&&<><i aria-hidden="true">•</i><strong>WOMATE Verified · {badgeName}</strong></>}
      {profile.collaboration_open&&<><i aria-hidden="true">•</i><span className="available">Open to collaboration</span></>}
     </div>
     <div className="pt-profileHeroActions">
      {profile.collaboration_open&&<a className="pt-profilePrimaryAction" href="#collaborate"><Handshake size={17}/> Collaborate with {firstName}</a>}
      <a className="pt-profileSecondaryAction" href="#profile-focus">Explore profile</a>
     </div>
    </div>
   </div>
  </header>

  <div className="pt-profileEditorial">
   <div className="pt-profileMain">
    <section className="pt-editorialSection" id="profile-focus">
     <span className="pt-kicker">CLIMATE FOCUS</span>
     <h2>Areas of interest and practice</h2>
     {interests(profile.climate_interests).length?
      <div className="pt-focusList">{interests(profile.climate_interests).map(i=><span key={i}>{i}</span>)}</div>:
      <p className="pt-editorialLead">Climate leadership and community action.</p>}
    </section>

    {achievements.length>0&&<section className="pt-editorialSection">
     <span className="pt-kicker">VERIFIED THROUGH WOMATE</span>
     <h2>Programme record</h2>
     <div className="pt-achievementRows">{achievements.map((a,i)=><div className="pt-achievementRow" key={a.title+i}><span className="pt-achievementIcon">{a.icon}</span><div><strong>{a.title}</strong><p>{a.detail}</p></div></div>)}</div>
    </section>}

    {publications.length>0&&<section className="pt-editorialSection pt-profilePublications" aria-labelledby="pt-publications-heading">
     <span className="pt-kicker">PUBLISHED ON WOMATE</span>
     <h2 id="pt-publications-heading">Research and perspectives</h2>
     <div className="pt-publicationRows">{publications.map(p=><article key={p.id}><div><small>{p.kind||'Publication'}</small><h3><a href={`/publications/${p.id}`}>{p.title}</a></h3><p>{p.summary}</p></div><a href={`/publications/${p.id}`} aria-label={`Read ${p.title}`}><ArrowUpRight size={19}/></a></article>)}</div>
    </section>}
   </div>

   <aside className="pt-profileAside" id="collaborate">
    {thread?<Thread thread={thread} chat={chat} setChat={setChat} send={send} busy={sending} privateUrl={privateChatUrl(access.id,access.token)} copy={copy} copied={copied}/>:profile.collaboration_open?
     <section className="pt-request pt-request--editorial">
      <span className="pt-kicker">COLLABORATE</span>
      <h2>Work with {firstName}</h2>
      <p>Send a professional collaboration request through WOMATE.</p>
      <form onSubmit={submit}>
       <div className="pt-formGrid"><label>Full name<input required maxLength="120" autoComplete="name" value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))}/></label><label>Email<input required type="email" maxLength="160" autoComplete="email" value={form.email} onChange={e=>setForm(v=>({...v,email:e.target.value}))}/></label></div>
       <label>Organisation or role<input maxLength="160" autoComplete="organization" value={form.organization} onChange={e=>setForm(v=>({...v,organization:e.target.value}))}/></label>
       <label className="pt-honeypot" aria-hidden="true">Website<input tabIndex="-1" autoComplete="off" value={form.website} onChange={e=>setForm(v=>({...v,website:e.target.value}))}/></label>
       <label>Collaboration request<textarea required minLength="20" maxLength="1500" value={form.message} onChange={e=>setForm(v=>({...v,message:e.target.value}))}/></label>
       <label className="pt-consent"><input required type="checkbox" checked={form.consent} onChange={e=>setForm(v=>({...v,consent:e.target.checked}))}/><span>Share these details with this WOMATE participant for this request.</span></label>
       <button className="pt-button" disabled={sending||!form.consent}><Handshake size={16}/>{sending?'Sending...':'Send collaboration request'}</button>
      </form>
     </section>:
     <section className="pt-request pt-request--editorial"><span className="pt-kicker">PROFILE STATUS</span><h2>Professional profile</h2><p>Collaboration requests are currently closed.</p></section>}
    {error&&<p className="pt-error">{error}</p>}
   </aside>
  </div>
 </main>
}
function ChatRoute({id}){
 const[token,setToken]=useState(''),[thread,setThread]=useState(null),[chat,setChat]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{const fromHash=window.location.hash.replace(/^#/,'');const saved=localStorage.getItem(accessKey(id))||'';const t=fromHash||saved;if(t){localStorage.setItem(accessKey(id),t);setToken(t);if(fromHash)window.history.replaceState({},'',window.location.pathname)}else setError('This private conversation link is missing its access key.')},[id]);
 const load=async()=>{if(!token)return;try{setThread(await getPublicCollaborationThread(id,token));setError('')}catch(e){setError(e.message)}};
 useEffect(()=>{if(!token)return;load();const timer=setInterval(()=>{if(document.visibilityState==='visible')load()},15000);return()=>clearInterval(timer)},[token,id]);
 const send=async()=>{const body=clean(chat);if(!body)return;setBusy(true);try{await sendPublicCollaborationMessage(id,token,body);setChat('');await load()}catch(e){setError(e.message)}finally{setBusy(false)}};
 return <main className="pt-page"><SEO chat/><a className="pt-back" href="/talent-discovery"><ArrowLeft size={16}/> Talent Discovery</a>{thread?<><Thread thread={thread} chat={chat} setChat={setChat} send={send} busy={busy}/><VisitorSafetyReport requestId={id} accessToken={token}/><VisitorOrganisationReview requestId={id} accessToken={token}/><VisitorEmailVerification requestId={id} accessToken={token}/><VisitorFacilitationTerms requestId={id} accessToken={token}/></>:<section className="pt-thread"><h1>Private collaboration</h1><p>This page is accessible only with the private conversation key created when the collaboration request was submitted.</p>{error&&<p className="pt-error">{error}</p>}</section>}</main>
}
function Thread({thread,chat,setChat,send,busy,privateUrl,copy,copied}){
 const status=thread.status;
 return <section className="pt-thread"><span className="pt-kicker">PRIVATE WOMATE COLLABORATION</span><h2>{status==='accepted'?'Request accepted':status==='declined'?'Request declined':status==='closed'?'Conversation closed':'Request received'}</h2><div className="pt-status">{status==='pending'?'Your request is waiting for a response.':status==='accepted'?'Your request was accepted. You can now chat privately here without either person publishing an email address.':status==='declined'?'The participant declined this collaboration request. No private participant contact details have been exposed.':'This collaboration conversation is closed.'}</div>{privateUrl&&<div className="pt-privateLink"><strong>Save your private conversation link</strong><span>You can use this link on another device. Anyone with this link can access this conversation, so keep it private.</span><code>{privateUrl}</code><button className="pt-button secondary" onClick={copy}><Copy size={15}/>{copied?'Copied':'Copy private link'}</button></div>}<div className="pt-messages">{(thread.messages||[]).map(m=><div key={m.id} className={`pt-message ${m.sender_kind}`}><div>{m.body}</div><small>{new Date(m.created_at).toLocaleString()}</small></div>)}</div>{status==='accepted'&&<div className="pt-chatComposer"><textarea maxLength="1200" value={chat} onChange={e=>setChat(e.target.value)} placeholder={`Message ${thread.recipient_name||'this participant'}`}/><button className="pt-button" onClick={send} disabled={busy||!clean(chat)}>{busy?'Sending...':'Send message'}</button></div>}</section>
}


function VisitorSafetyReport({requestId,accessToken}){
 const [open,setOpen]=useState(false),[reason,setReason]=useState('scam'),[description,setDescription]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const submit=async()=>{if(description.trim().length<10)return;setBusy(true);setNotice('');
 try{await submitPublicCollaborationSafetyReport(requestId,accessToken,reason,description);setNotice('Your confidential concern has been sent to WOMATE for review.');setDescription('');setOpen(false)}
 catch(e){setNotice(e.message)}finally{setBusy(false)}};
 return <section className="pt-thread" style={{marginTop:24}}>
  <span className="pt-kicker">YOUR SAFETY MATTERS</span><h2>Need WOMATE's help?</h2><p>If a collaboration seems suspicious or unsafe, you can report it confidentially. Only authorised WOMATE reviewers will see your report. Your full private conversation is not automatically shared.</p>
  <button type="button" className="pt-button secondary" onClick={()=>setOpen(v=>!v)}>{open?'Close report form':'Report a concern'}</button>
  {open&&<div style={{display:'grid',gap:12,marginTop:14}}>
   <label>Type of concern<select value={reason} onChange={e=>setReason(e.target.value)}><option value="scam">Suspected scam</option><option value="harassment">Harassment</option><option value="impersonation">Impersonation</option><option value="payment_pressure">Payment pressure</option><option value="other">Other concern</option></select></label>
   <label>Explain what happened<textarea rows={4} maxLength={1500} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Please describe the concern. Do not share passwords or financial account details."/></label>
   <button type="button" className="pt-button" disabled={busy||description.trim().length<10} onClick={submit}>{busy?'Submitting...':'Submit confidential report'}</button>
  </div>}
  {notice&&<p role="status">{notice}</p>}
 </section>
}


function VisitorOrganisationReview({requestId,accessToken}){
 const[open,setOpen]=useState(false),[website,setWebsite]=useState(''),[proof,setProof]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const submit=async()=>{setBusy(true);setNotice('');try{await submitPublicOrganisationReview(requestId,accessToken,website.trim(),proof.trim());setNotice('Organisation information received for WOMATE review. This does not verify your identity or email address.');setOpen(false)}
 catch(e){setNotice(e.message)}finally{setBusy(false)}};
 return <section className="pt-thread" style={{marginTop:24}}>
  <span className="pt-kicker">BUILD TRUST</span><h2>Submit organisation information</h2>
  <p>Optionally provide your official organisation website and a supporting public reference. WOMATE can review the organisation information. Submission is not verification of your personal identity or email address.</p>
  <button type="button" className="pt-button secondary" onClick={()=>setOpen(v=>!v)}>{open?'Close':'Submit organisation details'}</button>
  {open&&<div style={{display:'grid',gap:12,marginTop:14}}>
   <label>Official website (HTTPS)<input type="url" required value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://organisation.example"/></label>
   <label>Public supporting reference (optional)<input type="url" value={proof} onChange={e=>setProof(e.target.value)} placeholder="https://organisation.example/about"/></label>
   <button type="button" className="pt-button" disabled={busy||!/^https:\/\//i.test(website.trim())} onClick={submit}>{busy?'Submitting…':'Send for review'}</button>
  </div>}
  {notice&&<p role="status">{notice}</p>}
 </section>
}


function VisitorEmailVerification({requestId,accessToken}){
 const[verified,setVerified]=useState(null),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let live=true;getPublicRequesterVerificationStatus(requestId,accessToken).then(x=>{if(live)setVerified(x)}).catch(()=>{});return()=>{live=false}},[requestId,accessToken]);
 const verify=async()=>{setBusy(true);setNotice('');
 try{
   const raw=JSON.parse(localStorage.getItem('womate_canopy_session_v1')||'null');
   if(!raw?.access_token)throw new Error('Sign in with your requester email in WOMATE Canopy first, then return to this private link.');
   await verifyPublicRequesterEmail(requestId,accessToken,raw.access_token);
   setVerified(await getPublicRequesterVerificationStatus(requestId,accessToken));
   setNotice('Email ownership confirmed. This does not verify personal identity or organisation affiliation.');
 }catch(e){setNotice(e.message)}finally{setBusy(false)}};
 return <section className="pt-thread" style={{marginTop:24}}>
  <span className="pt-kicker">REQUESTER TRUST</span><h2>Confirm ownership of your email address</h2>
  <p>Sign in to <a href="/canopy/login">WOMATE Canopy</a> using the same confirmed email address as your collaboration request, then return to this private conversation link and select Verify. This confirms email ownership only.</p>
  <p><strong>Email ownership:</strong> {verified?.email_verified?'Confirmed':'Not confirmed'}</p>
  <p><strong>Organisation review:</strong> {verified?.organisation_review_status||'Not submitted'}</p>
  {!verified?.email_verified&&<button type="button" className="pt-button secondary" disabled={busy} onClick={verify}>{busy?'Verifying…':'Verify email ownership'}</button>}
  {notice&&<p role="status">{notice}</p>}
 </section>
}


function VisitorFacilitationTerms({requestId,accessToken}){
 const [terms,setTerms]=useState(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const reload=async()=>{try{const r=await getPublicFacilitationTerms(requestId,accessToken);setTerms(r?.id?r:null)}catch(e){setMessage(e.message)}};
 useEffect(()=>{reload()},[requestId,accessToken]);
 const decide=async accepted=>{setBusy(true);setMessage('');try{
   const s=JSON.parse(localStorage.getItem('womate_canopy_session_v1')||'null');
   if(!s?.access_token)throw new Error('Sign in to WOMATE Canopy with your confirmed requester email, then return to this private link.');
   await decidePublicFacilitationTerms(requestId,accessToken,accepted,s.access_token);
   await reload();setMessage(accepted?'Your agreement was recorded. This does not process payment.':'You declined these optional terms.');
 }catch(e){setMessage(e.message)}finally{setBusy(false)}};
 if(!terms)return null;
 return <section className="pt-thread" style={{marginTop:24}}>
   <span className="pt-kicker">OPTIONAL COMMERCIAL TERMS</span><h2>WOMATE-facilitated engagement</h2>
   <p>Scope: {terms.scope}</p>
   <p>Prospective engagement value: {terms.currency} {Number(terms.deal_value).toLocaleString()}</p>
   <p>Proposed WOMATE facilitation fee: {terms.fee_rate}% paid by the commissioning requester organisation. The talent is not charged.</p>
   <p><strong>Status:</strong> {terms.status}. No fee will be taken through this form. Existing unrelated collaborations remain free.</p>
   {terms.status==='learner_accepted'&&<div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      <button type="button" className="pt-button" disabled={busy} onClick={()=>decide(true)}>I agree to these terms</button>
      <button type="button" className="pt-button secondary" disabled={busy} onClick={()=>decide(false)}>Decline the terms</button>
   </div>}
   {terms.status==='proposed'&&<p>Awaiting talent's decision.</p>}
   {message&&<p role="status">{message}</p>}
 </section>
}
