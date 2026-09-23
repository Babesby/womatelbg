const fs=require("fs");
const path=require("path");

const file=path.join(process.cwd(),"src","main.jsx");
if(!fs.existsSync(file)) throw new Error("src/main.jsx not found.");

let s=fs.readFileSync(file,"utf8");
const before=s;

const people={
  ruby:{
    name:"Ruby Damenshie-Brown",
    role:"Chief Executive Officer (CEO)",
    bio:"Operations Specialist focused on community engagement, programme delivery and the regional scaling of climate initiatives."
  },
  phillipa:{
    name:"Phillipa Aidoo",
    role:"Chief Operating Officer (COO)",
    bio:"Chief Strategist & Full-stack Developer. Architect of WOMATE’s integrated climate-tech ecosystem and the organisation’s strategic direction."
  },
  asaa:{
    name:"Asaa Gyebi-Adjei",
    role:"Board Member"
  }
};

function esc(v){
  return v.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
}

function updatePerson(src,person){
  const n=esc(person.name);

  const objectRegex=new RegExp(
    `\\{[^{}]{0,1800}${n}[^{}]{0,1800}\\}`,
    "g"
  );

  return src.replace(objectRegex,block=>{
    let b=block;

    b=b.replace(
      /(\b(?:role|title|position|jobTitle|designation)\s*:\s*["'`])([^"'`]*)(["'`])/i,
      `$1${person.role}$3`
    );

    if(person.bio){
      b=b.replace(
        /(\b(?:bio|description|summary|about)\s*:\s*["'`])([^"'`]*)(["'`])/i,
        `$1${person.bio}$3`
      );
    }

    return b;
  });
}

s=s
  .replace(/Ruby\s+Damenshie[\s-]?Brown/gi,people.ruby.name)
  .replace(/Phillipa\s+Aidoo/gi,people.phillipa.name)
  .replace(/Asaa\s+Gyebi[\s-]?Adjei/gi,people.asaa.name);

s=updatePerson(s,people.ruby);
s=updatePerson(s,people.phillipa);
s=updatePerson(s,people.asaa);

for(const person of Object.values(people)){
  const n=esc(person.name);

  s=s.replace(
    new RegExp(
      `${n}\\s*[---]\\s*(?:Founder\\s*&\\s*)?(?:CEO|COO|Chief Executive Officer(?:\\s*\\(CEO\\))?|Chief Operating Officer(?:\\s*\\(COO\\))?|Executive Director|Managing Director|Operations Director|Director of Operations|President|Board Member)`,
      "gi"
    ),
    `${person.name} - ${person.role}`
  );
}

// Asaa must never remain CEO.
s=s.replace(
  new RegExp(
    `(${esc(people.asaa.name)}[\\s\\S]{0,250}?)(Chief Executive Officer\\s*\\(CEO\\)|CEO)`,
    "gi"
  ),
  `$1${people.asaa.role}`
);

// Put Ruby above Phillipa when the leadership cards are adjacent objects.
const reorder=new RegExp(
  `(\\{[^{}]{0,1800}${esc(people.phillipa.name)}[^{}]{0,1800}\\})(\\s*,\\s*)(\\{[^{}]{0,1800}${esc(people.ruby.name)}[^{}]{0,1800}\\})`,
  "g"
);

s=s.replace(reorder,"$3$2$1");

if(s===before){
  throw new Error("No leadership changes made. Source left untouched.");
}

fs.writeFileSync(file,s,"utf8");

console.log("");
console.log("WOMATE LEADERSHIP UPDATED");
console.log("1. Ruby Damenshie-Brown - Chief Executive Officer (CEO)");
console.log("2. Phillipa Aidoo - Chief Operating Officer (COO)");
console.log("3. Asaa Gyebi-Adjei - Board Member");
