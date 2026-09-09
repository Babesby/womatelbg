const fs=require('fs'),path=require('path');
const cwd=process.cwd(),pkg=__dirname;
const src=path.join(cwd,'src','canopy');
if(!fs.existsSync(path.join(src,'CanopyApp.jsx')))throw new Error('Run from WOMATE project root.');
for(const f of ['CanopyStaffWorkspace.jsx','canopyStaffWorkspace.css']){
  fs.copyFileSync(path.join(pkg,'src','canopy',f),path.join(src,f));
}
const ops=path.join(cwd,'CANOPY_OPERATIONS');fs.mkdirSync(ops,{recursive:true});
fs.copyFileSync(path.join(pkg,'CANOPY_OPERATIONS','WOMATE_CANOPY_STAFF_WORKSPACE_NAV_FIX_20260909.sql'),path.join(ops,'WOMATE_CANOPY_STAFF_WORKSPACE_NAV_FIX_20260909.sql'));
for(const old of ['WOMATE_CANOPY_STAFF_WORKSPACE_PREVIEW_20260909.sql']){
  const p=path.join(ops,old); if(fs.existsSync(p))fs.rmSync(p,{force:true});
}
for(const d of ['WOMATE_CANOPY_FULL_TEAM_WORKSPACE_PREVIEW','WOMATE_CANOPY_FULL_TEAM_WORKSPACE_PREVIEW_20260909']){
  const p=path.join(cwd,d); if(fs.existsSync(p))fs.rmSync(p,{recursive:true,force:true});
}
console.log('UPDATED: Canopy team workspace navigation + Admin Preview');
console.log('- Admin Preview sidebar and mobile navigation now react to every selected view');
console.log('- Change role now works');
console.log('- Internal compatibility notice removed from staff UI');
console.log('- Admin Preview workspace RPC corrected so audit logging no longer forces fallback');
console.log('- The same workspace is used by real activated staff accounts');
console.log('- Future staff receive the correct workspace after activation');
console.log('- Coordinator/Fellow module boundaries remain preserved');
console.log('- Superseded workspace patch files cleaned');
console.log('');
console.log('NEXT: npm run build, then run the new NAV_FIX SQL once in Supabase.');
