const fs=require('fs'),path=require('path');
const cwd=process.cwd();
const pkg=__dirname;
const srcDir=path.join(cwd,'src','canopy');
const app=path.join(srcDir,'CanopyApp.jsx');
if(!fs.existsSync(app))throw new Error('Run this from the WOMATE project root. src/canopy/CanopyApp.jsx was not found.');
fs.mkdirSync(srcDir,{recursive:true});

for(const f of ['CanopyStaffWorkspace.jsx','canopyStaffWorkspace.css']){
  fs.copyFileSync(path.join(pkg,'src','canopy',f),path.join(srcDir,f));
}
const ops=path.join(cwd,'CANOPY_OPERATIONS');
fs.mkdirSync(ops,{recursive:true});
fs.copyFileSync(path.join(pkg,'CANOPY_OPERATIONS','WOMATE_CANOPY_STAFF_WORKSPACE_PREVIEW_20260909.sql'),path.join(ops,'WOMATE_CANOPY_STAFF_WORKSPACE_PREVIEW_20260909.sql'));

let s=fs.readFileSync(app,'utf8');
if(!s.includes("CanopyStaffWorkspace from './CanopyStaffWorkspace'")){
  const imports=[...s.matchAll(/^import .*?;\s*$/gm)];
  if(!imports.length)throw new Error('Could not identify the import block in CanopyApp.jsx.');
  const last=imports[imports.length-1];
  const pos=last.index+last[0].length;
  s=s.slice(0,pos)+"\nimport CanopyStaffWorkspace from './CanopyStaffWorkspace';"+s.slice(pos);
}

const marker='/* WOMATE_FULL_TEAM_WORKSPACE_PREVIEW_20260909 */';
if(!s.includes(marker)){
  const needle="if(!viewer){";
  const idx=s.indexOf(needle);
  if(idx<0)throw new Error('Could not find the authenticated-viewer routing point in CanopyApp.jsx.');

  // Insert after the existing !viewer guard statement, using the next role declaration as a stable boundary.
  const managerCandidates=[
    "const manager=",
    "const isManager=",
    "let content;"
  ];
  let boundary=-1;
  for(const c of managerCandidates){
    const p=s.indexOf(c,idx);
    if(p>=0&&(boundary<0||p<boundary))boundary=p;
  }
  if(boundary<0)throw new Error('Could not identify the post-auth routing boundary in CanopyApp.jsx.');

  const block=`
${marker}
const __womateTeamPath=path==='/canopy/manage/role-preview'||path.startsWith('/canopy/manage/role-preview/')||path==='/canopy/operations'||path.startsWith('/canopy/operations/')||path==='/canopy/coordinator'||path.startsWith('/canopy/coordinator/')||path==='/canopy/fellow'||path.startsWith('/canopy/fellow/');
if(__womateTeamPath){
  return <CanopyStaffWorkspace viewer={viewer} path={path} onSignOut={async()=>{await signOut();go('/canopy/login')}}/>;
}
`;
  s=s.slice(0,boundary)+block+s.slice(boundary);
}
fs.writeFileSync(app,s,'utf8');

console.log('UPDATED: WOMATE Canopy full team workspace preview');
console.log('- Admin Preview now shows the complete role-specific sidebar/navigation');
console.log('- Programme Manager, Deputy, Coordinator and Fellow workspaces are distinct');
console.log('- Coordinator/Fellow remain module-bound');
console.log('- Admin Preview is read-only and never consumes a Team Access Code');
console.log('- Real staff Spotlight nomination/shortlist uses existing authorised RPCs');
console.log('- Richer roster/communication data SQL copied to CANOPY_OPERATIONS');
console.log('');
console.log('NEXT: run npm run build, then apply the included SQL once in Supabase SQL Editor.');
