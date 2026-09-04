import React,{useMemo,useRef,useState} from 'react';
import {Leaf,Sun,Droplets,Globe2,Megaphone,Wind,Trees,HeartPulse,Sparkles} from 'lucide-react';

const causes=[
  'Climate resilience','Climate justice','Clean energy','Biodiversity','Water security',
  'Sustainable cities','Climate & wellbeing','Women in climate leadership'
];

const audiences=[
  'Young people and early-career professionals',
  'Students and campus communities',
  'Women and girls',
  'Community leaders',
  'Policy makers and public institutions',
  'Businesses and employers',
  'Climate and development professionals',
  'Parents and families',
  'Urban residents',
  'Rural communities',
  'General public'
];

const actions=[
  'Learn and share one action.',
  'Join a local climate effort.',
  'Share with your community.',
  'Ask leaders to take action.',
  'Cut one source of waste.',
  'Protect and conserve water.',
  'Support women-led solutions.',
  'Start a climate conversation.',
  'Choose cleaner transport.',
  'Take one climate action today.'
];

const tones=['Clear & factual','Hopeful','Urgent but responsible','Community-centred','Professional'];
const formats=['Square post','Portrait post'];
const buttonShapes=['Pill','Rectangle'];
const MESSAGE_LIMIT=60;

const palettes=[
  {id:'canopy',label:'Canopy Green',css:'#0E4D4A',type:'solid',colors:['#0E4D4A'],text:'#FFFFFF',accent:'#C6FF52'},
  {id:'forest',label:'Forest',css:'#123C2C',type:'solid',colors:['#123C2C'],text:'#FFFFFF',accent:'#C6FF52'},
  {id:'ocean',label:'Ocean',css:'#0D4C66',type:'solid',colors:['#0D4C66'],text:'#FFFFFF',accent:'#BCEBFF'},
  {id:'plum',label:'Plum',css:'#4D244E',type:'solid',colors:['#4D244E'],text:'#FFFFFF',accent:'#F3D6FF'},
  {id:'sand',label:'Warm Sand',css:'#F0E6D2',type:'solid',colors:['#F0E6D2'],text:'#18352F',accent:'#0E4D4A'},
  {id:'lemon',label:'Lemon',css:'#C6FF52',type:'solid',colors:['#C6FF52'],text:'#17372F',accent:'#0E4D4A'},
  {id:'sunset',label:'Sunset Gradient',css:'linear-gradient(135deg,#FF8A5B 0%,#B5436E 52%,#4D244E 100%)',type:'linear',colors:['#FF8A5B','#B5436E','#4D244E'],text:'#FFFFFF',accent:'#FFE49A'},
  {id:'canopyglow',label:'Canopy Glow',css:'linear-gradient(135deg,#0E4D4A 0%,#16786F 55%,#C6FF52 135%)',type:'linear',colors:['#0E4D4A','#16786F','#C6FF52'],text:'#FFFFFF',accent:'#C6FF52'},
  {id:'skyfield',label:'Sky + Field',css:'linear-gradient(135deg,#0D4C66 0%,#1F7D75 52%,#B7D95B 100%)',type:'linear',colors:['#0D4C66','#1F7D75','#B7D95B'],text:'#FFFFFF',accent:'#E9FF91'},
  {id:'earth',label:'Earth Combo',css:'linear-gradient(135deg,#3A2D22 0%,#7C5C3E 44%,#B6A06B 100%)',type:'linear',colors:['#3A2D22','#7C5C3E','#B6A06B'],text:'#FFFFFF',accent:'#F6E9B5'},
  {id:'violet',label:'Violet + Blue',css:'linear-gradient(135deg,#433277 0%,#385AA6 55%,#55B8D1 100%)',type:'linear',colors:['#433277','#385AA6','#55B8D1'],text:'#FFFFFF',accent:'#DBF7FF'}
];

const textures=[
  {id:'none',label:'Clean'},
  {id:'dots',label:'Soft dots'},
  {id:'diagonal',label:'Diagonal lines'},
  {id:'grid',label:'Fine grid'},
  {id:'waves',label:'Climate waves'},
  {id:'grain',label:'Paper grain'}
];

const toneTemplates={
  'Clear & factual':()=>`Know the facts. Choose climate action that makes an impact.`,
  'Hopeful':()=>`Small climate actions can build a stronger future together.`,
  'Urgent but responsible':()=>`The climate needs action now. Choose a step that counts.`,
  'Community-centred':()=>`Climate action is stronger when communities act together.`,
  'Professional':()=>`Lead with evidence. Turn climate knowledge into action.` 
};

function wrap(ctx,text,x,y,maxWidth,lineHeight,maxLines=8){
  const words=String(text||'').split(/\s+/).filter(Boolean); let line='', lines=0;
  for(let n=0;n<words.length;n++){
    const test=line+words[n]+' ';
    if(ctx.measureText(test).width>maxWidth&&line){
      ctx.fillText(line.trim(),x,y); line=words[n]+' '; y+=lineHeight; lines++;
      if(lines>=maxLines)return;
    } else line=test;
  }
  if(line&&lines<maxLines)ctx.fillText(line.trim(),x,y);
}

function hexToRgb(hex){
  const h=hex.replace('#',''); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
}
function mix(a,b,t){return a.map((v,i)=>Math.round(v+(b[i]-v)*t))}
function rgb(a){return `rgb(${a[0]},${a[1]},${a[2]})`}

function fillBackground(ctx,w,h,palette){
  if(palette.type==='solid'){ctx.fillStyle=palette.colors[0];ctx.fillRect(0,0,w,h);return}
  const g=ctx.createLinearGradient(0,0,w,h);
  palette.colors.forEach((c,i)=>g.addColorStop(i/(palette.colors.length-1),c));
  ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
}
function drawTexture(ctx,w,h,id,textColor){
  ctx.save();ctx.globalAlpha=.12;ctx.strokeStyle=textColor;ctx.fillStyle=textColor;ctx.lineWidth=Math.max(1,w*.001);
  if(id==='dots'){
    for(let y=24;y<h;y+=42)for(let x=24;x<w;x+=42){ctx.beginPath();ctx.arc(x,y,2.4,0,Math.PI*2);ctx.fill()}
  }else if(id==='diagonal'){
    for(let x=-h;x<w+h;x+=70){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x-h,h);ctx.stroke()}
  }else if(id==='grid'){
    for(let x=0;x<w;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}
    for(let y=0;y<h;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
  }else if(id==='waves'){
    for(let y=h*.18;y<h;y+=110){ctx.beginPath();for(let x=0;x<=w;x+=12){const yy=y+Math.sin(x/65)*18; x===0?ctx.moveTo(x,yy):ctx.lineTo(x,yy)}ctx.stroke()}
  }else if(id==='grain'){
    for(let i=0;i<1800;i++){ctx.globalAlpha=.03+Math.random()*.06;ctx.fillRect(Math.random()*w,Math.random()*h,Math.random()*3+1,Math.random()*3+1)}
  }
  ctx.restore();
}
function drawSimpleIcon(ctx,id,x,y,s,color){
  ctx.save();ctx.strokeStyle=color;ctx.fillStyle='transparent';ctx.lineWidth=Math.max(3,s*.06);ctx.lineCap='round';ctx.lineJoin='round';
  if(id==='leaf'){ctx.beginPath();ctx.ellipse(x,y,s*.34,s*.18,-.55,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(x-s*.22,y+s*.18);ctx.lineTo(x+s*.20,y-s*.18);ctx.stroke()}
  if(id==='sun'){ctx.beginPath();ctx.arc(x,y,s*.18,0,Math.PI*2);ctx.stroke();for(let i=0;i<8;i++){let a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*s*.28,y+Math.sin(a)*s*.28);ctx.lineTo(x+Math.cos(a)*s*.40,y+Math.sin(a)*s*.40);ctx.stroke()}}
  if(id==='water'){for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(x+i*s*.2,y-s*.18);ctx.quadraticCurveTo(x+i*s*.2+s*.12,y,x+i*s*.2,y+s*.18);ctx.quadraticCurveTo(x+i*s*.2-s*.12,y,x+i*s*.2,y-s*.18);ctx.stroke()}}
  if(id==='globe'){ctx.beginPath();ctx.arc(x,y,s*.32,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.ellipse(x,y,s*.14,s*.32,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(x-s*.3,y);ctx.lineTo(x+s*.3,y);ctx.stroke()}
  if(id==='megaphone'){ctx.beginPath();ctx.moveTo(x-s*.32,y-s*.10);ctx.lineTo(x+s*.14,y-s*.26);ctx.lineTo(x+s*.14,y+s*.26);ctx.lineTo(x-s*.32,y+s*.10);ctx.closePath();ctx.stroke();ctx.beginPath();ctx.moveTo(x-s*.22,y+s*.12);ctx.lineTo(x-s*.10,y+s*.34);ctx.stroke()}
  if(id==='wind'){for(let j=-1;j<=1;j++){ctx.beginPath();ctx.moveTo(x-s*.34,y+j*s*.15);ctx.bezierCurveTo(x-s*.05,y+j*s*.15,x+s*.05,y+j*s*.02,x+s*.32,y+j*s*.07);ctx.stroke()}}
  if(id==='trees'){for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(x+i*s*.22,y+s*.28);ctx.lineTo(x+i*s*.22,y-s*.28);ctx.stroke();ctx.beginPath();ctx.moveTo(x+i*s*.22-s*.16,y-s*.04);ctx.lineTo(x+i*s*.22,y-s*.28);ctx.lineTo(x+i*s*.22+s*.16,y-s*.04);ctx.stroke()}}
  if(id==='wellbeing'){ctx.beginPath();ctx.moveTo(x,y+s*.28);ctx.bezierCurveTo(x-s*.42,y-s*.02,x-s*.28,y-s*.34,x,y-s*.12);ctx.bezierCurveTo(x+s*.28,y-s*.34,x+s*.42,y-s*.02,x,y+s*.28);ctx.stroke()}
  ctx.restore();
}
async function loadImage(src){
  return new Promise(resolve=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src=src});
}

export default function CanopyCanvas(){
  const initial={cause:causes[0],audience:audiences[0],actionTarget:actions[0],tone:tones[0],format:formats[0],palette:'canopy',texture:'none',buttonShape:'Pill',message:''};
  const [form,setForm]=useState(initial);
  const [note,setNote]=useState('');
  const lastSuggested=useRef('');
  const palette=palettes.find(x=>x.id===form.palette)||palettes[0];
  const dims=useMemo(()=>form.format==='Square post'?[1200,1200]:[1080,1350],[form.format]);
  const suggestion=useMemo(()=>toneTemplates[form.tone]({cause:form.cause,audience:form.audience,action:form.actionTarget}),[form.tone,form.cause,form.audience,form.actionTarget]);

  const update=(k,v)=>setForm(f=>({...f,[k]:v}));
  const choose=(k,v)=>{
    setForm(f=>{
      const next={...f,[k]:v};
      const nextSuggestion=toneTemplates[next.tone]({cause:next.cause,audience:next.audience,action:next.actionTarget});
      if(!f.message||f.message===lastSuggested.current){next.message=nextSuggestion;lastSuggested.current=nextSuggestion}
      return next;
    });
  };
  const useSuggestion=()=>{lastSuggested.current=suggestion;update('message',suggestion)};
  const makeBlob=()=>new Promise(async resolve=>{
    const [w,h]=dims,c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');
    fillBackground(ctx,w,h,palette);drawTexture(ctx,w,h,form.texture,palette.text);
    ctx.fillStyle=palette.accent;ctx.fillRect(0,0,w,Math.max(16,h*.012));

    const pad=w*.065;
    ctx.fillStyle=palette.accent;ctx.font=`700 ${Math.round(w*.022)}px Arial`;ctx.fillText(form.cause.toUpperCase(),pad,h*.19);
    ctx.fillStyle=palette.text;const msg=(form.message||suggestion).slice(0,MESSAGE_LIMIT);const portrait=form.format==='Portrait post';const base=portrait?.058:.052;const lengthScale=msg.length>145?.80:msg.length>105?.90:1;ctx.font=`700 ${Math.round(w*base*lengthScale)}px Arial`;const messageY=portrait?h*.255:h*.265;const messageW=w*.84;wrap(ctx,msg,pad,messageY,messageW,h*.061,portrait?7:6);

    ctx.globalAlpha=.82;ctx.fillStyle=palette.text;ctx.font=`500 ${Math.round(w*.022)}px Arial`;wrap(ctx,`For ${form.audience}`,pad,h*.72,w*.82,h*.035,2);ctx.globalAlpha=1;
    const btnText=form.actionTarget,btnFont=Math.round(w*.020);ctx.font=`700 ${btnFont}px Arial`;const maxBtnW=w*.72,measured=Math.min(maxBtnW,ctx.measureText(btnText).width+w*.07);const btnH=Math.max(54,h*.062),btnX=pad,btnY=h*.78-btnH/2;ctx.fillStyle=palette.accent;const radius=form.buttonShape==='Pill'?btnH/2:Math.max(8,w*.008);ctx.beginPath();ctx.roundRect(btnX,btnY,measured,btnH,radius);ctx.fill();ctx.fillStyle='#0E4D4A';ctx.textBaseline='middle';ctx.fillText(btnText,btnX+w*.035,btnY+btnH/2);ctx.textBaseline='alphabetic';    const logo=await loadImage('/assets/canopy/auth/canopy-logo-white.png');
    if(logo){
      const maxW=w*.18,maxH=h*.07,ratio=Math.min(maxW/logo.width,maxH/logo.height);
      ctx.globalAlpha=.62;ctx.drawImage(logo,w-maxW-pad,h-maxH-pad*.35,logo.width*ratio,logo.height*ratio);ctx.globalAlpha=1;
    }else{
      ctx.globalAlpha=.55;ctx.fillStyle=palette.text;ctx.font=`700 ${Math.round(w*.018)}px Arial`;ctx.fillText('CANOPY Â· CLIMATE LEARNING BY WOMATE',w*.64,h*.96);ctx.globalAlpha=1;
    }
    c.toBlob(resolve,'image/png',.96);
  });

  async function download(){
    const blob=await makeBlob(),a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download=`canopycanvas-${form.cause.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png`;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    setNote('Graphic downloaded. Upload it to your own Google Drive, set access to â€œAnyone with the linkâ€, then paste that Drive link into your assignment.');
  }

  return <section className="cc-page">
    <div className="cc-head">
      <span className="cc-kicker">CANOPYCANVAS</span>
      <h1>Create a responsible climate campaign graphic.</h1>
      <p>Build the campaign by selecting the cause, audience, action, tone, visual system and format. The message is the only field you type.</p>
    </div>

    <div className="cc-grid cc-grid-upgraded">
      <div className="cc-form">
        <label>Cause<select value={form.cause} onChange={e=>choose('cause',e.target.value)}>{causes.map(x=><option key={x}>{x}</option>)}</select></label>
        
        <div className="cc-two">
          <label>Audience<select value={form.audience} onChange={e=>choose('audience',e.target.value)}>{audiences.map(x=><option key={x}>{x}</option>)}</select></label>
          <label>Desired action<select value={form.actionTarget} onChange={e=>choose('actionTarget',e.target.value)}>{actions.map(x=><option key={x}>{x}</option>)}</select></label>
        </div>

        <label>Message
          <textarea rows="5" value={form.message} maxLength={MESSAGE_LIMIT} onChange={e=>update('message',e.target.value.slice(0,MESSAGE_LIMIT))} placeholder={suggestion}/>
          <div className="cc-message-meta"><span className="cc-message-helper"><Sparkles size={14}/> Tone suggestion: {suggestion}</span><b>{form.message.length}/{MESSAGE_LIMIT}</b></div>
          <button type="button" className="cc-use-suggestion" onClick={useSuggestion}>Use tone suggestion</button>
        </label>

        <div className="cc-two">
          <label>Tone<select value={form.tone} onChange={e=>choose('tone',e.target.value)}>{tones.map(x=><option key={x}>{x}</option>)}</select></label>
          <label>Format<select value={form.format} onChange={e=>update('format',e.target.value)}>{formats.map(x=><option key={x}>{x}</option>)}</select></label><label>Action button shape<select value={form.buttonShape} onChange={e=>update('buttonShape',e.target.value)}>{buttonShapes.map(x=><option key={x}>{x}</option>)}</select></label>
        </div>

        <div className="cc-choice-block">
          <span>Background</span>
          <div className="cc-palette-grid">{palettes.map(p=><button type="button" key={p.id} className={form.palette===p.id?'active':''} onClick={()=>update('palette',p.id)}><i style={{background:p.css}}/><b>{p.label}</b></button>)}</div>
        </div>

        <div className="cc-choice-block">
          <span>Texture</span>
          <div className="cc-texture-grid">{textures.map(t=><button type="button" key={t.id} className={`cc-texture-chip ${form.texture===t.id?'active':''}`} onClick={()=>update('texture',t.id)}><i className={`cc-texture-swatch texture-${t.id}`}/><b>{t.label}</b></button>)}</div>
        </div>

        <div className="cc-brand-note">
          <img src="/assets/canopy/auth/canopy-logo-white.png" alt="Canopy"/>
          <p>The Canopy mark is applied automatically as a small campaign watermark.</p>
        </div>

        <button type="button" className="cc-download" onClick={download}>Download graphic</button>
        {note&&<p className="cc-note">{note}</p>}
      </div>

      <div className={`cc-preview cc-preview-upgraded format-${form.format.toLowerCase().replace(/\s+/g,'-')} tone-${form.tone.toLowerCase().replace(/[^a-z]+/g,'-')}`}
           style={{background:palette.css,color:palette.text,'--cc-accent':palette.accent,width:'100%',height:'auto',aspectRatio:form.format==='Square post'?'1 / 1':'4 / 5'}}>
        <div className={`cc-texture-layer texture-${form.texture}`}/>
        <small>{form.cause}</small>
        <h2>{form.message||suggestion}</h2>
        <p>For {form.audience}</p>
        <button type="button" className={`cc-action-button ${form.buttonShape==='Pill'?'is-pill':'is-rectangle'}`} style={{borderRadius:form.buttonShape==='Pill'?'999px':'8px'}}>{form.actionTarget}</button>
        <img className="cc-watermark" src="/assets/canopy/auth/canopy-logo-white.png" alt=""/>
      </div>
    </div>
  </section>
}











