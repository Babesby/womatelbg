const fs=require('fs');
const path=require('path');

const p=path.resolve(process.cwd(),'src','main.jsx');
const cssP=path.resolve(process.cwd(),'src','style.css');

if(!fs.existsSync(p)){
  console.error('Run this from the WOMATE project root. src/main.jsx was not found.');
  process.exit(1);
}

let s=fs.readFileSync(p,'utf8');
const backup=p+'.before-sept3-cleanup.bak';
if(!fs.existsSync(backup)) fs.copyFileSync(p,backup);

function removeBetween(text,startNeedle,endNeedle,label){
  const a=text.indexOf(startNeedle);
  if(a<0){ console.warn(label+' not found — skipped.'); return text; }
  const b=text.indexOf(endNeedle,a);
  if(b<0){ console.warn(label+' end marker not found — skipped.'); return text; }
  return text.slice(0,a)+text.slice(b);
}

// 1) She Leads — remove "THE LEARNING ARCHITECTURE" only.
s=s.replace(
  /<section id="she-pillars" className="shePillars"><header><span>THE LEARNING ARCHITECTURE<\/span><h2>Six Core Learning Pillars<\/h2><\/header>/,
  '<section id="she-pillars" className="shePillars"><header><h2>Six Core Learning Pillars</h2></header>'
);

// Also cover the global icon-section version if that is what is currently installed.
s=s.replace(
  /<section id="she-pillars" className="iconPillarSection"><header className="iconPillarHead"><span>THE LEARNING ARCHITECTURE<\/span><h2>Six Core Learning Pillars<\/h2><\/header>/,
  '<section id="she-pillars" className="iconPillarSection"><header className="iconPillarHead"><h2>Six Core Learning Pillars</h2></header>'
);

// 2) She Leads network copy.
s=s.replace(
  'Women leave with more than climate knowledge: they leave with peers across African countries, shared language for leadership, and a community that continues beyond the programme.',
  'Women leave with climate knowledge, shared language for leadership, peers across African countries and a community that continues beyond the programme.'
);

// 3) Circle — remove the entire free-tier card section.
// Handles the current section inserted by the social-enterprise patch.
s=removeBetween(
  s,
  '<section id="circle-pathways" className="circlePathways">',
  '<section className="circlePath">',
  'Circle free-tier card section'
);

// If an older Circle tier section is still present, remove it too.
if(s.includes('<section className="circlePathways"')){
  s=removeBetween(
    s,
    '<section className="circlePathways"',
    '<section className="circlePath">',
    'Older Circle tier section'
  );
}

// 4) Fix common mojibake/encoding corruption globally, especially the WoK desktop mega-menu.
const fixes=[
  ['WoKâ€”Action','WoK—Action'],
  ['Womenâ€™s','Women’s'],
  ['womenâ€™s','women’s'],
  ['climate institutions, policies, and decision-making spaces functionâ€”and','climate institutions, policies, and decision-making spaces function—and'],
  ['â€”','—'],
  ['â€™','’'],
  ['â€œ','“'],
  ['â€','”']
];
for(const [bad,good] of fixes) s=s.split(bad).join(good);

// 5) Replace Header with a clean, categorized mobile navigation.
// Desktop mega-menu remains categorised and the highlighted CTA remains Donate.
const headerStart=s.indexOf('function Header(){');
if(headerStart>=0){
  const headerEnd=s.indexOf('\nfunction HeroVisual',headerStart);
  if(headerEnd>=0){
    const header=`function Header(){
 const[open,setOpen]=useState(false);
 const close=()=>setOpen(false);
 return <>
  <header className="globalHeader">
   <Link to="/" className="brand" onClick={close}><img src="/assets/img/logo.svg" alt="WOMATE"/></Link>
   <nav className="desktopNav">
    <div className="navGroup">
     <button className="navTrigger" type="button" aria-haspopup="true">Our work <ChevronDown size={15}/></button>
     <div className="megaMenu workMenu">
      <div className="megaIntro"><span>WOMATE ECOSYSTEM</span><strong>Women leading climate action.</strong></div>
      <div className="megaLinks">
       <div><span className="megaLabel">LEARN & LEAD</span><Link to="/she-leads"><b>She Leads</b><small>Climate mentorship & leadership</small></Link><Link to="/circle"><b>The WOMATE Circle</b><small>Community & professional network</small></Link></div>
       <div><span className="megaLabel">KNOWLEDGE & CARE</span><Link to="/wok-action"><b>WoK—Action</b><small>Women’s local climate knowledge</small></Link><Link to="/research"><b>Research</b><small>Gender-responsive evidence</small></Link><Link to="/resilient-minds"><b>Resilient Minds</b><small>Climate & mental-health support</small></Link></div>
      </div>
      <Link to="/honours" className="megaFeature"><span>CLIMATE HONOURS</span><strong>Amplify the Untold.</strong><ArrowUpRight size={18}/></Link>
     </div>
    </div>
    <Link to="/honours" className="desktopDirect">Climate Honours</Link>
    <div className="navGroup">
     <button className="navTrigger" type="button" aria-haspopup="true">Organisation <ChevronDown size={15}/></button>
     <div className="megaMenu orgMenu">
      <div className="megaIntro"><span>ABOUT WOMATE</span><strong>Africa-rooted. Future-facing.</strong></div>
      <div className="orgLinks"><Link to="/leadership"><b>Our organisation</b><small>Leadership & institutional direction</small></Link><Link to="/funding"><b>Funding support</b><small>Grant application programme</small></Link><Link to="/womateer"><b>WOMATEER</b><small>Volunteer your professional skill</small></Link><Link to="/merchandise"><b>The Vault</b><small>WOMATE merchandise</small></Link></div>
     </div>
    </div>
   </nav>
   <div className="headright"><Link to="/donate" className="headerJoin">Donate <ArrowUpRight size={16}/></Link></div>
   <button className="menu" type="button" aria-label={open?'Close navigation':'Open navigation'} aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
  </header>
  {open&&<nav className="mobileNav mobileNavCategorised" aria-label="Mobile navigation">
   <div className="mobileNavTop"><span>EXPLORE WOMATE</span><button type="button" onClick={close} aria-label="Close navigation"><X size={20}/></button></div>
   <div className="mobileNavGroup">
    <span className="mobileNavLabel">LEARN & COMMUNITY</span>
    <Link onClick={close} to="/she-leads">She Leads <ChevronRight size={16}/></Link>
    <Link onClick={close} to="/circle">The WOMATE Circle <ChevronRight size={16}/></Link>
   </div>
   <div className="mobileNavGroup">
    <span className="mobileNavLabel">KNOWLEDGE & CARE</span>
    <Link onClick={close} to="/wok-action">WoK—Action <ChevronRight size={16}/></Link>
    <Link onClick={close} to="/research">Research <ChevronRight size={16}/></Link>
    <Link onClick={close} to="/resilient-minds">Resilient Minds <ChevronRight size={16}/></Link>
    <Link onClick={close} to="/honours">Climate Honours <ChevronRight size={16}/></Link>
   </div>
   <div className="mobileNavGroup">
    <span className="mobileNavLabel">ORGANISATION</span>
    <Link onClick={close} to="/leadership">Our organisation <ChevronRight size={16}/></Link>
    <Link onClick={close} to="/funding">Funding support <ChevronRight size={16}/></Link>
    <Link onClick={close} to="/womateer">WOMATEER <ChevronRight size={16}/></Link>
    <Link onClick={close} to="/merchandise">The Vault <ChevronRight size={16}/></Link>
   </div>
   <Link onClick={close} to="/donate" className="mobileDonate">Donate to WOMATE <ArrowUpRight size={17}/></Link>
  </nav>}
 </>;
}
`;
    s=s.slice(0,headerStart)+header+s.slice(headerEnd);
  }else{
    console.warn('Header end marker not found — mobile nav replacement skipped.');
  }
}else{
  console.warn('Header function not found — mobile nav replacement skipped.');
}

// 6) Resilient Minds — update the continuity paragraph.
s=s.replace(
  'WOMATE is building continuity across rescue, clinical restoration, safe living and skills-building so support does not end at the first intervention.',
  'WOMATE is building continuity across rescue, clinical restoration, safe living and skills-building so support does not end at the first intervention, we are inviting hospitals, clinicians, safe-house partners, vocational trainers, donors and organisations to support.'
);

// 7) Remove Resilient Minds "SUPPORT THE WORK / One donation route..." section.
if(s.includes('<section className="healGuardians">')){
  s=removeBetween(
    s,
    '<section className="healGuardians">',
    '<section className="healGuardianStory">',
    'Resilient Minds support-work section'
  );
}

// 8) Remove Resilient Minds partner-in-care form completely.
if(s.includes('<section className="healInquiry">')){
  const a=s.indexOf('<section className="healInquiry">');
  const b=s.indexOf('</main>',a);
  if(a>=0&&b>=0) s=s.slice(0,a)+s.slice(b);
  else console.warn('Resilient Minds partner form boundary not found — skipped.');
}

fs.writeFileSync(p,s,'utf8');

// 9) Mobile categorisation styling.
if(fs.existsSync(cssP)){
 let css=fs.readFileSync(cssP,'utf8');
 const marker='/* WOMATE MOBILE NAV · CATEGORISED */';
 if(!css.includes(marker)){
 css+=`
${marker}
@media(max-width:900px){
 .mobileNavCategorised{position:fixed!important;inset:0!important;z-index:9998!important;background:#f8faf8!important;padding:18px 20px 28px!important;overflow-y:auto!important;display:block!important}
 .mobileNavCategorised>a{border:0!important}
 .mobileNavTop{display:flex;align-items:center;justify-content:space-between;padding:4px 0 18px;border-bottom:1px solid rgba(14,77,74,.13)}
 .mobileNavTop>span{font-size:10px;font-weight:850;letter-spacing:.16em;color:#6d8886}
 .mobileNavTop button{width:38px;height:38px;border:1px solid rgba(14,77,74,.14);border-radius:50%;background:#fff;color:#0e4d4a;display:grid;place-items:center}
 .mobileNavGroup{padding:20px 0 10px;border-bottom:1px solid rgba(14,77,74,.11)}
 .mobileNavLabel{display:block;margin:0 0 8px;font-size:9px;font-weight:850;letter-spacing:.16em;color:#819694}
 .mobileNavGroup a{display:flex!important;align-items:center!important;justify-content:space-between!important;padding:10px 0!important;border:0!important;font-size:17px!important;font-weight:700!important;letter-spacing:-.02em!important;color:#0e4d4a!important;text-decoration:none!important}
 .mobileNavGroup a svg{opacity:.45}
 .mobileDonate{display:flex!important;align-items:center!important;justify-content:space-between!important;margin-top:22px!important;padding:15px 18px!important;border-radius:999px!important;background:#c6ff52!important;color:#0e4d4a!important;font-weight:850!important;text-decoration:none!important}
}
`;
 fs.writeFileSync(cssP,css,'utf8');
 }
}

console.log('WOMATE Sept 3 cleanup applied successfully.');
console.log('✓ She Leads learning-architecture subtitle removed');
console.log('✓ She Leads network copy tightened');
console.log('✓ Circle tier/free-access card section removed');
console.log('✓ WoK—Action desktop navigation spelling/encoding fixed');
console.log('✓ Resilient Minds support-work section removed');
console.log('✓ Resilient Minds partner-in-care form removed');
console.log('✓ Resilient Minds continuity copy updated');
console.log('✓ Mobile navigation categorised');
console.log('Backup: src/main.jsx.before-sept3-cleanup.bak');
