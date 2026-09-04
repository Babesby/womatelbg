const fs=require('fs'), path=require('path'), cp=require('child_process');

const root=process.cwd();
const cdir=path.join(root,'src','canopy');
const appPath=path.join(cdir,'CanopyApp.jsx');

function exists(p){return fs.existsSync(path.join(root,p))}
function read(p){return fs.readFileSync(path.join(root,p),'utf8')}
function ok(name,detail=''){console.log(`PASS  ${name}${detail?' — '+detail:''}`)}
function warn(name,detail=''){console.log(`WARN  ${name}${detail?' — '+detail:''}`)}
function fail(name,detail=''){console.log(`FAIL  ${name}${detail?' — '+detail:''}`); failures++}
function test(cond,name,detail=''){cond?ok(name,detail):fail(name,detail)}
function has(txt,...parts){return parts.every(x=>txt.includes(x))}
function grep(txt,rx){return rx.test(txt)}

let failures=0, warnings=0;
if(!fs.existsSync(appPath)){
  console.error('ERROR: Run this from the WOMATE project root.');
  process.exit(2);
}

console.log('\nWOMATE CANOPY — FUNCTIONAL STATIC AUDIT\n');

const required=[
  'src/canopy/CanopyApp.jsx',
  'src/canopy/canopyApi.js',
  'src/canopy/canopy.css',
  'src/canopy/CanopyAssignmentsV2.jsx',
  'src/canopy/CanopyCanvas.jsx',
  'src/canopy/CanopyCertificate.jsx',
  'src/canopy/CanopyNotifications.jsx',
  'src/canopy/canopySchedule.js',
  'src/canopy/canopyCurriculum2026.js',
  'src/canopy/CanopyCurriculum2026.jsx',
  'src/canopy/canopyData.js',
];
for(const f of required)test(exists(f),`Required file: ${f}`);

const app=read('src/canopy/CanopyApp.jsx');
const api=read('src/canopy/canopyApi.js');
const assignments=read('src/canopy/CanopyAssignmentsV2.jsx');
const canvas=read('src/canopy/CanopyCanvas.jsx');
const notifications=read('src/canopy/CanopyNotifications.jsx');
const cert=read('src/canopy/CanopyCertificate.jsx');
const schedule=read('src/canopy/canopySchedule.js');
const curriculum=read('src/canopy/CanopyCurriculum2026.jsx');
const curriculumData=read('src/canopy/canopyCurriculum2026.js');

console.log('\n[1] ROLE + ROUTING');
test(has(app,"['manager','admin'].includes(viewer?.profile?.role)"),'Manager/admin role detection');
test(app.includes("path.startsWith('/canopy/manage')"),'Manager route namespace');
test(app.includes("go('/canopy/manage')"),'Manager redirect away from learner area');
test(app.includes("['/canopy/profile','/canopy/notifications','/canopy/certificate']"),'Inactive learner route guard exceptions');
test(app.includes("path==='/canopy/course/she-leads'"),'Learner Course route');
test(app.includes("path==='/canopy/assignments'"),'Learner Assignments route');
test(app.includes("path==='/canopy/canvas'"),'CanopyCanvas route');
test(app.includes("path==='/canopy/notifications'"),'Notifications route');
test(app.includes("path==='/canopy/certificate'"),'Certificate route');
test(app.includes("/^\\/canopy\\/course\\/she-leads\\/([^/]+)\\/([^/]+)$/"),'Lesson / quiz route matcher');

const managerLabels=['Operations','Manage cohort','Assess submissions','Warnings & feedback','Reminders','Complaints','Certificates','Reports'];
for(const label of managerLabels)test(app.includes(label),`Manager nav: ${label}`);

console.log('\n[2] CURRICULUM');
test(app.includes("import CanopyCurriculum2026 from './CanopyCurriculum2026.jsx'") ||
     app.includes('import CanopyCurriculum2026 from "./CanopyCurriculum2026.jsx"'),
     'Explicit .jsx curriculum component import');
test(app.includes("<CanopyCurriculum2026/>"),'2026 curriculum mounted in learner Course route');
for(const n of ['Understanding Climate Change','Gender & Climate Justice','Climate Governance & Policy','Climate Advocacy & Digital Innovation','Leadership & Professional Pathways'])
  test(curriculumData.includes(n),`Curriculum module: ${n}`);
for(const w of ['Week 1 & 2','Week 3','Week 4','Week 5 & 6','Week 7 & 8'])
  test(curriculumData.includes(w),`Display label: ${w}`);

console.log('\n[3] WEEKLY GATING + ASSIGNMENTS');
for(const d of ['2026-09-21','2026-09-28','2026-10-05','2026-10-12','2026-10-19'])
  test(schedule.includes(d),`Monday assignment open date ${d}`);
for(const d of ['2026-09-24','2026-10-01','2026-10-08','2026-10-15','2026-10-22'])
  test(schedule.includes(d),`Thursday speaker unlock date ${d}`);
for(const d of ['2026-09-27','2026-10-04','2026-10-11','2026-10-18','2026-10-25'])
  test(schedule.includes(d),`Sunday assignment due date ${d}`);
test(grep(assignments,/attempt/i),'Assignment attempts represented');
test(grep(assignments,/linkedin/i),'LinkedIn speaker task represented');
test(grep(assignments,/drive/i),'Drive-link submission represented');
test(grep(assignments,/canvas/i),'CanopyCanvas assignment component represented');
test(!grep(assignments,/google\s*(oauth|client[_ -]?id|drive api)/i),'No Google OAuth/API dependency in assignments');
test(!grep(canvas,/google\s*(oauth|client[_ -]?id|drive api)/i),'No Google OAuth/API dependency in CanopyCanvas');

console.log('\n[4] CANOPYCANVAS');
test(grep(canvas,/download/i),'Local download action exists');
test(grep(canvas,/cause/i),'Cause selection represented');
test(grep(canvas,/audience/i),'Audience targeting represented');
test(grep(canvas,/tone/i),'Tone control represented');
test(grep(canvas,/preview/i),'Live preview represented');

console.log('\n[5] NOTIFICATIONS + CERTIFICATES');
test(notifications.length>200,'Notifications component has implementation');
test(cert.length>200,'Certificate component has implementation');
test(grep(cert,/(download|href|url|drive)/i),'Certificate exposes downloadable/linkable record');
test(grep(api,/(notification|certificate|manager_action|manager actions)/i),'API includes manager/notification/certificate-related operations');

console.log('\n[6] COHORT + COPY HYGIENE');
const allFiles=fs.readdirSync(cdir).filter(x=>/\.(js|jsx|css)$/.test(x));
let combined='';
for(const f of allFiles) combined += '\n'+fs.readFileSync(path.join(cdir,f),'utf8');
test(!combined.includes('Cohort 3'), 'No visible Cohort 3');
test(!combined.includes('2027'), 'No stale 2027 Canopy copy');
test(combined.includes('Cohort 2'), 'Cohort 2 present');
test(combined.includes('2026'), '2026 present');
const bad=['â€™','â€œ','â€','Â','Ã—','âˆ’'];
for(const b of bad)test(!combined.includes(b),`No mojibake token ${JSON.stringify(b)}`);

console.log('\n[7] SELF-ACTIVATION / ADMIN CONTROL');
test(!grep(assignments,/setLearnerEnrollmentStatus/i),'Learner assignment UI cannot change enrolment status');
test(grep(app,/setLearnerEnrollmentStatus/i),'Admin/manager UI owns enrolment status control');
test(grep(app,/Activate|activate/i),'Manager activation action is present');

console.log('\n[8] OBSOLETE FILES');
test(!exists('src/canopy/canopy'), 'No duplicate nested src/canopy/canopy folder');
test(!exists('src/canopy/canopyDrive.js'), 'Old canopyDrive.js removed');
test(!exists('src/canopy/CanopyCertificateManager.jsx'), 'Old CanopyCertificateManager.jsx removed');

console.log('\n[9] BUILD');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  ok('Production build');
}catch(e){
  fail('Production build','npm run build failed');
}

console.log('\n----------------------------------------');
if(failures===0){
  console.log('RESULT: PASS — static wiring + production build are healthy.');
  console.log('NEXT: browser smoke-test the live learner and manager flows.');
}else{
  console.log(`RESULT: ${failures} issue(s) need attention before browser smoke testing.`);
}
console.log('----------------------------------------\n');

process.exit(failures?1:0);
