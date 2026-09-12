const fs=require('fs'),path=require('path');
const root=process.cwd();
const excluded=new Set(['node_modules','.git','dist','.vercel','build','coverage']);
const exts=new Set(['.js','.jsx','.ts','.tsx','.css','.html','.md','.txt','.cjs','.mjs']);
function walk(dir,out=[]){
 if(!fs.existsSync(dir)) return out;
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  if(excluded.has(e.name)) continue;
  const p=path.join(dir,e.name);
  if(e.isDirectory()) walk(p,out);
  else if(exts.has(path.extname(e.name).toLowerCase())) out.push(p);
 }
 return out;
}
const files=[...walk(path.join(root,'src')),...walk(path.join(root,'public'))];
if(fs.existsSync(path.join(root,'index.html'))) files.push(path.join(root,'index.html'));
const uniq=[...new Set(files)];
const data=new Map(uniq.map(f=>[f,fs.readFileSync(f,'utf8')]));
const rel=p=>path.relative(root,p).replace(/\\/g,'/');
let pass=[],fail=[],warn=[];
const P=(name,ok,detail='')=>(ok?pass:fail).push({name,detail});
const W=(name,detail='')=>warn.push({name,detail});

function locations(re){
 const hits=[];
 for(const [f,s] of data){
  const lines=s.split(/\r?\n/);
  lines.forEach((line,i)=>{
   if(re.global) re.lastIndex=0;
   if(re.test(line)) hits.push(`${rel(f)}:${i+1}: ${line.trim().slice(0,180)}`);
  });
 }
 return hits;
}
function any(re){return locations(re).length>0}

const replacement=locations(/�/);
P('No Unicode replacement characters (�) remain anywhere in src/public/index.html',replacement.length===0,replacement.slice(0,20).join('\n'));

const mojibake=locations(/Â·|Â©|â€”|â€“|â€™|â€˜|â€œ|â€|â€¦|Ã—|â†’|â†|â€¢/);
P('No common UTF-8 mojibake sequences remain',mojibake.length===0,mojibake.slice(0,20).join('\n'));

const reported=[
 ['Africa · connected globally',/Africa · connected globally/],
 ['WOMATE Circle · WhatsApp',/WOMATE Circle · WhatsApp/],
 ['02 · DIRECT ACCESS',/02 · DIRECT ACCESS/],
];
for(const [label,re] of reported) P(`Correct separator present: ${label}`,any(re),'');

const internalPhrases=[
 /This view gives the role a quick operational picture without exposing functions outside its authority\./i,
 /Workspace compatibility mode/i,
 /dashboard RPC/i,
 /workspace SQL/i,
 /Supabase environment/i,
 /Run the included .*SQL/i,
];
for(const re of internalPhrases){
 const hits=locations(re);
 P(`No rendered/internal copy matching ${re}`,hits.length===0,hits.slice(0,10).join('\n'));
}

const envLeak=locations(/alert\([^)]*(?:VITE_|\.env|Supabase|RPC|SQL)[^)]*\)/i);
P('Public alerts do not expose environment/database implementation details',envLeak.length===0,envLeak.slice(0,10).join('\n'));

const deadHref=locations(/href\s*=\s*["']#["']|javascript:void\s*\(/i);
P('No obvious dead href="#" or javascript:void links',deadHref.length===0,deadHref.slice(0,20).join('\n'));

const imgEmpty=locations(/<img[^>]+src\s*=\s*["']\s*["']/i);
P('No obvious empty image src attributes',imgEmpty.length===0,imgEmpty.slice(0,20).join('\n'));

const targetBlankUnsafe=locations(/target\s*=\s*["']_blank["'](?![^>]*rel\s*=)/i);
if(targetBlankUnsafe.length) W('target="_blank" links without rel detected',targetBlankUnsafe.slice(0,20).join('\n'));

const todo=locations(/\b(?:TODO|FIXME|HACK)\b/);
if(todo.length) W('TODO/FIXME/HACK markers remain',todo.slice(0,20).join('\n'));

const consoleLogs=locations(/\bconsole\.log\s*\(/);
if(consoleLogs.length) W('console.log statements remain in source',consoleLogs.slice(0,20).join('\n'));

const appPath=path.join(root,'src','canopy','CanopyApp.jsx');
const staffPath=path.join(root,'src','canopy','CanopyStaffWorkspace.jsx');
const apiPath=path.join(root,'src','canopy','canopyApi.js');
const schedPath=path.join(root,'src','canopy','canopySchedule.js');
const assignPath=path.join(root,'src','canopy','CanopyAssignmentsV2.jsx');
const certPath=path.join(root,'src','canopy','CanopyCertificate.jsx');
const notifPath=path.join(root,'src','canopy','CanopyNotifications.jsx');
const canvasPath=path.join(root,'src','canopy','CanopyCanvas.jsx');
const currPath=path.join(root,'src','canopy','canopyCurriculum2026.js');

for(const p of [appPath,apiPath,schedPath,assignPath,certPath,notifPath,canvasPath,currPath])
 P(`Required Canopy file exists: ${rel(p)}`,fs.existsSync(p));

if(fs.existsSync(appPath)){
 const s=fs.readFileSync(appPath,'utf8');
 for(const r of ['/canopy/classroom','/canopy/course/she-leads','/canopy/assignments','/canopy/progress','/canopy/resources','/canopy/profile','/canopy/canvas','/canopy/notifications','/canopy/help','/canopy/certificate'])
   P(`Learner route wired: ${r}`,s.includes(r));
 P('Auth callback route exists',s.includes('/canopy/auth/callback'));
 P('Reset password route exists',s.includes('/canopy/reset-password'));
}

if(fs.existsSync(staffPath)){
 const s=fs.readFileSync(staffPath,'utf8');
 for(const label of ['programme_manager','programme_operations','module_coordinator','learning_fellow'])
   P(`Staff role workspace definition present: ${label}`,s.includes(label));
 for(const nav of ['Overview','Learner Operations','Submissions','Communications','Complaints','Reports'])
   P(`Shared staff navigation/function present: ${nav}`,s.includes(nav));
 P('Known refreshKey temporal-dead-zone ordering is fixed',
   s.indexOf('const [refreshKey,setRefreshKey]=useState(0)') < s.indexOf('useWorkspace({viewer,previewRole,previewModule,refreshKey})')
   && s.indexOf('const [refreshKey,setRefreshKey]=useState(0)')>=0);
}

if(fs.existsSync(schedPath)){
 const s=fs.readFileSync(schedPath,'utf8');
 P('Participant access date retained: 20 Sep 2026',/20 September 2026|2026-09-20/.test(s));
 P('Module 01 start retained: 21 Sep 2026',/2026-09-21/.test(s));
 P('Module 05 start retained: 19 Oct 2026',/2026-10-19/.test(s));
}

if(fs.existsSync(currPath)){
 const s=fs.readFileSync(currPath,'utf8');
 const lessonIds=[...s.matchAll(/id:'(\d{2}\.\d)'/g)].map(x=>x[1]);
 P('Curriculum still contains 20 unique lessons',lessonIds.length===20&&new Set(lessonIds).size===20,`Found ${lessonIds.length}`);
}

if(fs.existsSync(apiPath)){
 const s=fs.readFileSync(apiPath,'utf8');
 P('Manual assignment review RPC remains wired',/canopy_manager_review_assignment/.test(s));
 P('Certificate issuance RPC remains wired',/canopy_manager_issue_certificate/.test(s));
}

const obsoleteCantest=fs.existsSync(path.join(root,'src','cantest'));
P('No obsolete src/cantest directory',!obsoleteCantest);
P('No obsolete nested src/canopy/canopy directory',!fs.existsSync(path.join(root,'src','canopy','canopy')));

const sql=path.join(root,'CANOPY_OPERATIONS','WOMATE_CANOPY_TEAM_READINESS_FINAL_20260910.sql');
if(fs.existsSync(sql)){
 const s=fs.readFileSync(sql,'utf8');
 P('Canonical Team Readiness SQL includes staff workspace RPC',/canopy_staff_workspace_data/.test(s));
 P('Canonical Team Readiness SQL includes safe Team Access retry',/already_activated/.test(s)&&/canopy_activate_team_access/.test(s));
 P('Canonical Team Readiness SQL includes Auth-user deletion safety',/canopy_auth_user_delete_blockers/.test(s)&&/on delete set null/i.test(s));
}else W('Canonical Team Readiness SQL not found at expected path','CANOPY_OPERATIONS/WOMATE_CANOPY_TEAM_READINESS_FINAL_20260910.sql');

const report=[];
report.push('WOMATE / CANOPY FINAL PRE-ENROLMENT SOURCE AUDIT');
report.push(new Date().toISOString());
report.push('');
report.push(`PASS: ${pass.length}`);
report.push(`FAIL: ${fail.length}`);
report.push(`WARN: ${warn.length}`);
report.push('');
pass.forEach(x=>report.push(`PASS  ${x.name}`));
if(fail.length){
 report.push('\nFAILURES');
 fail.forEach(x=>{report.push(`FAIL  ${x.name}`);if(x.detail)report.push(x.detail)});
}
if(warn.length){
 report.push('\nWARNINGS (review; not all are launch blockers)');
 warn.forEach(x=>{report.push(`WARN  ${x.name}`);if(x.detail)report.push(x.detail)});
}
report.push('\nNOTE: Static audit cannot prove live Supabase/Vercel behaviour. Production build and one live role/learner smoke test remain the final runtime checks.');
const out=path.join(root,'CANOPY_OPERATIONS','WOMATE_FINAL_PRE_ENROLMENT_AUDIT_REPORT.txt');
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,report.join('\n'),'utf8');
console.log(report.join('\n'));
console.log(`\nReport saved to ${path.relative(root,out)}`);
process.exitCode=fail.length?1:0;
