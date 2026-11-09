const fs=require('node:fs');
const path=require('node:path');
const dist=path.resolve(__dirname,'../dist');
const manifestPath=path.join(dist,'seo-manifest.json');
const sitemapPath=path.join(dist,'sitemap.xml');

function fail(msg){throw new Error('[WOMATE SEO validation] '+msg)}
function htmlFiles(dir,out=[]){
 for(const name of fs.readdirSync(dir)){
  const p=path.join(dir,name),st=fs.statSync(p);
  if(st.isDirectory())htmlFiles(p,out);
  else if(name==='index.html')out.push(p);
 }
 return out;
}
if(!fs.existsSync(manifestPath))fail('seo-manifest.json is missing');
if(!fs.existsSync(sitemapPath))fail('sitemap.xml is missing');

const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
if(!Number.isInteger(manifest.talent_profiles)||manifest.talent_profiles<1)fail('no Talent Discovery profiles were generated');
if(!Number.isInteger(manifest.publications)||manifest.publications<1)fail('no approved publication pages were generated');

const sitemap=fs.readFileSync(sitemapPath,'utf8');
const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]);
if(new Set(urls).size!==urls.length)fail('sitemap contains duplicate URLs');
if(urls.length!==manifest.canonical_urls)fail('sitemap URL count does not match SEO manifest');

const talentFiles=htmlFiles(path.join(dist,'talent'));
if(talentFiles.length!==manifest.talent_profiles)fail('generated Talent profile file count does not match source count');

const publicationDir=path.join(dist,'publications');
const publicationFiles=fs.readdirSync(publicationDir,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>path.join(publicationDir,x.name,'index.html')).filter(fs.existsSync);
if(publicationFiles.length!==manifest.publications)fail('generated publication file count does not match source count');

const canonicalSeen=new Set();
for(const file of [...talentFiles,...publicationFiles]){
 const html=fs.readFileSync(file,'utf8');
 const canon=[...html.matchAll(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/gi)].map(x=>x[1]);
 if(canon.length!==1)fail(path.relative(dist,file)+' must contain exactly one canonical; found '+canon.length);
 if(canonicalSeen.has(canon[0]))fail('duplicate canonical across generated pages: '+canon[0]);
 canonicalSeen.add(canon[0]);
 if(!html.includes('name="robots" content="index,follow'))fail(path.relative(dist,file)+' is missing index/follow robots metadata');
 if(!/<h1[ >]/i.test(html))fail(path.relative(dist,file)+' is missing an H1');
 if(!/<script[^>]+application\/ld\+json/i.test(html))fail(path.relative(dist,file)+' is missing structured data');
}

console.log('[WOMATE SEO validation] PASS — '+manifest.talent_profiles+' talent profiles, '+manifest.publications+' publications, '+manifest.canonical_urls+' sitemap URLs.');
