const fs=require('fs'),path=require('path');
const root=process.cwd();
const sel=path.join(root,'src','selected');
if(!fs.existsSync(sel)) throw new Error('src/selected not found. Run this from C:\\phill\\wo-web\\ww\\womate_build.');

const markSrc=path.join(__dirname,'assets','womate-mark.png');
const markDir=path.join(root,'public','assets','img');
fs.mkdirSync(markDir,{recursive:true});
fs.copyFileSync(markSrc,path.join(markDir,'womate-selected-mark.png'));

// Keep the already approved WOMATE palette/tagline if this V2 is run directly.
for(const name of ['selectedCard.css','SelectedCard.jsx','selectedCardRenderer.js','selectedStandalone.jsx']){
  const f=path.join(sel,name); if(!fs.existsSync(f)) continue;
  let s=fs.readFileSync(f,'utf8');
  s=s.replaceAll('#17382b','#0E4D4A').replaceAll('#17382B','#0E4D4A')
     .replaceAll('#CAFF58','#C6FF52').replaceAll('#caff58','#C6FF52')
     .replaceAll('#F4F1E8','#F9F6FF').replaceAll('#f4f1e8','#F9F6FF')
     .replaceAll('#10231b','#083F3E').replaceAll('#10231B','#083F3E')
     .replaceAll('Share your selection. Carry the mission.','Driving inclusive climate action with technology.')
     .replaceAll('SHARE YOUR SELECTION. CARRY THE MISSION.','DRIVING INCLUSIVE CLIMATE ACTION WITH TECHNOLOGY.');
  fs.writeFileSync(f,s,'utf8');
}

// Ensure enhancement module exists and is imported.
const enh=path.join(sel,'selectedBrandEnhancements.js');
let e=fs.existsSync(enh)?fs.readFileSync(enh,'utf8'):'';
if(!e.includes('WOMATE_CARD_BRAND_OVERLAY_V2')){
  e += `\n\n// WOMATE_CARD_BRAND_OVERLAY_V2\n// Replaces the generic top-right motif on the generated 1080x1080 card\n// with the supplied WOMATE favicon and makes the footer logo clearly visible.\n(function installWomateCardBrandOverlay(){\n  const MARK='/assets/img/womate-selected-mark.png';\n  const LOGO='/assets/img/logo.svg';\n  const TEAL='#0E4D4A';\n  const CREAM='#F9F6FF';\n  const mark=new Image(); mark.src=MARK;\n  const logo=new Image(); logo.src=LOGO;\n  let busy=false;\n\n  function roundRect(ctx,x,y,w,h,r){\n    const rr=Math.min(r,w/2,h/2);\n    ctx.beginPath();\n    ctx.moveTo(x+rr,y); ctx.arcTo(x+w,y,x+w,y+h,rr);\n    ctx.arcTo(x+w,y+h,x,y+h,rr); ctx.arcTo(x,y+h,x,y,rr);\n    ctx.arcTo(x,y,x+w,y,rr); ctx.closePath();\n  }\n\n  function brandCanvas(c){\n    if(!c || c.width!==1080 || c.height!==1080 || busy) return;\n    const ctx=c.getContext('2d'); if(!ctx) return;\n    busy=true;\n    try{\n      // Cover the old generic C/circle motif without touching the approved header layout.\n      ctx.save();\n      ctx.fillStyle=TEAL;\n      ctx.fillRect(790,20,270,285);\n      if(mark.complete && mark.naturalWidth){\n        const box=190;\n        const scale=Math.min(box/mark.naturalWidth,box/mark.naturalHeight);\n        const w=mark.naturalWidth*scale,h=mark.naturalHeight*scale;\n        ctx.drawImage(mark,925-w/2,145-h/2,w,h);\n      }\n      ctx.restore();\n\n      // Fix the low-contrast footer logo using the existing official WOMATE logo\n      // on a restrained cream brand plate.\n      ctx.save();\n      ctx.fillStyle=TEAL;\n      ctx.fillRect(45,890,285,95);\n      roundRect(ctx,62,902,188,58,12);\n      ctx.fillStyle=CREAM; ctx.fill();\n      if(logo.complete && logo.naturalWidth){\n        const maxW=154,maxH=38;\n        const scale=Math.min(maxW/logo.naturalWidth,maxH/logo.naturalHeight);\n        const w=logo.naturalWidth*scale,h=logo.naturalHeight*scale;\n        ctx.drawImage(logo,156-w/2,931-h/2,w,h);\n      }\n      ctx.restore();\n    }finally{busy=false;}\n  }\n\n  function all(){document.querySelectorAll('canvas').forEach(brandCanvas);}\n  mark.addEventListener('load',()=>setTimeout(all,0));\n  logo.addEventListener('load',()=>setTimeout(all,0));\n  window.addEventListener('load',()=>setTimeout(all,100));\n  document.addEventListener('input',()=>setTimeout(all,25));\n  document.addEventListener('change',()=>setTimeout(all,25));\n  document.addEventListener('click',()=>{setTimeout(all,0);setTimeout(all,120)});\n\n  const obs=new MutationObserver(()=>setTimeout(all,0));\n  if(document.documentElement) obs.observe(document.documentElement,{childList:true,subtree:true});\n  setInterval(all,350);\n\n  // Guarantee the branded version is used for PNG download/share exports.\n  const nativeToBlob=HTMLCanvasElement.prototype.toBlob;\n  if(nativeToBlob && !nativeToBlob.__womateV2){\n    const wrapped=function(...args){brandCanvas(this);return nativeToBlob.apply(this,args)};\n    wrapped.__womateV2=true; HTMLCanvasElement.prototype.toBlob=wrapped;\n  }\n  const nativeToDataURL=HTMLCanvasElement.prototype.toDataURL;\n  if(nativeToDataURL && !nativeToDataURL.__womateV2){\n    const wrapped=function(...args){brandCanvas(this);return nativeToDataURL.apply(this,args)};\n    wrapped.__womateV2=true; HTMLCanvasElement.prototype.toDataURL=wrapped;\n  }\n})();\n`;
  fs.writeFileSync(enh,e,'utf8');
}

const stand=path.join(sel,'selectedStandalone.jsx');
if(fs.existsSync(stand)){
  let s=fs.readFileSync(stand,'utf8');
  if(!s.includes('selectedBrandEnhancements')){
    s=`import './selectedBrandEnhancements.js';\n`+s;
    fs.writeFileSync(stand,s,'utf8');
  }
}

console.log('UPDATED: WOMATE Selected Card Brand V2');
console.log('- Generic top-right circle replaced by supplied WOMATE favicon');
console.log('- Footer WOMATE logo contrast corrected');
console.log('- Approved layout, palette, caption kit and card content preserved');
console.log('- Download/share export receives the same fixes');
