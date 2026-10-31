import React,{useMemo,useState,useEffect} from 'react';
import {ArrowLeft,ArrowRight,Minus,Plus,Maximize2,Minimize2,SunMoon} from 'lucide-react';
import './PublicationFlipbook.css';

function chapters(text){
 const raw=String(text||'').trim();
 if(!raw)return [];
 const paras=raw.split(/\n\s*\n/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
 const pages=[];let page=[],characters=0;
 for(const para of paras){
  // Shorter pages keep the reader spacious on medium screens.
  const segments=para.match(/.{1,570}(?:\s|$)/g)||[para];
  for(const segment of segments){
   const t=segment.trim();if(!t)continue;
   if(characters+t.length>780&&page.length){pages.push(page);page=[];characters=0;}
   page.push(t);characters+=t.length;
  }
 }
 if(page.length)pages.push(page);
 return pages;
}
export default function PublicationFlipbook({publication,embed,source}){
 const pages=useMemo(()=>chapters(publication.article_text),[publication.article_text]);
 const [spread,setSpread]=useState(0),[zoom,setZoom]=useState(100),[night,setNight]=useState(false),[focus,setFocus]=useState(false);
 const total=Math.max(1,Math.ceil((pages.length+1)/2));
 const forward=()=>setSpread(v=>Math.min(total-1,v+1));
 const backward=()=>setSpread(v=>Math.max(0,v-1));
 useEffect(()=>{const keys=e=>{if(e.key==='ArrowRight')forward();if(e.key==='ArrowLeft')backward();if(e.key==='Escape')setFocus(false)};if(focus)window.addEventListener('keydown',keys);return()=>window.removeEventListener('keydown',keys)},[focus,total]);
 const page=(n)=>n<1?<div className="wflipCover"><span>WOMATE · WOMEN IN CLIMATE</span><strong>{publication.title}</strong><p>By {publication.name}</p><small>{publication.kind} · {publication.country||'Africa'}</small><div className="wflipCoverMark" aria-hidden="true">W</div></div>:<><div className="wflipPageHeader"><span>WOMATE PUBLICATIONS</span><span>{publication.kind}</span></div><div className="wflipPageText">{(pages[n-1]||[]).map((p,i)=><p key={i}>{p}</p>)}</div><div className="wflipFolio"><span>{publication.title}</span><b>{n}</b></div></>;
 const left=spread*2,right=left+1;
 return <section className={'wflip '+(night?'wflipNight ':'')+(focus?'wflipFocus ':'')} aria-label="Interactive publication flipbook">
  <div className="wflipTop"><div><span className="wflipEyebrow">THE READING ROOM</span><h2>Read the publication.</h2></div><div className="wflipTools" aria-label="Reading settings"><button type="button" onClick={()=>setZoom(v=>Math.max(85,v-10))} aria-label="Decrease text size"><Minus size={16}/> A</button><button type="button" onClick={()=>setZoom(v=>Math.min(125,v+10))} aria-label="Increase text size">A <Plus size={16}/></button><button type="button" onClick={()=>setNight(v=>!v)} aria-label="Toggle reading theme"><SunMoon size={18}/></button><button type="button" onClick={()=>setFocus(v=>!v)} aria-label={focus?'Exit focus mode':'Focus on reading'}>{focus?<Minimize2 size={18}/>:<Maximize2 size={18}/>}</button></div></div>
  <div className="wflipStage"><button type="button" className="wflipArrow" onClick={backward} disabled={spread===0} aria-label="Previous pages"><ArrowLeft size={22}/></button><div className="wflipBook" style={{'--wflip-font':zoom+'%'}}><div className="wflipPaper wflipLeft" key={'l'+left}>{page(left)}</div><div className="wflipPaper wflipRight" key={'r'+right}>{page(right)}</div></div><button type="button" className="wflipArrow" onClick={forward} disabled={spread>=total-1} aria-label="Next pages"><ArrowRight size={22}/></button></div>
  <div className="wflipBottom"><span>Pages {left===0?'Cover':left}–{Math.min(right,pages.length)} · {pages.length} text pages</span><div className="wflipDots" aria-label="Book progress">{Array.from({length:Math.min(total,16)},(_,i)=><button type="button" key={i} className={spread===i?'current':''} onClick={()=>setSpread(i)} aria-label={'Go to spread '+(i+1)}/>)}</div><span>Use arrows to turn pages</span></div>
  <div className="wflipMobile"><span className="wflipEyebrow">MOBILE READING EDITION</span><h3>{publication.title}</h3><p className="wflipMobileBy">By {publication.name}</p>{pages.length?pages.flat().map((t,i)=><p key={i}>{t}</p>):<p>Read the original publication below.</p>}</div>
  {embed&&<details className="wflipOriginal"><summary>View the original document <span>PDF / original formatting</span></summary><iframe src={embed} loading="lazy" title={'Original document for '+publication.title}/></details>}
  {source&&<a className="wflipSource" href={source} target="_blank" rel="noopener noreferrer">Open or download original document ↗</a>}
 </section>
}
