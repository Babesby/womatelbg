const fs = require('fs');
const path = require('path');

const target = path.resolve(process.cwd(), 'src', 'main.jsx');
if (!fs.existsSync(target)) {
  console.error('Could not find src/main.jsx. Run this from the WOMATE project root.');
  process.exit(1);
}
let s = fs.readFileSync(target, 'utf8');
const original = s;

function replaceOnce(from, to, label) {
  if (s.includes(to)) return;
  if (!s.includes(from)) {
    console.error(`Patch stopped: could not find ${label}. No file was changed.`);
    process.exit(1);
  }
  s = s.replace(from, to);
}

// 1) Public page registry
if (!s.includes("'/donate':{k:'DONATE'")) {
  const anchor = "'/merchandise':{k:'THE VAULT'";
  const idx = s.indexOf(anchor);
  if (idx < 0) { console.error('Patch stopped: page registry anchor not found.'); process.exit(1); }
  const lineStart = s.lastIndexOf('\n', idx) + 1;
  const insert = "'/donate':{k:'DONATE',title:'Back women-led climate leadership.',accent:'Give access. Grow leadership.',intro:'Support free climate learning, practical skills and leadership opportunities for women across Africa.',type:'donate'},\n";
  s = s.slice(0, lineStart) + insert + s.slice(lineStart);
}

// 2) SEO route
if (!s.includes("'/donate':{title:'Donate to WOMATE")) {
  const anchor = "'/merchandise':{title:'The Vault | WOMATE Merchandise'";
  const idx = s.indexOf(anchor);
  if (idx < 0) { console.error('Patch stopped: SEO anchor not found.'); process.exit(1); }
  const lineStart = s.lastIndexOf('\n', idx) + 1;
  const insert = "'/donate':{title:'Donate to WOMATE | Support Women in Climate',description:'Support WOMATE, a nonprofit organisation equipping African women with climate learning, technology, community and leadership opportunities.'},\n";
  s = s.slice(0, lineStart) + insert + s.slice(lineStart);
}

// 3) Organisation positioning
s = s.replace("'@type':'Organization'", "'@type':'NGO'");
s = s.replace(
  `description:"WOMATE advances African women's leadership in climate action through sustainable technology, research, community, capacity building and storytelling."`,
  `description:"WOMATE is a nonprofit organisation equipping African women with technology, training and community support to move from climate participation to climate leadership."`
);
s = s.replace(
  `description:"WOMATE advances African women's leadership in climate action through sustainable technology, research, community, capacity building and storytelling."`,
  `description:"WOMATE is a nonprofit organisation equipping African women with technology, training and community support to move from climate participation to climate leadership."`
);

// 4) Desktop highlighted CTA only. Mobile navigation is intentionally untouched.
replaceOnce(
  '<div className="headright"><Link to="/circle" className="headerJoin">Join the community <ArrowUpRight size={16}/></Link></div>',
  '<div className="headright"><Link to="/donate" className="headerJoin">Donate <Heart size={15}/></Link></div>',
  'desktop highlighted navigation CTA'
);

// 5) Homepage nonprofit statement
s = s.replace(
  'WOMATE equips women with technology, training and community support to move from climate participation to climate leadership.',
  'WOMATE is a nonprofit organisation equipping African women with technology, training and community support to move from climate participation to climate leadership.'
);

// 6) Donation page component
if (!s.includes('function DonationPage()')) {
  const marker = 'function Application({type})';
  const idx = s.indexOf(marker);
  if (idx < 0) { console.error('Patch stopped: component insertion point not found.'); process.exit(1); }
  const component = `function DonationPage(){\nconst donateUrl=import.meta.env.VITE_DONATE_URL||'';\nconst impact=[\n['01','Free climate learning','Keep foundational She Leads learning free for women who should not be excluded by cost.'],\n['02','Practical skills','Support low-cost and sponsored pathways in climate technology, advocacy, data and green careers.'],\n['03','Access & community','Help women participate through digital access, learning support, mentorship and community.'],\n['04','Women-led climate action','Back practical projects, research and leadership that move learning into local impact.']\n];\nconst give=()=>{if(donateUrl){window.location.href=donateUrl}else{document.getElementById('donate-checkout-note')?.scrollIntoView({behavior:'smooth',block:'center'})}};\nreturn <main className=\"donatePage\">\n<section className=\"donateHero\"><div className=\"donateHeroCopy\"><span>SUPPORT WOMATE</span><h1>Back the woman who will lead what comes next.</h1><p>WOMATE is a nonprofit organisation equipping African women with technology, training and community support to move from climate participation to climate leadership.</p><div className=\"donateHeroActions\"><button className=\"pill lime\" onClick={give}>Donate to WOMATE <Heart size={17}/></button><a className=\"donateTextLink\" href=\"#donate-impact\">See where your support goes <ChevronRight size={16}/></a></div></div><aside className=\"donatePromise\"><span>THE WOMATE PROMISE</span><strong>Access should not depend on ability to pay.</strong><p>Your support helps us keep foundational learning accessible while building deeper, practical pathways for women ready to advance.</p></aside></section>\n<section className=\"donateStatement\"><span>WHY GIVE</span><h2>A donation does more than fund a course. It widens who gets to enter climate leadership.</h2></section>\n<section className=\"donateImpactGrid\" id=\"donate-impact\">{impact.map(([n,title,copy])=><article key={n}><b>{n}</b><div><h3>{title}</h3><p>{copy}</p></div></article>)}</section>\n<section className=\"donateModel\"><div><span>OUR MODEL</span><h2>Free foundations. Affordable advancement. Supported access.</h2></div><div className=\"donateModelRail\"><article><strong>FREE</strong><h3>Foundational learning</h3><p>Core climate literacy and leadership learning remains accessible at no cost.</p></article><article><strong>LOW-COST</strong><h3>Advanced skill pathways</h3><p>Affordable technical and career-focused courses create mission-aligned earned income.</p></article><article><strong>SPONSORED</strong><h3>Scholarships & access</h3><p>Donors and partners help women who need additional support participate fully.</p></article></div></section>\n<section className=\"donateFinal\"><div><span>GIVE ACCESS. GROW LEADERSHIP.</span><h2>Help keep the first door open.</h2><p>Every contribution strengthens a women-led climate learning ecosystem built for Africa and connected to the world.</p></div><div><button className=\"pill lime\" onClick={give}>Make a donation <ArrowUpRight size={17}/></button><small id=\"donate-checkout-note\">{donateUrl?'Secure donation checkout opens through WOMATE’s payment partner.':'Donation checkout is being connected. For institutional or immediate giving, contact womatead@gmail.com.'}</small></div></section>\n</main>\n}\n\n`;
  s = s.slice(0, idx) + component + s.slice(idx);
}

// 7) Route DonationPage in existing public render chain without touching Canopy route handling.
if (!s.includes("p.type==='donate'?<DonationPage/>")) {
  const from = "p.type==='merch'?<MerchandisePage/>:p.type==='funding'?<FundingPage/>";
  const to = "p.type==='merch'?<MerchandisePage/>:p.type==='donate'?<DonationPage/>:p.type==='funding'?<FundingPage/>";
  replaceOnce(from, to, 'public route render chain');
}

// 8) Isolated donation styling inside existing global UI polish string.
if (!s.includes('.donatePage{')) {
  const marker = '@media(prefers-reduced-motion:reduce)';
  const idx = s.indexOf(marker);
  if (idx < 0) { console.error('Patch stopped: style insertion point not found.'); process.exit(1); }
  const css = `.donatePage{background:#f6f5ef;color:#103f3c;min-height:70vh}.donateHero{min-height:76vh;padding:clamp(120px,14vw,190px) clamp(24px,6vw,96px) 80px;background:#0E4D4A;color:white;display:grid;grid-template-columns:minmax(0,1.35fr) minmax(300px,.65fr);gap:clamp(44px,8vw,120px);align-items:end}.donateHeroCopy{max-width:850px}.donateHeroCopy>span,.donatePromise>span,.donateStatement>span,.donateModel>div>span,.donateFinal span{font-size:11px;letter-spacing:.18em;font-weight:800}.donateHero h1{font-size:clamp(48px,7vw,102px);line-height:.94;letter-spacing:-.055em;margin:18px 0 28px;max-width:980px}.donateHeroCopy>p{font-size:clamp(18px,2vw,24px);line-height:1.55;max-width:760px;color:rgba(255,255,255,.82)}.donateHeroActions{display:flex;align-items:center;gap:24px;flex-wrap:wrap;margin-top:34px}.donateTextLink{color:white;display:inline-flex;align-items:center;gap:5px;font-weight:750;text-decoration:none}.donatePromise{border-top:1px solid rgba(255,255,255,.45);padding-top:22px;align-self:end}.donatePromise strong{font-size:clamp(28px,3vw,43px);line-height:1.08;display:block;margin:18px 0}.donatePromise p{color:rgba(255,255,255,.72);line-height:1.65}.donateStatement{padding:100px clamp(24px,6vw,96px) 58px;display:grid;grid-template-columns:.45fr 1.55fr;gap:40px}.donateStatement h2{font-size:clamp(38px,5vw,72px);line-height:1.02;letter-spacing:-.045em;margin:0;max-width:1050px}.donateImpactGrid{padding:0 clamp(24px,6vw,96px) 110px;display:grid;grid-template-columns:repeat(2,1fr);border-top:1px solid rgba(14,77,74,.18)}.donateImpactGrid article{display:grid;grid-template-columns:60px 1fr;gap:22px;padding:38px 26px 38px 0;border-bottom:1px solid rgba(14,77,74,.18)}.donateImpactGrid article:nth-child(odd){border-right:1px solid rgba(14,77,74,.18)}.donateImpactGrid article:nth-child(even){padding-left:32px}.donateImpactGrid b{font-size:12px;letter-spacing:.14em}.donateImpactGrid h3{font-size:clamp(24px,2.4vw,36px);margin:0 0 12px;letter-spacing:-.03em}.donateImpactGrid p{margin:0;line-height:1.7;color:#466b68}.donateModel{padding:110px clamp(24px,6vw,96px);background:#dfff63;display:grid;grid-template-columns:.7fr 1.3fr;gap:70px}.donateModel h2{font-size:clamp(40px,5vw,72px);line-height:1;letter-spacing:-.045em;margin:18px 0 0}.donateModelRail{display:grid;gap:0;border-top:1px solid rgba(14,77,74,.35)}.donateModelRail article{display:grid;grid-template-columns:100px 1fr 1fr;gap:20px;padding:24px 0;border-bottom:1px solid rgba(14,77,74,.35);align-items:start}.donateModelRail strong{font-size:11px;letter-spacing:.12em}.donateModelRail h3{font-size:24px;margin:0}.donateModelRail p{margin:0;color:#315c58;line-height:1.55}.donateFinal{padding:90px clamp(24px,6vw,96px);background:#072f2d;color:white;display:grid;grid-template-columns:1.2fr .8fr;gap:60px;align-items:end}.donateFinal h2{font-size:clamp(48px,6vw,86px);line-height:.98;letter-spacing:-.05em;margin:14px 0 18px}.donateFinal p{color:rgba(255,255,255,.72);font-size:18px;max-width:700px}.donateFinal>div:last-child{display:grid;gap:15px;justify-items:start}.donateFinal small{color:rgba(255,255,255,.62);max-width:420px;line-height:1.5}@media(max-width:850px){.donateHero,.donateStatement,.donateModel,.donateFinal{grid-template-columns:1fr}.donateHero{padding-top:110px}.donateImpactGrid{grid-template-columns:1fr}.donateImpactGrid article:nth-child(odd){border-right:0}.donateImpactGrid article:nth-child(even){padding-left:0}.donateModelRail article{grid-template-columns:80px 1fr}.donateModelRail p{grid-column:2}.donateStatement{padding-top:72px}.donateImpactGrid{padding-bottom:75px}}\n\n`;
  s = s.slice(0, idx) + css + s.slice(idx);
}

if (s === original) {
  console.log('WOMATE main architecture patch is already applied. No changes needed.');
  process.exit(0);
}

fs.copyFileSync(target, target + '.before-donate.bak');
fs.writeFileSync(target, s, 'utf8');
console.log('Updated src/main.jsx successfully.');
console.log('Backup: src/main.jsx.before-donate.bak');
console.log('Next: add VITE_DONATE_URL to .env when your donation checkout URL is ready.');
