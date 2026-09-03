const fs=require('fs');
const path=require('path');

const mainPath=path.resolve(process.cwd(),'src','main.jsx');
const cssPath=path.resolve(process.cwd(),'src','style.css');

if(!fs.existsSync(mainPath)){
  console.error('Could not find src/main.jsx. Run this from the WOMATE project root.');
  process.exit(1);
}

let s=fs.readFileSync(mainPath,'utf8');
const backup=mainPath+'.before-social-enterprise.bak';
if(!fs.existsSync(backup)) fs.copyFileSync(mainPath,backup);

function upsertObjectEntry(source, objectName, key, entry){
  const startNeedle=`const ${objectName}={`;
  const start=source.indexOf(startNeedle);
  if(start<0) return source;
  const end=source.indexOf('\n};',start);
  if(end<0) return source;

  let body=source.slice(start+startNeedle.length,end);
  const lines=body.split(/\r?\n/).filter(line=>!line.includes(`'${key}':`));
  body=lines.join('\n').replace(/\s+$/,'');
  if(body.trim() && !body.trimEnd().endsWith(',')) body=body.trimEnd()+',';
  body += `\n${entry}`;
  return source.slice(0,start+startNeedle.length)+body+source.slice(end);
}

// 1) Public route + SEO. This preserves every existing page and all current icon-pillar UI.
s=upsertObjectEntry(
  s,'pages','/donate',
  "'/donate':{k:'DONATE',title:'Back women-led climate leadership.',accent:'Give access. Grow leadership.',intro:'Support research, climate, health and leadership programmes for women across Africa.',type:'donate'}"
);
s=upsertObjectEntry(
  s,'seo','/donate',
  "'/donate':{title:'Donate to WOMATE | Support Women in Climate',description:'Support WOMATE, a nonprofit organisation equipping African women with technology, training, research, community and climate leadership opportunities.'}"
);

// 2) Make nonprofit status explicit on the homepage and in structured organisation copy.
s=s.replace(
  /WOMATE equips women with technology, training and community support to move from climate participation to climate leadership\./g,
  'WOMATE is a nonprofit organisation that equips African women with technology, training and community support to move from climate participation to climate leadership.'
);
s=s.replace(
  /WOMATE advances African women's leadership in climate action through sustainable technology, research, community, capacity building and storytelling\./g,
  'WOMATE is a nonprofit organisation that equips African women with technology, training and community support to move from climate participation to climate leadership.'
);

// 3) Desktop highlighted CTA only. Mobile navigation is left unchanged.
s=s.replace(
  /<div className="headright"><Link to="\/(?:circle|donate)" className="headerJoin">(?:Join the community|Donate)\s*<ArrowUpRight size=\{16\}\/><\/Link><\/div>/,
  '<div className="headright"><Link to="/donate" className="headerJoin">Donate <ArrowUpRight size={16}/></Link></div>'
);

// 4) WoK—Action: remove its Paystack route and centralise support through Donate.
s=s.replace(/\n?const WOK_FUND\s*=\s*['"][^'"]*paystack[^'"]*['"];\s*/gi,'\n');
s=s.replace(
  /<a className="pill lime" href=\{WOK_FUND\} target="_blank" rel="noreferrer">Fund Community Project<\/a>/g,
  '<Link to="/donate" className="pill lime">Support WOMATE <ArrowUpRight size={16}/></Link>'
);

// 5) Circle: one free community route, no payment tier, no Paystack, direct WhatsApp access.
const circleStart=s.indexOf('const CIRCLE_FORM=');
const circleEnd=s.indexOf('const researchServices=',circleStart);
if(circleStart>=0 && circleEnd>circleStart){
  const circleBlock=`const CIRCLE_WHATSAPP=import.meta.env.VITE_CIRCLE_WHATSAPP_URL||'';
const CIRCLE_INQUIRY=import.meta.env.VITE_CIRCLE_INQUIRY_ENDPOINT||'';
const circleTiers=[
['01','The Collective','Free',['Opportunity sharing — jobs, grants and fellowships','Community learning exchanges','Volunteering and collaboration opportunities','Digital resources and peer connection']]
];
function CirclePage(){
 const[sent,setSent]=useState(false),[sending,setSending]=useState(false);
 const goPath=()=>document.getElementById('circle-pathways')?.scrollIntoView({behavior:'smooth',block:'start'});
 const openWhatsApp=()=>{if(CIRCLE_WHATSAPP)window.open(CIRCLE_WHATSAPP,'_blank','noopener,noreferrer');else alert('Add VITE_CIRCLE_WHATSAPP_URL to your .env to activate the WOMATE Circle WhatsApp route.');};
 async function sendInquiry(e){e.preventDefault();const form=e.currentTarget;setSending(true);try{if(!CIRCLE_INQUIRY)throw new Error('missing');const data=Object.fromEntries(new FormData(form));const r=await fetch(CIRCLE_INQUIRY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,source:'WOMATE Circle'})});if(!r.ok)throw new Error('request');setSent(true);form.reset()}catch(err){if(err.message==='missing') alert('Add VITE_CIRCLE_INQUIRY_ENDPOINT to your .env to activate direct inquiry delivery.');else alert('Your inquiry could not be sent. Please try again.')}finally{setSending(false)}}
 return <>
<section className="hero hero-circle"><div className="heroTop"><div className="heroCopy"><h1>A climate community for women.</h1><div className="actions"><button className="pill lime" onClick={openWhatsApp}>Join the Circle <ArrowUpRight size={16}/></button><button className="pill ghost" onClick={goPath}>Explore the community</button></div></div><HeroVisual type="circle"/></div></section>
<main className="circlePage">
<section className="circleIntro"><span>THE INNER RING OF CLIMATE LEADERSHIP</span><div><h2>Influence grows faster when women do not have to build alone.</h2><p>The WOMATE Circle is a specialised ecosystem for women architects of sustainability: a place to exchange intelligence, access opportunity, build professional visibility and turn peer connection into collective power.</p></div></section>
<section className="circlePromise"><div className="circleSectionHead"><span>FOSTERING VISIBILITY</span><h2>More than a network. A growth accelerator.</h2></div><div className="circlePromiseGrid"><article><b>01 · SHARED LEARNING</b><h3>Stay current together.</h3><p>Capacity-building exchanges, resource sharing and peer intelligence for women navigating climate and sustainability work.</p></article><article><b>02 · DIRECT ACCESS</b><h3>See opportunity sooner.</h3><p>Curated fellowships, grants, projects and speaking opportunities selected for women building credible climate careers.</p></article><article><b>03 · COMMUNITY</b><h3>Build with others.</h3><p>Connect with women working across climate, research, technology, advocacy, health and community leadership.</p></article></div></section>
<section id="circle-pathways" className="circlePathways"><div className="circleSectionHead"><span>ONE COMMUNITY · FREE ACCESS</span><h2>One Circle. No paid tiers.</h2></div><div className="circleTierGrid">{circleTiers.map(([n,t,price,items])=><article className="circleTier featured" key={n}><div className="circleTierTop"><span>{n}</span><b>OPEN ACCESS</b></div><h3>{t}</h3><div className="circlePrice">{price}</div><ul>{items.map(x=><li key={x}>{x}</li>)}</ul><button className="pill darkbtn" onClick={openWhatsApp}>Join community <ArrowUpRight size={16}/></button></article>)}</div></section>
<section className="circlePath"><div className="circlePathCopy"><h2>A direct route into the Circle.</h2><p>The WOMATE Circle is free to join. Enter the community, introduce yourself and connect to learning, opportunities and peers.</p></div><div className="circleSteps"><div><b>01</b><strong>Join the community</strong><p>Use the direct WhatsApp route to enter the WOMATE Circle.</p></div><div><b>02</b><strong>Introduce yourself</strong><p>Share who you are, where you are based and the climate space you are building in.</p></div><div><b>03</b><strong>Participate</strong><p>Access learning, resources, opportunities and peer exchange without a membership fee.</p></div></div></section>
<section className="circleAccess"><div className="circleAccessCopy"><h2>Ready to enter?</h2><p>There is no annual membership payment. The Circle is an open community pathway into WOMATE.</p></div><div className="circleAccessActions"><button className="pill lime" onClick={openWhatsApp}>Open WhatsApp community <ArrowUpRight size={16}/></button></div></section>
<section className="circleInquiry"><div><h2>Need help before joining?</h2><p>Send a short note and the WOMATE team can help with access or community questions.</p></div>{sent?<div className="circleSuccess"><ShieldCheck size={30}/><strong>Inquiry received.</strong><p>WOMATE can now follow up using the contact details you provided.</p></div>:<form onSubmit={sendInquiry}><label>Full name<input name="name" required autoComplete="name"/></label><label>Email address<input name="email" required type="email" autoComplete="email"/></label><label>Country<input name="country" autoComplete="country-name"/></label><textarea name="message" required placeholder="How can we help?"/><button className="pill darkbtn" disabled={sending}>{sending?'Sending…':'Send inquiry'} <ArrowUpRight size={16}/></button></form>}</section>
</main>
</>}

`;
  s=s.slice(0,circleStart)+circleBlock+s.slice(circleEnd);
}

// 6) Resilient Minds: remove its direct Paystack route.
// Existing programme/guardian design remains, but all contributions go through WOMATE's central Donate page.
s=s.replace(/const HEAL_PAYMENT_BASE=import\.meta\.env\.VITE_HEAL_PAYMENT_URL\|\|'';\s*/g,'');
s=s.replace(
  /const contribute=\(tier\)=>\{[^;]*?setGuardianOpen\(true\)\};/,
  "const contribute=(tier)=>{setSelected(tier.id);window.location.href='/donate'};"
);

// If an older current build still contains a direct HEAL_PAYMENT_BASE reference, neutralise only that contribution href.
s=s.replace(/href=\{HEAL_PAYMENT_BASE\}/g,'href="/donate"');

// 7) Funding Support: it remains an interest/readiness service, not a payment route.
// Remove common funding-payment declarations if an older local build still has one.
s=s.replace(/\n?const\s+FUNDING_(?:PAYMENT|PAY|CHECKOUT)[A-Z_]*\s*=\s*[^;]+;\s*/g,'\n');

// 8) Add Donate page component before Application. No existing programme component is replaced.
if(!s.includes('function DonationPage(){')){
  const marker='function Application({type})';
  const idx=s.indexOf(marker);
  if(idx<0){
    console.error('Could not locate Application component for Donate-page insertion.');
    process.exit(1);
  }
  const donateComponent=`function DonationPage(){
 const donateUrl='https://paystack.shop/pay/donateadollar';
 const impact=[
  ['01','Research','Support women-centred climate research, evidence and knowledge that can shape better decisions.'],
  ['02','Climate','Keep foundational climate learning, community action and practical leadership opportunities accessible.'],
  ['03','Health','Strengthen programmes such as Resilient Minds that connect climate resilience with wellbeing, care and dignity.'],
  ['04','Leadership','Help women access training, mentorship, visibility, professional pathways and opportunities to lead.']
 ];
 return <main className="donatePage">
  <section className="donateHero"><div className="donateHeroCopy"><span>SUPPORT WOMATE</span><h1>Give access. Grow leadership.</h1><p>WOMATE is a nonprofit organisation that equips African women with technology, training and community support to move from climate participation to climate leadership.</p><div className="donateHeroActions"><a className="pill lime" href={donateUrl} target="_blank" rel="noreferrer">Donate now <ArrowUpRight size={17}/></a><a className="donateTextLink" href="#donate-impact">See where your support goes <ChevronRight size={16}/></a></div></div><aside className="donatePromise"><span>EVERY CEDI COUNTS</span><strong>Every cedi goes into supporting women.</strong><p>Your contribution strengthens WOMATE's research, climate, health and leadership programmes across Africa.</p></aside></section>
  <section className="donateStatement"><span>WHY GIVE</span><h2>Support that keeps access open and turns learning into leadership.</h2></section>
  <section className="donateImpactGrid" id="donate-impact">{impact.map(([n,title,copy])=><article key={n}><b>{n}</b><div><h3>{title}</h3><p>{copy}</p></div></article>)}</section>
  <section className="donateModel"><div><span>HOW WOMATE SUSTAINS ACCESS</span><h2>Free foundations. Affordable advancement. Supported access.</h2></div><div className="donateModelRail"><article><strong>FREE</strong><h3>Foundational learning</h3><p>Core climate literacy and leadership learning can remain free and accessible.</p></article><article><strong>AFFORDABLE</strong><h3>Advanced skills</h3><p>Selected advanced professional courses can carry a small, accessible fee to support sustainable delivery.</p></article><article><strong>SPONSORED</strong><h3>Scholarships & programmes</h3><p>Donations and partners help WOMATE widen access for women who need additional support.</p></article></div></section>
  <section className="donateFinal"><div><span>BACK WOMEN-LED CLIMATE ACTION</span><h2>Help keep the first door open.</h2><p>Support research, climate action, health and leadership programmes designed around women as actors, builders and decision-makers.</p></div><a className="pill lime" href={donateUrl} target="_blank" rel="noreferrer">Make a donation <ArrowUpRight size={17}/></a></section>
 </main>
}

`;
  s=s.slice(0,idx)+donateComponent+s.slice(idx);
}

// 9) Route Donate through the existing public route chain without touching any Canopy routing.
if(!s.includes("p.type==='donate'?<DonationPage/>")){
  const needle=':<Standard p={p}/>';
  const idx=s.lastIndexOf(needle);
  if(idx<0){
    console.error('Could not locate the public page render chain.');
    process.exit(1);
  }
  s=s.slice(0,idx)+":p.type==='donate'?<DonationPage/>"+s.slice(idx);
}

// 10) Footer: add Donate once.
if(!s.includes('<Link to="/donate">Donate</Link>')){
  s=s.replace(
    '<span className="footerLabel">TAKE PART</span>',
    '<span className="footerLabel">TAKE PART</span><Link to="/donate">Donate</Link>'
  );
}

fs.writeFileSync(mainPath,s,'utf8');

// 11) Isolated Donate styles in style.css. Existing She Leads/WoK/Research/WOMATEER icon styles are untouched.
const cssMarker='/* WOMATE DONATE PAGE · SOCIAL ENTERPRISE */';
if(fs.existsSync(cssPath)){
  let css=fs.readFileSync(cssPath,'utf8');
  if(!css.includes(cssMarker)){
    css+=`

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
.donateFinal{padding:90px clamp(24px,6vw,96px);background:#072f2d;color:#fff;display:grid;grid-template-columns:1.2fr .8fr;gap:60px;align-items:end}.donateFinal h2{font-size:clamp(48px,6vw,86px);line-height:.98;letter-spacing:-.05em;margin:14px 0 18px}.donateFinal p{color:rgba(255,255,255,.72);font-size:18px;max-width:700px}.donateFinal>a{justify-self:start}
@media(max-width:850px){.donateHero,.donateStatement,.donateModel,.donateFinal{grid-template-columns:1fr}.donateHero{padding-top:110px}.donateImpactGrid{grid-template-columns:1fr}.donateImpactGrid article:nth-child(odd){border-right:0}.donateImpactGrid article:nth-child(even){padding-left:0}.donateModelRail article{grid-template-columns:80px 1fr}.donateModelRail p{grid-column:2}.donateStatement{padding-top:72px}.donateImpactGrid{padding-bottom:75px}}
`;
    fs.writeFileSync(cssPath,css,'utf8');
  }
}

console.log('WOMATE social-enterprise architecture patch applied.');
console.log('✓ Current icon-pillar styling preserved');
console.log('✓ Donate uses https://paystack.shop/pay/donateadollar');
console.log('✓ WoK direct Paystack route removed');
console.log('✓ Circle paid tiers/payment route removed; free direct community access retained');
console.log('✓ Resilient Minds direct Paystack route removed');
console.log('✓ Funding Support remains non-payment');
console.log('✓ Canopy files and routing were not replaced');
console.log('Backup: src/main.jsx.before-social-enterprise.bak');
