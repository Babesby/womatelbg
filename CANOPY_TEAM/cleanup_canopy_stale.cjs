const fs=require('fs');
const path=require('path');
const root=process.cwd();
const removed=[];
const safeRemove=(rel)=>{
  const p=path.join(root,rel);
  if(fs.existsSync(p)){fs.rmSync(p,{recursive:true,force:true});removed.push(rel);}
};
// Exact obsolete Canopy staging/test directories only. Never touch public assets,
// root assets, node_modules, dist, or the live src/canopy directory.
[
  'src/cantest',
  'src/canopy/canopy',
  'CANOPY_CANVAS_CANTEST',
  'CANOPY_FUNCTIONAL_AUDIT',
  'CANOPY_UNIFIED_2026',
  'CANTEST_CANVAS_REFINEMENT',
  'womate_canopy_addon'
].forEach(safeRemove);
const canopy=path.join(root,'src','canopy');
if(fs.existsSync(canopy)){
  for(const name of fs.readdirSync(canopy)){
    if(/\.bak$/i.test(name)||/\.before-[^.]+\.bak$/i.test(name)||/\.before-.+$/i.test(name)){
      safeRemove(path.join('src','canopy',name));
    }
  }
}
console.log(removed.length?`Removed ${removed.length} obsolete Canopy item(s):\n- ${removed.join('\n- ')}`:'No known obsolete Canopy staging files were present.');
