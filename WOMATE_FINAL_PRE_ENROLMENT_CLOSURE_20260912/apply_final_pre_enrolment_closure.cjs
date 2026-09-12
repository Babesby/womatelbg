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
const rel=p=>path.relative(root,p).replace(/\\/g,'/');

function repairReplacementChars(s){
  // Exact recurring WOMATE corruption patterns.
  s=s.replace(/([A-Za-z])�s\b/g,'$1’s');       // Women�s, Africa�s
  s=s.replace(/([A-Za-z])�t\b/g,'$1’t');
  s=s.replace(/([A-Za-z])�re\b/g,'$1’re');
  s=s.replace(/([A-Za-z])�ve\b/g,'$1’ve');
  s=s.replace(/([A-Za-z])�ll\b/g,'$1’ll');
  s=s.replace(/([A-Za-z])�d\b/g,'$1’d');
  s=s.replace(/([A-Za-z])�m\b/g,'$1’m');

  // Known separator / punctuation corruption.
  s=s.replace(/\s�\s/g,' · ');
  s=s.replace(/(\b\d{2})\s*�\s*([A-Z])/g,'$1 · $2');
  s=s.replace(/function�and\b/g,'function—and');
  s=s.replace(/�To build\b/g,'“To build');
  s=s.replace(/�Rising Together\b/g,'“Rising Together');

  // Opening/closing quote-shaped corruption.
  s=s.replace(/([>=(,:]\s*)�(?=[A-Z])/g,'$1“');
  s=s.replace(/�(?=\s*<\/(?:blockquote|h1|h2|h3|p)>)/g,'”');

  // For any remaining replacement character between lowercase words, an em dash
  // is safer for WOMATE prose than leaving broken encoding visible.
  s=s.replace(/([a-z])�(?=[a-z])/g,'$1—');

  // Remaining isolated replacement characters are removed rather than rendered
  // publicly as broken glyphs. The audit will still flag suspicious doubled spaces.
  s=s.replace(/�/g,'');

  return s;
}

function repairCommonMojibake(s){
  const pairs=[
    ['Â·','·'],['Â©','©'],['â€”','—'],['â€“','–'],['â€™','’'],['â€˜','‘'],
    ['â€œ','“'],['â€','”'],['â€¦','…'],['Ã—','×'],['â†’','→'],['â†','←'],['â€¢','•']
  ];
  for(const [a,b] of pairs)s=s.split(a).join(b);
  return s;
}

let files=[...walk(path.join(root,'src')),...walk(path.join(root,'public'))];
if(fs.existsSync(path.join(root,'index.html')))files.push(path.join(root,'index.html'));
files=[...new Set(files)];

let changed=[];
for(const f of files){
  let s=fs.readFileSync(f,'utf8'), n=s;
  n=repairCommonMojibake(n);
  n=repairReplacementChars(n);
  n=n.split('This view gives the role a quick operational picture without exposing functions outside its authority.').join('');
  n=n.split('Workspace compatibility mode').join('');
  if(f.endsWith('index.html')&&!/<meta\s+charset=/i.test(n)){
    n=n.replace(/<head(\s[^>]*)?>/i,m=>m+'\n  <meta charset="UTF-8" />');
  }
  if(n!==s){fs.writeFileSync(f,n,'utf8');changed.push(rel(f));}
}

// Remove implementation/environment wording from staff/learner-visible Canopy copy.
const app=path.join(root,'src','canopy','CanopyApp.jsx');
if(fs.existsSync(app)){
  let s=fs.readFileSync(app,'utf8'),n=s;
  n=n.replace(
    'Canopy backend is not configured on this deployment yet. Add the Supabase environment variables before testing accounts.',
    'Canopy is temporarily unavailable. Please try again shortly or contact WOMATE support.'
  );
  if(n!==s){fs.writeFileSync(app,n,'utf8');if(!changed.includes(rel(app)))changed.push(rel(app));}
}
const teamApi=path.join(root,'src','canopy','canopyTeamAccessApi.js');
if(fs.existsSync(teamApi)){
  let s=fs.readFileSync(teamApi,'utf8'),n=s;
  n=n.replace(
    'Canopy team access is not configured. Add the Supabase environment variables.',
    'Canopy team access is temporarily unavailable.'
  );
  if(n!==s){fs.writeFileSync(teamApi,n,'utf8');if(!changed.includes(rel(teamApi)))changed.push(rel(teamApi));}
}

// Ensure the canonical consolidated SQL is in the expected project location.
const pkgSql=path.join(__dirname,'CANOPY_OPERATIONS','WOMATE_CANOPY_TEAM_READINESS_FINAL_20260910.sql');
const dstSql=path.join(root,'CANOPY_OPERATIONS','WOMATE_CANOPY_TEAM_READINESS_FINAL_20260910.sql');
if(fs.existsSync(pkgSql)){
  fs.mkdirSync(path.dirname(dstSql),{recursive:true});
  fs.copyFileSync(pkgSql,dstSql);
}

console.log('\nWOMATE FINAL PRE-ENROLMENT CLOSURE');
console.log(`Updated ${changed.length} source file(s).`);
changed.forEach(f=>console.log('  UPDATED  '+f));
console.log('Canonical Team Readiness SQL placed in CANOPY_OPERATIONS.');
console.log('\nNEXT: npm run build');
console.log('THEN: node .\\WOMATE_FINAL_PRE_ENROLMENT_CLOSURE_20260912\\audit_final_pre_enrolment_v2.cjs');
