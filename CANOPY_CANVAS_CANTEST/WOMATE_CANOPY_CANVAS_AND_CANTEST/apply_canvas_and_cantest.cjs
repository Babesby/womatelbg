const fs=require('fs'),path=require('path');

const root=process.cwd(),src=path.join(root,'src'),canopy=path.join(src,'canopy'),cantest=path.join(src,'cantest');
const canvasPath=path.join(canopy,'CanopyCanvas.jsx'),cssPath=path.join(canopy,'canopy.css'),appPath=path.join(canopy,'CanopyApp.jsx');
if(!fs.existsSync(canvasPath)||!fs.existsSync(cssPath)||!fs.existsSync(appPath)){
  console.error('ERROR: Run this from the WOMATE project root.');process.exit(1);
}
const stamp='.before-canvas-cantest.bak';
for(const p of [canvasPath,cssPath,appPath])fs.copyFileSync(p,p+stamp);

// 1) Upgrade live CanopyCanvas.
fs.copyFileSync(path.join(__dirname,'CanopyCanvas.jsx'),canvasPath);
let css=fs.readFileSync(cssPath,'utf8'),add=fs.readFileSync(path.join(__dirname,'canvas_css.txt'),'utf8');
if(!css.includes('/* CANOPYCANVAS 2026 UPGRADE */'))css+='\n'+add+'\n';
fs.writeFileSync(cssPath,css,'utf8');

// 2) Rebuild CANTEST as an exact duplicate of current Canopy.
fs.rmSync(cantest,{recursive:true,force:true});
fs.cpSync(canopy,cantest,{recursive:true});

// 3) Prefix all CANTEST internal route literals with /canopy/cantest.
// Avoid asset paths such as /assets/canopy.
for(const name of fs.readdirSync(cantest)){
  const p=path.join(cantest,name);
  if(!fs.statSync(p).isFile()||!/\.(js|jsx)$/.test(name))continue;
  let t=fs.readFileSync(p,'utf8');
  t=t.replace(/(['"`])\/canopy(?=\/|['"`])/g,'$1/canopy/cantest');
  fs.writeFileSync(p,t,'utf8');
}

// 4) CANTEST: remove all course timing locks.
const testAppPath=path.join(cantest,'CanopyApp.jsx');
let ta=fs.readFileSync(testAppPath,'utf8');
ta=ta.replace(/function canopyModuleIsOpen\(m(?:,now=new Date\(\))?\)\{[^}]*\}/,
  "function canopyModuleIsOpen(){return true}");
ta=ta.replace(/const active=viewer\.enrollments\?\.[^;]+;/,
  "const active=true;");
ta=ta.replace(/const enrolled=viewer\.enrollments\?\.[^;]+;/,
  "const enrolled=true;");
ta=ta.replace(/Canopy learning access opens from 1 October 2026\./g,'CANTEST access is open for unrestricted testing.');
fs.writeFileSync(testAppPath,ta,'utf8');

// 5) CANTEST assignment schedule: all weeks and speaker tasks open.
// Dates remain displayed only as programme reference; no UI gate uses them.
const testSchedule=path.join(cantest,'canopySchedule.js');
if(fs.existsSync(testSchedule)){
  let ts=fs.readFileSync(testSchedule,'utf8');
  ts=ts.replace(/export function openAssignments\(now=new Date\(\)\)\{[\s\S]*?\n\}/,
    "export function openAssignments(){return CANOPY_ASSIGNMENT_SCHEDULE}");
  ts=ts.replace(/export function speakerChallengeOpen\(item,now=new Date\(\)\)\{[\s\S]*?\n\}/,
    "export function speakerChallengeOpen(){return true}");
  fs.writeFileSync(testSchedule,ts,'utf8');
}

// 6) CANTEST assignments: ignore resubmission dates and use LOCAL TEST submissions.
// This prevents test work from polluting live learner records or being blocked by the live SQL clock.
const testAssignments=path.join(cantest,'CanopyAssignmentsV2.jsx');
if(fs.existsSync(testAssignments)){
  let t=fs.readFileSync(testAssignments,'utf8');

  // Replace API import with only puzzle API unused; then localize load/send safely.
  t=t.replace(/import \{getWeeklyAssignmentSubmissions,submitWeeklyAssignment,getPuzzleProgress,savePuzzleCompletion,refreshLearningAutomation\} from ['"]\.\/canopyApi['"];/,
`const CANTEST_STORE='womate_cantest_assignment_submissions_v1';
const CANTEST_PUZZLES='womate_cantest_puzzles_v1';
const localRead=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return []}};
const localWrite=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const getWeeklyAssignmentSubmissions=async()=>localRead(CANTEST_STORE);
const getPuzzleProgress=async()=>localRead(CANTEST_PUZZLES);
const refreshLearningAutomation=async()=>true;
const savePuzzleCompletion=async(_session,weekKey)=>{const rows=localRead(CANTEST_PUZZLES).filter(x=>x.week_key!==weekKey);rows.push({week_key:weekKey,completed:true});localWrite(CANTEST_PUZZLES,rows);return true};
const submitWeeklyAssignment=async(_session,weekKey,payload)=>{const rows=localRead(CANTEST_STORE),n=rows.filter(x=>x.week_key===weekKey).length;if(n>=3)throw new Error('CANTEST: all three attempts have been used.');rows.push({id:crypto.randomUUID?.()||String(Date.now()),week_key:weekKey,attempt_no:n+1,...payload,status:'submitted',submitted_at:new Date().toISOString(),auto_score:null,release_at:new Date(0).toISOString()});localWrite(CANTEST_STORE,rows);return true};`);

  t=t.replace(/const mayResubmit=count<3 && new Date\(\)<=new Date\(item\.resubmitUntil\);/,'const mayResubmit=count<3;');
  t=t.replace(/<span className="ca-kicker">ASSIGNMENTS<\/span>/,'<span className="ca-kicker">CANTEST · ASSIGNMENTS</span>');
  t=t.replace(/Each week opens on Monday\.[\s\S]*?by Sunday\.<\/p>/,
    'All five assignment weeks are open in CANTEST. Speaker tasks are unlocked and timing is disabled so you can test the complete participant flow.</p>');
  t=t.replace(/Submission window closed or all three attempts have been used\./g,'All three CANTEST attempts have been used.');
  fs.writeFileSync(testAssignments,t,'utf8');
}

// 7) Add a visible CANTEST badge.
let tc=fs.readFileSync(path.join(cantest,'canopy.css'),'utf8');
if(!tc.includes('/* CANTEST MODE */'))tc+=`
/* CANTEST MODE */
.canopyAppTop:before{content:'CANTEST · TIMING OFF';display:inline-flex;align-items:center;padding:5px 9px;border-radius:999px;background:#C6FF52;color:#0E4D4A;font-size:9px;font-weight:900;letter-spacing:.08em;white-space:nowrap}
`;
fs.writeFileSync(path.join(cantest,'canopy.css'),tc,'utf8');

// 8) Expose CANTEST through the existing /canopy router.
// The import uses the duplicated app, while the live Canopy code remains separate.
let app=fs.readFileSync(appPath,'utf8');
if(!app.includes("import CantestApp from '../cantest/CanopyApp';")){
  const lines=app.split(/\r?\n/);let last=-1;
  for(let i=0;i<lines.length;i++)if(lines[i].trim().startsWith('import '))last=i;
  lines.splice(last+1,0,"import CantestApp from '../cantest/CanopyApp';");
  app=lines.join('\n');
}
const marker="export default function CanopyApp(){";
if(!app.includes(marker)){console.error('ERROR: Could not expose CANTEST route. Live Canvas upgrade applied, but route injection stopped.');process.exit(1);}
if(!app.includes("path.startsWith('/canopy/cantest')")){
  app=app.replace(marker,marker+"\nif(window.location.pathname.startsWith('/canopy/cantest'))return <CantestApp/>;");
}
fs.writeFileSync(appPath,app,'utf8');

console.log('\nWOMATE CanopyCanvas + CANTEST applied.');
console.log(' - Audience and Desired action are dropdowns');
console.log(' - Message is the only typed campaign-content field');
console.log(' - Tone now produces a real message suggestion and changes preview treatment');
console.log(' - Canopy logo is applied automatically as a watermark');
console.log(' - solid backgrounds, gradients, combos, textures and selectable icons added');
console.log(' - src/cantest created as a duplicate of current src/canopy');
console.log(' - CANTEST route: /canopy/cantest');
console.log(' - CANTEST course/modules/assignments/speaker tasks are timing-free');
console.log(' - CANTEST assignment submissions use localStorage, not live Supabase records');
console.log(' - live Canopy timing remains unchanged');
console.log('\nRun: npm run build');
