const fs=require('fs');
const path=require('path');
const root=process.cwd();
const log=(m)=>console.log(m);

function must(p,msg){if(!fs.existsSync(p))throw new Error(msg||`Missing ${p}`)}
function rm(p){if(fs.existsSync(p)){fs.rmSync(p,{recursive:true,force:true});log(`REMOVED stale: ${path.relative(root,p)}`)}}
function writeUtf8(p,s){fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s,'utf8')}

must(path.join(root,'src'),'src not found. Run this from the WOMATE project root.');
must(path.join(root,'package.json'),'package.json not found. Run this from the WOMATE project root.');

// 1) Install the user-updated canonical Canopy master SQL.
const sqlSrc=path.join(__dirname,'CANOPY_OPERATIONS','WOMATE_CANOPY_MASTER_2026.sql');
const opsDir=path.join(root,'CANOPY_OPERATIONS');
fs.mkdirSync(opsDir,{recursive:true});
fs.copyFileSync(sqlSrc,path.join(opsDir,'WOMATE_CANOPY_MASTER_2026.sql'));
for(const name of ['README_APPLY.md','RELEASE_MANIFEST.txt']){
  fs.copyFileSync(path.join(__dirname,'CANOPY_OPERATIONS',name),path.join(opsDir,name));
}
log('UPDATED: CANOPY_OPERATIONS/WOMATE_CANOPY_MASTER_2026.sql');

// Remove duplicate historical master SQL copies inside CANOPY_OPERATIONS only.
for(const f of fs.readdirSync(opsDir)){
  if(/^WOMATE_CANOPY_(CONSOLIDATED_MASTER_2026.*|MASTER_2026_V\d+).*\.sql$/i.test(f)){
    rm(path.join(opsDir,f));
  }
}

// 2) Apply approved /selected brand refinements without redesigning it.
const sel=path.join(root,'src','selected');
if(fs.existsSync(sel)){
  const markSrc=path.join(__dirname,'assets','womate-mark.png');
  const markDir=path.join(root,'public','assets','img');
  fs.mkdirSync(markDir,{recursive:true});
  fs.copyFileSync(markSrc,path.join(markDir,'womate-selected-mark.png'));

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
    writeUtf8(f,s);
  }

  const cssFile=path.join(sel,'selectedCard.css');
  if(fs.existsSync(cssFile)){
    let css=fs.readFileSync(cssFile,'utf8');
    if(!css.includes('WOMATE_SELECTED_TEXTURE_V3')){
      css += `\n\n/* WOMATE_SELECTED_TEXTURE_V3 — subtle premium texture */\nbody{\n  background-color:#F9F6FF;\n  background-image:\n    radial-gradient(circle at 18% 20%, rgba(198,255,82,.07) 0 1px, transparent 1.5px),\n    radial-gradient(circle at 78% 65%, rgba(14,77,74,.055) 0 1px, transparent 1.5px);\n  background-size:28px 28px,34px 34px;\n}\n`;
      writeUtf8(cssFile,css);
    }
  }

  const enh=path.join(sel,'selectedBrandEnhancements.js');
  let e=fs.existsSync(enh)?fs.readFileSync(enh,'utf8'):'';
  if(!e.includes('WOMATE_CARD_TEXTURE_V3')){
    e += `\n\n// WOMATE_CARD_TEXTURE_V3\n(function installWomateCardTextureV3(){\n  function near(d,r,g,b,t=2){return Math.abs(d[0]-r)<=t&&Math.abs(d[1]-g)<=t&&Math.abs(d[2]-b)<=t&&d[3]>245}\n  function texture(c){\n    if(!c||c.width!==1080||c.height!==1080)return;\n    const ctx=c.getContext('2d',{willReadFrequently:true}); if(!ctx)return;\n    ctx.save();\n    try{\n      for(let y=18;y<1065;y+=27){for(let x=18;x<1065;x+=27){\n        const d=ctx.getImageData(x,y,1,1).data;\n        if(near(d,14,77,74,1)){ctx.fillStyle='rgba(198,255,82,.075)';ctx.beginPath();ctx.arc(x,y,1.15,0,Math.PI*2);ctx.fill();}\n        else if(near(d,249,246,255,1)){ctx.fillStyle='rgba(14,77,74,.035)';ctx.fillRect(x,y,1,1);}\n      }}\n    }catch(_){}finally{ctx.restore()}\n  }\n  const all=()=>document.querySelectorAll('canvas').forEach(texture);\n  window.addEventListener('load',()=>setTimeout(all,180));\n  document.addEventListener('change',()=>setTimeout(all,80));\n  document.addEventListener('input',()=>setTimeout(all,80));\n  document.addEventListener('click',()=>setTimeout(all,160));\n  const b=HTMLCanvasElement.prototype.toBlob;if(b&&!b.__womateTextureV3){const w=function(...a){texture(this);return b.apply(this,a)};w.__womateTextureV3=true;HTMLCanvasElement.prototype.toBlob=w;}\n  const d=HTMLCanvasElement.prototype.toDataURL;if(d&&!d.__womateTextureV3){const w=function(...a){texture(this);return d.apply(this,a)};w.__womateTextureV3=true;HTMLCanvasElement.prototype.toDataURL=w;}\n})();\n`;
    writeUtf8(enh,e);
  }
  const stand=path.join(sel,'selectedStandalone.jsx');
  if(fs.existsSync(stand)){
    let s=fs.readFileSync(stand,'utf8');
    if(!s.includes('selectedBrandEnhancements')) writeUtf8(stand,`import './selectedBrandEnhancements.js';\n`+s);
  }
  log('UPDATED: /selected approved branding + footer + texture');
}else{
  log('NOTE: src/selected not present; selected-card source was not changed.');
}

// 3) Remove known obsolete patch folders. These are installers/temporary patches,
// not live application source. Keep the canonical operations and selected generator.
const staleDirs=[
  'CANOPY_DEEP_FIX','CANOPY_FIXES','canopy_profile_nav_patch','CANOPY_TEAM','CANOPY_TESTER',
  'WOMATE_SELECTED_BRAND_UPDATE','WOMATE_SELECTED_BRAND_UPDATE_V2','WOMATE_SELECTED_BRAND_UPDATE_V3'
];
for(const d of staleDirs) rm(path.join(root,d));

// dist is generated output, not source; remove stale build so next npm run build is clean.
rm(path.join(root,'dist'));

log('');
log('CLEAN UPDATE COMPLETE');
log('- Canonical Canopy SQL updated');
log('- Old duplicate/patch folders removed where present');
log('- Stale dist removed; run npm run build next');
log('- Live source, env, package files, node_modules and selected-card generator preserved');
