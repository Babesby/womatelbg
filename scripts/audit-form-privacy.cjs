const fs = require("fs");
const path = require("path");

const ROOT = path.join(process.cwd(), "src");
if (!fs.existsSync(ROOT)) process.exit(0);

const risky = [
  { re: /viewanalytics/gi, label: "Google Forms response analytics link" },
  { re: /usp=form_confirm/gi, label: "Google Forms response-summary confirmation link" },
  { re: /docs\.google\.com\/forms\/d\/[^"'`\s]+\/edit/gi, label: "Google Forms editor link" },
  { re: /1FAIpQLSdwc1l7vlWD4VC6v9cPF_-UdO3VLGDVLRiVJiwmiGE3Aqjs4w/gi, label: "retired 2026 Cohort 2 form ID" },
];

const exts = new Set([".js",".jsx",".ts",".tsx",".html"]);
const findings = [];

function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(p);
    else if(exts.has(path.extname(ent.name).toLowerCase())){
      const txt=fs.readFileSync(p,"utf8");
      for(const rule of risky){
        rule.re.lastIndex=0;
        if(rule.re.test(txt)) findings.push(`${path.relative(process.cwd(),p)}: ${rule.label}`);
      }
    }
  }
}
walk(ROOT);

if(findings.length){
  console.error("\nFORM PRIVACY AUDIT FAILED");
  for(const f of findings) console.error(" - "+f);
  console.error("\nRemove these links before deploying.");
  process.exit(1);
}
console.log("FORM PRIVACY AUDIT PASSED: no response-summary, analytics, editor, or retired Cohort 2 form links found in src.");
