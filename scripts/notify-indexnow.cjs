/* IndexNow notifications for WOMATE public URLs.
   Use: node scripts/notify-indexnow.cjs https://www.womate.org/honours [additional URLs]
   Production postbuild may call this when INDEXNOW_ENABLED=true.
   Only public, canonical URLs under www.womate.org are submitted. */
const fs=require('node:fs'),path=require('node:path');
const key='2b2f97ee650aaa0a50654117af0b75d5',host='www.womate.org';
const sitemap=path.resolve(__dirname,'../dist/sitemap.xml');
function clean(s){try{const u=new URL(s);return u.protocol==='https:'&&u.host===host&&!/\/(canopy|talent\/chat)(\/|$)/.test(u.pathname)?u.href:null}catch{return null}}
async function main(){
 const direct=process.argv.slice(2).map(clean).filter(Boolean);
 if(!direct.length&&process.env.INDEXNOW_ENABLED!=='true'){console.log('IndexNow disabled: set INDEXNOW_ENABLED=true or supply changed public URLs.');return}
 let urls=direct;
 if(!urls.length&&fs.existsSync(sitemap)){const xml=fs.readFileSync(sitemap,'utf8');urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>clean(x[1])).filter(Boolean)}
 urls=[...new Set(urls)].slice(0,10000);if(!urls.length)return;
 const r=await fetch('https://api.indexnow.org/indexnow',{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify({host,key,keyLocation:'https://'+host+'/'+key+'.txt',urlList:urls}),signal:AbortSignal.timeout(15000)});
 if(![200,202].includes(r.status))throw Error('IndexNow responded '+r.status+': '+(await r.text()).slice(0,300));
 console.log('IndexNow notified about '+urls.length+' public URLs (HTTP '+r.status+'). This is not an indexing guarantee.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
