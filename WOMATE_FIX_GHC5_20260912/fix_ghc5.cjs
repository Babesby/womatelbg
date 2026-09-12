const fs=require('fs'),path=require('path');
const root=process.cwd(), file=path.join(root,'src','main.jsx');
if(!fs.existsSync(file)) throw new Error('Run from WOMATE project root.');
let s=fs.readFileSync(file,'utf8'), before=s;
s=s.replaceAll('Even GH?5 can join a bigger impact.','Even GHC5 can join a bigger impact.');
s=s.replaceAll('GH?5','GHC5');
if(s===before){console.log('No GH?5 occurrence found; it may already be fixed.');}
else{fs.writeFileSync(file,s,'utf8');console.log('FIXED: Even GHC5 can join a bigger impact.');}
console.log('NEXT: npm run build');
