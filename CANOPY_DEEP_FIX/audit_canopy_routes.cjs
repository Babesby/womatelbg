const fs=require('fs');
const p='src/canopy/CanopyApp.jsx';
const s=fs.readFileSync(p,'utf8');
const checks=[
 ['CourseOverview route component',/function\s+CourseOverview\s*\(/],
 ['Lesson route component',/function\s+Lesson\s*\(/],
 ['Quiz route component',/function\s+Quiz\s*\(/],
 ['Progress route component',/function\s+Progress\s*\(/],
 ['Resources route component',/function\s+Resources\s*\(/],
 ['Profile route component',/function\s+Profile\s*\(/],
 ['Help route component',/function\s+CanopyHelp\s*\(/],
 ['Module-open helper',/function\s+canopyModuleIsOpen\s*\(/],
 ['Module-open label helper',/function\s+canopyModuleOpenLabel\s*\(/],
 ['Google auth import',/signInWithGoogle/],
 ['No obsolete legacy assignment route',!s.includes('assignments-legacy')],
 ['No common mojibake',!/[Â]|â(?:€¦|€™|€œ|€|€”|€“|ˆ’)/.test(s)],
];
let fail=0;
for(const [name,test] of checks){const ok=typeof test==='boolean'?test:test.test(s);console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)fail++}
const routes=['/canopy/classroom','/canopy/course/she-leads','/canopy/assignments','/canopy/progress','/canopy/resources','/canopy/profile','/canopy/canvas','/canopy/notifications','/canopy/help','/canopy/certificate'];
for(const r of routes){const ok=s.includes(`'${r}'`)||s.includes(`\"${r}\"`);console.log(`${ok?'PASS':'FAIL'}  route ${r}`);if(!ok)fail++}
console.log(`\n${fail?`FAIL ${fail}`:'PASS all static route checks'}`);process.exitCode=fail?1:0;
