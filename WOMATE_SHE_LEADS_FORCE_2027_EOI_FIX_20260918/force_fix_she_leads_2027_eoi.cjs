const fs=require('fs'), path=require('path');
const file=path.join(process.cwd(),'src','main.jsx');
if(!fs.existsSync(file)) throw new Error('src/main.jsx not found. Run from WOMATE project root.');
let s=fs.readFileSync(file,'utf8');
const before=s;
const OLD_ID='1FAIpQLSdwc1l7vlWD4VC6v9cPF_-UdO3VLGDVLRiVJiwmiGE3Aqjs4w';
const NEW='https://forms.gle/bfvyE7TryQ76LsLEA';

// FORCE-remove every occurrence of the old Cohort 2 Google Form URL, including embedded/viewform variants.
s=s.replace(new RegExp('https://docs\\.google\\.com/forms/d/e/'+OLD_ID+'[^"\\'\\s<})]*','g'), NEW);
s=s.replace(new RegExp('https://docs\\.google\\.com/forms/d/'+OLD_ID+'[^"\\'\\s<})]*','g'), NEW);
s=s.replace(new RegExp('https://forms\\.gle/[A-Za-z0-9_-]+','g'), (m,offset)=>{
  const ctx=s.slice(Math.max(0,offset-8000), Math.min(s.length,offset+8000)).toLowerCase();
  return ctx.includes('she leads') ? NEW : m;
});

// Replace old application wording visible on the She Leads page.
const replacements=[
 [/She Leads Climate Mentorship Program(?:me)?\s*-\s*Cohort 2 Application\s*Form/gi,'She Leads 2027 Expression of Interest'],
 [/She Leads Climate Mentorship Programme\s*-\s*Cohort 2 Application\s*Form/gi,'She Leads 2027 Expression of Interest'],
 [/Applications? for (?:the )?2026 Cohort 2 (?:are|is) (?:now )?open/gi,'Applications for 2026 Cohort 2 are now closed'],
 [/Applications? (?:are|is) (?:now )?open/gi,'Applications for 2026 Cohort 2 are now closed'],
 [/Apply for (?:the )?2026 Cohort 2/gi,'Express interest for 2027'],
 [/Apply for Cohort 2/gi,'Express interest for 2027'],
 [/Apply Now/gi,'Express interest for 2027'],
 [/Start (?:your )?application/gi,'Express interest for 2027'],
 [/Application Form/gi,'2027 Expression of Interest']
];
for(const [a,b] of replacements) s=s.replace(a,b);

// Hard safety check: old form ID must be gone.
if(s.includes(OLD_ID)) throw new Error('Old Cohort 2 Google Form ID is still present; source not written.');
if(s===before) throw new Error('No matching She Leads form/application content was found. Nothing changed.');
fs.writeFileSync(file,s,'utf8');

console.log('FIXED: src/main.jsx');
console.log('OLD COHORT 2 FORM REMOVED:', !s.includes(OLD_ID));
console.log('2027 EOI:', NEW);
console.log('Now run: npm run build');
