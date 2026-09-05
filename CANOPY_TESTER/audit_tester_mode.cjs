const fs=require('fs');
const checks=[
 ['tester identity','src/canopy/CanopyApp.jsx',"CANOPY_TESTER_EMAIL='p.viewmultimedia@gmail.com'"],
 ['tester dashboard','src/canopy/CanopyApp.jsx','function TesterDashboard('],
 ['tester classroom branch','src/canopy/CanopyApp.jsx','tester?<TesterDashboard'],
 ['tester enrollment bypass','src/canopy/CanopyApp.jsx',"const active=tester||viewer.enrollments?.some"],
 ['tester module unlock','src/canopy/CanopyApp.jsx','const locked=!tester&&!canopyModuleIsOpen(m)'],
 ['tester lesson unlock','src/canopy/CanopyApp.jsx','if(!tester&&!canopyModuleIsOpen(m))'],
 ['tester assignment full schedule','src/canopy/CanopyAssignmentsV2.jsx','tester?CANOPY_ASSIGNMENT_SCHEDULE:openAssignments(now)'],
 ['tester immediate score display','src/canopy/CanopyAssignmentsV2.jsx','tester||now>=new Date(s.release_at)'],
 ['tester speaker unlock','src/canopy/CanopyAssignmentsV2.jsx','const speakerOpen=tester||speakerChallengeOpen(item,now)'],
 ['tester RPC client','src/canopy/canopyApi.js','canopy_tester_submit_weekly_assignment'],
 ['tester manager exclusion','src/canopy/canopyApi.js',"filter(p=>p.role==='tester')"],
 ['tester SQL isolation','CANOPY_TESTER/WOMATE_CANOPY_TESTER_MODE.sql',"not public.canopy_is_tester()"],
 ['tester SQL five modules','CANOPY_TESTER/WOMATE_CANOPY_TESTER_MODE.sql',"'module-05'"]
];
let fail=0;
for(const [name,file,needle] of checks){
 const ok=fs.existsSync(file)&&fs.readFileSync(file,'utf8').includes(needle);
 console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)fail++;
}
if(fail){console.error(`\nFAIL ${fail} tester-mode checks`);process.exit(1)}
console.log('\nPASS all isolated tester-mode static checks');
