const fs=require('fs'),path=require('path');

const root=process.cwd();
const cdir=path.join(root,'src','canopy');
const appPath=path.join(cdir,'CanopyApp.jsx');
const dataPath=path.join(cdir,'canopyData.js');
const assnPath=path.join(cdir,'CanopyAssignmentsV2.jsx');
const schedulePath=path.join(cdir,'canopySchedule.js');
const currPath=path.join(cdir,'canopyCurriculum2026.js');
const duplicateUiPath=path.join(cdir,'CanopyCurriculum2026.jsx');
const payload=path.join(__dirname,'payload','src','canopy');

function die(msg,backup){
  if(backup){
    for(const [p,v] of Object.entries(backup)){
      try{fs.writeFileSync(p,v,'utf8')}catch{}
    }
  }
  console.error('\nERROR: '+msg+(backup?'\nOriginal source restored.':''));
  process.exit(1);
}
if(!fs.existsSync(appPath)||!fs.existsSync(dataPath)||!fs.existsSync(assnPath))die('Run this from C:\\phill\\wo-web\\ww\\womate_build');

const backup={
  [appPath]:fs.readFileSync(appPath,'utf8'),
  [dataPath]:fs.readFileSync(dataPath,'utf8'),
  [assnPath]:fs.readFileSync(assnPath,'utf8'),
  [schedulePath]:fs.existsSync(schedulePath)?fs.readFileSync(schedulePath,'utf8'):'',
  [currPath]:fs.existsSync(currPath)?fs.readFileSync(currPath,'utf8'):''
};
for(const [p,v] of Object.entries(backup)){
  if(v!==''||fs.existsSync(p))fs.writeFileSync(p+'.before-unified-2026-course.bak',v,'utf8');
}

// Replace the data layer and assignment UI with the unified 2026 versions.
for(const name of ['canopyData.js','CanopyAssignmentsV2.jsx','canopySchedule.js','canopyCurriculum2026.js']){
  const src=path.join(payload,name);
  if(!fs.existsSync(src))die('Missing payload file '+name,backup);
  fs.copyFileSync(src,path.join(cdir,name));
}

let app=backup[appPath];

// 1. Remove the separate replacement course UI import.
// The old course structure will now render the new curriculum through canopyData.js.
app=app.replace(/^\s*import\s+CanopyCurriculum2026\s+from\s+['"]\.\/CanopyCurriculum2026(?:\.jsx)?['"];\s*\r?\n?/m,'');

// 2. Ensure schedule import exists for exact Monday-based module locking.
if(!/from\s+['"]\.\/canopySchedule['"]/.test(app)){
  const lines=app.split(/\r?\n/); let last=-1;
  for(let i=0;i<lines.length;i++)if(lines[i].trim().startsWith('import '))last=i;
  if(last<0)die('Could not locate import block.',backup);
  lines.splice(last+1,0,"import {CANOPY_ASSIGNMENT_SCHEDULE} from './canopySchedule';");
  app=lines.join('\n');
} else if(!app.includes('CANOPY_ASSIGNMENT_SCHEDULE')){
  // Existing schedule import but without the schedule constant.
  app=app.replace(/import\s*\{([^}]*)\}\s*from\s*['"]\.\/canopySchedule['"];/,
    (m,g)=>`import {${g.trim()?g.trim()+', ':''}CANOPY_ASSIGNMENT_SCHEDULE} from './canopySchedule';`);
}

// 3. Restore the OLD course organization/flow at the Course route.
app=app.replace(
  /else if\(path===['"]\/canopy\/course\/she-leads['"]\)\s*content=<CanopyCurriculum2026\s*\/>/,
  "else if(path==='/canopy/course/she-leads')content=<CourseOverview progress={progress}/>"
);

// 4. Replace old env/week-number locking with exact programme schedule.
// Match the three helper functions as a block if present.
const gateRx=/function canopyModuleUnlockWeek\(m\)\{[\s\S]*?function canopyModuleIsOpen\(m\)\{[^}]*\}/;
const gateNew=`function canopyModuleSchedule(m){return CANOPY_ASSIGNMENT_SCHEDULE.find(x=>x.moduleId===m.id)||null}
function canopyModuleIsOpen(m,now=new Date()){const item=canopyModuleSchedule(m);return !!item&&now>=new Date(item.weekStartsAt)}
function canopyModuleOpenLabel(m){const item=canopyModuleSchedule(m);if(!item)return 'Scheduled';return new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(item.weekStartsAt))}`;
if(gateRx.test(app)) app=app.replace(gateRx,gateNew);
else if(!app.includes('function canopyModuleSchedule(')){
  const at=app.indexOf('function CourseOverview');
  if(at<0)die('Could not locate CourseOverview for schedule gating.',backup);
  app=app.slice(0,at)+gateNew+'\n'+app.slice(at);
}

// 5. Make locked modules visibly show when they open.
if(!app.includes("Opens {canopyModuleOpenLabel(m)}")){
  app=app.replace(
    /<div className="canopyModuleArrow">\{locked\?<Lock\/>:<ArrowRight\/>\}<\/div>/,
    `<div className="canopyModuleArrow">{locked?<><span className="canopyModuleOpenDate">Opens {canopyModuleOpenLabel(m)}</span><Lock/></>:<ArrowRight/>}</div>`
  );
}

// 6. Cohort-paced metadata, not self-paced.
app=app.split('Self-paced + guided').join('Cohort-paced + guided');

// 7. Targeted text cleanup.
const fixes=[['â€™','’'],['â€œ','“'],['â€','”'],['â€”','—'],['â€“','–'],['â€¦','…'],['Â·','·'],['Â',''],['Ã—','×'],['âˆ’','−']];
for(const [a,b] of fixes)app=app.split(a).join(b);

// Verification before writing.
if(app.includes('<CanopyCurriculum2026/>'))die('Separate course renderer still remains.',backup);
if(!app.includes("content=<CourseOverview progress={progress}/>"))die('Old CourseOverview route was not restored.',backup);
if(!app.includes('CANOPY_ASSIGNMENT_SCHEDULE'))die('Schedule locking was not installed.',backup);
if(!app.includes("path==='/canopy/course/she-leads'"))die('Course route disappeared.',backup);
if(!app.includes("path.startsWith('/canopy/manage')"))die('Manager routing was disturbed.',backup);

fs.writeFileSync(appPath,app,'utf8');

// Remove only the now-obsolete duplicate visual course component.
// The data file canopyCurriculum2026.js is retained as the ONE 2026 curriculum source.
if(fs.existsSync(duplicateUiPath)){
  fs.copyFileSync(duplicateUiPath,duplicateUiPath+'.before-unified-2026-course.bak');
  fs.unlinkSync(duplicateUiPath);
}

// Add a tiny CSS enhancement for locked-module open date if not already present.
const cssPath=path.join(cdir,'canopy.css');
if(fs.existsSync(cssPath)){
  let css=fs.readFileSync(cssPath,'utf8');
  if(!css.includes('/* UNIFIED 2026 COURSE LOCK DATE */')){
    css+=`\n/* UNIFIED 2026 COURSE LOCK DATE */\n.canopyModuleOpenDate{font-size:10px;line-height:1.2;font-weight:800;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;opacity:.65;margin-right:8px}\n.canopyModuleArrow{display:flex;align-items:center;justify-content:flex-end;gap:6px}\n@media(max-width:680px){.canopyModuleOpenDate{display:none}}\n`;
    fs.writeFileSync(cssPath,css,'utf8');
  }
}

console.log('\nWOMATE CANOPY unified 2026 course applied.');
console.log(' - ONE course source: canopyCurriculum2026.js');
console.log(' - old premium CourseOverview / Lesson / Quiz flow restored');
console.log(' - learner Home, public module preview, Course, Lessons, Quiz and Progress now use the new 2026 curriculum');
console.log(' - modules lock by the exact Monday programme schedule');
console.log(' - each module intro video remains embedded at the start of its first lesson');
console.log(' - assignments use the new curriculum paragraph + CanopyCanvas brief');
console.log(' - Thursday speaker task / Sunday deadline / resubmission automation preserved');
console.log(' - manager/admin routes preserved');
console.log(' - duplicate CanopyCurriculum2026.jsx renderer removed');
console.log('\nRun: npm run build');
