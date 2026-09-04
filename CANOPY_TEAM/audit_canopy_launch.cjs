const fs=require('fs');
const path=require('path');
const root=process.cwd();
const canopy=path.join(root,'src','canopy');
const requiredFiles=['CanopyApp.jsx','CanopyAssignmentsV2.jsx','CanopyCanvas.jsx','CanopyCertificate.jsx','CanopyNotifications.jsx','canopy.css','canopyApi.js','canopyCurriculum2026.js','canopyData.js','canopySchedule.js'];
let failures=[]; let passes=[];
const ok=(condition,label)=>{(condition?passes:failures).push(label)};
for(const f of requiredFiles)ok(fs.existsSync(path.join(canopy,f)),`required file: ${f}`);
const texts={};
for(const f of requiredFiles){const p=path.join(canopy,f);texts[f]=fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';}
const all=Object.values(texts).join('\n');
const forbidden=[
 ['Cohort 3',/Cohort\s*3/i],['CANTEST',/CANTEST/i],['legacy assignments route',/assignments-legacy/i],
 ['old 1 October access copy',/learning access opens (?:from )?1 October 2026/i],['mojibake Â',/Â/],['mojibake â',/â(?:€™|€œ|€|€”|€“|€¦)/],
 ['Landscape Canvas format',/Landscape card/i],['verified observance',/Verified observance/i],['legacy Canvas icon options',/iconOptions|toggleIcon|form\.icons/]
];
for(const [label,re] of forbidden)ok(!re.test(all),`no ${label}`);
ok(/20 September 2026/.test(all),'learner access date is 20 September 2026');
ok(/const\s+MESSAGE_LIMIT\s*=\s*60/.test(texts['CanopyCanvas.jsx']),'CanopyCanvas message limit is 60');
ok(/const\s+formats\s*=\s*\['Square post','Portrait post'\]/.test(texts['CanopyCanvas.jsx']),'CanopyCanvas has only Square + Portrait formats');
ok(/\/canopy\/help/.test(texts['CanopyApp.jsx']),'learner Help route exists');
ok(/getUnreadNotificationCount/.test(texts['canopyApi.js'])&&/canopyNotificationBadge/.test(texts['CanopyApp.jsx']),'real unread notification badge is wired');
ok(/reviewWeeklyAssignment/.test(texts['canopyApi.js'])&&/canopy_manager_review_assignment/.test(texts['canopyApi.js']),'manual assignment review RPC is wired');
ok(/canopy_manager_weekly_submissions/.test(texts['canopyApi.js']),'manager weekly submissions RPC is wired');
ok(/issueCanopyCertificate/.test(texts['canopyApi.js'])&&/canopy_manager_issue_certificate/.test(texts['canopyApi.js']),'real certificate issuance RPC is wired');
ok(/response_message/.test(texts['CanopyApp.jsx']),'complaint response loop is wired');
const lessonIds=[...texts['canopyCurriculum2026.js'].matchAll(/id:'(\d{2}\.\d)'/g)].map(m=>m[1]);
ok(lessonIds.length===20&&new Set(lessonIds).size===20,'curriculum contains 20 unique lessons');
const moduleIds=[...texts['canopyCurriculum2026.js'].matchAll(/id:'(\d{2})'/g)].map(m=>m[1]);
ok(moduleIds.length===5&&new Set(moduleIds).size===5,'curriculum contains 5 modules');
const weekKeys=(texts['canopySchedule.js'].match(/weekKey:/g)||[]).length;
ok(weekKeys===5,'assignment schedule contains 5 module windows');
ok(/2026-09-21T00:00:00Z/.test(texts['canopySchedule.js'])&&/2026-10-19T00:00:00Z/.test(texts['canopySchedule.js']),'module opening dates retained');
ok(!fs.existsSync(path.join(root,'src','cantest')),'src/cantest removed');
ok(!fs.existsSync(path.join(canopy,'canopy')),'obsolete nested src/canopy/canopy removed');
if(fs.existsSync(canopy)){
 const stale=fs.readdirSync(canopy).filter(n=>/\.bak$/i.test(n)||/\.before-/.test(n));
 ok(stale.length===0,'no .bak/before-* files remain in src/canopy');
}
console.log(`\nWOMATE CANOPY LAUNCH AUDIT\nPASS: ${passes.length}\nFAIL: ${failures.length}`);
passes.forEach(x=>console.log(`  PASS  ${x}`));
if(failures.length){failures.forEach(x=>console.error(`  FAIL  ${x}`));process.exit(1)}
console.log('\nStatic launch checks passed. Run npm run build next; then complete the live end-to-end test before calling the release production-ready.');
