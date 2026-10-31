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
async function main(){
if(!fs.existsSync(path.join(dist,'index.html')))throw Error('Vite output missing');
if(!base){console.warn('[WOMATE SEO] Supabase URL missing; article pre-rendering skipped.');return}
const res=await fetch(base+'/functions/v1/womate-publications',{method:'POST',headers:{'Content-Type':'application/json',...(key?{apikey:key}:{})},body:JSON.stringify({action:'list'}),signal:AbortSignal.timeout(15000)});
if(!res.ok)throw Error('Publications public endpoint returned HTTP '+res.status);
const data=await res.json(),items=(data.items||[]).filter(x=>valid(x.id));
const template=fs.readFileSync(path.join(dist,'index.html'),'utf8');
for(const p of items){const canon='https://www.womate.org/publications/'+p.id;let html=template.replace(/<title>[^<]*<\/title>/,'<title>'+esc(p.title)+' | WOMATE Publications</title>').replace(/<meta[\s\S]*?name="description"[\s\S]*?\/>/,'<meta name="description" content="'+esc(String(p.summary||'').slice(0,155))+'">');
html=html.replace('<div id="root"></div>','<div id="root">'+bodyMarkup(p)+'</div>');
const schema=JSON.stringify({'@context':'https://schema.org','@type':'Article',headline:p.title,description:p.summary,author:{'@type':'Person',name:p.name},publisher:{'@type':'Organization',name:'WOMATE'},datePublished:p.published_at,url:canon}).replace(/</g,'\\u003c');
html=insertMeta(html,'<link rel="canonical" href="'+canon+'"><meta property="og:type" content="article"><meta property="og:title" content="'+esc(p.title)+'"><meta property="og:url" content="'+canon+'"><script type="application/ld+json">'+schema+'</script>');
const dir=path.join(dist,'publications',p.id);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'index.html'),html);
}
const sitemap=path.join(dist,'sitemap.xml');let xml=fs.existsSync(sitemap)?fs.readFileSync(sitemap,'utf8'):'<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';
xml=xml.replace('</urlset>',items.map(x=>'  <url><loc>https://www.womate.org/publications/'+x.id+'</loc></url>').join('\n')+'\n</urlset>');
fs.writeFileSync(sitemap,xml);
console.log('[WOMATE SEO] Generated '+items.length+' approved HTML article pages and sitemap links.');
}
main().catch(e=>{console.error('[WOMATE SEO] Pre-render unavailable: '+e.message);process.exitCode=1});
