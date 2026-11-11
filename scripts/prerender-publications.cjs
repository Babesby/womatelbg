/* WOMATE public SEO pre-render.
 * Generates canonical, crawlable HTML for public site pages, every opt-in Talent
 * Discovery profile and every approved publication. Production builds fail if
 * dynamic SEO generation cannot complete, preventing generic SPA fallback HTML
 * from being deployed for hundreds of distinct public URLs.
 */
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const dist=path.join(root,'dist');
const base=(process.env.VITE_CANOPY_SUPABASE_URL||process.env.CANOPY_SUPABASE_URL||'https://bwnwhsvssgponrzvwlpt.supabase.co').replace(/[/]+$/,'');
const key=process.env.VITE_CANOPY_SUPABASE_ANON_KEY||'';
const production=process.env.VERCEL_ENV==='production'||process.env.NODE_ENV==='production';

const ORIGIN='https://www.womate.org';
const OG_IMAGE=ORIGIN+'/og-womate.png';
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const validPublicationId=id=>/^[a-f0-9-]{36}$/i.test(String(id));
const validTalentSlug=slug=>/^[a-z0-9-]{2,180}$/i.test(String(slug));
const norm=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,' ');
const paragraphs=v=>String(v||'').replace(/\r/g,'').trim().split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
const unique=a=>[...new Set(a.filter(Boolean))];

function removeHeadSignals(html){
 return html
  .replace(/<link[^>]+rel=["']canonical["'][^>]*>\s*/gi,'')
  .replace(/<meta[^>]+name=["']robots["'][^>]*>\s*/gi,'')
  .replace(/<meta[^>]+property=["']og:(?:type|site_name|title|description|url|image|image:alt)["'][^>]*>\s*/gi,'')
  .replace(/<meta[^>]+name=["']twitter:(?:card|title|description|image)["'][^>]*>\s*/gi,'')
  .replace(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi,'');
}
function replaceTitleDescription(html,title,description){
 return html
  .replace(/<title>[\s\S]*?<\/title>/i,'<title>'+esc(title)+'</title>')
  .replace(/<meta[^>]*name=["']description["'][^>]*>/i,'<meta name="description" content="'+esc(description)+'">');
}
function insertHead(html,markup){return html.replace('</head>',markup+'\n</head>')}
function setRoot(html,body){return html.replace('<div id="root"></div>','<div id="root">'+body+'</div>')}
function schemaJson(value){return JSON.stringify(value).replace(/</g,'\\u003c')}
function seoHead({canonical,title,description,type='website',image=OG_IMAGE,schema,robots='index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'}){
 return [
  '<link rel="canonical" href="'+esc(canonical)+'">',
  '<meta name="robots" content="'+robots+'">',
  '<meta property="og:type" content="'+esc(type)+'">',
  '<meta property="og:site_name" content="WOMATE">',
  '<meta property="og:title" content="'+esc(title)+'">',
  '<meta property="og:description" content="'+esc(description)+'">',
  '<meta property="og:url" content="'+esc(canonical)+'">',
  '<meta property="og:image" content="'+esc(image||OG_IMAGE)+'">',
  '<meta property="og:image:alt" content="'+esc(title)+'">',
  '<meta name="twitter:card" content="summary_large_image">',
  '<meta name="twitter:title" content="'+esc(title)+'">',
  '<meta name="twitter:description" content="'+esc(description)+'">',
  '<meta name="twitter:image" content="'+esc(image||OG_IMAGE)+'">',
  schema?'<script type="application/ld+json">'+schemaJson(schema)+'</script>':''
 ].filter(Boolean).join('');
}
function pageHtml(template,{canonical,title,description,body,type='website',image=OG_IMAGE,schema,robots}){
 let html=removeHeadSignals(template);
 html=replaceTitleDescription(html,title,description);
 html=setRoot(html,body);
 html=insertHead(html,seoHead({canonical,title,description,type,image,schema,robots}));
 return html;
}
function writeRoute(route,html){
 if(route==='/'){fs.writeFileSync(path.join(dist,'index.html'),html);return}
 const dir=path.join(dist,route.replace(/^\//,''));
 fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'index.html'),html);
}
function publicPhoto(pathname){
 const clean=String(pathname||'').replace(/^\/+/, '');
 return clean?base+'/storage/v1/object/public/canopy-profile-images/'+clean:OG_IMAGE;
}
function talentAwards(p){
 const a=[];
 if(p.badge)a.push(String(p.badge).charAt(0).toUpperCase()+String(p.badge).slice(1)+' WOMATE Verified badge');
 if(p.mission_completed)a.push('Verified climate mission completed');
 if(p.all_modules_completed)a.push('All She Leads learning modules completed');
 if(p.final_team_completed)a.push('Final Mission team');
 if(Number(p.spotlight_count)>0)a.push('WOMATE Canopy Spotlight');
 return a;
}
function talentDescription(p){
 const parts=[
  p.full_name,
  p.country,
  p.headline,
  Array.isArray(p.climate_interests)&&p.climate_interests.length?'Climate focus: '+p.climate_interests.slice(0,4).join(', '):''
 ].filter(Boolean);
 return parts.join(' · ').slice(0,158);
}
function talentBody(p,authored=[]){
 const topics=Array.isArray(p.climate_interests)?p.climate_interests.filter(Boolean):[];
 const awards=talentAwards(p);
 const badge=p.badge?String(p.badge).charAt(0).toUpperCase()+String(p.badge).slice(1):'';
 const focus=topics.length?topics.slice(0,5).join(', '):'climate leadership and community action';
 const about=esc(p.full_name)+' is a WOMATE Talent Discovery professional based in '+esc(p.country||'Africa')+'. '+esc(p.headline||'Climate leadership professional')+'. Their recorded climate focus includes '+esc(focus)+'.'+(badge?' WOMATE has verified this profile at the '+esc(badge)+' badge tier.':'');
 const mission=p.mission_name?'<section><h2>Verified climate mission</h2><p>'+esc(p.mission_name)+'</p></section>':'';
 const topicsHtml=topics.length?'<section><h2>Climate focus</h2><ul>'+topics.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></section>':'';
 const evidence=awards.length?'<section><h2>Verified WOMATE achievements</h2><ul>'+awards.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></section>':'';
 const pubs=authored.length?'<section><h2>Published on WOMATE</h2><ul>'+authored.map(x=>'<li><a href="/publications/'+esc(x.id)+'">'+esc(x.title)+'</a></li>').join('')+'</ul></section>':'';
 return '<main class="womate-seo-profile" style="font-family:system-ui,sans-serif;max-width:900px;margin:4rem auto;padding:0 24px;color:#073b39">'+
  '<nav aria-label="Breadcrumb"><a href="/">WOMATE</a> › <a href="/talent-discovery">Talent Discovery</a> › '+esc(p.full_name)+'</nav>'+
  '<article><header style="margin-top:42px"><img src="'+esc(publicPhoto(p.avatar_path))+'" alt="'+esc(p.full_name)+' profile photo" width="180" height="180" style="border-radius:24px;object-fit:cover"><p>WOMATE Talent Discovery · '+esc(p.country||'Africa')+'</p><h1>'+esc(p.full_name)+'</h1><p style="font-size:1.25rem;line-height:1.6">'+esc(p.headline||'Climate leadership professional')+'</p></header>'+
  '<section><h2>Professional profile</h2><p style="line-height:1.8">'+about+'</p></section>'+
  topicsHtml+mission+evidence+pubs+
  '<section><h2>WOMATE Talent Discovery</h2><p>This public professional profile is published for climate-sector discovery, collaboration and verification of recorded WOMATE programme achievements.</p></section>'+
  '</article></main>';
}
function articleType(kind){
 const k=String(kind||'').toLowerCase();
 if(/research|paper|study/.test(k))return 'ScholarlyArticle';
 if(/report/.test(k))return 'Report';
 return 'Article';
}
function publicationAuthorSchema(p,authorProfile){
 const name=String(p.name||'').trim();
 const isWomate=/^womate(?:\s+research\s+team)?$/i.test(name)||/^womate\b/i.test(name);
 if(isWomate)return {'@type':'Organization',name:name||'WOMATE',url:ORIGIN+'/'};
 return {'@type':'Person',name:name||'Author',...(authorProfile?{url:ORIGIN+'/talent/'+authorProfile.slug}:{})};
}
function articleBody(p,authorProfile){
 const full=paragraphs(p.article_text);
 const author=authorProfile?'<a href="/talent/'+esc(authorProfile.slug)+'">'+esc(p.name)+'</a>':esc(p.name);
 return '<main class="womate-seo-article" style="font-family:system-ui,sans-serif;max-width:860px;margin:4rem auto;padding:0 24px;color:#073b39">'+
  '<nav aria-label="Breadcrumb"><a href="/">WOMATE</a> › <a href="/publications">Publications</a> › '+esc(p.title)+'</nav>'+
  '<article><header style="margin-top:42px"><p>'+esc(p.kind||'Article')+' · '+esc((p.published_at||'').slice(0,10))+'</p><h1>'+esc(p.title)+'</h1><p>By '+author+(p.affiliation?' · '+esc(p.affiliation):'')+'</p></header>'+
  '<section><h2>Overview</h2>'+paragraphs(p.summary).map(x=>'<p style="line-height:1.8">'+esc(x)+'</p>').join('')+'</section>'+
  (full.length?'<section><h2>Full article</h2>'+full.map(x=>'<p style="line-height:1.9;white-space:pre-wrap">'+esc(x)+'</p>').join('')+'</section>':'')+
  '</article></main>';
}

const STATIC_PAGES=[
 ['/',"WOMATE | Women's Climate Leadership & Mentorship in Africa","WOMATE advances women's climate leadership across Africa through mentorship, practical climate action, research, advocacy and professional opportunities.",'Women leading climate action across Africa'],
 ['/voices-impact','Reflections & Experiences | WOMATE Voices of She Leads','Read 73 genuine participant evaluations from WOMATE She Leads Africa Cohort 2, covering climate leadership, confidence and practical learning.','Reflections & Experiences'],
 ['/she-leads','Climate Mentorship for Women in Africa | WOMATE She Leads','She Leads equips emerging women leaders with climate knowledge, leadership skills and practical pathways to credible climate action.','She Leads Climate Mentorship'],
 ['/she-leads/asia','She Leads Asia | Climate Leadership for Women | WOMATE','She Leads Asia connects women across Asia with practical climate leadership, regional evidence and action-focused learning.','She Leads Asia'],
 ['/wok-action',"WoK Action | Women's Climate Knowledge | WOMATE","WoK Action documents, protects and activates women's local climate knowledge for community resilience and adaptation.",'Women’s local knowledge for climate adaptation'],
 ['/circle','The WOMATE Circle | Climate Community for Women','A professional climate community connecting women to learning, opportunities, peer networks and long-term climate leadership.','The WOMATE Circle'],
 ['/research','Climate Research & Gender Intelligence | WOMATE','Explore WOMATE climate research, gender-responsive evidence and community-rooted insight for better climate decisions.','Climate research and evidence'],
 ['/resilient-minds','Resilient Minds | Climate, Wellbeing & Women | WOMATE','Resilient Minds connects climate resilience with mental health, care, restoration and dignity.','Climate resilience includes wellbeing'],
 ['/honours','Climate Honours Africa | Women Climate Leaders & Advocates | WOMATE','Meet women recognised through WOMATE Climate Honours for contributions to climate action, advocacy, sustainability and leadership across Africa.','Climate Honours'],
 ['/leadership','Leadership & Organisation | WOMATE','Meet the WOMATE leadership team and the organisation advancing women-led climate action, technology, research and community practice.','WOMATE leadership and organisation'],
 ['/funding','Climate Funding Readiness | WOMATE','WOMATE supports African women founders to strengthen climate funding applications, documentation and competitive positioning.','Climate funding readiness'],
 ['/womateer','Become a WOMATEER | Volunteer with WOMATE','Contribute professional skills to women-led climate action, research, technology and community impact.','Volunteer with WOMATE'],
 ['/merchandise','The Vault | WOMATE','Explore WOMATE merchandise created for the community advancing women-led climate action.','The WOMATE Vault'],
 ['/donate','Donate to WOMATE | Support Women in Climate','Support WOMATE programmes advancing women in climate leadership, research, technology and community action.','Support women-led climate leadership'],
 ['/courses','WOMATE Courses | Specialist Climate Learning','Explore WOMATE short, applied climate courses designed to build practical skills for climate action.','WOMATE climate courses'],
 ['/courses/climate-innovation-digital-growth','Climate Innovation & Digital Growth | WOMATE Courses','Build the foundations of a locally grounded climate initiative and learn how to communicate and grow it digitally.','Climate Innovation & Digital Growth'],
 ['/courses/gender-responsive-adaptation-finance','Gender-Responsive Climate Adaptation & Finance | WOMATE Courses','Understand local climate risks, gender-responsive adaptation and practical pathways to climate funding and policy influence.','Gender-Responsive Climate Adaptation & Finance'],
 ['/privacy','Privacy Policy | WOMATE','Read how WOMATE collects, uses and protects personal information.','Privacy Policy'],
 ['/terms','Terms of Service | WOMATE','Read the terms governing WOMATE websites, programmes and digital services.','Terms of Service']
];

async function fetchPublications(){
 const response=await fetch(base+'/functions/v1/womate-publications',{
  method:'POST',
  headers:{'Content-Type':'application/json',...(key?{apikey:key}: {})},
  body:JSON.stringify({action:'list'}),
  signal:AbortSignal.timeout(20000)
 });
 if(!response.ok)throw Error('Publications HTTP '+response.status);
 const data=await response.json();
 return (data.items||[]).filter(x=>validPublicationId(x.id));
}
async function fetchTalent(){
 if(!key)throw Error('VITE_CANOPY_SUPABASE_ANON_KEY is required to pre-render Talent Discovery');
 const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
 let after=null;
 const all=[];
 const seen=new Set();
 for(let pageNo=0;pageNo<200;pageNo++){
  const response=await fetch(base+'/rest/v1/rpc/canopy_public_talent_directory',{
   method:'POST',
   headers,
   body:JSON.stringify({p_after_slug:after,p_limit:48}),
   signal:AbortSignal.timeout(20000)
  });
  if(!response.ok)throw Error('Public talent directory HTTP '+response.status);
  const page=await response.json();
  const items=Array.isArray(page.items)?page.items:[];
  for(const p of items){
   if(p.slug&&validTalentSlug(p.slug)&&!seen.has(p.slug)){all.push(p);seen.add(p.slug)}
  }
  if(!page.has_more||!page.next_cursor||page.next_cursor===after)break;
  after=page.next_cursor;
 }
 if(!all.length)throw Error('Public Talent Discovery returned zero profiles');
 return all;
}
function makeCollectionBody(title,description,links){
 return '<main class="womate-seo-shell" style="font-family:Manrope,system-ui,sans-serif;width:min(1180px,100%);min-height:100vh;margin:0 auto;padding:clamp(44px,7vw,88px) clamp(24px,5vw,64px);box-sizing:border-box;color:#073b39;background:#fff">'+
  '<h1 style="max-width:1040px;margin:0 0 20px;font-size:clamp(52px,6vw,78px);line-height:.94;letter-spacing:-.055em;font-weight:800;text-wrap:balance">'+esc(title)+'</h1>'+
  '<p style="max-width:1080px;margin:0 0 18px;font-size:clamp(16px,1.6vw,19px);line-height:1.55;font-weight:500">'+esc(description)+'</p>'+
  '<div style="max-width:1080px;font-size:14px;line-height:1.5;font-weight:700">'+links+'</div>'+
  '</main>';
}
function sitemapLastmod(value){
 if(!value)return null;
 const d=new Date(value);
 return Number.isNaN(d.getTime())?null:d.toISOString().slice(0,10);
}
function normaliseSitemapItems(items){
 const byUrl=new Map();
 for(const raw of items){
  const item=typeof raw==='string'?{url:raw}:raw||{};
  if(!item.url)continue;
  const current=byUrl.get(item.url);
  const nextLastmod=sitemapLastmod(item.lastmod);
  if(!current||(!current.lastmod&&nextLastmod))byUrl.set(item.url,{url:item.url,lastmod:nextLastmod});
 }
 return [...byUrl.values()];
}
function writeUrlset(filename,items){
 const rows=normaliseSitemapItems(items).map(item=>{
  const lastmod=item.lastmod?'<lastmod>'+esc(item.lastmod)+'</lastmod>':'';
  return '  <url><loc>'+esc(item.url)+'</loc>'+lastmod+'</url>';
 }).join('\n');
 fs.writeFileSync(path.join(dist,filename),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+rows+'\n</urlset>\n');
}
function writeSitemapIndex(files){
 const rows=files.map(file=>'  <sitemap><loc>'+esc(ORIGIN+'/'+file)+'</loc></sitemap>').join('\n');
 fs.writeFileSync(path.join(dist,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+rows+'\n</sitemapindex>\n');
}
async function main(){
 if(!fs.existsSync(path.join(dist,'index.html')))throw Error('Vite output missing');
 if(production&&!key)throw Error('Production SEO build blocked: VITE_CANOPY_SUPABASE_ANON_KEY is missing.');

 const template=fs.readFileSync(path.join(dist,'index.html'),'utf8');

 // Deep production repair: Vite/Vercel may carry generated route directories from
 // the SEO stage into the final filesystem. Remove every primary React route
 // directory before generating dynamic SEO detail pages so filesystem routing
 // can never shadow the SPA shell.
 const reactOwnedRoutes=STATIC_PAGES.map(([route])=>route).filter(route=>route!=='/').concat(['/selected','/verify','/canopy']);
 for(const route of reactOwnedRoutes){
  const dir=path.join(dist,route.replace(/^\//,''));
  if(fs.existsSync(dir))fs.rmSync(dir,{recursive:true,force:true});
 }

 let publications=[],talent=[];
 try{publications=await fetchPublications()}catch(e){if(production)throw e;console.warn('[WOMATE SEO] '+e.message)}
 try{talent=await fetchTalent()}catch(e){if(production)throw e;console.warn('[WOMATE SEO] '+e.message)}

 const talentByName=new Map(talent.map(p=>[norm(p.full_name),p]));
 const pubsByAuthor=new Map();
 for(const p of publications){
  const k=norm(p.name);
  if(!pubsByAuthor.has(k))pubsByAuthor.set(k,[]);
  pubsByAuthor.get(k).push(p);
 }

 const sitemap=[],staticSitemap=[],talentSitemap=[],publicationSitemap=[];
 const websiteSchema={'@context':'https://schema.org','@type':'WebSite',name:'WOMATE',url:ORIGIN+'/'};
 for(const [route,title,description,h1] of STATIC_PAGES){
  const canonical=ORIGIN+(route==='/'?'':route);
  // React owns all primary application routes. Do not emit physical HTML
  // route files here: Vercel's filesystem routing would shadow the SPA and
  // serve the SEO shell instead of the real WOMATE UI (notably /selected).
  staticSitemap.push({url:canonical});
  sitemap.push({url:canonical});
 }

 // Fully static, human-readable HTML index so every approved Talent profile is
 // reachable by a simple anchor rather than requiring JS pagination/clicks.
 const grouped=new Map();
 for(const p of talent){
  const country=String(p.country||'Other locations').trim()||'Other locations';
  if(!grouped.has(country))grouped.set(country,[]);
  grouped.get(country).push(p);
 }
 const groupMarkup=[...grouped.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([country,people])=>
  '<section class="talent-country"><h2>'+esc(country)+' <small>'+people.length+'</small></h2><ul>'+people.sort((a,b)=>String(a.full_name).localeCompare(String(b.full_name))).map(p=>
  '<li><a href="/talent/'+encodeURIComponent(p.slug)+'"><strong>'+esc(p.full_name)+'</strong><span>'+esc(p.headline||'Climate leadership professional')+'</span><span class="arrow" aria-hidden="true">↗</span></a></li>'
  ).join('')+'</ul></section>'
 ).join('');
 const staticTalentIndex='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Browse All Climate Talent Profiles | WOMATE</title><meta name="description" content="Explore all publicly approved WOMATE Talent Discovery profiles by country. Meet women working across climate research, leadership, advocacy and sustainability."><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="'+ORIGIN+'/talent-profiles.html"><style>*,*:before,*:after{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#f6faf7;color:#073b39;font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.5}a{color:inherit}.sitebar{background:#073b39;color:#fff;padding:22px clamp(20px,5vw,85px);display:flex;align-items:center;justify-content:space-between;gap:18px}.sitebar a{text-decoration:none}.brand{font-weight:900;letter-spacing:.11em;font-size:1.3rem}.sitebar nav{display:flex;gap:24px;font-size:.88rem}.hero{background:#073b39;color:#fff;padding:clamp(50px,7vw,110px) clamp(20px,6vw,100px);display:grid;gap:18px}.eyebrow{color:#c6ff52;text-transform:uppercase;font-size:.72rem;letter-spacing:.15em;font-weight:800}h1{font-size:clamp(2.6rem,6vw,6rem);letter-spacing:-.06em;line-height:1.04;margin:0;max-width:850px}.hero p{max-width:680px;line-height:1.7;color:#d7e8e1;margin:0}.count{font-weight:800;color:#c6ff52}.directory{max-width:1320px;padding:clamp(40px,6vw,80px) 20px;margin:auto}.directory>p{max-width:750px;color:#52766b}.countries{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin-top:35px}.talent-country{padding:28px;background:#fff;border:1px solid #dbe8e0;border-radius:22px;min-width:0}.talent-country h2{font-size:1.32rem;margin:0 0 18px;display:flex;justify-content:space-between;gap:12px}.talent-country h2 small{font-size:.8rem;color:#53766c}.talent-country ul{list-style:none;margin:0;padding:0}.talent-country li+li{border-top:1px solid #e5eee8}.talent-country li a{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 10px;padding:13px 0;text-decoration:none}.talent-country li strong{font-size:.94rem}.talent-country li span:not(.arrow){grid-column:1;color:#618078;font-size:.78rem;line-height:1.4}.talent-country li .arrow{grid-column:2;grid-row:1/3;align-self:center;color:#527d69}.talent-country li a:hover strong,.talent-country li a:focus-visible strong{text-decoration:underline;text-underline-offset:3px}.footer{padding:28px 20px;text-align:center;background:#073b39;color:#dcece5;font-size:.8rem}@media(max-width:700px){.countries{grid-template-columns:1fr;gap:13px}.talent-country{padding:20px}.sitebar{padding:17px 20px}.sitebar nav{gap:13px;font-size:.75rem}.hero{padding:48px 20px 55px}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}</style><script type="application/ld+json">'+schemaJson({'@context':'https://schema.org','@type':'CollectionPage',name:'WOMATE Climate Talent Profiles',url:ORIGIN+'/talent-profiles.html',mainEntity:{'@type':'ItemList',numberOfItems:talent.length,itemListElement:talent.map((p,i)=>({'@type':'ListItem',position:i+1,url:ORIGIN+'/talent/'+p.slug,name:p.full_name}))}})+'</script></head><body><header class="sitebar"><a class="brand" href="/">WOMATE</a><nav aria-label="Primary"><a href="/talent-discovery">Talent Discovery</a><a href="/she-leads">She Leads</a></nav></header><main><section class="hero"><span class="eyebrow">Talent Discovery · Public directory</span><h1>Meet the women moving climate leadership forward.</h1><p>Explore '+talent.length+' approved public professional profiles. Browse by country or visit the interactive Talent Discovery directory to search by climate focus, verified achievements and collaboration availability.</p><p class="count">'+talent.length+' public profiles</p></section><div class="directory"><p>Profiles appear here only when available through WOMATE\'s public Talent Discovery directory. They are not automatic evidence of a specific qualification or employment status.</p><div class="countries">'+groupMarkup+'</div></div></main><footer class="footer">WOMATE · Women in Climate · <a href="/talent-discovery">Interactive Talent Discovery</a></footer></body></html>';
 fs.writeFileSync(path.join(dist,'talent-profiles.html'),staticTalentIndex);
 staticSitemap.push({url:ORIGIN+'/talent-profiles.html'});
 sitemap.push({url:ORIGIN+'/talent-profiles.html'});


 // Prerender the public Voices & Impact page with actual participant text.
 // A client-only SPA shell is not sufficient for reliable first-pass indexing.
 const publicVoices=JSON.parse(fs.readFileSync(path.join(root,'src/components/evaluationVoices2026.json'),'utf8'));
 if(publicVoices.length<50)throw Error('Voices SEO page must have at least 50 consented participant reflections');
 const voiceCards=publicVoices.map((v,i)=>'<article class="voice"><span class="loc">'+esc(v.country)+'</span><blockquote>'+esc(v.quote)+'</blockquote><p><strong>'+esc(v.name)+'</strong> · She Leads Africa participant</p></article>').join('');
 const voiceHtml=pageHtml(template,{
  canonical:ORIGIN+'/voices-impact',
  title:'Reflections & Experiences | WOMATE Voices of She Leads',
  description:'Read '+publicVoices.length+' first-hand participant reflections about the WOMATE She Leads Climate Mentorship programme in Africa.',
  body:'<main class="womate-voices-seo" style="font-family:system-ui,-apple-system,sans-serif;background:#f9fbf8;color:#073b39"><header style="padding:130px max(24px,6vw) 65px;background:#073b39;color:white"><h1 style="font-size:clamp(2.7rem,6vw,5.5rem);letter-spacing:-.05em;max-width:950px">Reflections &amp; Experiences.</h1><p>Personal reflections from women who joined the She Leads programme.</p></header><section style="padding:30px max(24px,6vw)"><h2>She Leads Africa · Cohort 2 evaluation</h2><p>4.72/5 average programme rating · 98% would recommend · 208 evaluation responses.</p></section><section style="max-width:1300px;margin:auto;padding:40px 24px"><h2>In their own words.</h2><div style="columns:3 260px;column-gap:22px">'+voiceCards+'</div><a href="/she-leads/apply">Explore application dates</a></section></main>',
  schema:{'@context':'https://schema.org','@type':'CollectionPage',name:'Reflections & Experiences — WOMATE',url:ORIGIN+'/voices-impact',description:'Participant evaluations and voices from WOMATE She Leads Africa 2026.',mainEntity:{'@type':'ItemList',numberOfItems:publicVoices.length,itemListElement:publicVoices.map((v,i)=>({'@type':'ListItem',position:i+1,name:v.name+' — '+v.country,description:v.quote}))}}
 });
 writeRoute('/voices-impact',voiceHtml);

 const talentList=talent.map(p=>'<li><a href="/talent/'+encodeURIComponent(p.slug)+'">'+esc(p.full_name)+'</a> — '+esc(p.country||'Africa')+(p.headline?' · '+esc(p.headline):'')+'</li>').join('');
 const talentDirectory=pageHtml(template,{
  canonical:ORIGIN+'/talent-discovery',
  title:'African Women Climate Leaders & Talent Directory | WOMATE',
  description:'Discover public professional profiles of women working in climate action, research, advocacy, sustainability and leadership through WOMATE Talent Discovery.',
  body:makeCollectionBody('WOMATE Talent Discovery','Discover public, WOMATE-approved climate talent and verified programme achievement.','<section><h2>Climate talent profiles</h2><ul>'+talentList+'</ul></section>'),
  schema:{'@context':'https://schema.org','@type':'CollectionPage',name:'WOMATE Talent Discovery',url:ORIGIN+'/talent-discovery',description:'Public professional profiles of WOMATE-approved climate talent.'}
 });
 // /talent-discovery is rendered by React; keep it in the sitemap without
 // generating a shadowing physical route.
 const talentDirectoryUrl=ORIGIN+'/talent-discovery';
 talentSitemap.push({url:talentDirectoryUrl});
 sitemap.push({url:talentDirectoryUrl});

 const publicationList=publications.map(p=>'<li><a href="/publications/'+encodeURIComponent(p.id)+'">'+esc(p.title)+'</a> — '+esc(p.name)+'</li>').join('');
 const publicationsDirectory=pageHtml(template,{
  canonical:ORIGIN+'/publications',
  title:'Climate Research, Leadership & Advocacy Publications | WOMATE',
  description:'Read WOMATE climate research, women-led climate action stories, community solutions, policy perspectives and original articles.',
  body:makeCollectionBody('WOMATE Publications','Research, analysis and perspectives advancing climate action.','<section><h2>Published work</h2><ul>'+publicationList+'</ul></section>'),
  schema:{'@context':'https://schema.org','@type':'CollectionPage',name:'WOMATE Publications',url:ORIGIN+'/publications'}
 });
 // /publications is rendered by React; keep it in the sitemap without
 // generating a shadowing physical route.
 const publicationsDirectoryUrl=ORIGIN+'/publications';
 publicationSitemap.push({url:publicationsDirectoryUrl});
 sitemap.push({url:publicationsDirectoryUrl});

 for(const p of talent){
  const canonical=ORIGIN+'/talent/'+encodeURIComponent(p.slug);
  const title=p.full_name+' | '+(p.headline||'Climate Leader')+' | WOMATE';
  const description=talentDescription(p);
  const authored=pubsByAuthor.get(norm(p.full_name))||[];
  const awards=talentAwards(p);
  const schema={
   '@context':'https://schema.org',
   '@type':'ProfilePage',
   url:canonical,
   name:p.full_name+' | WOMATE Talent Discovery',
   mainEntity:{
    '@type':'Person',
    name:p.full_name,
    url:canonical,
    image:publicPhoto(p.avatar_path),
    description:p.headline||undefined,
    homeLocation:p.country?{'@type':'Place',name:p.country}:undefined,
    knowsAbout:Array.isArray(p.climate_interests)?p.climate_interests:undefined,
    award:awards.length?awards:undefined,
    subjectOf:authored.map(a=>({'@type':'Article',headline:a.title,url:ORIGIN+'/publications/'+a.id}))
   },
   breadcrumb:{
    '@type':'BreadcrumbList',
    itemListElement:[
     {'@type':'ListItem',position:1,name:'WOMATE',item:ORIGIN+'/'},
     {'@type':'ListItem',position:2,name:'Talent Discovery',item:ORIGIN+'/talent-discovery'},
     {'@type':'ListItem',position:3,name:p.full_name,item:canonical}
    ]
   }
  };
  // Inline only the same fields already visible through the PUBLIC directory API.
  // This lets the React profile render its unique name, country, and focus on
  // the very first paint instead of replacing crawler-visible HTML with a spinner.
  const publicInitial={slug:p.slug,full_name:p.full_name,country:p.country,headline:p.headline,avatar_path:p.avatar_path,badge:p.badge,climate_interests:p.climate_interests,mission_name:p.mission_name,mission_completed:Boolean(p.mission_completed),all_modules_completed:Boolean(p.all_modules_completed),final_team_completed:Boolean(p.final_team_completed),spotlight_count:Number(p.spotlight_count)||0,collaboration_open:Boolean(p.collaboration_open)};
  let profileHtml=pageHtml(template,{canonical,title,description,body:talentBody(p,authored),type:'profile',image:publicPhoto(p.avatar_path),schema});
  profileHtml=insertHead(profileHtml,'<script id="womate-public-profile-data" type="application/json">'+schemaJson(publicInitial)+'</script>');
  writeRoute('/talent/'+p.slug,profileHtml);
  const talentMapItem={url:canonical,lastmod:p.talent_updated_at||null};
  talentSitemap.push(talentMapItem);
  sitemap.push(talentMapItem);
 }

 for(const p of publications){
  const canonical=ORIGIN+'/publications/'+encodeURIComponent(p.id);
  const authorProfile=talentByName.get(norm(p.name));
  const title=p.title+' | WOMATE Publications';
  const description=String(p.summary||'').replace(/\s+/g,' ').trim().slice(0,158)||('Read '+p.title+' by '+p.name+' on WOMATE.');
  const schema={
   '@context':'https://schema.org',
   '@type':articleType(p.kind),
   headline:p.title,
   description:p.summary||undefined,
   articleBody:p.article_text||undefined,
   author:publicationAuthorSchema(p,authorProfile),
   publisher:{'@type':'Organization',name:'WOMATE',url:ORIGIN+'/',logo:{'@type':'ImageObject',url:ORIGIN+'/assets/img/logo.svg'}},
   datePublished:p.published_at||undefined,
   dateModified:p.published_at||undefined,
   wordCount:String(p.article_text||'').trim()?String(p.article_text).trim().split(/\s+/).length:undefined,
   mainEntityOfPage:canonical,
   url:canonical,
   breadcrumb:{
    '@type':'BreadcrumbList',
    itemListElement:[
     {'@type':'ListItem',position:1,name:'WOMATE',item:ORIGIN+'/'},
     {'@type':'ListItem',position:2,name:'Publications',item:ORIGIN+'/publications'},
     {'@type':'ListItem',position:3,name:p.title,item:canonical}
    ]
   }
  };
  writeRoute('/publications/'+p.id,pageHtml(template,{canonical,title,description,body:articleBody(p,authorProfile),type:'article',schema}));
  const publicationMapItem={url:canonical,lastmod:p.published_at||null};
  publicationSitemap.push(publicationMapItem);
  sitemap.push(publicationMapItem);
 }

 writeUrlset('sitemap-static.xml',staticSitemap);
 writeUrlset('sitemap-talent.xml',talentSitemap);
 writeUrlset('sitemap-publications.xml',publicationSitemap);
 writeSitemapIndex(['sitemap-static.xml','sitemap-talent.xml','sitemap-publications.xml']);
 const manifest={generated_at:new Date().toISOString(),talent_profiles:talent.length,publications:publications.length,canonical_urls:normaliseSitemapItems(sitemap).length};
 fs.writeFileSync(path.join(dist,'seo-manifest.json'),JSON.stringify(manifest,null,2));
 console.log('[WOMATE SEO] Generated '+manifest.talent_profiles+' Talent profiles, '+manifest.publications+' publications and '+manifest.canonical_urls+' canonical sitemap URLs.');
}
main().catch(e=>{console.error('[WOMATE SEO] '+e.message);process.exitCode=1});
