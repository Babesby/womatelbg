const fs=require('fs'),path=require('path');
const root=process.cwd();
const excluded=new Set(['node_modules','.git','dist','.vercel','build','coverage']);
const exts=new Set(['.js','.jsx','.ts','.tsx','.css','.html','.md','.txt','.cjs','.mjs']);
function walk(dir,out=[]){
 if(!fs.existsSync(dir))return out;
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  if(excluded.has(e.name))continue;
  const p=path.join(dir,e.name);
  if(e.isDirectory())walk(p,out);
  else if(exts.has(path.extname(e.name).toLowerCase()))out.push(p);
 }
 return out;
}
const files=[...walk(path.join(root,'src')),...walk(path.join(root,'public'))];
if(fs.existsSync(path.join(root,'index.html')))files.push(path.join(root,'index.html'));
const data=new Map([...new Set(files)].map(f=>[f,fs.readFileSync(f,'utf8')]));
const rel=p=>path.relative(root,p).replace(/\\/g,'/');
const loc=re=>{
 const a=[];
 for(const [f,s] of data)s.split(/\r?\n/).forEach((l,i)=>{if(re.global)re.lastIndex=0;if(re.test(l))a.push(`${rel(f)}:${i+1}: ${l.trim().slice(0,190)}`)});
 return a;
};
const has=re=>loc(re).length>0;
let pass=[],fail=[],warn=[];
const P=(n,ok,d='')=>(ok?pass:fail).push({n,d});
const W=(n,d='')=>warn.push({n,d});

let h=loc(/�/);P('No Unicode replacement characters (�) remain',!h.length,h.slice(0,30).join('\n'));
h=loc(/Â·|Â©|â€”|â€“|â€™|â€˜|â€œ|â€|â€¦|Ã—|â†’|â†|â€¢/);P('No common UTF-8 mojibake remains',!h.length,h.slice(0,30).join('\n'));
for(const [label,re] of [
 ['Africa · connected globally',/Africa · connected globally/],
 ['WOMATE Circle · WhatsApp',/WOMATE Circle · WhatsApp/],
 ['02 · DIRECT ACCESS',/02 · DIRECT ACCESS/]
])P(`Correct copy present: ${label}`,has(re));

for(const re of [
 /This view gives the role a quick operational picture without exposing functions outside its authority\./i,
 /Workspace compatibility mode/i,/dashboard RPC/i,/workspace SQL/i,/Run the included .*SQL/i,
 /Supabase environment/i
]){
 h=loc(re);P(`No public/internal implementation copy matching ${re}`,!h.length,h.slice(0,20).join('\n'));
}

h=loc(/alert\([^)]*(?:VITE_|\.env|Supabase|RPC|SQL)[^)]*\)/i);
P('No public alert exposes environment/database implementation details',!h.length,h.slice(0,20).join('\n'));
h=loc(/href\s*=\s*["']#["']|javascript:void\s*\(/i);P('No obvious dead href="#" or javascript:void links',!h.length,h.slice(0,20).join('\n'));
h=loc(/<img[^>]+src\s*=\s*["']\s*["']/i);P('No obvious empty image src',!h.length,h.slice(0,20).join('\n'));

h=loc(/\b(?:TODO|FIXME|HACK)\b/);if(h.length)W('TODO/FIXME/HACK markers remain',h.slice(0,20).join('\n'));
h=loc(/\bconsole\.log\s*\(/);if(h.length)W('console.log statements remain',h.slice(0,20).join('\n'));

const req=['CanopyApp.jsx','canopyApi.js','canopySchedule.js','CanopyAssignmentsV2.jsx','CanopyCertificate.jsx','CanopyNotifications.jsx','CanopyCanvas.jsx','canopyCurriculum2026.js'];
for(const f of req)P(`Required Canopy file exists: src/canopy/${f}`,fs.existsSync(path.join(root,'src','canopy',f)));

const app=path.join(root,'src','canopy','CanopyApp.jsx');
if(fs.existsSync(app)){
 const s=fs.readFileSync(app,'utf8');
 for(const r of ['/canopy/classroom','/canopy/course/she-leads','/canopy/assignments','/canopy/progress','/canopy/resources','/canopy/profile','/canopy/canvas','/canopy/notifications','/canopy/help','/canopy/certificate'])
  P(`Learner route wired: ${r}`,s.includes(r));
 P('Auth callback route exists',s.includes('/canopy/auth/callback'));
 P('Reset password route exists',s.includes('/canopy/reset-password'));
}

const staff=path.join(root,'src','canopy','CanopyStaffWorkspace.jsx');
if(fs.existsSync(staff)){
 const s=fs.readFileSync(staff,'utf8');
 for(const r of ['programme_manager','programme_operations','module_coordinator','learning_fellow'])P(`Staff role present: ${r}`,s.includes(r));
 for(const re of [/Overview/i,/Learner operations/i,/Submissions/i,/Communications/i,/Complaints/i,/Reports/i])P(`Staff navigation/function present: ${re}`,re.test(s));
 const a=s.indexOf('const [refreshKey,setRefreshKey]=useState(0)'),b=s.indexOf('useWorkspace({viewer,previewRole,previewModule,refreshKey})');
 P('Known refreshKey initialization-order crash remains fixed',a>=0&&b>=0&&a<b);
}else P('Shared staff workspace exists',false);

const sched=path.join(root,'src','canopy','canopySchedule.js');
if(fs.existsSync(sched)){
 const s=fs.readFileSync(sched,'utf8');
 P('Participant access date retained: 20 Sep 2026',/20 September 2026|2026-09-20/.test(s));
 P('Module 01 start retained: 21 Sep 2026',/2026-09-21/.test(s));
 P('Module 05 start retained: 19 Oct 2026',/2026-10-19/.test(s));
}

const curr=path.join(root,'src','canopy','canopyCurriculum2026.js');
if(fs.existsSync(curr)){
 const s=fs.readFileSync(curr,'utf8'),ids=[...s.matchAll(/id:'(\d{2}\.\d)'/g)].map(x=>x[1]);
 P('Curriculum still contains 20 unique lessons',ids.length===20&&new Set(ids).size===20,`Found ${ids.length}`);
}
const api=path.join(root,'src','canopy','canopyApi.js');
if(fs.existsSync(api)){
 const s=fs.readFileSync(api,'utf8');
 P('Manual assignment review RPC remains wired',/canopy_manager_review_assignment/.test(s));
 P('Certificate issuance RPC remains wired',/canopy_manager_issue_certificate/.test(s));
}
P('No obsolete src/cantest directory',!fs.existsSync(path.join(root,'src','cantest')));
P('No obsolete nested src/canopy/canopy directory',!fs.existsSync(path.join(root,'src','canopy','canopy')));

const sql=path.join(root,'CANOPY_OPERATIONS','WOMATE_CANOPY_TEAM_READINESS_FINAL_20260910.sql');
P('Canonical Team Readiness SQL exists',fs.existsSync(sql));
if(fs.existsSync(sql)){
 const s=fs.readFileSync(sql,'utf8');
 P('Canonical SQL includes staff workspace RPC',/canopy_staff_workspace_data/.test(s));
 P('Canonical SQL includes safe Team Access retry',/already_activated/.test(s)&&/canopy_activate_team_access/.test(s));
 P('Canonical SQL includes Auth-user deletion safety',/canopy_auth_user_delete_blockers/.test(s)&&/on delete set null/i.test(s));
}

const lines=['WOMATE / CANOPY FINAL PRE-ENROLMENT AUDIT V2',new Date().toISOString(),'',
 `PASS: ${pass.length}`,`FAIL: ${fail.length}`,`WARN: ${warn.length}`,''];
pass.forEach(x=>lines.push('PASS  '+x.n));
if(fail.length){lines.push('\nFAILURES');fail.forEach(x=>{lines.push('FAIL  '+x.n);if(x.d)lines.push(x.d)})}
if(warn.length){lines.push('\nWARNINGS');warn.forEach(x=>{lines.push('WARN  '+x.n);if(x.d)lines.push(x.d)})}
lines.push('\nStatic source audit complete. Production build + live smoke test remain runtime evidence.');
fs.mkdirSync(path.join(root,'CANOPY_OPERATIONS'),{recursive:true});
fs.writeFileSync(path.join(root,'CANOPY_OPERATIONS','WOMATE_FINAL_PRE_ENROLMENT_AUDIT_REPORT_V2.txt'),lines.join('\n'),'utf8');
console.log(lines.join('\n'));
process.exitCode=fail.length?1:0;
