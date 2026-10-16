import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Award,ChevronDown,Download,Eye,EyeOff,Heart,ImagePlus,LockKeyhole,Maximize2,Minus,Move,Play,Plus,RotateCcw,RotateCw,Send,ShieldCheck,Sparkles} from 'lucide-react';
import {getCertificates,getCanopyGraduationOverview,submitCanopyGraduationReflection} from './canopyApi';
import './canopyGraduation.css';

const ASSET='/assets/canopy/graduation/';
const OPEN_AT=Date.UTC(2026,9,29,0,0,0);
const SIZE={width:1080,height:1350};
const START_CAP={x:.50,y:.235,width:.70,rotation:0};
const SAMPLE=[{id:'tester-preview',display_name:'WOMATE Graduate',reflection:'The journey taught me to trust my voice and take meaningful climate action.',created_at:'2026-10-29T12:00:00Z'}];
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const fmt=n=>String(n).padStart(2,'0');

function drawCover(ctx,img,w,h){
 const scale=Math.max(w/img.width,h/img.height);
 const dw=img.width*scale,dh=img.height*scale;
 ctx.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh);
}
function drawImageCard(canvas,photo,cap,settings,name,withCap=true){
 if(!canvas||!photo)return;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const {width:w,height:h}=SIZE;
 if(canvas.width!==w)canvas.width=w;
 if(canvas.height!==h)canvas.height=h;
 ctx.clearRect(0,0,w,h);
 ctx.fillStyle='#073b39';ctx.fillRect(0,0,w,h);
 drawCover(ctx,photo,w,h);
 if(withCap&&cap){
  const cw=settings.width*w,ch=cw*cap.height/cap.width;
  ctx.save();ctx.translate(settings.x*w,settings.y*h);ctx.rotate(settings.rotation*Math.PI/180);
  ctx.drawImage(cap,-cw/2,-ch/2,cw,ch);ctx.restore();
 }
 // The download is a portrait design, not a screenshot of the page/editor UI.
 const shade=ctx.createLinearGradient(0,h*.63,0,h);
 shade.addColorStop(0,'rgba(1,29,28,0)');shade.addColorStop(.45,'rgba(1,29,28,.76)');shade.addColorStop(1,'rgba(1,29,28,.98)');
 ctx.fillStyle=shade;ctx.fillRect(0,h*.63,w,h*.37);
 ctx.textAlign='left';
 ctx.fillStyle='#c6ff52';ctx.font='800 32px Arial,sans-serif';ctx.fillText('WOMATE   /   SHE LEADS',70,h-242);
 ctx.fillStyle='#fff';
 const full=(name||'WOMATE GRADUATE').trim();
 let f=64;ctx.font=`800 ${f}px Arial,sans-serif`;
 while(f>35&&ctx.measureText(full).width>w-140){f-=2;ctx.font=`800 ${f}px Arial,sans-serif`}
 ctx.fillText(full.slice(0,100),70,h-155);
 ctx.fillStyle='#e8eedb';ctx.font='400 31px Arial,sans-serif';ctx.fillText('COHORT 2  ·  CLASS OF 2026',70,h-90);
 ctx.fillStyle='#c6ff52';ctx.fillRect(70,h-60,w-140,6);
}
function videoEmbedUrl(raw){
 if(!raw)return'';
 try{
  const u=new URL(raw);if(u.protocol!=='https:')return'';
  const host=u.hostname.toLowerCase().replace(/^www\./,'');
  let id='';
  if(host==='youtu.be')id=u.pathname.split('/')[1]||'';
  else if(host==='youtube.com'||host==='m.youtube.com'||host==='youtube-nocookie.com'){
   id=u.searchParams.get('v')||(/\/(?:embed|shorts|live)\/([\w-]+)/.exec(u.pathname)||[])[1]||'';
  }
  if(/^[\w-]{11}$/.test(id))return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
  if(host==='player.vimeo.com'||host==='vimeo.com'){
   const v=(u.pathname.match(/(?:video\/)?(\d+)/)||[])[1];
   if(v)return `https://player.vimeo.com/video/${v}`;
  }
 }catch{/* Configured URL is optional. */}
 return'';
}

function GradVideo(){
 const [playing,setPlaying]=useState(false);
 const url=videoEmbedUrl(import.meta.env.VITE_CANOPY_GRADUATION_VIDEO_URL||'');
 return <section className="cgrad-video" aria-label="Graduation video message">
  <div className="cgrad-video-art">
   {url&&playing?<iframe src={url+(url.includes('?')?'&':'?')+'autoplay=1'} title="A message from the WOMATE team" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:<>
    <img src={`${ASSET}womate-neon.webp`} alt="" className="cgrad-video-logo"/>
    <div className="cgrad-video-caption">A message from WOMATE</div>
    {url?<button type="button" className="cgrad-video-play" onClick={()=>setPlaying(true)} aria-label="Play WOMATE graduation message"><Play size={30} fill="currentColor"/></button>:<div className="cgrad-video-soon"><Play size={24}/><span>Our message is coming</span></div>}
   </>}
  </div>
  <h2>A message from WOMATE <Heart size={17} aria-hidden="true"/></h2>
  <p className="cgrad-script">Same girl. Bigger dreams.</p>
 </section>;
}

function PortraitStudio({graduateName}){
 const canvasRef=useRef(null),stageRef=useRef(null),fileRef=useRef(null),objectUrlRef=useRef(null),dragRef=useRef(null);
 const photoRef=useRef(null),capRef=useRef(null);
 const [photoLoaded,setPhotoLoaded]=useState(false),[capLoaded,setCapLoaded]=useState(false);
 const [cap,setCap]=useState(START_CAP),[activeTool,setActiveTool]=useState('move'),[notice,setNotice]=useState('');
 const [exporting,setExporting]=useState(false),[showGuides,setShowGuides]=useState(true);
 const [assetError,setAssetError]=useState(false);
 const cleanPhoto=useCallback(()=>{if(objectUrlRef.current){URL.revokeObjectURL(objectUrlRef.current);objectUrlRef.current=null}},[]);
 useEffect(()=>()=>{cleanPhoto()},[cleanPhoto]);
 useEffect(()=>{
  let mounted=true;const img=new Image();img.onload=()=>{if(mounted){capRef.current=img;setCapLoaded(true);setAssetError(false)}};
  img.onerror=()=>{if(mounted)setAssetError(true)};
  img.src=ASSET+'womate-cap.webp';
  return()=>{mounted=false;img.onload=null;img.onerror=null};
 },[]);
 useEffect(()=>{drawImageCard(canvasRef.current,photoRef.current,capRef.current,cap,graduateName,false)},[photoLoaded,capLoaded,cap,graduateName]);
 const selectFile=()=>fileRef.current?.click();
 const onFile=e=>{
  const file=e.target.files?.[0];if(!file)return;
  if(!file.type.startsWith('image/')){
   setNotice('Please choose an image file.');return;
  }
  if(file.size>12*1024*1024){setNotice('Please choose a photo smaller than 12 MB.');return}
  cleanPhoto();const url=URL.createObjectURL(file);objectUrlRef.current=url;
  const img=new Image();img.onload=()=>{
   if(objectUrlRef.current!==url)return;
   photoRef.current=img;setCap({...START_CAP});setShowGuides(true);setPhotoLoaded(true);
   setNotice('Photo ready. Drag the cap onto your head, or adjust its size and tilt.');
  };img.onerror=()=>{setNotice('This picture could not be opened. Try JPG, PNG or WebP.');setPhotoLoaded(false);cleanPhoto()};img.src=url;
  e.target.value='';
 };
 const pointerDown=e=>{
  if(!photoLoaded||!capLoaded)return;
  e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);
  dragRef.current={id:e.pointerId,px:e.clientX,py:e.clientY,starting:cap};setActiveTool('move');
 };
 const pointerMove=e=>{
  const d=dragRef.current,rect=stageRef.current?.getBoundingClientRect();if(!d||d.id!==e.pointerId||!rect)return;
  e.preventDefault();setCap(v=>({...v,x:clamp(d.starting.x+(e.clientX-d.px)/rect.width,-.12,1.12),y:clamp(d.starting.y+(e.clientY-d.py)/rect.height,-.08,.85)}));
 };
 const pointerUp=e=>{if(dragRef.current?.id===e.pointerId)dragRef.current=null;};
 const tweak=(field,delta)=>setCap(v=>({...v,[field]:clamp(v[field]+delta,field==='width'?.3:field==='rotation'?-50:-.2,field==='width'?1.35:field==='rotation'?50:1.2)}));
 const fit=async()=>{
  const photo=photoRef.current;
  if(!photo){selectFile();return}
  // Native face detection is available in some browsers. Always allow manual
  // positioning: do not depend on face detection or transmit photos to a server.
  try{
    if(typeof window.FaceDetector==='function'){
      const detector=new window.FaceDetector({fastMode:true,maxDetectedFaces:1});
      const faces=await detector.detect(photo);
      const box=faces?.[0]?.boundingBox;
      if(box&&box.width>0){
        const scale=Math.max(SIZE.width/photo.width,SIZE.height/photo.height);
        const dx=(SIZE.width-photo.width*scale)/2,dy=(SIZE.height-photo.height*scale)/2;
        const x=clamp((dx+(box.x+box.width/2)*scale)/SIZE.width,.05,.95);
        const y=clamp((dy+(box.y-box.height*.30)*scale)/SIZE.height,.03,.76);
        const width=clamp(box.width*scale*1.55/SIZE.width,.3,1.35);
        setCap({x,y,width,rotation:-3});
        setNotice('Cap placed near your head. Drag, tilt or resize it for your perfect fit.');return;
      }
    }
  }catch{/* Face detection is optional and may be unavailable. */}
  setCap({...START_CAP});setNotice('Cap reset to its starting position. Drag to fit your head.');
 };
 const exportPortrait=async()=>{
  if(!photoRef.current){selectFile();return}
  if(!capRef.current){setNotice('Graduation cap is still loading. Please try again.');return}
  // The positioning box is DOM-only; the PNG is drawn separately without any guides.
  setShowGuides(false);setExporting(true);setNotice('');
  const cleanExportCanvas=document.createElement('canvas');
  drawImageCard(cleanExportCanvas,photoRef.current,capRef.current,cap,graduateName,true);
  try{
   const blob=await new Promise(resolve=>cleanExportCanvas.toBlob(resolve,'image/png'));
   if(!blob)throw new Error('Unable to export portrait');
   const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download='WOMATE-Cohort-2-Graduate.png';document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
   setNotice('Your graduation portrait has been saved!');
  }catch{setNotice('Unable to download the portrait. Please try again.')}finally{setExporting(false)}
 };
 return <section className="cgrad-studio" aria-label="Create your graduation portrait">
  <div className="cgrad-studio-head"><div><span className="cgrad-kicker">YOUR GRADUATION PORTRAIT</span><h2>Wear your moment.</h2></div><button type="button" className="cgrad-upload" onClick={selectFile}><ImagePlus size={18}/> {photoLoaded?'Change photo':'Upload photo'}</button></div>
  <input ref={fileRef} type="file" accept="image/*" className="cgrad-file" onChange={onFile} aria-label="Upload a photo for your graduation portrait"/>
  <div className="cgrad-stage" ref={stageRef}>
   {photoLoaded?<><canvas ref={canvasRef} width={SIZE.width} height={SIZE.height} aria-label="Graduation portrait preview without cap"/>
    {capLoaded&&<div role="img" aria-label="Drag to position the WOMATE graduation cap on your head" tabIndex={0} className={`cgrad-cap-overlay${showGuides?'':' is-clean'}`} style={{left:`${cap.x*100}%`,top:`${cap.y*100}%`,width:`${cap.width*100}%`,transform:`translate(-50%,-50%) rotate(${cap.rotation}deg)`}} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onKeyDown={e=>{const arrows={ArrowLeft:['x',-.01],ArrowRight:['x',.01],ArrowUp:['y',-.01],ArrowDown:['y',.01]};if(arrows[e.key]){e.preventDefault();tweak(...arrows[e.key])}}}>
     <img src={`${ASSET}womate-cap.webp`} alt="" draggable="false"/><i className="cgrad-handle top-left"/><i className="cgrad-handle top-right"/><i className="cgrad-handle bottom-left"/><i className="cgrad-handle bottom-right"/>
    </div>}
   </>:<button type="button" className="cgrad-stage-placeholder" onClick={selectFile}><span className="cgrad-stage-icon"><ImagePlus size={35}/></span><strong>Make it yours.</strong><span>Add your favourite photo and try on the WOMATE graduation cap.</span><span className="cgrad-stage-cta">Choose my photo <Plus size={16}/></span></button>}
  </div>
  {assetError&&<p className="cgrad-status" role="alert">The graduation cap asset has not been installed yet. Add the supplied graduation assets to enable the cap overlay.</p>}
  {photoLoaded&&<><div className="cgrad-tools" aria-label="Adjust graduation cap">
   <button type="button" className={activeTool==='move'?'on':''} onClick={()=>{setActiveTool('move');setNotice('Drag the cap with your finger or mouse.')}}><Move size={20}/> Move</button>
   <button type="button" className={activeTool==='tilt'?'on':''} onClick={()=>setActiveTool('tilt')}><Maximize2 size={20}/> Tilt</button>
   <button type="button" className={activeTool==='size'?'on':''} onClick={()=>setActiveTool('size')}><Maximize2 size={20}/> Size</button>
   <button type="button" className={activeTool==='rotate'?'on':''} onClick={()=>setActiveTool('rotate')}><RotateCw size={20}/> Rotate</button>
   <button type="button" onClick={()=>{setCap({...START_CAP});setActiveTool('move')}}><RotateCcw size={20}/> Reset</button>
   <button type="button" onClick={fit}><Sparkles size={20}/> Fit cap</button>
   <button type="button" className={showGuides?'':'on'} aria-pressed={!showGuides} onClick={()=>setShowGuides(v=>!v)}>{showGuides?<EyeOff size={20}/>:<Eye size={20}/>} {showGuides?'Hide guides':'Show guides'}</button>
  </div>
  {activeTool==='size'&&<label className="cgrad-range">Size <input aria-label="Graduation cap size" type="range" min="30" max="135" step="1" value={Math.round(cap.width*100)} onChange={e=>setCap(v=>({...v,width:Number(e.target.value)/100}))}/><output>{Math.round(cap.width*100)}%</output></label>}
  {(activeTool==='tilt'||activeTool==='rotate')&&<label className="cgrad-range">{activeTool==='tilt'?'Tilt':'Rotate'} <button type="button" aria-label="Turn left" onClick={()=>tweak('rotation',-2)}><Minus size={16}/></button><input aria-label="Graduation cap rotation" type="range" min="-50" max="50" step="1" value={cap.rotation} onChange={e=>setCap(v=>({...v,rotation:Number(e.target.value)}))}/><button type="button" aria-label="Turn right" onClick={()=>tweak('rotation',2)}><Plus size={16}/></button><output>{cap.rotation}°</output></label>}
  </>}
  {photoLoaded&&<p className="cgrad-editor-hint">Guides help you position the cap. They never appear in your downloaded portrait.</p>}
  <button type="button" className="cgrad-download" disabled={!photoLoaded||!capLoaded||exporting} onClick={exportPortrait}><Download size={20}/>{exporting?'Preparing your portrait…':'Download my graduation portrait'}</button>
  <p className="cgrad-local-hint"><ShieldCheck size={14}/> Your photo stays on this device.</p>
  {notice&&<p role="status" className="cgrad-status">{notice}</p>}
 </section>;
}

export default function CanopyGraduationPortal({viewer,tester=false}){
 const [now,setNow]=useState(Date.now());
 const [data,setData]=useState(null),[certs,setCerts]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [reflection,setReflection]=useState(''),[displayName,setDisplayName]=useState(viewer?.profile?.full_name||'');
 const [showNote,setShowNote]=useState(false);
 const delta=Math.max(0,OPEN_AT-now),opened=now>=OPEN_AT;
 const unlocked=tester||Boolean(data?.can_enter&&opened);
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(t)},[]);
 useEffect(()=>{
  if(tester){setData({can_enter:true,reflections:SAMPLE});setCerts([]);return}
  let live=true;
  async function load(){try{const [overview,items]=await Promise.all([getCanopyGraduationOverview(viewer.session),getCertificates(viewer.session)]);if(live){setData(overview);setCerts(items||[]);setError('')}}catch(e){if(live)setError(e.message||'Graduation information is temporarily unavailable.')}}
  load();const timer=setInterval(load,30000);return()=>{live=false;clearInterval(timer)};
 },[viewer?.session?.access_token,tester]);
 async function shareReflection(e){e.preventDefault();if(!reflection.trim()||reflection.trim().length<30)return;
  if(tester){setData(v=>({...v,reflections:[{id:'tester-message',display_name:displayName||'Graduate',reflection,created_at:new Date().toISOString()},...(v.reflections||[]).filter(x=>x.id!=='tester-message')]}));setReflection('');setShowNote(false);return}
  if(!unlocked)return;
  setBusy(true);setError('');try{await submitCanopyGraduationReflection(viewer.session,{displayName,reflection});const next=await getCanopyGraduationOverview(viewer.session);setData(next);setReflection('');setShowNote(false)}catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <main className="cgrad-page">
  <div className="cgrad-decor cgrad-decor-ribbon" aria-hidden="true"/><div className="cgrad-decor cgrad-decor-confetti" aria-hidden="true"/><div className="cgrad-decor cgrad-decor-balloons" aria-hidden="true"/><div className="cgrad-decor cgrad-decor-stars" aria-hidden="true"/>
  <div className="cgrad-content">
   <header className="cgrad-celebrate">
    <span className="cgrad-kicker">WOMATE · SHE LEADS · COHORT 2 · 2026</span>
    {unlocked?<><span className="cgrad-crown" aria-hidden="true">✦ ♡ ✦</span><h1>CONGRATULATIONS!</h1><p>YOU DID IT! <Heart size={15} fill="currentColor" aria-hidden="true"/></p></>:<><h1 className="cgrad-wait-title">Your moment is almost here.</h1><p>29 OCTOBER 2026 · GRADUATION DAY</p></>}
   </header>
   {tester&&<div className="cgrad-test"><ShieldCheck size={18}/> TESTER PREVIEW · Photos stay local. Certificates and reflections are simulated.</div>}
   {error&&<p className="cgrad-error" role="alert">{error}</p>}
   {!unlocked?<section className="cgrad-gated"><LockKeyhole size={26}/><h2>{!opened?'The celebration opens on 29 October.':'Your graduation access is being verified.'}</h2>{!opened&&<div className="cgrad-countdown" role="timer"><div><strong>{Math.floor(delta/86400000)}</strong><span>Days</span></div><div><strong>{fmt(Math.floor(delta%86400000/3600000))}</strong><span>Hours</span></div><div><strong>{fmt(Math.floor(delta%3600000/60000))}</strong><span>Minutes</span></div></div>}<p>Official certificates and WOMATE graduation approval are required for learner access. If your status looks wrong, email <a href="mailto:womatead@gmail.com">WOMATE support</a>.</p></section>:<>
    <div className="cgrad-main-layout"><PortraitStudio graduateName={displayName}/><aside className="cgrad-aside"><GradVideo/><div className="cgrad-certificate"><Award size={22}/><div><strong>Your official certificate</strong>{tester?<span>Available here when issued to an eligible learner.</span>:certs.length?certs.map(c=><a key={c.id} href={c.drive_url} target="_blank" rel="noopener noreferrer">View certificate ↗</a>):<span>No certificate link is available yet.</span>}</div></div></aside></div>
    <section className="cgrad-voices"><div className="cgrad-voices-head"><div><span className="cgrad-kicker">THE WOMEN BEHIND THE JOURNEY</span><h2>Our voices. Our next chapter.</h2></div><button type="button" onClick={()=>setShowNote(v=>!v)} aria-expanded={showNote}><Heart size={16}/> {showNote?'Close':'Leave your note'} <ChevronDown size={16}/></button></div>
     {showNote&&<form className="cgrad-reflection-form" onSubmit={shareReflection}><label>Your name<input value={displayName} onChange={e=>setDisplayName(e.target.value)} minLength={2} maxLength={100} required/></label><label>Your reflection<textarea value={reflection} onChange={e=>setReflection(e.target.value)} minLength={30} maxLength={1200} required placeholder="What are you taking into your next chapter?"/></label><button type="submit" disabled={busy||reflection.trim().length<30}><Send size={16}/>{busy?'Sharing…':'Share my reflection'}</button></form>}
     <div className="cgrad-reflection-list">{(data?.reflections||[]).length?(data.reflections||[]).slice(0,12).map(r=><blockquote key={r.id}><p>“{r.reflection}”</p><footer>{r.display_name}</footer></blockquote>):<p className="cgrad-no-reflections">Be the first to celebrate your journey with the class.</p>}</div>
    </section>
   </>}
  </div>
 </main>;
}
