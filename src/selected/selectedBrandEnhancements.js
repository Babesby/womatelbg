import './selectedBrandEnhancements.css';

const TAGS='#WOMATE #SheLeads #SheLeads2026 #WomenInClimate #ClimateLeadership #WomenLeadingClimateAction #AfricanWomenInClimate #ClimateAction #InclusiveClimateAction';
function valByLabel(label){const els=[...document.querySelectorAll('input')]; const x=els.find(el=>{const p=el.closest('label,div');return p&&p.textContent.toLowerCase().includes(label.toLowerCase())});return x?.value?.trim()||''}
function learnerName(){return valByLabel('full name')||valByLabel('name')||''}
function caption(){const n=learnerName();return `${n?`${n} — `:""}I’m excited to share that I have been selected for the She Leads Climate Mentorship Programme — Cohort 2 by WOMATE.\n\nOver the coming weeks, I’ll be strengthening my climate knowledge, leadership and capacity to turn learning into meaningful action.\n\nI’m looking forward to learning, connecting and contributing alongside an incredible community of emerging women climate leaders across Africa.\n\nDriving inclusive climate action with technology.`;}
function copy(t,b){navigator.clipboard?.writeText(t).then(()=>{const old=b.textContent;b.textContent='Copied';setTimeout(()=>b.textContent=old,1600)});}
function mount(){if(document.querySelector('.selected-share-kit'))return; const host=document.querySelector('main')||document.body; const box=document.createElement('section');box.className='selected-share-kit';box.innerHTML=`<div class="selected-share-eyebrow">READY TO SHARE</div><h2>Suggested caption</h2><p class="selected-share-note">Make it yours before you post.</p><div class="selected-caption-text"></div><div class="selected-share-actions"><button type="button" class="selected-copy-caption">Copy caption</button></div><h3>Suggested hashtags</h3><div class="selected-hashtags"></div><div class="selected-share-actions"><button type="button" class="selected-copy-tags">Copy hashtags</button></div></section>`;host.appendChild(box);const ct=box.querySelector('.selected-caption-text'),ht=box.querySelector('.selected-hashtags');ct.textContent=caption();ht.textContent=TAGS;box.querySelector('.selected-copy-caption').onclick=e=>copy(caption(),e.currentTarget);box.querySelector('.selected-copy-tags').onclick=e=>copy(TAGS,e.currentTarget);document.addEventListener('input',()=>ct.textContent=caption());}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,250));else setTimeout(mount,250);


// WOMATE_CARD_BRAND_OVERLAY_V2
// Replaces the generic top-right motif on the generated 1080x1080 card
// with the supplied WOMATE favicon and makes the footer logo clearly visible.
(function installWomateCardBrandOverlay(){
  const MARK='/assets/img/womate-selected-mark.png';
  const LOGO='/assets/img/logo.svg';
  const TEAL='#0E4D4A';
  const CREAM='#F9F6FF';
  const mark=new Image(); mark.src=MARK;
  const logo=new Image(); logo.src=LOGO;
  let busy=false;

  function roundRect(ctx,x,y,w,h,r){
    const rr=Math.min(r,w/2,h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr,y); ctx.arcTo(x+w,y,x+w,y+h,rr);
    ctx.arcTo(x+w,y+h,x,y+h,rr); ctx.arcTo(x,y+h,x,y,rr);
    ctx.arcTo(x,y,x+w,y,rr); ctx.closePath();
  }

  function brandCanvas(c){
    if(!c || c.width!==1080 || c.height!==1080 || busy) return;
    const ctx=c.getContext('2d'); if(!ctx) return;
    busy=true;
    try{
      // Cover the old generic C/circle motif without touching the approved header layout.
      ctx.save();
      ctx.fillStyle=TEAL;
      ctx.fillRect(790,20,270,285);
      if(mark.complete && mark.naturalWidth){
        const box=190;
        const scale=Math.min(box/mark.naturalWidth,box/mark.naturalHeight);
        const w=mark.naturalWidth*scale,h=mark.naturalHeight*scale;
        ctx.drawImage(mark,925-w/2,145-h/2,w,h);
      }
      ctx.restore();

      // Fix the low-contrast footer logo using the existing official WOMATE logo
      // on a restrained cream brand plate.
      ctx.save();
      ctx.fillStyle=TEAL;
      ctx.fillRect(45,890,285,95);
      roundRect(ctx,62,902,188,58,12);
      ctx.fillStyle=CREAM; ctx.fill();
      if(logo.complete && logo.naturalWidth){
        const maxW=154,maxH=38;
        const scale=Math.min(maxW/logo.naturalWidth,maxH/logo.naturalHeight);
        const w=logo.naturalWidth*scale,h=logo.naturalHeight*scale;
        ctx.drawImage(logo,156-w/2,931-h/2,w,h);
      }
      ctx.restore();
    }finally{busy=false;}
  }

  function all(){document.querySelectorAll('canvas').forEach(brandCanvas);}
  mark.addEventListener('load',()=>setTimeout(all,0));
  logo.addEventListener('load',()=>setTimeout(all,0));
  window.addEventListener('load',()=>setTimeout(all,100));
  document.addEventListener('input',()=>setTimeout(all,25));
  document.addEventListener('change',()=>setTimeout(all,25));
  document.addEventListener('click',()=>{setTimeout(all,0);setTimeout(all,120)});

  const obs=new MutationObserver(()=>setTimeout(all,0));
  if(document.documentElement) obs.observe(document.documentElement,{childList:true,subtree:true});
  setInterval(all,350);

  // Guarantee the branded version is used for PNG download/share exports.
  const nativeToBlob=HTMLCanvasElement.prototype.toBlob;
  if(nativeToBlob && !nativeToBlob.__womateV2){
    const wrapped=function(...args){brandCanvas(this);return nativeToBlob.apply(this,args)};
    wrapped.__womateV2=true; HTMLCanvasElement.prototype.toBlob=wrapped;
  }
  const nativeToDataURL=HTMLCanvasElement.prototype.toDataURL;
  if(nativeToDataURL && !nativeToDataURL.__womateV2){
    const wrapped=function(...args){brandCanvas(this);return nativeToDataURL.apply(this,args)};
    wrapped.__womateV2=true; HTMLCanvasElement.prototype.toDataURL=wrapped;
  }
})();


// WOMATE_CARD_TEXTURE_V3
// Adds a restrained texture only on flat brand-background pixels and preserves text/photo clarity.
(function installWomateCardTextureV3(){
  function near(d,r,g,b,t=2){return Math.abs(d[0]-r)<=t&&Math.abs(d[1]-g)<=t&&Math.abs(d[2]-b)<=t&&d[3]>245}
  function texture(c){
    if(!c||c.width!==1080||c.height!==1080)return;
    const ctx=c.getContext('2d',{willReadFrequently:true}); if(!ctx)return;
    ctx.save();
    try{
      for(let y=18;y<1065;y+=27){
        for(let x=18;x<1065;x+=27){
          const d=ctx.getImageData(x,y,1,1).data;
          if(near(d,14,77,74,1)){
            ctx.fillStyle='rgba(198,255,82,.075)';
            ctx.beginPath(); ctx.arc(x,y,1.15,0,Math.PI*2); ctx.fill();
          }else if(near(d,249,246,255,1)){
            ctx.fillStyle='rgba(14,77,74,.035)';
            ctx.fillRect(x,y,1,1);
          }
        }
      }
    }catch(_){} finally{ctx.restore()}
  }
  function all(){document.querySelectorAll('canvas').forEach(texture)}
  window.addEventListener('load',()=>setTimeout(all,180));
  document.addEventListener('change',()=>setTimeout(all,80));
  document.addEventListener('input',()=>setTimeout(all,80));
  document.addEventListener('click',()=>setTimeout(all,160));
  const nativeToBlob=HTMLCanvasElement.prototype.toBlob;
  if(nativeToBlob&&!nativeToBlob.__womateTextureV3){
    const wrapped=function(...args){texture(this);return nativeToBlob.apply(this,args)};
    wrapped.__womateTextureV3=true; HTMLCanvasElement.prototype.toBlob=wrapped;
  }
  const nativeToDataURL=HTMLCanvasElement.prototype.toDataURL;
  if(nativeToDataURL&&!nativeToDataURL.__womateTextureV3){
    const wrapped=function(...args){texture(this);return nativeToDataURL.apply(this,args)};
    wrapped.__womateTextureV3=true; HTMLCanvasElement.prototype.toDataURL=wrapped;
  }
})();
