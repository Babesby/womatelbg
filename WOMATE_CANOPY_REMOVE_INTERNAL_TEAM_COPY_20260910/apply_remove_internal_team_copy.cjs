const fs=require('fs'),path=require('path');
const cwd=process.cwd(),pkg=__dirname;
const target=path.join(cwd,'src','canopy','CanopyStaffWorkspace.jsx');
if(!fs.existsSync(target)) throw new Error('Run this from the WOMATE project root.');
fs.copyFileSync(path.join(pkg,'src','canopy','CanopyStaffWorkspace.jsx'),target);
console.log('Removed internal team-facing operational copy from Coordinator/Fellow report views.');
console.log('NEXT: npm run build');
