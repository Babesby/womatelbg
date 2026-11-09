/* IndexNow notifications for WOMATE public URLs.
   Production postbuild reads the dedicated child sitemaps so Bing and other
   IndexNow participants receive canonical page URLs, not sitemap-index URLs. */
const fs=require('node:fs'),path=require('node:path');
const key='2b2f97ee650aaa0a50654117af0b75d5',host='www.womate.org';
const dist=path.resolve(__dirname,'../dist');
const sitemapFiles=['sitemap-static.xml','sitemap-talent.xml','sitemap-publications.xml'];
function clean(s){try{const u=new URL(s);return u.protocol==='https:'&&u.host===host&&!/\/(canopy|talent\/chat)(\/|$)/.test(u.pathname)?u.href:null}catch{return null}}
function xmlLocs(xml){return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1])}
async function main(){
 const direct=process.argv.slice(2).map(clean).filter(Boolean);
 const production=process.env.VERCEL_ENV==='production'||process.env.NODE_ENV==='production';
 if(!direct.length&&process.env.INDEXNOW_ENABLED!=='true'&&!production){console.log('IndexNow disabled outside production: set INDEXNOW_ENABLED=true or supply changed public URLs.');return}
 let urls=direct;
 if(!urls.length){
  urls=[];
  for(const file of sitemapFiles){
   const p=path.join(dist,file);
   if(!fs.existsSync(p))continue;
   urls.push(...xmlLocs(fs.readFileSync(p,'utf8')).map(clean).filter(Boolean));
  }
 }
 urls=[...new Set(urls)].slice(0,10000);
 if(!urls.length)return;
 const r=await fetch('https://api.indexnow.org/indexnow',{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify({host,key,keyLocation:'https://'+host+'/'+key+'.txt',urlList:urls}),signal:AbortSignal.timeout(15000)});
 if(![200,202].includes(r.status))throw Error('IndexNow responded '+r.status+': '+(await r.text()).slice(0,300));
 console.log('IndexNow notified about '+urls.length+' public canonical URLs (HTTP '+r.status+'). This is not an indexing guarantee.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
