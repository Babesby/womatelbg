const fs=require('fs'),path=require('path');
const root=process.cwd();
const sel=path.join(root,'src','selected');
if(!fs.existsSync(sel)) throw new Error('src/selected not found. Run this from C:\\phill\\wo-web\\ww\\womate_build.');

const markSrc=path.join(__dirname,'assets','womate-mark.png');
const markDir=path.join(root,'public','assets','img');
fs.mkdirSync(markDir,{recursive:true});
fs.copyFileSync(markSrc,path.join(markDir,'womate-selected-mark.png'));

// Keep the approved WOMATE palette/tagline and correct the footer wording everywhere.
for(const name of ['selectedCard.css','SelectedCard.jsx','selectedCardRenderer.js','selectedStandalone.jsx','selectedBrandEnhancements.js']){
  const f=path.join(sel,name); if(!fs.existsSync(f)) continue;
  let s=fs.readFileSync(f,'utf8');
  s=s.replaceAll('#17382b','#0E4D4A').replaceAll('#17382B','#0E4D4A')
     .replaceAll('#CAFF58','#C6FF52').replaceAll('#caff58','#C6FF52')
     .replaceAll('#F4F1E8','#F9F6FF').replaceAll('#f4f1e8','#F9F6FF')
     .replaceAll('#10231b','#083F3E').replaceAll('#10231B','#083F3E')
     .replaceAll('Share your selection. Carry the mission.','Driving inclusive climate action with technology.')
     .replaceAll('SHARE YOUR SELECTION. CARRY THE MISSION.','DRIVING INCLUSIVE CLIMATE ACTION WITH TECHNOLOGY.')
     .replaceAll('Women in Climate Action','Women in Climate')
     .replaceAll('WOMEN IN CLIMATE ACTION','WOMEN IN CLIMATE');
  fs.writeFileSync(f,s,'utf8');
}

// Add a subtle premium texture to the /selected page background.
const cssFile=path.join(sel,'selectedCard.css');
if(fs.existsSync(cssFile)){
  let css=fs.readFileSync(cssFile,'utf8');
  if(!css.includes('WOMATE_SELECTED_TEXTURE_V3')){
    css += `\n\n/* WOMATE_SELECTED_TEXTURE_V3 — subtle, non-distracting brand texture */\nbody{\n  background-color:#F9F6FF;\n  background-image:\n    radial-gradient(circle at 18% 20%, rgba(198,255,82,.07) 0 1px, transparent 1.5px),\n    radial-gradient(circle at 78% 65%, rgba(14,77,74,.055) 0 1px, transparent 1.5px);\n  background-size:28px 28px,34px 34px;\n}\n`;
    fs.writeFileSync(cssFile,css,'utf8');
  }
}

// Enhance generated 1080x1080 card without redesigning it.
const enh=path.join(sel,'selectedBrandEnhancements.js');
let e=fs.existsSync(enh)?fs.readFileSync(enh,'utf8'):'';
if(!e.includes('WOMATE_CARD_TEXTURE_V3')){
  e += `\n\n// WOMATE_CARD_TEXTURE_V3\n// Adds a restrained texture only on flat brand-background pixels and preserves text/photo clarity.\n(function installWomateCardTextureV3(){\n  function near(d,r,g,b,t=2){return Math.abs(d[0]-r)<=t&&Math.abs(d[1]-g)<=t&&Math.abs(d[2]-b)<=t&&d[3]>245}\n  function texture(c){\n    if(!c||c.width!==1080||c.height!==1080)return;\n    const ctx=c.getContext('2d',{willReadFrequently:true}); if(!ctx)return;\n    ctx.save();\n    try{\n      for(let y=18;y<1065;y+=27){\n        for(let x=18;x<1065;x+=27){\n          const d=ctx.getImageData(x,y,1,1).data;\n          if(near(d,14,77,74,1)){\n            ctx.fillStyle='rgba(198,255,82,.075)';\n            ctx.beginPath(); ctx.arc(x,y,1.15,0,Math.PI*2); ctx.fill();\n          }else if(near(d,249,246,255,1)){\n            ctx.fillStyle='rgba(14,77,74,.035)';\n            ctx.fillRect(x,y,1,1);\n          }\n        }\n      }\n    }catch(_){} finally{ctx.restore()}\n  }\n  function all(){document.querySelectorAll('canvas').forEach(texture)}\n  window.addEventListener('load',()=>setTimeout(all,180));\n  document.addEventListener('change',()=>setTimeout(all,80));\n  document.addEventListener('input',()=>setTimeout(all,80));\n  document.addEventListener('click',()=>setTimeout(all,160));\n  const nativeToBlob=HTMLCanvasElement.prototype.toBlob;\n  if(nativeToBlob&&!nativeToBlob.__womateTextureV3){\n    const wrapped=function(...args){texture(this);return nativeToBlob.apply(this,args)};\n    wrapped.__womateTextureV3=true; HTMLCanvasElement.prototype.toBlob=wrapped;\n  }\n  const nativeToDataURL=HTMLCanvasElement.prototype.toDataURL;\n  if(nativeToDataURL&&!nativeToDataURL.__womateTextureV3){\n    const wrapped=function(...args){texture(this);return nativeToDataURL.apply(this,args)};\n    wrapped.__womateTextureV3=true; HTMLCanvasElement.prototype.toDataURL=wrapped;\n  }\n})();\n`;
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

console.log('UPDATED: WOMATE Selected Card Brand V3');
console.log('- Footer wording changed to: Women in Climate');
console.log('- Supplied WOMATE favicon retained in the top-right');
console.log('- Subtle premium texture added to /selected and generated card backgrounds');
console.log('- Photo treatment, layout, verification, download/share, caption and hashtags preserved');
