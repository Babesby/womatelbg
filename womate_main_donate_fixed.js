const fs = require('fs');
const path = require('path');

const mainPath = path.resolve(process.cwd(), 'src', 'main.jsx');
const cssPath  = path.resolve(process.cwd(), 'src', 'style.css');

if (!fs.existsSync(mainPath)) {
  console.error('Could not find src/main.jsx. Run this from the WOMATE project root.');
  process.exit(1);
}

let s = fs.readFileSync(mainPath, 'utf8');
const original = s;

function insertIntoObject(objectStart, insertText, alreadyNeedle) {
  if (s.includes(alreadyNeedle)) return true;
  const start = s.indexOf(objectStart);
  if (start < 0) return false;
  const end = s.indexOf('\n};', start);
  if (end < 0) return false;
  s = s.slice(0, end) + '\n' + insertText + s.slice(end);
  return true;
}

// 1) Add Donate to the public page registry.
if (!s.includes("'/donate':{k:'DONATE'")) {
  if (!insertIntoObject(
    'const pages={',
    "'/donate':{k:'DONATE',title:'Back women-led climate leadership.',accent:'Give access. Grow leadership.',intro:'Support free climate learning, practical skills and leadership opportunities for women across Africa.',type:'donate'},",
    "'/donate':{k:'DONATE'"
  )) {
    console.error('Patch stopped: public page registry not found.');
    process.exit(1);
  }
}

// 2) Add Donate SEO, if this build has the SEO registry.
if (s.includes('const seo={') && !s.includes("'/donate':{title:'Donate to WOMATE")) {
  if (!insertIntoObject(
    'const seo={',
    "'/donate':{title:'Donate to WOMATE | Support Women in Climate',description:'Support WOMATE, a nonprofit organisation equipping African women with climate learning, technology, training, community and leadership opportunities.'},",
    "'/donate':{title:'Donate to WOMATE"
  )) {
    console.error('Patch stopped: SEO registry could not be updated.');
    process.exit(1);
  }
}

// 3) Change only the DESKTOP highlighted CTA. Mobile nav remains untouched.
s = s.replace(
  /<div className="headright"><Link to="\/circle" className="headerJoin">Join the community\s*<ArrowUpRight size=\{16\}\/><\/Link><\/div>/,
  '<div className="headright"><Link to="/donate" className="headerJoin">Donate <ArrowUpRight size={16}/></Link></div>'
);

// Fallback for slightly different formatting.
s = s.replace(
  /<Link to="\/circle" className="headerJoin">Join the community\s*<ArrowUpRight size=\{16\}\/><\/Link>/,
  '<Link to="/donate" className="headerJoin">Donate <ArrowUpRight size={16}/></Link>'
);

// 4) Make WOMATE's nonprofit status explicit on the homepage.
s = s.replace(
  /WOMATE equips women with technology, training and community support to move from climate participation to climate leadership\./g,
  'WOMATE is a nonprofit organisation equipping African women with technology, training and community support to move from climate participation to climate leadership.'
);

// 5) Keep structured/SEO description aligned where the existing sentence is present.
s = s.replace(
  /WOMATE advances African women's leadership in climate action through sustainable technology, research, community, capacity building and storytelling\./g,
  'WOMATE is a nonprofit organisation equipping African women with technology, training and community support to move from climate participation to climate leadership.'
);

// 6) Add a standalone Donate page without touching Canopy.
if (!s.includes('function DonationPage()')) {
  const marker = 'function Application({type})';
  const idx = s.indexOf(marker);
  if (idx < 0) {
    console.error('Patch stopped: Donation component insertion point not found.');
    process.exit(1);
  }

  const component = `function DonationPage(){
const donateUrl=import.meta.env.VITE_DONATE_URL||'';
const impact=[
['01','Free climate learning','Keep foundational She Leads learning free for women who should not be excluded by cost.'],
['02','Practical climate skills','Support accessible pathways in climate technology, advocacy, data and green careers.'],
['03','Participation & community','Help women access learning support, mentorship, peer networks and leadership opportunities.'],
['04','Women-led climate action','Back programmes, research and practical leadership that move learning into local impact.']
];
const give=()=>{if(donateUrl){window.location.href=donateUrl}else{document.getElementById('donate-checkout-note')?.scrollIntoView({behavior:'smooth',block:'center'})}};
return <main className="donatePage">
<section className="donateHero">
<div className="donateHeroCopy"><span>SUPPORT WOMATE</span><h1>Back the woman who will lead what comes next.</h1><p>WOMATE is a nonprofit organisation equipping African women with technology, training and community support to move from climate participation to climate leadership.</p><div className="donateHeroActions"><button className="pill lime" onClick={give}>Donate to WOMATE <ArrowUpRight size={17}/></button><a className="donateTextLink" href="#donate-impact">See where your support goes <ChevronRight size={16}/></a></div></div>
<aside className="donatePromise"><span>OUR COMMITMENT</span><strong>Access should not depend on ability to pay.</strong><p>Your support helps WOMATE keep foundational learning free while building affordable advanced pathways, scholarships and practical opportunities.</p></aside>
</section>
<section className="donateStatement"><span>WHY GIVE</span><h2>A donation does more than fund a course. It widens who gets to enter climate leadership.</h2></section>
<section className="donateImpactGrid" id="donate-impact">{impact.map(([n,title,copy])=><article key={n}><b>{n}</b><div><h3>{title}</h3><p>{copy}</p></div></article>)}</section>
<section className="donateModel"><div><span>OUR SOCIAL-ENTERPRISE MODEL</span><h2>Free foundations. Affordable advancement. Supported access.</h2></div><div className="donateModelRail"><article><strong>FREE</strong><h3>Foundational learning</h3><p>Core climate literacy and leadership learning remains accessible at no cost.</p></article><article><strong>AFFORDABLE</strong><h3>Advanced skills</h3><p>Low-cost professional courses create mission-aligned earned income without making access the privilege of a few.</p></article><article><strong>SPONSORED</strong><h3>Scholarships & cohorts</h3><p>Donors and partners help women who need additional support participate fully.</p></article></div></section>
<section className="donateFinal"><div><span>GIVE ACCESS. GROW LEADERSHIP.</span><h2>Help keep the first door open.</h2><p>Every contribution strengthens a women-led climate learning ecosystem built for Africa and connected to the world.</p></div><div><button className="pill lime" onClick={give}>Make a donation <ArrowUpRight size={17}/></button><small id="donate-checkout-note">{donateUrl?'Secure donation checkout opens through WOMATE’s payment partner.':'Donation checkout is being connected. For institutional or immediate giving, contact womatead@gmail.com.'}</small></div></section>
</main>
}

`;
  s = s.slice(0, idx) + component + s.slice(idx);
}

// 7) Route /donate through the existing public render chain.
// This deliberately avoids changing any /canopy handling.
if (!s.includes("p.type==='donate'?<DonationPage/>")) {
  const standardNeedle = ':<Standard p={p}/>';
  const idx = s.lastIndexOf(standardNeedle);
  if (idx >= 0) {
    s = s.slice(0, idx) + ":p.type==='donate'?<DonationPage/>" + s.slice(idx);
  } else {
    console.error('Patch stopped: public render chain not found.');
    process.exit(1);
  }
}

// 8) Add Donate to footer "TAKE PART" if that section exists.
if (!s.includes('<Link to="/donate">Donate</Link>')) {
  s = s.replace(
    '<span className="footerLabel">TAKE PART</span>',
    '<span className="footerLabel">TAKE PART</span><Link to="/donate">Donate</Link>'
  );
}

// Write main.jsx.
if (s !== original) {
  if (!fs.existsSync(mainPath + '.before-donate-fixed.bak')) {
    fs.copyFileSync(mainPath, mainPath + '.before-donate-fixed.bak');
  }
  fs.writeFileSync(mainPath, s, 'utf8');
}

// 9) Append isolated donation CSS to style.css rather than trying to inject into main.jsx.
const cssMarker = '/* WOMATE DONATE PAGE · PATCH */';
if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, 'utf8');
  if (!css.includes(cssMarker)) {
    css += `

${cssMarker}
.donatePage{background:#f6f5ef;color:#103f3c;min-height:70vh}
.donateHero{min-height:76vh;padding:clamp(120px,14vw,190px) clamp(24px,6vw,96px) 80px;background:#0E4D4A;color:#fff;display:grid;grid-template-columns:minmax(0,1.35fr) minmax(300px,.65fr);gap:clamp(44px,8vw,120px);align-items:end}
.donateHeroCopy{max-width:850px}.donateHeroCopy>span,.donatePromise>span,.donateStatement>span,.donateModel>div>span,.donateFinal span{font-size:11px;letter-spacing:.18em;font-weight:800}
.donateHero h1{font-size:clamp(48px,7vw,102px);line-height:.94;letter-spacing:-.055em;margin:18px 0 28px;max-width:980px}
.donateHeroCopy>p{font-size:clamp(18px,2vw,24px);line-height:1.55;max-width:760px;color:rgba(255,255,255,.82)}
.donateHeroActions{display:flex;align-items:center;gap:24px;flex-wrap:wrap;margin-top:34px}.donateTextLink{color:#fff;display:inline-flex;align-items:center;gap:5px;font-weight:750;text-decoration:none}
.donatePromise{border-top:1px solid rgba(255,255,255,.45);padding-top:22px;align-self:end}.donatePromise strong{font-size:clamp(28px,3vw,43px);line-height:1.08;display:block;margin:18px 0}.donatePromise p{color:rgba(255,255,255,.72);line-height:1.65}
.donateStatement{padding:100px clamp(24px,6vw,96px) 58px;display:grid;grid-template-columns:.45fr 1.55fr;gap:40px}.donateStatement h2{font-size:clamp(38px,5vw,72px);line-height:1.02;letter-spacing:-.045em;margin:0;max-width:1050px}
.donateImpactGrid{padding:0 clamp(24px,6vw,96px) 110px;display:grid;grid-template-columns:repeat(2,1fr);border-top:1px solid rgba(14,77,74,.18)}
.donateImpactGrid article{display:grid;grid-template-columns:60px 1fr;gap:22px;padding:38px 26px 38px 0;border-bottom:1px solid rgba(14,77,74,.18)}.donateImpactGrid article:nth-child(odd){border-right:1px solid rgba(14,77,74,.18)}.donateImpactGrid article:nth-child(even){padding-left:32px}
.donateImpactGrid b{font-size:12px;letter-spacing:.14em}.donateImpactGrid h3{font-size:clamp(24px,2.4vw,36px);margin:0 0 12px;letter-spacing:-.03em}.donateImpactGrid p{margin:0;line-height:1.7;color:#466b68}
.donateModel{padding:110px clamp(24px,6vw,96px);background:#C6FF52;display:grid;grid-template-columns:.7fr 1.3fr;gap:70px}.donateModel h2{font-size:clamp(40px,5vw,72px);line-height:1;letter-spacing:-.045em;margin:18px 0 0}
.donateModelRail{display:grid;gap:0;border-top:1px solid rgba(14,77,74,.35)}.donateModelRail article{display:grid;grid-template-columns:100px 1fr 1fr;gap:20px;padding:24px 0;border-bottom:1px solid rgba(14,77,74,.35);align-items:start}.donateModelRail strong{font-size:11px;letter-spacing:.12em}.donateModelRail h3{font-size:24px;margin:0}.donateModelRail p{margin:0;color:#315c58;line-height:1.55}
.donateFinal{padding:90px clamp(24px,6vw,96px);background:#072f2d;color:#fff;display:grid;grid-template-columns:1.2fr .8fr;gap:60px;align-items:end}.donateFinal h2{font-size:clamp(48px,6vw,86px);line-height:.98;letter-spacing:-.05em;margin:14px 0 18px}.donateFinal p{color:rgba(255,255,255,.72);font-size:18px;max-width:700px}.donateFinal>div:last-child{display:grid;gap:15px;justify-items:start}.donateFinal small{color:rgba(255,255,255,.62);max-width:420px;line-height:1.5}
@media(max-width:850px){.donateHero,.donateStatement,.donateModel,.donateFinal{grid-template-columns:1fr}.donateHero{padding-top:110px}.donateImpactGrid{grid-template-columns:1fr}.donateImpactGrid article:nth-child(odd){border-right:0}.donateImpactGrid article:nth-child(even){padding-left:0}.donateModelRail article{grid-template-columns:80px 1fr}.donateModelRail p{grid-column:2}.donateStatement{padding-top:72px}.donateImpactGrid{padding-bottom:75px}}
`;
    fs.writeFileSync(cssPath, css, 'utf8');
  }
} else {
  console.warn('Warning: src/style.css was not found, so Donate page styles were not appended.');
}

console.log('WOMATE Donate + nonprofit patch applied successfully.');
console.log('Backup: src/main.jsx.before-donate-fixed.bak');
console.log('Canopy files/routes were not modified.');
console.log('Optional later: add VITE_DONATE_URL=... to .env when the donation checkout is ready.');
