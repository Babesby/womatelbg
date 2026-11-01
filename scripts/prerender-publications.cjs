/* Build public, approved WOMATE publications as crawlable HTML pages.
 * Only the approved public endpoint is used. No private submission data is exported.
 * When the deployment lacks Supabase configuration, the build stays functional
 * but warns that pre-rendering did not run.
 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist');
const base=(process.env.VITE_CANOPY_SUPABASE_URL||process.env.CANOPY_SUPABASE_URL||'').replace(/[/]+$/,'');
const key=process.env.VITE_CANOPY_SUPABASE_ANON_KEY||'';
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const valid=id=>/^[a-f0-9-]{36}$/i.test(String(id));
function insertMeta(html,tag){return html.replace('</head>',tag+'\n</head>')}
function bodyMarkup(p){const lines=String(p.article_text||'').trim().split(/\n\s*\n/).filter(Boolean);
return '<main style="font-family:system-ui,sans-serif;max-width:820px;margin:5rem auto;padding:0 24px;color:#073b39"><a href="/publications">WOMATE Publications</a><p style="margin-top:48px;font-size:14px">'+esc(p.kind||'Article')+' · '+esc((p.published_at||'').slice(0,10))+'</p><h1 style="font-size:clamp(32px,5vw,58px);line-height:1.1">'+esc(p.title)+'</h1><p>By '+esc(p.name)+'</p><h2>Abstract</h2><p style="line-height:1.8">'+esc(p.summary)+'</p>'+(lines.length?'<h2>Full article</h2>'+lines.map(t=>'<p style="line-height:1.9;white-space:pre-wrap">'+esc(t)+'</p>').join(''):'<p>Explore the original publication in the interactive reader.</p>')+'</main>'}

async function talentPages(template){
 if(!key){console.warn('[WOMATE SEO] Public talent pre-render skipped: missing anon key.');return []}
 const head={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
 let after=null;const all=[];const seen=new Set();
 for(let i=0;i<100;i++){
  const response=await fetch(base+'/rest/v1/rpc/canopy_public_talent_directory',{method:'POST',headers:head,body:JSON.stringify({p_after_slug:after,p_limit:48}),signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('Public talent directory HTTP '+response.status);
  const page=await response.json();const items=Array.isArray(page.items)?page.items:[];
  for(const p of items)if(p.slug&&/^[a-z0-9-]{2,160}$/i.test(p.slug)&&!seen.has(p.slug)){all.push(p);seen.add(p.slug)}
  if(!page.has_more||!page.next_cursor||page.next_cursor===after)break;
  after=page.next_cursor;
 }
 for(const p of all){
  const canonical='https://www.womate.org/talent/'+encodeURIComponent(p.slug);
  const title=String(p.full_name||'WOMATE Climate Talent')+' | '+String(p.headline||'Climate Leadership')+' | WOMATE';
  const description=[p.full_name,p.country,p.headline].filter(Boolean).join(' · ').slice(0,160);
  const topics=Array.isArray(p.climate_interests)?p.climate_interests:[];
  const profile='<main style="font-family:system-ui,sans-serif;max-width:860px;margin:5rem auto;padding:0 24px;color:#073b39"><a href="/talent-discovery">WOMATE Talent Discovery</a><h1>'+esc(p.full_name)+'</h1><p>'+esc(p.country||'Africa')+'</p><h2>'+esc(p.headline||'Climate leadership professional')+'</h2><p>Climate interests: '+esc(topics.join(', '))+'</p><p>Explore this publicly approved WOMATE talent profile for collaboration and professional opportunities.</p></main>';
  let html=template.replace(/<title>[^<]*<\/title>/,'<title>'+esc(title)+'</title>').replace(/<meta[^>]*name="description"[^>]*>/,'<meta name="description" content="'+esc(description)+'">');
  html=html.replace('<div id="root"></div>','<div id="root">'+profile+'</div>');
  const schema=JSON.stringify({'@context':'https://schema.org','@type':'ProfilePage',mainEntity:{'@type':'Person',name:p.full_name,description:p.headline||'',knowsAbout:topics,homeLocation:p.country?{'@type':'Place',name:p.country}:undefined},url:canonical}).replace(/</g,'\\u003c');
  html=insertMeta(html,'<link rel="canonical" href="'+canonical+'"><meta property="og:type" content="profile"><meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(description)+'"><meta property="og:url" content="'+canonical+'"><script type="application/ld+json">'+schema+'</script>');
  const dir=path.join(dist,'talent',p.slug);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'index.html'),html);
 }
 return all.map(p=>'https://www.womate.org/talent/'+encodeURIComponent(p.slug));
}


function staticLandingPages(template){
 const pages=[
  ['/','WOMATE | Women’s Climate Leadership & Mentorship in Africa',"WOMATE advances women's climate leadership across Africa through mentorship, practical climate action, research and advocacy.",'Women leading climate action across Africa'],
  ['/she-leads','Climate Mentorship for Women in Africa | WOMATE She Leads','Explore WOMATE She Leads climate mentorship, leadership development and professional opportunities for emerging African women.','Climate mentorship and leadership for women in Africa'],
  ['/honours','Climate Honours Africa | Women Climate Leaders & Advocates | WOMATE','Meet women recognised through WOMATE Climate Honours for contributions to climate action, advocacy, sustainability and leadership across Africa.','Climate Honours: Celebrating women leading climate action'],
  ['/talent-discovery','African Women Climate Leaders & Talent Directory | WOMATE','Discover public professional profiles of African women working in climate action, research, advocacy, sustainability and leadership.','Discover African women climate leaders'],
  ['/publications','Climate Research, Leadership & Advocacy Publications | WOMATE','Explore WOMATE research, climate action reports, policy perspectives and original articles by women climate leaders.','Climate research and publications'],
  ['/research','Climate Research and Evidence in Africa | WOMATE','Explore WOMATE research and evidence on climate adaptation, community leadership and women-led climate solutions.','Climate research informed by communities'],
  ['/wok-action','Women’s Climate Knowledge and Community Action | WOMATE','WoK Action documents local climate knowledge and community-led adaptation across Africa.','Women’s local wisdom for climate action']
 ];
 for(const [route,title,description,h1] of pages){
  const canonical='https://www.womate.org'+(route==='/'?'':route);
  let html=template.replace(/<title>[^<]*<\/title>/,'<title>'+esc(title)+'</title>').replace(/<meta[^>]*name="description"[^>]*>/,'<meta name="description" content="'+esc(description)+'">');
  html=html.replace('<div id="root"></div>','<div id="root"><main class="womate-seo-shell" style="font-family:system-ui,sans-serif;padding:7rem 5vw;color:#073b39"><h1>'+esc(h1)+'</h1><p>'+esc(description)+'</p><nav><a href="/she-leads">She Leads</a> · <a href="/talent-discovery">Talent Discovery</a> · <a href="/honours">Climate Honours</a> · <a href="/publications">Publications</a></nav></main></div>');
  const schema=JSON.stringify({'@context':'https://schema.org','@type':route==='/honours'?'WebPage':'WebPage',name:title,description,url:canonical,isPartOf:{'@type':'WebSite',name:'WOMATE',url:'https://www.womate.org/'}}).replace(/</g,'\\u003c');
  html=insertMeta(html,'<link rel="canonical" href="'+canonical+'"><meta property="og:url" content="'+canonical+'"><meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(description)+'"><script type="application/ld+json">'+schema+'</script>');
  if(route==='/')fs.writeFileSync(path.join(dist,'index.html'),html);
  else{const d=path.join(dist,route.slice(1));fs.mkdirSync(d,{recursive:true});fs.writeFileSync(path.join(d,'index.html'),html)}
 }
 return pages.length;
}

async function main(){
if(!fs.existsSync(path.join(dist,'index.html')))throw Error('Vite output missing');
const template=fs.readFileSync(path.join(dist,'index.html'),'utf8');
staticLandingPages(template);
if(!base){console.warn('[WOMATE SEO] Supabase URL missing; dynamic article and profile generation skipped.');return}
let items=[];
try{
 const res=await fetch(base+'/functions/v1/womate-publications',{method:'POST',headers:{'Content-Type':'application/json',...(key?{apikey:key}:{})},body:JSON.stringify({action:'list'}),signal:AbortSignal.timeout(15000)});
 if(!res.ok)throw Error('Publications HTTP '+res.status);
 const data=await res.json();items=(data.items||[]).filter(x=>valid(x.id));
}catch(e){console.warn('[WOMATE SEO] Publication source unavailable: '+e.message)}
for(const p of items){const canon='https://www.womate.org/publications/'+p.id;let html=template.replace(/<title>[^<]*<\/title>/,'<title>'+esc(p.title)+' | WOMATE Publications</title>').replace(/<meta[^>]*name="description"[^>]*>/,'<meta name="description" content="'+esc(String(p.summary||'').slice(0,155))+'">');
html=html.replace('<div id="root"></div>','<div id="root">'+bodyMarkup(p)+'</div>');
const schema=JSON.stringify({'@context':'https://schema.org','@type':'Article',headline:p.title,description:p.summary,author:{'@type':'Person',name:p.name},publisher:{'@type':'Organization',name:'WOMATE'},datePublished:p.published_at,url:canon}).replace(/</g,'\\u003c');
html=insertMeta(html,'<link rel="canonical" href="'+canon+'"><meta property="og:type" content="article"><meta property="og:title" content="'+esc(p.title)+'"><meta property="og:url" content="'+canon+'"><script type="application/ld+json">'+schema+'</script>');
const dir=path.join(dist,'publications',p.id);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'index.html'),html);
}
let talentUrls=[];try{talentUrls=await talentPages(template)}catch(e){console.warn('[WOMATE SEO] Public talent source unavailable: '+e.message)}
const sitemap=path.join(dist,'sitemap.xml');let xml=fs.existsSync(sitemap)?fs.readFileSync(sitemap,'utf8'):'<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';
xml=xml.replace('</urlset>',[...items.map(x=>'https://www.womate.org/publications/'+x.id),...talentUrls].map(u=>'  <url><loc>'+esc(u)+'</loc></url>').join('\n')+'\n</urlset>');
fs.writeFileSync(sitemap,xml);
console.log('[WOMATE SEO] Generated '+items.length+' approved articles and '+talentUrls.length+' opt-in public talent profiles with sitemap links.');
}
main().catch(e=>{console.error('[WOMATE SEO] Pre-render unavailable: '+e.message);process.exitCode=1});
