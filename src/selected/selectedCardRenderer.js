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

export async function renderSelectedCard(canvas,{
  fullName,
  programmeName,
  cohortLabel,
  photo,
  zoom=1,
  offsetX=0,
  offsetY=0
}){
  if(!canvas) return;

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
