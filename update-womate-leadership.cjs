const fs=require("fs"),path=require("path");

const root=path.join(process.cwd(),"src");
if(!fs.existsSync(root)) throw new Error("src folder not found.");

const extensions=new Set([".js",".jsx",".ts",".tsx",".json",".md",".mdx",".html"]);
const files=[];

function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,entry.name);
    if(entry.isDirectory()) walk(p);
    else if(extensions.has(path.extname(p).toLowerCase())) files.push(p);
  }
}
walk(root);

const people=[
  ["Ruby Damenshie-Brown","Chief Executive Officer (CEO)"],
  ["Phillipa Aidoo","Chief Operating Officer (COO)"]
];

let changed=0;

for(const file of files){
  let s=fs.readFileSync(file,"utf8");
  const before=s;

  s=s.replace(/Ruby\s+Damenshie[\s-]?Brown/gi,"Ruby Damenshie-Brown");
  s=s.replace(/Phillipa\s+Aidoo/gi,"Phillipa Aidoo");

  for(const [name,title] of people){
    const n=name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");

    s=s.replace(
      new RegExp(`(${n}[\\s\\S]{0,500}?\\b(?:role|title|position|jobTitle|designation)\\s*[:=]\\s*["'\`])([^"'\`]*)(["'\`])`,"gi"),
      (m,a,old,c)=>a+title+c
    );

    s=s.replace(
      new RegExp(`(\\b(?:role|title|position|jobTitle|designation)\\s*[:=]\\s*["'\`])([^"'\`]*)(["'\`][\\s\\S]{0,500}?${n})`,"gi"),
      (m,a,old,c)=>a+title+c
    );

    s=s.replace(
      new RegExp(`${n}\\s*[—–-]\\s*(?:Founder\\s*&\\s*)?(?:CEO|COO|Chief Executive Officer|Chief Operating Officer|Executive Director|Managing Director|Operations Director|Director of Operations|President|Programme Director)`,"gi"),
      `${name} — ${title}`
    );

    s=s.replace(
      new RegExp(`${n}\\s*,\\s*(?:Founder\\s*&\\s*)?(?:CEO|COO|Chief Executive Officer|Chief Operating Officer|Executive Director|Managing Director|Operations Director|Director of Operations|President|Programme Director)`,"gi"),
      `${name}, ${title}`
    );
  }

  if(s!==before){
    fs.writeFileSync(file,s,"utf8");
    console.log("UPDATED:",path.relative(process.cwd(),file));
    changed++;
  }
}

console.log("");
console.log("Leadership now:");
console.log("Ruby Damenshie-Brown — Chief Executive Officer (CEO)");
console.log("Phillipa Aidoo — Chief Operating Officer (COO)");
console.log("Files changed:",changed);
