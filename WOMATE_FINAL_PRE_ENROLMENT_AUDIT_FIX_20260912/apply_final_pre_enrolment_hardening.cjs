const fs=require('fs'),path=require('path');

const root=process.cwd();
const textExt=new Set(['.js','.jsx','.ts','.tsx','.css','.html','.md','.txt','.json','.cjs','.mjs']);
const excluded=new Set(['node_modules','.git','dist','.vercel','build','coverage']);

function walk(dir,out=[]){
  if(!fs.existsSync(dir)) return out;
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(excluded.has(ent.name)) continue;
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(p,out);
    else if(textExt.has(path.extname(ent.name).toLowerCase())) out.push(p);
  }
  return out;
}
function rel(p){return path.relative(root,p).replace(/\\/g,'/')}
function replaceAllSafe(s){
  const replacements=[
    ['Africa � connected globally','Africa · connected globally'],
    ['WOMATE Circle � WhatsApp','WOMATE Circle · WhatsApp'],
    ['Â·','·'],
    ['Â©','©'],
    ['â€”','—'],
    ['â€“','–'],
    ['â€™','’'],
    ['â€˜','‘'],
    ['â€œ','“'],
    ['â€','”'],
    ['â€¦','…'],
    ['Ã—','×'],
    ['â†’','→'],
    ['â†','←'],
    ['â€¢','•'],
  ];
  for(const [a,b] of replacements) s=s.split(a).join(b);

  // The reported site-wide corruption is a separator that became U+FFFD.
  // Only replace U+FFFD when it is clearly being used as a separator between
  // whitespace-delimited text; do not blindly alter unknown replacement chars.
  s=s.replace(/\s�\s/g,' · ');
  s=s.replace(/(\b\d{2})\s*�\s*([A-Z])/g,'$1 · $2');

  // Remove known internal team-facing copy wherever it remains.
  s=s.split('This view gives the role a quick operational picture without exposing functions outside its authority.').join('');
  s=s.split('Workspace compatibility mode').join('');

  // Public fallback copy must not expose implementation/environment details.
  s=s.replace(
    /alert\(['"]Add VITE_CIRCLE_WHATSAPP_URL to your \.env to activate the WOMATE Circle WhatsApp route\.['"]\)/g,
    "alert('The WOMATE Circle WhatsApp link is temporarily unavailable. Please try again later.')"
  );
  return s;
}

const targets=[
  ...walk(path.join(root,'src')),
  ...walk(path.join(root,'public')),
];
for(const f of ['index.html']) if(fs.existsSync(path.join(root,f))) targets.push(path.join(root,f));

let changed=[];
for(const file of [...new Set(targets)]){
  let s=fs.readFileSync(file,'utf8');
  let n=replaceAllSafe(s);
  if(file.endsWith('index.html') && !/<meta\s+charset=/i.test(n)){
    n=n.replace(/<head(\s[^>]*)?>/i,m=>m+'\n  <meta charset="UTF-8" />');
  }
  if(n!==s){
    fs.writeFileSync(file,n,'utf8');
    changed.push(rel(file));
  }
}

// Fix the known React temporal-dead-zone defect if an older copy still exists.
const staff=path.join(root,'src','canopy','CanopyStaffWorkspace.jsx');
if(fs.existsSync(staff)){
  let s=fs.readFileSync(staff,'utf8');
  const bad=`  const{data,error,loading}=useWorkspace({viewer,previewRole,previewModule,refreshKey});
  const role=previewRole||data?.role||null;
  const moduleId=previewModule||data?.module_id||null;
  const [open,setOpen]=useState(false);
  const [refreshKey,setRefreshKey]=useState(0);`;
  const good=`  const [open,setOpen]=useState(false);
  const [refreshKey,setRefreshKey]=useState(0);
  const{data,error,loading}=useWorkspace({viewer,previewRole,previewModule,refreshKey});
  const role=previewRole||data?.role||null;
  const moduleId=previewModule||data?.module_id||null;`;
  if(s.includes(bad)){
    s=s.replace(bad,good);
    fs.writeFileSync(staff,s,'utf8');
    if(!changed.includes(rel(staff))) changed.push(rel(staff));
  }
}

console.log('\nWOMATE FINAL PRE-ENROLMENT HARDENING');
console.log(`Updated ${changed.length} file(s).`);
changed.forEach(f=>console.log('  UPDATED  '+f));
console.log('\nSafe source-wide UTF-8 separator repair complete.');
console.log('Known internal team copy removed.');
console.log('Public WhatsApp fallback no longer exposes VITE/.env implementation details.');
console.log('\nNEXT: npm run build');
console.log('THEN: node .\\WOMATE_FINAL_PRE_ENROLMENT_AUDIT_FIX_20260912\\audit_final_pre_enrolment.cjs');
