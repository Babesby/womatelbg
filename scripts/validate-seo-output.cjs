const fs=require('node:fs');
const path=require('node:path');
const dist=path.resolve(__dirname,'../dist');
const manifestPath=path.join(dist,'seo-manifest.json');
const sitemapIndexPath=path.join(dist,'sitemap.xml');
const childSitemaps=['sitemap-static.xml','sitemap-talent.xml','sitemap-publications.xml'];

function fail(msg){throw new Error('[WOMATE SEO validation] '+msg)}
function htmlFiles(dir,out=[]){
 for(const name of fs.readdirSync(dir)){
  const p=path.join(dir,name),st=fs.statSync(p);
  if(st.isDirectory())htmlFiles(p,out);
  else if(name==='index.html')out.push(p);
 }
 return out;
}
function xmlLocs(xml){return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1])}

if(!fs.existsSync(manifestPath))fail('seo-manifest.json is missing');
if(!fs.existsSync(sitemapIndexPath))fail('sitemap.xml is missing');
for(const file of childSitemaps)if(!fs.existsSync(path.join(dist,file)))fail(file+' is missing');

const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
if(!Number.isInteger(manifest.talent_profiles)||manifest.talent_profiles<1)fail('no Talent Discovery profiles were generated');
if(!Number.isInteger(manifest.publications)||manifest.publications<1)fail('no approved publication pages were generated');

const sitemapIndex=fs.readFileSync(sitemapIndexPath,'utf8');
if(!/<sitemapindex[ >]/i.test(sitemapIndex))fail('sitemap.xml must be a sitemap index');
const indexLocs=xmlLocs(sitemapIndex);
const expectedIndex=childSitemaps.map(x=>'https://www.womate.org/'+x);
if(indexLocs.length!==expectedIndex.length||expectedIndex.some(x=>!indexLocs.includes(x)))fail('sitemap index does not reference the expected child sitemaps');

const childUrls={};
const allUrls=[];
for(const file of childSitemaps){
 const xml=fs.readFileSync(path.join(dist,file),'utf8');
 if(!/<urlset[ >]/i.test(xml))fail(file+' must be a URL set');
 const urls=xmlLocs(xml);
 if(new Set(urls).size!==urls.length)fail(file+' contains duplicate URLs');
 childUrls[file]=urls;
 allUrls.push(...urls);
}
if(new Set(allUrls).size!==allUrls.length)fail('canonical URL appears in more than one child sitemap');
if(allUrls.length!==manifest.canonical_urls)fail('combined child sitemap URL count does not match SEO manifest');

if(childUrls['sitemap-talent.xml'].length!==manifest.talent_profiles+1)fail('Talent sitemap must include the Talent Discovery hub plus every public profile');
if(!childUrls['sitemap-talent.xml'].includes('https://www.womate.org/talent-discovery'))fail('Talent Discovery hub missing from Talent sitemap');
if(childUrls['sitemap-publications.xml'].length!==manifest.publications+1)fail('Publications sitemap must include the Publications hub plus every approved publication');
if(!childUrls['sitemap-publications.xml'].includes('https://www.womate.org/publications'))fail('Publications hub missing from Publications sitemap');

const allProfilesIndex=path.join(dist,'talent-profiles.html');
if(!fs.existsSync(allProfilesIndex))fail('complete public Talent Discovery index is missing');
const allProfilesHtml=fs.readFileSync(allProfilesIndex,'utf8');
const allProfilesLinks=[...allProfilesHtml.matchAll(/<a\s+href="(\/talent\/[^"]+)"/g)].map(m=>m[1]);
if(allProfilesLinks.length!==manifest.talent_profiles||new Set(allProfilesLinks).size!==manifest.talent_profiles)fail('all-profiles index must link exactly once to every public Talent profile');
if(!allProfilesHtml.includes('<link rel="canonical" href="https://www.womate.org/talent-profiles.html">'))fail('all-profile index missing canonical');
if(!childUrls['sitemap-static.xml'].includes('https://www.womate.org/talent-profiles.html'))fail('all-profile index missing from static sitemap');

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

console.log('[WOMATE SEO validation] PASS — '+manifest.talent_profiles+' talent profiles, '+manifest.publications+' publications, '+manifest.canonical_urls+' canonical URLs across dedicated sitemaps.');
