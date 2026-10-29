import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Award,Check,ChevronDown,Download,Heart,ImagePlus,LockKeyhole,Maximize2,Minus,Move,Play,Plus,RotateCcw,RotateCw,Send,ShieldCheck,Sparkles,X,RefreshCw} from 'lucide-react';
import {getCertificates,getCanopyGraduationOverview,submitCanopyGraduationReflection,getMyGraduationDanceSeen,markMyGraduationDanceSeen} from './canopyApi';
import './canopyGraduation.css';

const ASSET='/assets/canopy/graduation/';
const OPEN_AT=Date.UTC(2026,9,29,0,0,0);
const SIZE={width:1080,height:1350};
const START_CAP={x:.50,y:.22,width:.72,rotation:0};
const START_PHOTO={x:.5,y:.49,scale:1};
const PORTRAIT_BACKGROUNDS=[{id:'white',label:'White'},{id:'deep-green',label:'Deep Green'},{id:'teal',label:'Teal'}];
const MEDIAPIPE_WASM='/assets/canopy/mediapipe/wasm';
const SEGMENTER_MODEL='/assets/canopy/mediapipe/selfie_segmenter.tflite';

const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const fmt=n=>String(n).padStart(2,'0');
let segmenterPromise;

function drawCover(ctx,img,w,h){
 const scale=Math.max(w/img.width,h/img.height);
 const dw=img.width*scale,dh=img.height*scale;
 ctx.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh);
}

async function getSegmenter(){
 if(!segmenterPromise){
  segmenterPromise=(async()=>{
   // This import is bundled by Vite instead of importing an unreliable CDN module.
   // WASM is copied from the same pinned npm package during the production build.
   const {FilesetResolver,ImageSegmenter}=await import('@mediapipe/tasks-vision');
   const fileset=await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
   return ImageSegmenter.createFromOptions(fileset,{
    baseOptions:{modelAssetPath:SEGMENTER_MODEL,delegate:'CPU'},
    runningMode:'IMAGE',
    outputConfidenceMasks:true,
    outputCategoryMask:true
   });
  })().catch(err=>{segmenterPromise=null;throw err});
 }
 return segmenterPromise;
}

function cropCanvasToSubject(canvas,pad=20){
 const ctx=canvas.getContext('2d');
 if(!ctx)return canvas;
 const {width,height}=canvas;
 const data=ctx.getImageData(0,0,width,height).data;
 let minX=width,minY=height,maxX=-1,maxY=-1;
 for(let y=0;y<height;y++){
  for(let x=0;x<width;x++){
   const a=data[(y*width+x)*4+3];
   if(a>12){
    if(x<minX)minX=x;
    if(y<minY)minY=y;
    if(x>maxX)maxX=x;
    if(y>maxY)maxY=y;
   }
  }
 }
 if(maxX<0||maxY<0)return canvas;
 minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);maxX=Math.min(width-1,maxX+pad);maxY=Math.min(height-1,maxY+pad);
 const out=document.createElement('canvas');
 out.width=Math.max(1,maxX-minX+1);out.height=Math.max(1,maxY-minY+1);
 out.getContext('2d')?.drawImage(canvas,minX,minY,out.width,out.height,0,0,out.width,out.height);
 return out;
}

async function buildCutoutFromPhoto(img){
 // Keep decoding and mask compositing under control on large phone photos.
 // Processing is local; this resized canvas is not uploaded anywhere.
 const naturalW=img.naturalWidth||img.width,naturalH=img.naturalHeight||img.height;
 const scale=Math.min(1,1600/Math.max(naturalW,naturalH));
 const source=document.createElement('canvas');
 source.width=Math.max(1,Math.round(naturalW*scale));
 source.height=Math.max(1,Math.round(naturalH*scale));
 const sourceCtx=source.getContext('2d');
 if(!sourceCtx)throw new Error('Your browser could not open the photo canvas.');
 sourceCtx.drawImage(img,0,0,source.width,source.height);

 const segmenter=await getSegmenter();
 const result=segmenter.segment(source);
 let maskValues,mw,mh,categoryData,usesCategories=false;
 try{
  const confidenceMasks=result?.confidenceMasks||[];
  // Depending on model metadata, the selfie model may return ONE foreground
  // confidence mask rather than separate background and foreground masks.
  const mask=confidenceMasks.length>1?confidenceMasks[1]:confidenceMasks[0];
  if(mask&&typeof mask.getAsFloat32Array==='function'){
   mw=mask.width;mh=mask.height;
   maskValues=mask.getAsFloat32Array().slice();
  }else if(result?.categoryMask?.getAsUint8Array){
   const cat=result.categoryMask;
   mw=cat.width;mh=cat.height;
   categoryData=cat.getAsUint8Array().slice();
   usesCategories=true;
  }else{
   throw new Error('The person mask could not be read.');
  }
 }finally{result?.close?.();}
 if(!mw||!mh||!maskValues&&!categoryData||mw*mh!==(maskValues||categoryData).length)
  throw new Error('The AI mask was incomplete. Try another photo.');
 const width=source.width,height=source.height;
 const maskCanvas=document.createElement('canvas');
 maskCanvas.width=mw;maskCanvas.height=mh;
 const mctx=maskCanvas.getContext('2d');
 if(!mctx)throw new Error('Mask canvas could not be created.');
 const imageData=mctx.createImageData(mw,mh);
 for(let i=0;i<(usesCategories?categoryData.length:maskValues.length);i++){
  const p=i*4;
  const confidence=usesCategories?(categoryData[i]===1?1:0):clamp((maskValues[i]-0.08)/0.76,0,1);
  const a=Math.round(confidence*255);
  imageData.data[p]=255;imageData.data[p+1]=255;imageData.data[p+2]=255;imageData.data[p+3]=a;
 }
 mctx.putImageData(imageData,0,0);
 const cutout=document.createElement('canvas');
 cutout.width=width;cutout.height=height;
 const cctx=cutout.getContext('2d');
 if(!cctx)throw new Error('Photo canvas could not be created.');
 cctx.drawImage(maskCanvas,0,0,width,height);
 cctx.globalCompositeOperation='source-in';
 cctx.drawImage(source,0,0,width,height);
 cctx.globalCompositeOperation='source-over';
 return cropCanvasToSubject(cutout,24);
}

function drawSubject(ctx,subject,settings,w,h){
 if(!subject)return;
 const fit=Math.min((w*0.82)/subject.width,(h*0.76)/subject.height);
 const dw=subject.width*fit*settings.scale;
 const dh=subject.height*fit*settings.scale;
 const x=settings.x*w-dw/2;
 const y=settings.y*h-dh/2;
 ctx.drawImage(subject,x,y,dw,dh);
}

function drawImageCard(canvas,frame,subject,cap,person,capSettings,name,withCap=true,background='deep-green'){
 if(!canvas||!frame||!subject)return;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const {width:w,height:h}=SIZE;
 if(canvas.width!==w)canvas.width=w;
 if(canvas.height!==h)canvas.height=h;
 ctx.clearRect(0,0,w,h);
 // Apply the learner's background choice to the actual canvas, not merely CSS.
 // This same compositor powers the live preview and the downloaded PNG.
 if(background==='white'){
  ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
 }else{
  const isTeal=background==='teal';
  const base=ctx.createLinearGradient(0,0,0,h);
  if(isTeal){
   base.addColorStop(0,'#168d85');base.addColorStop(.52,'#0e6863');base.addColorStop(1,'#064b48');
  }else{
   base.addColorStop(0,'#0d5954');base.addColorStop(.52,'#073b39');base.addColorStop(1,'#032c2b');
  }
  ctx.fillStyle=base;ctx.fillRect(0,0,w,h);
  const light=ctx.createRadialGradient(w*.53,h*.30,w*.04,w*.53,h*.30,w*.77);
  light.addColorStop(0,isTeal?'rgba(127,236,204,.25)':'rgba(55,149,129,.31)');
  light.addColorStop(.58,isTeal?'rgba(63,173,154,.14)':'rgba(19,95,86,.12)');
  light.addColorStop(1,'rgba(19,95,86,0)');
  ctx.fillStyle=light;ctx.fillRect(0,0,w,h);
 }
 drawSubject(ctx,subject,person,w,h);
 if(withCap&&cap){
  const cw=capSettings.width*w,ch=cw*cap.height/cap.width;
  ctx.save();ctx.translate(capSettings.x*w,capSettings.y*h);ctx.rotate(capSettings.rotation*Math.PI/180);
  ctx.drawImage(cap,-cw/2,-ch/2,cw,ch);ctx.restore();
 }
 // The supplied transparent artwork is an OVERLAY, not an opaque backdrop.
 // Place it over the portrait so its original teal/gold corners stay visible.
 ctx.drawImage(frame,0,0,w,h);
 // Reserve a dark teal footer for readable names while keeping the portrait vibrant.
 const shade=ctx.createLinearGradient(0,h*.70,0,h);
 shade.addColorStop(0,'rgba(1,29,28,0)');
 shade.addColorStop(.45,'rgba(1,29,28,.83)');
 shade.addColorStop(1,'rgba(1,29,28,.99)');
 ctx.fillStyle=shade;ctx.fillRect(0,h*.70,w,h*.30);
 ctx.textAlign='left';
 ctx.fillStyle='#c6ff52';ctx.font='800 32px Arial,sans-serif';ctx.fillText('WOMATE   /   SHE LEADS',70,h-242);
 ctx.fillStyle='#fff';
 const full=(name||'WOMATE GRADUATE').trim();
 let f=64;ctx.font=`800 ${f}px Arial,sans-serif`;
 while(f>35&&ctx.measureText(full).width>w-140){f-=2;ctx.font=`800 ${f}px Arial,sans-serif`;}
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
  else if(host==='youtube.com'||host==='m.youtube.com'||host==='youtube-nocookie.com')id=u.searchParams.get('v')||(/\/(?:embed|shorts|live)\/([\w-]+)/.exec(u.pathname)||[])[1]||'';
  if(/^[\w-]{11}$/.test(id))return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
  if(host==='player.vimeo.com'||host==='vimeo.com'){
   const v=(u.pathname.match(/(?:video\/)?(\d+)/)||[])[1];
   if(v)return `https://player.vimeo.com/video/${v}`;
  }
   if(host==='drive.google.com'){const fileId=(u.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]+)\/(?:view|preview)?/)||[])[1];if(fileId)return `https://drive.google.com/file/d/${fileId}/preview`}
 }catch{}
 return'';
}

function GradVideo(){
 const [playing,setPlaying]=useState(false);
 const url=videoEmbedUrl(import.meta.env.VITE_CANOPY_GRADUATION_VIDEO_URL||'https://drive.google.com/file/d/1HXAoemWlZukESwqE_pqLtQzY5vFVcQ-U/view');
 return <section className="cgrad-video" aria-label="Graduation video message">
  <div className="cgrad-video-art">
   {url&&playing?<iframe src={url+(url.includes('?')?'&':'?')+'autoplay=1'} title="A congratulatory message from the WOMATE CEO" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:<>
    <img src={`${ASSET}womate-neon.webp`} alt="" className="cgrad-video-logo"/>
    <div className="cgrad-video-caption">A congratulatory message from our CEO</div>
    {url?<button type="button" className="cgrad-video-play" onClick={()=>setPlaying(true)} aria-label="Play the CEO graduation congratulations video"><Play size={30} fill="currentColor"/></button>:<div className="cgrad-video-soon"><Play size={24}/><span>Our message is coming</span></div>}
   </>}
  </div>
  <h2>A message from our CEO <Heart size={17} aria-hidden="true"/></h2>
  <p className="cgrad-script">A special message to celebrate your She Leads journey.</p>
 </section>;
}

function PortraitStudio({graduateName}){
 const canvasRef=useRef(null),stageRef=useRef(null),fileRef=useRef(null),objectUrlRef=useRef(null),dragRef=useRef(null);
 const sourcePhotoRef=useRef(null),subjectRef=useRef(null),capRef=useRef(null),frameRef=useRef(null);
 const [photoLoaded,setPhotoLoaded]=useState(false),[capLoaded,setCapLoaded]=useState(false),[frameLoaded,setFrameLoaded]=useState(false),[processing,setProcessing]=useState(false);
 const [cap,setCap]=useState(START_CAP),[person,setPerson]=useState(START_PHOTO),[notice,setNotice]=useState('');
 const [exporting,setExporting]=useState(false),[assetError,setAssetError]=useState(false),[frameError,setFrameError]=useState(false);
 const [photoVersion,setPhotoVersion]=useState(0),[showGuides,setShowGuides]=useState(true);
 const [background,setBackground]=useState('deep-green');
 const [withCap,setWithCap]=useState(false);
 const uploadRequestRef=useRef(0); // WOMATE_GRAD_ALL_IN_ONE_V6
 const cleanPhoto=useCallback(()=>{if(objectUrlRef.current){URL.revokeObjectURL(objectUrlRef.current);objectUrlRef.current=null;} sourcePhotoRef.current=null;subjectRef.current=null;},[]);
 useEffect(()=>()=>{cleanPhoto()},[cleanPhoto]);
 useEffect(()=>{
  let mounted=true;
  const capImg=new Image();
  capImg.onload=()=>{if(mounted){capRef.current=capImg;setCapLoaded(true);setAssetError(false);}};
  capImg.onerror=()=>{if(mounted)setAssetError(true)};
  capImg.src=ASSET+'portrait-cap-v6.webp';
  const frameImg=new Image();
  frameImg.onload=()=>{if(mounted){frameRef.current=frameImg;setFrameLoaded(true);setFrameError(false);}};
  frameImg.onerror=()=>{if(mounted)setFrameError(true)};
  frameImg.src=ASSET+'portrait-frame-v6.webp';
  return()=>{mounted=false;capImg.onload=null;capImg.onerror=null;frameImg.onload=null;frameImg.onerror=null;};
 },[]);
 useEffect(()=>{drawImageCard(canvasRef.current,frameRef.current,subjectRef.current,capRef.current,person,cap,graduateName,withCap,background);},[photoLoaded,capLoaded,frameLoaded,person,cap,graduateName,photoVersion,background,withCap]);
 const selectFile=()=>{
  if(processing||!fileRef.current)return;
  fileRef.current.value='';
  fileRef.current.click();
 };
 const clearPhoto=()=>{
  uploadRequestRef.current+=1; // cancel pending segmentation results
  cleanPhoto();
  if(fileRef.current)fileRef.current.value='';
  setPhotoLoaded(false);setProcessing(false);
  setPerson({...START_PHOTO});setCap({...START_CAP});
  setPhotoVersion(v=>v+1);setShowGuides(true);
  setNotice('Photo removed. Choose another photo to create your portrait.');
 };
 const nudgePerson=(dx=0,dy=0)=>setPerson(v=>({...v,x:clamp(v.x+dx,.18,.82),y:clamp(v.y+dy,.18,.82)}));
 const setPhotoStandard=()=>setPerson({...START_PHOTO});
 const onFile=async e=>{
  const file=e.target.files?.[0];
  e.target.value=''; // choosing this same file later must still trigger change
  if(!file)return;
  if(!file.type.startsWith('image/')){setNotice('Please choose a JPG, PNG or WebP photo.');return;}
  if(file.size>12*1024*1024){setNotice('Choose a photo smaller than 12 MB.');return;}
  if(!frameLoaded){setNotice('The WOMATE teal portrait frame is still loading; try again shortly.');return;}

  const request=++uploadRequestRef.current;
  cleanPhoto(); // revoke previous object URL and erase the old processed cutout
  setPhotoLoaded(false);setProcessing(true);setShowGuides(true);
  setNotice('Removing the old photo and preparing your new portrait…');
  setPerson({...START_PHOTO});setCap({...START_CAP});
  const url=URL.createObjectURL(file);
  objectUrlRef.current=url;
  const img=new Image();
  img.onload=async()=>{
   if(request!==uploadRequestRef.current||objectUrlRef.current!==url)return;
   sourcePhotoRef.current=img;
   try{
    const cutout=await buildCutoutFromPhoto(img);
    if(request!==uploadRequestRef.current||objectUrlRef.current!==url)return;
    subjectRef.current=cutout;
    setPhotoVersion(v=>v+1); // force a fresh canvas after each successful upload
    setPhotoLoaded(true);
    setNotice('Photo ready. The graduation cap is optional; choose your preferred portrait style.');
   }catch(err){
    if(request!==uploadRequestRef.current)return;
    console.error('[WOMATE graduation] Background removal failed',err);
    setPhotoLoaded(false);
    setNotice('Background removal could not finish: '+String(err?.message||'browser processing error').slice(0,150)+'. Please try a clear JPG or PNG. Your original background will never be used.');
   }finally{
    if(request===uploadRequestRef.current)setProcessing(false);
   }
  };
  img.onerror=()=>{
   if(request!==uploadRequestRef.current)return;
   setPhotoLoaded(false);setProcessing(false);
   setNotice('That photo could not be opened. Please choose a JPG, PNG or WebP file.');
   cleanPhoto();
  };
  img.src=url;
 };
 const pointerDown=e=>{
  if(!photoLoaded||!withCap||!capLoaded)return;
  e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);
  dragRef.current={id:e.pointerId,px:e.clientX,py:e.clientY,starting:cap};
 };
 const pointerMove=e=>{
  const d=dragRef.current,rect=stageRef.current?.getBoundingClientRect();
  if(!d||d.id!==e.pointerId||!rect)return;
  e.preventDefault();
  setCap(v=>({...v,x:clamp(d.starting.x+(e.clientX-d.px)/rect.width,-.10,1.10),y:clamp(d.starting.y+(e.clientY-d.py)/rect.height,-.04,.82)}));
 };
 const pointerUp=e=>{if(dragRef.current?.id===e.pointerId)dragRef.current=null;};
 const tweakCap=(field,delta)=>setCap(v=>({...v,[field]:clamp(v[field]+delta,field==='width'?.28:field==='rotation'?-50:-.2,field==='width'?1.30:field==='rotation'?50:1.2)}));
 const fitCap=async()=>{
  const photo=sourcePhotoRef.current;
  if(!photo){selectFile();return;}
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
     const width=clamp(box.width*scale*1.5/SIZE.width,.28,1.30);
     setCap({x,y,width,rotation:0});
     setNotice('Cap placed near your head. Fine-tune it if you want.');
     return;
    }
   }
  }catch{}
  setCap({...START_CAP});
  setNotice('Cap reset to its starting position. Drag it onto your head if needed.');
 };
 const exportPortrait=async()=>{
  if(!subjectRef.current){selectFile();return;}
  if(!frameRef.current||(withCap&&!capRef.current)){setNotice('The portrait decoration is still loading. Please try again.');return;}
  setExporting(true);setNotice('');
  const temp=document.createElement('canvas');
  drawImageCard(temp,frameRef.current,subjectRef.current,capRef.current,person,cap,graduateName,withCap,background);
  try{
   const blob=await new Promise(resolve=>temp.toBlob(resolve,'image/png'));
   if(!blob)throw new Error('Unable to export portrait');
   const url=URL.createObjectURL(blob);
   const anchor=document.createElement('a');anchor.href=url;anchor.download='WOMATE-Cohort-2-Graduate.png';document.body.appendChild(anchor);anchor.click();anchor.remove();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
   setNotice('Your graduation portrait has been saved!');
  }catch{
   setNotice('Unable to download the portrait. Please try again.');
  }finally{setExporting(false);}
 };
 return <section className="cgrad-studio" aria-label="Create your graduation portrait">
  <div className="cgrad-studio-head"><div><span className="cgrad-kicker">YOUR GRADUATION PORTRAIT</span><h2>Wear your moment.</h2></div><div className="cgrad-photo-actions"><button type="button" className="cgrad-upload" onClick={selectFile} disabled={processing}><ImagePlus size={18}/> {photoLoaded?'Replace photo':'Upload photo'}</button>{photoLoaded&&<button type="button" className="cgrad-clear-photo" onClick={clearPhoto} disabled={processing}><RotateCcw size={15}/> Clear photo</button>}</div></div>
  <input ref={fileRef} type="file" accept="image/*" className="cgrad-file" onChange={onFile} aria-label="Upload a photo for your graduation portrait"/>
  <div className="cgrad-background-selector" role="group" aria-label="Choose your graduation portrait background">
   <div className="cgrad-background-title"><strong>Choose your background</strong><span>Same portrait, three beautiful finishes.</span></div>
   <div className="cgrad-background-choices">
    {PORTRAIT_BACKGROUNDS.map(option=><button type="button" key={option.id} className={`cgrad-background-choice${background===option.id?' is-selected':''}`} aria-pressed={background===option.id} onClick={()=>setBackground(option.id)}>
     <span className={`cgrad-background-swatch cgrad-background-swatch--${option.id}`} aria-hidden="true"/>
     <span className="cgrad-background-name">{option.label}</span>
     {background===option.id&&<Check size={15} aria-hidden="true"/>}
    </button>)}
   </div>
  </div>
  <div className="cgrad-background-selector" role="group" aria-label="Choose whether to wear a graduation cap">
   <div className="cgrad-background-title"><strong>Graduation cap</strong><span>Optional — your portrait, your choice.</span></div>
   <div className="cgrad-background-choices" style={{gridTemplateColumns:'repeat(2,minmax(0,1fr))'}}>
    <button type="button" className={`cgrad-background-choice${!withCap?' is-selected':''}`} aria-pressed={!withCap} onClick={()=>{setWithCap(false);setNotice('Your portrait will be downloaded without a cap.')}}>Without cap {!withCap&&<Check size={15} aria-hidden="true"/>}</button>
    <button type="button" className={`cgrad-background-choice${withCap?' is-selected':''}`} aria-pressed={withCap} onClick={()=>{setWithCap(true);setNotice('Cap added. Adjust the placement and size below.')}}>With cap {withCap&&<Check size={15} aria-hidden="true"/>}</button>
   </div>
  </div>
  <div className="cgrad-stage" ref={stageRef} data-background={background}>
   {photoLoaded?<><canvas key={photoVersion} ref={canvasRef} width={SIZE.width} height={SIZE.height} aria-label={`Graduation portrait preview with ${PORTRAIT_BACKGROUNDS.find(option=>option.id===background)?.label||"Deep Green"} background, transparent teal decorations and ${withCap?"optional graduation cap":"no graduation cap"}`}/>
    {withCap&&capLoaded&&<div role="img" aria-label="Drag to position the WOMATE graduation cap on your head" tabIndex={0} className={`cgrad-cap-overlay${showGuides?'':' is-clean'}`} style={{left:`${cap.x*100}%`,top:`${cap.y*100}%`,width:`${cap.width*100}%`,transform:`translate(-50%,-50%) rotate(${cap.rotation}deg)`}} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onKeyDown={e=>{const arrows={ArrowLeft:['x',-.01],ArrowRight:['x',.01],ArrowUp:['y',-.01],ArrowDown:['y',.01]};if(arrows[e.key]){e.preventDefault();tweakCap(...arrows[e.key]);}}}>
     {/* Cap visual is already rendered into the canvas so preview and export match. */}
     <i className="cgrad-handle top-left"/><i className="cgrad-handle top-right"/><i className="cgrad-handle bottom-left"/><i className="cgrad-handle bottom-right"/>
    </div>}
   </>:<button type="button" className="cgrad-stage-placeholder" onClick={selectFile} disabled={processing}><span className="cgrad-stage-icon"><ImagePlus size={35}/></span><strong>Make it yours.</strong><span>Upload a clear photo. Its original background is removed, then choose White, Deep Green or Teal, with refined transparent WOMATE graduation decorations.</span><span className="cgrad-stage-cta">Choose my photo <Plus size={16}/></span></button>}
   {processing&&<div className="cgrad-processing" aria-live="polite"><Sparkles size={20}/><span>Removing your background on this device…</span></div>}
  </div>
  {withCap&&assetError&&<p className="cgrad-status" role="alert">The updated graduation cap asset has not been installed yet.</p>}
  {frameError&&<p className="cgrad-status" role="alert">The refined WOMATE teal portrait frame did not load. Check portrait-frame-v6.webp.</p>}
  {photoLoaded&&withCap&&<div className="cgrad-guide-toggle"><span>Preview and download use the same finished artwork.</span><button type="button" onClick={()=>setShowGuides(v=>!v)}>{showGuides?'Hide cap guides':'Show cap guides'}</button></div>}
  {photoLoaded&&<div className="cgrad-editor-stack">
   <div className="cgrad-control-card">
    <div className="cgrad-control-head"><strong>Photo</strong><span>Your own background is removed automatically.</span></div>
    <div className="cgrad-photo-grid">
     <button type="button" onClick={()=>nudgePerson(0,-.02)}><Move size={18}/> Up</button>
     <button type="button" onClick={()=>nudgePerson(-.02,0)}><Move size={18}/> Left</button>
     <button type="button" onClick={()=>setPerson(v=>({...v,x:.5}))}><Sparkles size={18}/> Center</button>
     <button type="button" onClick={()=>nudgePerson(.02,0)}><Move size={18}/> Right</button>
     <button type="button" onClick={()=>nudgePerson(0,.02)}><Move size={18}/> Down</button>
     <button type="button" onClick={setPhotoStandard}><RotateCcw size={18}/> Standard</button>
    </div>
    <label className="cgrad-range">Zoom <button type="button" aria-label="Zoom out" onClick={()=>setPerson(v=>({...v,scale:clamp(v.scale-.04,.72,1.55)}))}><Minus size={16}/></button><input aria-label="Portrait zoom" type="range" min="72" max="155" step="1" value={Math.round(person.scale*100)} onChange={e=>setPerson(v=>({...v,scale:Number(e.target.value)/100}))}/><button type="button" aria-label="Zoom in" onClick={()=>setPerson(v=>({...v,scale:clamp(v.scale+.04,.72,1.55)}))}><Plus size={16}/></button><output>{Math.round(person.scale*100)}%</output></label>
   </div>
   {withCap&&<div className="cgrad-control-card">
    <div className="cgrad-control-head"><strong>Cap</strong><span>Use Fit cap or drag it yourself.</span></div>
    <div className="cgrad-cap-grid">
     <button type="button" onClick={()=>tweakCap('y',-.02)}><Move size={18}/> Up</button>
     <button type="button" onClick={()=>tweakCap('x',-.02)}><Move size={18}/> Left</button>
     <button type="button" onClick={fitCap}><Sparkles size={18}/> Fit cap</button>
     <button type="button" onClick={()=>tweakCap('x',.02)}><Move size={18}/> Right</button>
     <button type="button" onClick={()=>tweakCap('y',.02)}><Move size={18}/> Down</button>
     <button type="button" onClick={()=>setCap({...START_CAP})}><RotateCcw size={18}/> Reset</button>
    </div>
    <label className="cgrad-range">Size <button type="button" aria-label="Make cap smaller" onClick={()=>tweakCap('width',-.04)}><Minus size={16}/></button><input aria-label="Graduation cap size" type="range" min="28" max="130" step="1" value={Math.round(cap.width*100)} onChange={e=>setCap(v=>({...v,width:Number(e.target.value)/100}))}/><button type="button" aria-label="Make cap bigger" onClick={()=>tweakCap('width',.04)}><Plus size={16}/></button><output>{Math.round(cap.width*100)}%</output></label>
    <label className="cgrad-range">Rotate <button type="button" aria-label="Turn cap left" onClick={()=>tweakCap('rotation',-2)}><Minus size={16}/></button><input aria-label="Graduation cap rotation" type="range" min="-50" max="50" step="1" value={cap.rotation} onChange={e=>setCap(v=>({...v,rotation:Number(e.target.value)}))}/><button type="button" aria-label="Turn cap right" onClick={()=>tweakCap('rotation',2)}><Plus size={16}/></button><output>{cap.rotation}°</output></label>
   </div>}
  </div>}
  <button type="button" className="cgrad-download" disabled={!photoLoaded||(withCap&&!capLoaded)||!frameLoaded||processing||exporting} onClick={exportPortrait}><Download size={20}/>{exporting?'Preparing your portrait…':'Download my graduation portrait'}</button>
  <p className="cgrad-local-hint"><ShieldCheck size={14}/> Your photo stays on this device.</p>
  {notice&&<p role="status" className="cgrad-status">{notice}</p>}
 </section>;
}

const DANCE_VIDEO='BbOao2XdIMk';
function GraduationDanceWelcome({onClose,tester=false}){
 useEffect(()=>{const key=e=>{if(e.key==='Escape')onClose()};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[onClose]);
 return <div className="cgrad-dance-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
  <section className="cgrad-dance-dialog" role="dialog" aria-modal="true" aria-labelledby="cgrad-dance-title">
   <div className="cgrad-dance-head"><div><span>{tester?'TESTER PREVIEW · REPLAY AVAILABLE':'SHE LEADS CLIMATE · COHORT 2'}</span><h2 id="cgrad-dance-title">You made it. Now dance! ✨</h2><p>A moment to celebrate everything you have achieved.</p></div><button type="button" onClick={onClose} aria-label="Close celebration video"><X size={20}/></button></div>
   <div className="cgrad-dance-video"><iframe title="WOMATE graduation celebration dance" src={`https://www.youtube-nocookie.com/embed/${DANCE_VIDEO}?autoplay=1&mute=1&playsinline=1&rel=0`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/></div>
   <div className="cgrad-dance-actions"><span>Tap the video to unmute.</span><button type="button" onClick={onClose}>Continue to graduation <Check size={16}/></button></div>
  </section>
 </div>;
}

export default function CanopyGraduationPortal({viewer,tester=false}){
 const [now,setNow]=useState(Date.now());
 const [data,setData]=useState(null),[certs,setCerts]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [reflection,setReflection]=useState(''),[displayName,setDisplayName]=useState(viewer?.profile?.full_name||'');
 const [showNote,setShowNote]=useState(false),[reflectionSaved,setReflectionSaved]=useState('');
 const [danceOpen,setDanceOpen]=useState(false),[danceChecked,setDanceChecked]=useState(false);
 const delta=Math.max(0,OPEN_AT-now),opened=now>=OPEN_AT;
 const unlocked=tester||Boolean(data?.can_enter&&opened);
 const danceKey='womate_c2_graduation_dance_2026_'+(viewer?.user?.id||viewer?.profile?.user_id||'guest');
 useEffect(()=>{if(!unlocked||tester||danceChecked)return;let alive=true;setDanceChecked(true);(async()=>{try{if(localStorage.getItem(danceKey)==='seen')return;const seen=await getMyGraduationDanceSeen(viewer.session);if(seen){localStorage.setItem(danceKey,'seen');return}await markMyGraduationDanceSeen(viewer.session);localStorage.setItem(danceKey,'seen');if(alive)setDanceOpen(true)}catch(e){console.warn('Graduation welcome acknowledgement unavailable',e)}})();return()=>{alive=false}},[unlocked,tester,danceChecked,danceKey,viewer?.session?.access_token]);

 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(t);},[]);
 useEffect(()=>{
  // Tester sees the same persisted, moderated Supabase feed as graduates.
  // It is no longer a local, disposable mock note.
  let live=true;
  async function load(){
   try{
    const [overview,items]=await Promise.all([
     getCanopyGraduationOverview(viewer.session),
     tester?Promise.resolve([]):getCertificates(viewer.session)
    ]);
    if(live){setData(overview);setCerts(items||[]);setError('');}
   }catch(e){if(live)setError(e.message||'Graduation information is temporarily unavailable.');}
  }
  load();
  const timer=setInterval(load,30000);
  return()=>{live=false;clearInterval(timer);};
 },[viewer?.session?.access_token,tester]);
 async function shareReflection(e){
  e.preventDefault();if(!reflection.trim()||reflection.trim().length<30||!unlocked)return;
  setBusy(true);setError('');setReflectionSaved('');
  try{
   // Only report success after Supabase confirms the write.
   await submitCanopyGraduationReflection(viewer.session,{displayName,reflection});
   const next=await getCanopyGraduationOverview(viewer.session);
   setData(next);setReflection('');setShowNote(false);
   setReflectionSaved('Your note is saved to the graduation wall and will remain after refresh. Eligible graduates can see it once graduation opens.');
  }catch(e){setError(e.message||'Could not save your note. Please try again.');}
  finally{setBusy(false);}
 }
 return <main className="cgrad-page">
  <div className="cgrad-decor cgrad-decor-ribbon" aria-hidden="true"/><div className="cgrad-decor cgrad-decor-confetti" aria-hidden="true"/><div className="cgrad-decor cgrad-decor-balloons" aria-hidden="true"/><div className="cgrad-decor cgrad-decor-stars" aria-hidden="true"/>
  <div className="cgrad-content">
   <header className="cgrad-celebrate">
    <span className="cgrad-kicker">WOMATE · SHE LEADS · COHORT 2 · 2026</span>
    {unlocked?<><span className="cgrad-crown" aria-hidden="true">✦ ♡ ✦</span><h1>CONGRATULATIONS!</h1><p>YOU DID IT! <Heart size={15} fill="currentColor" aria-hidden="true"/></p></>:<><h1 className="cgrad-wait-title">Your moment is almost here.</h1><p>29 OCTOBER 2026 · GRADUATION DAY</p></>}
   </header>
   {tester&&<div className="cgrad-test"><ShieldCheck size={18}/> TESTER PREVIEW · Photos stay local. Certificate links are simulated; graduation notes are saved to the shared wall. <button type="button" className="cgrad-dance-preview-btn" onClick={()=>setDanceOpen(true)}><RefreshCw size={15}/> Preview welcome dance</button></div>}
   {error&&<p className="cgrad-error" role="alert">{error}</p>}
   {!unlocked?<section className="cgrad-gated"><LockKeyhole size={26}/><h2>{!opened?'The celebration opens on 29 October.':'Your graduation access is being verified.'}</h2>{!opened&&<div className="cgrad-countdown" role="timer"><div><strong>{Math.floor(delta/86400000)}</strong><span>Days</span></div><div><strong>{fmt(Math.floor(delta%86400000/3600000))}</strong><span>Hours</span></div><div><strong>{fmt(Math.floor(delta%3600000/60000))}</strong><span>Minutes</span></div></div>}<p>Official certificates and WOMATE graduation approval are required for learner access. If your status looks wrong, email <a href="mailto:womatead@gmail.com">WOMATE support</a>.</p></section>:<>
    <div className="cgrad-main-layout"><PortraitStudio graduateName={displayName}/><aside className="cgrad-aside"><GradVideo/><div className="cgrad-certificate"><Award size={22}/><div><strong>Your official certificate</strong>{tester?<span>Available here when issued to an eligible learner.</span>:certs.length?certs.map(c=><a key={c.id} href={c.drive_url} target="_blank" rel="noopener noreferrer">View certificate ↗</a>):<span>No certificate link is available yet.</span>}</div></div></aside></div>
    <section className="cgrad-voices"><div className="cgrad-voices-head"><div><span className="cgrad-kicker">THE WOMEN BEHIND THE JOURNEY</span><h2>Our voices. Our next chapter.</h2></div><button type="button" onClick={()=>{setReflectionSaved('');setShowNote(v=>!v);}} aria-expanded={showNote}><Heart size={16}/> {showNote?'Close':'Leave your note'} <ChevronDown size={16}/></button></div>
     {reflectionSaved&&<p className="cgrad-status" role="status">{reflectionSaved}</p>}
     {showNote&&<form className="cgrad-reflection-form" onSubmit={shareReflection}><label>Your name<input value={displayName} onChange={e=>setDisplayName(e.target.value)} minLength={2} maxLength={100} required/></label><label>Your reflection<textarea value={reflection} onChange={e=>setReflection(e.target.value)} minLength={30} maxLength={1200} required placeholder="What are you taking into your next chapter?"/></label><button type="submit" disabled={busy||reflection.trim().length<30}><Send size={16}/>{busy?'Sharing…':'Share my reflection'}</button></form>}
     <div className="cgrad-reflection-list">{(data?.reflections||[]).length?(data.reflections||[]).slice(0,100).map(r=><blockquote key={r.id}><p>“{r.reflection}”</p><footer>{r.display_name}</footer></blockquote>):<p className="cgrad-no-reflections">Be the first to celebrate your journey with the class.</p>}</div>
    </section>
   </>}
  </div>
 </main>;
}
