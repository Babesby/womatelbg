const SIZE=1080;

const GREEN='#0E4D4A';
const LIME='#C6FF52';
const CREAM='#F9F6FF';
const WHITE='#FFFFFF';
const INK='#083F3E';
const MUTED='#51655c';

function roundedRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.roundRect(x,y,w,h,r);
}

function loadImage(src){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=reject;
    img.src=src;
  });
}

function fitText(ctx,text,maxWidth,startSize,minSize=36){
  let size=startSize;

  while(size>minSize){
    ctx.font=`700 ${size}px Arial, Helvetica, sans-serif`;
    if(ctx.measureText(text).width<=maxWidth) return size;
    size-=2;
  }

  return minSize;
}

function wrapText(ctx,text,maxWidth){
  const words=String(text||'').split(/\s+/);
  const lines=[''];

  for(const word of words){
    const attempt=(lines[lines.length-1]+' '+word).trim();

    if(ctx.measureText(attempt).width>maxWidth && lines[lines.length-1]){
      lines.push(word);
    }else{
      lines[lines.length-1]=attempt;
    }
  }

  return lines;
}

function drawCover(ctx,img,x,y,w,h,zoom=1,offsetX=0,offsetY=0){
  const baseScale=Math.max(w/img.width,h/img.height);
  const scale=baseScale*Math.max(1,zoom);

  const sw=w/scale;
  const sh=h/scale;

  const availableX=Math.max(0,img.width-sw);
  const availableY=Math.max(0,img.height-sh);

  const cx=(img.width/2)+(offsetX/100)*(availableX/2);
  const cy=(img.height/2)+(offsetY/100)*(availableY/2);

  let sx=cx-sw/2;
  let sy=cy-sh/2;

  sx=Math.max(0,Math.min(img.width-sw,sx));
  sy=Math.max(0,Math.min(img.height-sh,sy));

  ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);
}

function drawDecor(ctx){
  ctx.save();

  ctx.strokeStyle=LIME;
  ctx.lineWidth=5;
  ctx.globalAlpha=.92;

  ctx.beginPath();
  ctx.arc(925,145,108,.35,4.85);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(925,145,78,1.1,5.65);
  ctx.stroke();

  ctx.restore();
}

async function drawLogo(ctx){
  try{
    const img=await loadImage('/assets/img/logo.svg');
    const ratio=img.width/img.height;
    const h=62;
    const w=Math.min(250,h*ratio);

    ctx.drawImage(img,68,900,w,h);
  }catch{
    ctx.fillStyle=WHITE;
    ctx.font='700 46px Arial, Helvetica, sans-serif';
    ctx.fillText('WOMATE',68,947);
  }
}


const SELECTED_2027_VARIANTS={
 'she-leads-climate-c3-2027':{region:'AFRICA',edition:'COHORT 03 · 2027',deep:'#073B39',mid:'#126154',accent:'#C6FF52',paper:'#F7F8F0',motto:'ROOTED IN ACTION. READY TO LEAD.',art:'rings'},
 'she-leads-asia-c1-2027':{region:'ASIA',edition:'COHORT 01 · 2027',deep:'#103C3E',mid:'#19766F',accent:'#C6FF52',paper:'#F4FAF4',motto:'CONNECTED BY PURPOSE. LEADING CHANGE.',art:'routes'}
};
async function renderSelected2027(canvas,props,v){
 const ctx=canvas.getContext('2d');canvas.width=1080;canvas.height=1080;
 const g=ctx.createLinearGradient(0,0,1080,400);g.addColorStop(0,v.deep);g.addColorStop(1,v.mid);
 ctx.fillStyle=v.paper;ctx.fillRect(0,0,1080,1080);ctx.fillStyle=g;ctx.fillRect(0,0,1080,345);
 ctx.save();ctx.strokeStyle='rgba(198,255,82,.17)';ctx.lineWidth=1.5;
 if(v.art==='rings'){for(let i=0;i<8;i++){ctx.beginPath();ctx.arc(1030,150,90+i*33,0,Math.PI*2);ctx.stroke()}}
 else for(let i=0;i<9;i++){ctx.beginPath();ctx.moveTo(520+i*34,-30);ctx.bezierCurveTo(400+i*40,130,970-i*17,200,800+i*25,350);ctx.stroke()}
 ctx.restore();
 ctx.fillStyle=v.accent;ctx.font='800 19px Arial, sans-serif';ctx.fillText('WOMATE  /  SHE LEADS',66,72);
 ctx.fillStyle='#fff';ctx.font='700 73px Georgia, serif';ctx.fillText('I HAVE BEEN',66,165);ctx.fillText('SELECTED.',66,250);
 ctx.fillStyle=v.accent;ctx.font='700 22px Arial, sans-serif';ctx.fillText(v.region+' · '+v.edition,68,310);
 ctx.fillRect(66,377,78,5);ctx.fillStyle=v.deep;ctx.font='800 17px Arial, sans-serif';ctx.fillText('OFFICIALLY SELECTED',66,420);
 const px=66,py=456,pw=389,ph=405;ctx.save();roundedRect(ctx,px,py,pw,ph,25);ctx.clip();
 if(props.photo)drawCover(ctx,props.photo,px,py,pw,ph,props.zoom,props.offsetX,props.offsetY);
 else{ctx.fillStyle='#DDE9DF';ctx.fillRect(px,py,pw,ph);ctx.fillStyle='#B0C9BD';ctx.beginPath();ctx.arc(260,600,76,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(260,830,165,135,0,0,Math.PI*2);ctx.fill()}ctx.restore();
 ctx.strokeStyle='rgba(10,70,60,.18)';ctx.lineWidth=2;roundedRect(ctx,px,py,pw,ph,25);ctx.stroke();
 ctx.fillStyle=v.deep;ctx.font='800 17px Arial, sans-serif';ctx.fillText('SELECTED PARTICIPANT',494,492);
 const name=String(props.fullName||'PARTICIPANT').trim().toUpperCase();const size=fitText(ctx,name,500,57,29);
 ctx.font='700 '+size+'px Arial, sans-serif';const lines=wrapText(ctx,name,505).slice(0,3);lines.forEach((line,i)=>ctx.fillText(line,494,555+i*(size+9)));
 const y=555+(lines.length-1)*(size+9);
 ctx.fillStyle=v.deep;ctx.font='400 23px Arial, sans-serif';
 const programme=String(props.programmeName||'She Leads Climate Mentorship Programme');
 wrapText(ctx,programme,500).slice(0,3).forEach((line,i)=>ctx.fillText(line,494,y+57+i*32));
 ctx.fillStyle=v.mid;ctx.font='800 20px Arial, sans-serif';wrapText(ctx,String(props.cohortLabel||v.edition).toUpperCase(),500).slice(0,2).forEach((line,i)=>ctx.fillText(line,494,Math.min(790,y+178)+i*29));
 ctx.fillStyle=v.deep;ctx.font='800 17px Arial, sans-serif';ctx.fillText(v.motto,66,908);
 ctx.fillStyle=v.deep;ctx.fillRect(0,939,1080,141);ctx.fillStyle=v.accent;ctx.fillRect(66,969,56,4);
 ctx.fillStyle='#fff';ctx.font='800 37px Arial, sans-serif';ctx.fillText('WOMATE',66,1020);ctx.font='400 16px Arial, sans-serif';ctx.fillText('WOMEN IN CLIMATE',66,1047);
 ctx.textAlign='right';ctx.fillStyle=v.accent;ctx.font='700 20px Arial, sans-serif';ctx.fillText('womate.org',1012,1020);ctx.textAlign='left';
}

export async function renderSelectedCard(canvas,{
  fullName,
  programmeName,
  cohortLabel,
  programmeSlug,
  photo,
  zoom=1,
  offsetX=0,
  offsetY=0
}){
  if(!canvas) return;
  const variant=SELECTED_2027_VARIANTS[String(programmeSlug||'')];
  if(variant)return renderSelected2027(canvas,{fullName,programmeName,cohortLabel,photo,zoom,offsetX,offsetY},variant);

  const ctx=canvas.getContext('2d');

  canvas.width=SIZE;
  canvas.height=SIZE;

  ctx.clearRect(0,0,SIZE,SIZE);

  ctx.fillStyle=CREAM;
  ctx.fillRect(0,0,SIZE,SIZE);

  ctx.fillStyle=GREEN;
  ctx.fillRect(0,0,SIZE,340);

  drawDecor(ctx);

  ctx.fillStyle=LIME;
  ctx.font='700 21px Arial, Helvetica, sans-serif';
  ctx.fillText('WOMATE · SELECTED',68,82);

  ctx.fillStyle=WHITE;
  ctx.font='700 77px Arial, Helvetica, sans-serif';
  ctx.fillText('I HAVE BEEN',68,178);
  ctx.fillText('SELECTED',68,268);

  const px=68;
  const py=390;
  const ps=365;

  ctx.save();
  roundedRect(ctx,px,py,ps,ps,34);
  ctx.clip();

  if(photo){
    drawCover(
      ctx,
      photo,
      px,
      py,
      ps,
      ps,
      zoom,
      offsetX,
      offsetY
    );
  }else{
    ctx.fillStyle='#DDE5DE';
    ctx.fillRect(px,py,ps,ps);

    ctx.fillStyle=GREEN;
    ctx.globalAlpha=.28;

    ctx.beginPath();
    ctx.arc(px+ps/2,py+135,65,0,Math.PI*2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(
      px+ps/2,
      py+310,
      120,
      100,
      0,
      0,
      Math.PI*2
    );
    ctx.fill();
  }

  ctx.restore();
  ctx.globalAlpha=1;

  ctx.strokeStyle='rgba(23,56,43,.13)';
  ctx.lineWidth=2;
  roundedRect(ctx,px,py,ps,ps,34);
  ctx.stroke();

  const tx=490;

  ctx.fillStyle=GREEN;
  ctx.font='700 18px Arial, Helvetica, sans-serif';
  ctx.fillText('SELECTED LEARNER',tx,425);

  const name=String(fullName||'').trim().toUpperCase();
  const nameSize=fitText(ctx,name,510,62,38);

  ctx.fillStyle=GREEN;
  ctx.font=`700 ${nameSize}px Arial, Helvetica, sans-serif`;

  const nameLines=wrapText(ctx,name,510).slice(0,3);

  nameLines.forEach((line,index)=>{
    ctx.fillText(
      line,
      tx,
      510+(index*(nameSize+9))
    );
  });

  const nameBottom=
    510+
    ((Math.max(1,nameLines.length)-1)*(nameSize+9));

  ctx.fillStyle=INK;
  ctx.font='400 27px Arial, Helvetica, sans-serif';

  const programme=
    programmeName||
    'She Leads Climate Mentorship Programme';

  const programmeLines=
    wrapText(ctx,programme,500).slice(0,3);

  programmeLines.forEach((line,index)=>{
    ctx.fillText(
      line,
      tx,
      nameBottom+75+(index*39)
    );
  });

  ctx.fillStyle=GREEN;
  ctx.font='700 22px Arial, Helvetica, sans-serif';

  ctx.fillText(
    String(cohortLabel||'Cohort 2 · 2026').toUpperCase(),
    tx,
    nameBottom+
      75+
      (programmeLines.length*39)+
      35
  );

  ctx.fillStyle=MUTED;
  ctx.font='400 20px Arial, Helvetica, sans-serif';
  ctx.fillText(
    'Women leading climate action forward.',
    tx,
    747
  );

  ctx.fillStyle=GREEN;
  ctx.fillRect(0,845,SIZE,235);

  await drawLogo(ctx);

  ctx.fillStyle=WHITE;
  ctx.font='400 22px Arial, Helvetica, sans-serif';
  ctx.fillText(
    'Women in Climate',
    68,
    1005
  );

  ctx.textAlign='right';

  ctx.fillStyle=LIME;
  ctx.font='700 22px Arial, Helvetica, sans-serif';
  ctx.fillText('womate.org',1010,940);

  ctx.fillStyle=WHITE;
  ctx.font='400 18px Arial, Helvetica, sans-serif';
  ctx.fillText(
    'Driving inclusive climate action with technology.',
    1010,
    985
  );

  ctx.textAlign='left';
}

export function downloadCanvas(canvas,filename){
  const anchor=document.createElement('a');

  anchor.download=filename;
  anchor.href=canvas.toDataURL('image/png',1);

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export async function shareCanvas(canvas,filename){
  if(!navigator.share) return false;

  const blob=await new Promise(resolve=>{
    canvas.toBlob(resolve,'image/png',1);
  });

  if(!blob) return false;

  const file=new File(
    [blob],
    filename,
    {type:'image/png'}
  );

  if(
    navigator.canShare &&
    navigator.canShare({files:[file]})
  ){
    await navigator.share({
      title:'I Have Been Selected — WOMATE',
      text:'I have been selected for the WOMATE She Leads Climate Mentorship Programme.',
      files:[file]
    });

    return true;
  }

  await navigator.share({
    title:'I Have Been Selected — WOMATE',
    text:'I have been selected for the WOMATE She Leads Climate Mentorship Programme. womate.org'
  });

  return true;
}
