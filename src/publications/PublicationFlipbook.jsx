import React,{useState,useEffect,useRef} from 'react';
import {ArrowLeft,ArrowRight,Maximize2,Minimize2,ExternalLink} from 'lucide-react';
import * as pdfjs from 'pdfjs-dist/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import './PublicationFlipbook.css';
pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;

function PdfSheet({pdf,page,large=false}){
 const canvas=useRef(null);
 useEffect(()=>{
  let active=true,task;
  if(!pdf||!page||!canvas.current)return;
  (async()=>{try{
   const p=await pdf.getPage(page);if(!active)return;
   const v=p.getViewport({scale:1});
   const width=large?950:Math.min(900,Math.max(390,window.innerWidth*.39));
   const viewport=p.getViewport({scale:Math.min(2.2,width/v.width)});
   const el=canvas.current;if(!el||!active)return;
   el.width=Math.round(viewport.width);el.height=Math.round(viewport.height);
   task=p.render({canvasContext:el.getContext('2d'),viewport});
   await task.promise;
  }catch(e){if(active)console.warn('Page render unavailable',e)}})();
  return()=>{active=false;try{task?.cancel()}catch{}};
 },[pdf,page,large]);
 return <div className="wflipPdfSheet">{pdf&&page<=pdf.numPages?<canvas ref={canvas} aria-label={'Original PDF page '+page}/>:<div className="wflipBlank" aria-hidden="true"><span>WOMATE</span></div>}</div>;
}
export default function PublicationFlipbook({publication,embed,source,compact=false}){
 const [pdf,setPdf]=useState(null),[error,setError]=useState(''),[spread,setSpread]=useState(0),[focus,setFocus]=useState(false),[single,setSingle]=useState(false);
 const task=useRef(null);
 useEffect(()=>{
  let mounted=true;setPdf(null);setError('');setSpread(0);
  const url='/api/publication-pdf?id='+encodeURIComponent(publication.id);
  const loading=pdfjs.getDocument({url,withCredentials:false});task.current=loading;
  loading.promise.then(p=>{if(mounted)setPdf(p)}).catch(()=>{if(mounted)setError('The original PDF cannot load in the flipbook right now.')});
  return()=>{mounted=false;loading.destroy().catch(()=>{})};
 },[publication.id]);
 useEffect(()=>{const fn=()=>setSingle(window.matchMedia('(max-width: 700px)').matches);fn();window.addEventListener('resize',fn);return()=>window.removeEventListener('resize',fn)},[]);
 const count=pdf?.numPages||0;
 // Desktop spread: 1 left, 2 right; 3 left, 4 right. Mobile: one original page.
 const maxSpread=single?Math.max(0,count-1):Math.max(0,Math.ceil(count/2)-1);
 const i=Math.min(spread,maxSpread),left=single?i+1:i*2+1,right=left+1;
 const go=n=>setSpread(Math.max(0,Math.min(maxSpread,n)));
 useEffect(()=>{const key=e=>{if(e.key==='Escape')setFocus(false);if(!focus)return;if(e.key==='ArrowRight')go(i+1);if(e.key==='ArrowLeft')go(i-1)};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key)},[focus,i,maxSpread]);
 return <section className={'wflip wflipPdf '+(compact?'wflipCompact ':'')+(focus?'wflipFocus':'')} aria-label={'Original PDF flipbook: '+publication.title}>
 {!compact&&<div className="wflipTop"><div><span className="wflipEyebrow">WOMATE · ORIGINAL DOCUMENT</span><h2>Read the publication.</h2><p>Original pages, illustrations, tables and typography.</p></div><div className="wflipTools"><button type="button" onClick={()=>setFocus(v=>!v)} aria-label={focus?'Exit focus mode':'Open focus mode'}>{focus?<Minimize2 size={18}/>:<Maximize2 size={18}/>}</button></div></div>}
 {pdf?<><div className="wflipStage"><button type="button" className="wflipArrow" disabled={i===0} onClick={()=>go(i-1)} aria-label="Previous PDF pages"><ArrowLeft size={22}/></button><div className="wflipBook wflipPdfBook" key={i}><PdfSheet pdf={pdf} page={left} large={single}/>{!single&&<PdfSheet pdf={pdf} page={right}/>}</div><button type="button" className="wflipArrow" disabled={i===maxSpread} onClick={()=>go(i+1)} aria-label="Next PDF pages"><ArrowRight size={22}/></button></div><div className="wflipBottom"><span>{single?'Page '+left:'Pages '+left+(right<=count?'–'+right:'')} of {count}</span><div className="wflipDots">{Array.from({length:Math.min(maxSpread+1,20)},(_,j)=><button type="button" key={j} className={i===j?'current':''} onClick={()=>go(j)} aria-label={'Go to page group '+(j+1)}/>)}</div><span>Original PDF edition</span></div></>:<div className="wflipLoading"><p>{error||'Preparing the original PDF pages…'}</p>{embed&&<iframe src={embed} title={'Embedded original document: '+publication.title} loading="lazy" referrerPolicy="strict-origin-when-cross-origin"/>}</div>}
 {!compact&&source&&<a className="wflipSource" href={source} target="_blank" rel="noopener noreferrer">Open original PDF <ExternalLink size={14}/></a>}
 </section>;
}
