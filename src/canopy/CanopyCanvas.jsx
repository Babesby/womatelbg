import React,{useMemo,useRef,useState} from 'react';
import {Sparkles} from 'lucide-react';

const causes=[
  'Climate resilience','Climate justice','Clean energy','Biodiversity','Water security',
  'Sustainable cities','Climate & wellbeing','Women in climate leadership'
];
const audiences=[
  'Young people and early-career professionals','Women and girls','Community leaders',
  'Policy and decision-makers','Students and educators','Entrepreneurs and innovators','General public'
];
const actions=[
  'Learn and share one action.','Join a local climate effort.','Share with your community.',
  'Ask leaders to take action.','Cut one source of waste.','Protect and conserve water.',
  'Support women-led solutions.','Start a climate conversation.','Choose cleaner transport.',
  'Take one climate action today.'
];
const tones=['Clear & factual','Hopeful','Urgent but responsible','Community-centred','Professional'];
const formats=['Square post','Portrait post'];
const buttonShapes=['Pill','Rectangle'];
const MESSAGE_LIMIT=60;

const palettes=[
  {id:'canopy',label:'Canopy green',css:'#0E4D4A',type:'solid',colors:['#0E4D4A'],text:'#FFFFFF',accent:'#C6FF52'},
  {id:'forest',label:'Forest',css:'#123C2C',type:'solid',colors:['#123C2C'],text:'#FFFFFF',accent:'#C6FF52'},
  {id:'night',label:'Night teal',css:'#082F31',type:'solid',colors:['#082F31'],text:'#FFFFFF',accent:'#C6FF52'},
  {id:'lime',label:'Lime field',css:'#C6FF52',type:'solid',colors:['#C6FF52'],text:'#0E4D4A',accent:'#0E4D4A'},
  {id:'canopyGlow',label:'Canopy glow',css:'linear-gradient(135deg,#082F31 0%,#0E4D4A 55%,#16645F 100%)',type:'gradient',colors:['#082F31','#0E4D4A','#16645F'],text:'#FFFFFF',accent:'#C6FF52'},
  {id:'earth',label:'Earth',css:'linear-gradient(135deg,#173C35 0%,#6B5D38 100%)',type:'gradient',colors:['#173C35','#6B5D38'],text:'#FFFFFF',accent:'#D9F76A'},
  {id:'dawn',label:'Dawn',css:'linear-gradient(135deg,#0E4D4A 0%,#547D61 55%,#C6FF52 120%)',type:'gradient',colors:['#0E4D4A','#547D61','#C6FF52'],text:'#FFFFFF',accent:'#C6FF52'},
  {id:'paper',label:'Light paper',css:'#F4F7F2',type:'solid',colors:['#F4F7F2'],text:'#0E4D4A',accent:'#0E4D4A'}
];
const textures=[
  {id:'none',label:'None'},
  {id:'contour',label:'Contour lines'},
  {id:'grid',label:'Fine grid'},
  {id:'dots',label:'Soft dots'},
  {id:'diagonal',label:'Diagonal weave'},
  {id:'grain',label:'Paper grain'}
];
const canvasGraphics=[
  {id:'none',label:'No graphic',src:''},
  {id:'community-climate-dialogue-flood',label:'Community climate dialogue',src:'/assets/canopy/canvas-graphics/community-climate-dialogue-flood.webp'},
  {id:'youth-climate-action',label:'Youth climate action',src:'/assets/canopy/canvas-graphics/youth-climate-action.webp'},
  {id:'coastal-mangrove-planting',label:'Coastal mangrove planting',src:'/assets/canopy/canvas-graphics/coastal-mangrove-planting.webp'},
  {id:'flood-resilience-restoration',label:'Flood resilience restoration',src:'/assets/canopy/canvas-graphics/flood-resilience-restoration.webp'},
  {id:'rainwater-terraces',label:'Rainwater harvesting terraces',src:'/assets/canopy/canvas-graphics/rainwater-terraces.webp'},
  {id:'renewable-energy-landscape',label:'Renewable energy landscape',src:'/assets/canopy/canvas-graphics/renewable-energy-landscape.webp'},
  {id:'clean-energy-baobab',label:'Clean energy & baobab',src:'/assets/canopy/canvas-graphics/clean-energy-baobab.webp'},
  {id:'solar-engineer',label:'Solar engineer',src:'/assets/canopy/canvas-graphics/solar-engineer.webp'},
  {id:'solar-lantern',label:'Solar lantern',src:'/assets/canopy/canvas-graphics/solar-lantern.webp'},
  {id:'climate-planning-table',label:'Climate planning table',src:'/assets/canopy/canvas-graphics/climate-planning-table.webp'},
  {id:'mangrove-restoration-team',label:'Mangrove restoration team',src:'/assets/canopy/canvas-graphics/mangrove-restoration-team.webp'},
  {id:'community-adaptation-learning',label:'Community adaptation learning',src:'/assets/canopy/canvas-graphics/community-adaptation-learning.webp'},
  {id:'watershed-field-research',label:'Watershed field research',src:'/assets/canopy/canvas-graphics/watershed-field-research.webp'},
  {id:'green-neighbourhood-transit',label:'Green neighbourhood transit',src:'/assets/canopy/canvas-graphics/green-neighbourhood-transit.webp'},
  {id:'solar-market-neighbourhood',label:'Solar market neighbourhood',src:'/assets/canopy/canvas-graphics/solar-market-neighbourhood.webp'},
  {id:'green-city-mobility',label:'Green city mobility',src:'/assets/canopy/canvas-graphics/green-city-mobility.webp'},
  {id:'urban-rainwater-harvesting',label:'Urban rainwater harvesting',src:'/assets/canopy/canvas-graphics/urban-rainwater-harvesting.webp'},
  {id:'green-transit-stop',label:'Green transit stop',src:'/assets/canopy/canvas-graphics/green-transit-stop.webp'},
  {id:'water-quality-scientist',label:'Water quality scientist',src:'/assets/canopy/canvas-graphics/water-quality-scientist.webp'},
  {id:'community-water-point',label:'Community water point',src:'/assets/canopy/canvas-graphics/community-water-point.webp'},
  {id:'water-conservation-river',label:'Water conservation',src:'/assets/canopy/canvas-graphics/water-conservation-river.webp'},
  {id:'baobab-biodiversity',label:'Baobab biodiversity',src:'/assets/canopy/canvas-graphics/baobab-biodiversity.webp'},
  {id:'savanna-biodiversity',label:'Savanna biodiversity',src:'/assets/canopy/canvas-graphics/savanna-biodiversity.webp'},
  {id:'mangrove-biodiversity',label:'Mangrove biodiversity',src:'/assets/canopy/canvas-graphics/mangrove-biodiversity.webp'},
  {id:'biodiversity-field-research',label:'Biodiversity field research',src:'/assets/canopy/canvas-graphics/biodiversity-field-research.webp'},
  {id:'community-climate-circle',label:'Community climate circle',src:'/assets/canopy/canvas-graphics/community-climate-circle.webp'},
  {id:'inclusive-climate-planning',label:'Inclusive climate planning',src:'/assets/canopy/canvas-graphics/inclusive-climate-planning.webp'},
  {id:'coastal-mangrove-resilience',label:'Coastal mangrove resilience',src:'/assets/canopy/canvas-graphics/coastal-mangrove-resilience.webp'}
];
const graphicLayouts=['Smart fit','Watermark','Right scene','Bottom scene','Hero scene'];

function loadCanvasGraphic(src){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error('Graphic could not load.'));
    img.src=src;
  });
}
function drawGraphicContain(ctx,img,x,y,w,h,alpha=1){
  const scale=Math.min(w/img.width,h/img.height);
  const dw=img.width*scale,dh=img.height*scale;
  ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);ctx.restore();
}
function drawResponsiveGraphic(ctx,img,w,h,format,layout){
  if(layout==='Watermark') return drawGraphicContain(ctx,img,w*.09,h*.17,w*.82,h*.63,.17);
  if(layout==='Right scene') return drawGraphicContain(ctx,img,w*.51,h*.28,w*.47,h*.44,.82);
  if(layout==='Bottom scene') return drawGraphicContain(ctx,img,w*.08,h*.52,w*.84,h*.32,.88);
  if(layout==='Hero scene') return drawGraphicContain(ctx,img,w*.31,h*.31,w*.66,h*.43,.82);
  // Smart fit is intentionally format-aware so transparent artwork never looks stretched.
  if(format==='Portrait post') return drawGraphicContain(ctx,img,w*.15,h*.46,w*.70,h*.27,.88);
  return drawGraphicContain(ctx,img,w*.52,h*.40,w*.45,h*.34,.86);
}

const toneTemplates={
  'Clear & factual':()=>`Know the facts. Choose climate action that makes an impact.`,
  'Hopeful':()=>`Small climate actions can build a stronger future together.`,
  'Urgent but responsible':()=>`The climate needs action now. Choose a step that counts.`,
  'Community-centred':()=>`Climate action is stronger when communities act together.`,
  'Professional':()=>`Lead with evidence. Turn climate knowledge into action.`
};

function wrap(ctx,text,x,y,maxWidth,lineHeight,maxLines=8){
  const words=String(text||'').split(/\s+/).filter(Boolean);let line='',lines=0;
  for(let n=0;n<words.length;n++){
    const test=line+words[n]+' ';
    if(ctx.measureText(test).width>maxWidth&&line){ctx.fillText(line.trim(),x,y);line=words[n]+' ';y+=lineHeight;lines++;if(lines>=maxLines)return}
    else line=test;
  }
  if(line&&lines<maxLines)ctx.fillText(line.trim(),x,y);
}
function roundRectPath(ctx,x,y,w,h,r){
  const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
}
function fillBackground(ctx,w,h,palette){
  if(palette.type==='gradient'){
    const g=ctx.createLinearGradient(0,0,w,h);palette.colors.forEach((c,i)=>g.addColorStop(i/Math.max(1,palette.colors.length-1),c));ctx.fillStyle=g;
  }else ctx.fillStyle=palette.colors[0];
  ctx.fillRect(0,0,w,h);
}
function drawTexture(ctx,w,h,type,color){
  if(type==='none')return;ctx.save();ctx.globalAlpha=.12;ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=Math.max(1,w*.0012);
  if(type==='grid')for(let x=0;x<w;x+=w/18){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()} 
  if(type==='grid')for(let y=0;y<h;y+=h/18){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
  if(type==='dots')for(let y=h*.06;y<h;y+=h/16)for(let x=w*.05;x<w;x+=w/14){ctx.beginPath();ctx.arc(x,y,Math.max(1.5,w*.0018),0,Math.PI*2);ctx.fill()}
  if(type==='diagonal')for(let x=-h;x<w+h;x+=w/12){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x-h,h);ctx.stroke()}
  if(type==='contour')for(let i=0;i<8;i++){ctx.beginPath();ctx.ellipse(w*.72,h*.34,w*(.13+i*.035),h*(.09+i*.03),-.35,0,Math.PI*2);ctx.stroke()}
  if(type==='grain')for(let i=0;i<1100;i++){ctx.globalAlpha=.035+((i%7)/300);ctx.fillRect((i*83)%w,(i*47)%h,1.2,1.2)}
  ctx.restore();
}
function loadImage(src){return new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=src})}

export default function CanopyCanvas(){
  const initial={cause:causes[0],audience:audiences[0],actionTarget:actions[0],tone:tones[0],format:formats[0],palette:'canopy',texture:'contour',buttonShape:'Pill',graphic:'none',graphicLayout:'Smart fit',message:''};
  const[form,setForm]=useState(initial);const[note,setNote]=useState('');const lastSuggested=useRef('');
  const palette=palettes.find(x=>x.id===form.palette)||palettes[0];
  const selectedGraphic=canvasGraphics.find(x=>x.id===form.graphic)||canvasGraphics[0];
  const dims=useMemo(()=>form.format==='Square post'?[1200,1200]:[1080,1350],[form.format]);
  const suggestion=useMemo(()=>toneTemplates[form.tone](),[form.tone]);
  const update=(k,v)=>setForm(f=>({...f,[k]:v}));
  const choose=(k,v)=>setForm(f=>{const next={...f,[k]:v};const nextSuggestion=toneTemplates[next.tone]();if(!f.message||f.message===lastSuggested.current){next.message=nextSuggestion;lastSuggested.current=nextSuggestion}return next});
  const useSuggestion=()=>{lastSuggested.current=suggestion;update('message',suggestion)};

  const makeBlob=()=>new Promise(async resolve=>{
    const[w,h]=dims,c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');
    fillBackground(ctx,w,h,palette);drawTexture(ctx,w,h,form.texture,palette.text);
    /* WOMATE_CANVASCANVAS_GRAPHIC_EXPORT_V2 */
    if(selectedGraphic?.src){
      try{
        const graphic=await loadCanvasGraphic(selectedGraphic.src);
        drawResponsiveGraphic(ctx,graphic,w,h,form.format,form.graphicLayout);
      }catch{}
    }ctx.fillStyle=palette.accent;ctx.fillRect(0,0,w,Math.max(16,h*.012));
    const pad=w*.065,msg=(form.message||suggestion).slice(0,MESSAGE_LIMIT),portrait=form.format==='Portrait post';
    ctx.fillStyle=palette.accent;ctx.font=`700 ${Math.round(w*.022)}px Arial`;ctx.fillText(form.cause.toUpperCase(),pad,h*.18);
    ctx.fillStyle=palette.text;const base=portrait?.058:.052,lengthScale=msg.length>52?.88:1;ctx.font=`700 ${Math.round(w*base*lengthScale)}px Arial`;wrap(ctx,msg,pad,portrait?h*.265:h*.27,w*.84,h*.062,portrait?6:5);
    ctx.globalAlpha=.82;ctx.fillStyle=palette.text;ctx.font=`500 ${Math.round(w*.022)}px Arial`;wrap(ctx,`For ${form.audience}`,pad,h*.70,w*.82,h*.035,2);ctx.globalAlpha=1;
    const btnText=form.actionTarget,btnFont=Math.round(w*.019);ctx.font=`700 ${btnFont}px Arial`;const maxBtnW=w*.76,measured=Math.min(maxBtnW,ctx.measureText(btnText).width+w*.07),btnH=Math.max(54,h*.058),btnX=pad,btnY=h*.77;ctx.fillStyle=palette.accent;roundRectPath(ctx,btnX,btnY,measured,btnH,form.buttonShape==='Pill'?btnH/2:Math.max(8,w*.008));ctx.fill();ctx.fillStyle=palette.id==='lime'||palette.id==='paper'?'#FFFFFF':'#0E4D4A';if(palette.id==='paper')ctx.fillStyle='#FFFFFF';ctx.textBaseline='middle';ctx.fillText(btnText,btnX+w*.035,btnY+btnH/2);ctx.textBaseline='alphabetic';
    const logo=await loadImage('/assets/canopy/auth/canopy-logo-white.png');ctx.globalAlpha=.58;if(logo&&palette.text==='#FFFFFF'){const targetW=Math.min(w*.23,240),ratio=logo.naturalHeight/logo.naturalWidth;ctx.drawImage(logo,w-pad-targetW,h-pad-targetW*ratio,targetW,targetW*ratio)}else{ctx.fillStyle=palette.text;ctx.font=`700 ${Math.round(w*.018)}px Arial`;ctx.textAlign='right';ctx.fillText('CANOPY · WOMATE',w-pad,h-pad);ctx.textAlign='left'}ctx.globalAlpha=1;
    c.toBlob(resolve,'image/png',.95);
  });
  async function download(){
    setNote('Preparing your graphic…');try{const blob=await makeBlob();if(!blob)throw new Error('The graphic could not be prepared.');const href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download=`canopycanvas-${form.cause.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),1200);setNote('Graphic downloaded. Upload it to your own Google Drive, set access to “Anyone with the link”, then paste that Drive link into your assignment.')}catch(e){setNote(e?.message||'Unable to download the graphic. Try again.')}
  }

  return <section className="cc-page"><div className="cc-head"><span className="cc-kicker">CANOPYCANVAS</span><h1>Build a climate campaign graphic.</h1><p>Shape the message, choose the visual direction, then download.</p></div>
    <div className="cc-grid cc-grid-upgraded"><div className="cc-form">
      <div className="cc-core-fields">
        <label>Cause<select value={form.cause} onChange={e=>choose('cause',e.target.value)}>{causes.map(x=><option key={x}>{x}</option>)}</select></label>
        <div className="cc-two"><label>Audience<select value={form.audience} onChange={e=>choose('audience',e.target.value)}>{audiences.map(x=><option key={x}>{x}</option>)}</select></label><label>Action<select value={form.actionTarget} onChange={e=>choose('actionTarget',e.target.value)}>{actions.map(x=><option key={x}>{x}</option>)}</select></label></div>
        <label>Message<textarea rows="4" value={form.message} maxLength={MESSAGE_LIMIT} onChange={e=>update('message',e.target.value.slice(0,MESSAGE_LIMIT))} placeholder={suggestion}/><div className="cc-message-meta"><span className="cc-message-helper"><Sparkles size={14}/> {suggestion}</span><b>{form.message.length}/{MESSAGE_LIMIT}</b></div><button type="button" className="cc-use-suggestion" onClick={useSuggestion}>Use suggestion</button></label>
        <div className="cc-two"><label>Tone<select value={form.tone} onChange={e=>choose('tone',e.target.value)}>{tones.map(x=><option key={x}>{x}</option>)}</select></label><label>Format<select value={form.format} onChange={e=>update('format',e.target.value)}>{formats.map(x=><option key={x}>{x}</option>)}</select></label></div>
      </div>
      <details className="cc-options"><summary>Visual style</summary><div className="cc-options-body">
        <label>Button shape<select value={form.buttonShape} onChange={e=>update('buttonShape',e.target.value)}>{buttonShapes.map(x=><option key={x}>{x}</option>)}</select></label>
        <div className="cc-choice-block"><span>Background</span><div className="cc-palette-grid">{palettes.map(p=><button type="button" key={p.id} className={form.palette===p.id?'active':''} onClick={()=>update('palette',p.id)}><i style={{background:p.css}}/><b>{p.label}</b></button>)}</div></div>
        <div className="cc-choice-block"><span>Texture</span><div className="cc-texture-grid">{textures.map(t=><button type="button" key={t.id} className={form.texture===t.id?'active':''} onClick={()=>update('texture',t.id)}><i className={`cc-texture-swatch texture-${t.id}`}/><b>{t.label}</b></button>)}</div></div>
      </div></details>
      <details className="cc-options cc-graphic-choice"><summary>Campaign graphic <small>Optional</small></summary><div className="cc-options-body">
        <div className="cc-graphic-grid">{canvasGraphics.map(g=><button type="button" key={g.id} className={form.graphic===g.id?'active':''} onClick={()=>update('graphic',g.id)} aria-pressed={form.graphic===g.id}>{g.src?<img src={g.src} alt="" loading="lazy"/>:<i className="cc-no-graphic">Aa</i>}<b>{g.label}</b></button>)}</div>
        {form.graphic!=='none'&&<label className="cc-graphic-layout">Placement<select value={form.graphicLayout} onChange={e=>update('graphicLayout',e.target.value)}>{graphicLayouts.map(x=><option key={x}>{x}</option>)}</select></label>}
      </div></details>
      <div className="cc-canvas-actions"><button type="button" className="cc-download" onClick={download}>Download graphic</button>{note&&<p className="cc-note" role="status">{note}</p>}</div>
    </div>
      <div className={`cc-preview cc-preview-upgraded format-${form.format.toLowerCase().replace(/\s+/g,'-')} tone-${form.tone.toLowerCase().replace(/[^a-z]+/g,'-')}`} style={{background:palette.css,color:palette.text,'--cc-accent':palette.accent,width:'100%',height:'auto',aspectRatio:form.format==='Square post'?'1 / 1':'4 / 5'}}><div className={`cc-texture-layer texture-${form.texture}`}/>{selectedGraphic?.src&&<img className={`cc-preview-graphic layout-${form.graphicLayout.toLowerCase().replace(/\s+/g,'-')}`} src={selectedGraphic.src} alt=""/>}<small>{form.cause}</small><h2>{form.message||suggestion}</h2><p>For {form.audience}</p><button type="button" className={`cc-action-button ${form.buttonShape==='Pill'?'is-pill':'is-rectangle'}`} style={{borderRadius:form.buttonShape==='Pill'?'999px':'8px'}}>{form.actionTarget}</button><img className="cc-watermark" src="/assets/canopy/auth/canopy-logo-white.png" alt=""/></div>
    </div>
  </section>
}
