// Proxy only WOMATE's explicitly approved, public publication PDFs.
// Never accept arbitrary URLs or Drive file IDs from callers.
const DOCUMENTS={
 '11d54cf7-c631-40a9-8dd2-c84de5fd0cf3':'1OHVyYva8ppOxfjAyaKQM4l11qezGAzhw',
 '5c3f3243-b343-4022-81f8-7f761578fc8f':'1KLLoSF7I8VRTPkbBlbcdAipmG7pHRLrG'
};
module.exports=async function handler(req,res){
 const id=typeof req.query?.id==='string'?req.query.id:'';
 if(req.method!=='GET'){res.status(405).end();return}
 const file=DOCUMENTS[id];if(!file){res.status(404).end();return}
 try{
  let upstream=null;
  const candidates=['https://drive.usercontent.google.com/download?id='+encodeURIComponent(file)+'&export=download&confirm=t','https://drive.google.com/uc?export=download&id='+encodeURIComponent(file)];
  for(const url of candidates){const attempt=await fetch(url,{redirect:'follow',headers:{'User-Agent':'Mozilla/5.0'}});if(attempt.ok&&(attempt.headers.get('content-type')||'').includes('pdf')){upstream=attempt;break}}
  if(!upstream){res.status(502).json({error:'Original PDF could not be fetched. Open the linked Drive document instead.'});return}
  const data=Buffer.from(await upstream.arrayBuffer());
  if(data.length>16*1024*1024||data.subarray(0,5).toString()!=='%PDF-'){res.status(502).end();return}
  res.setHeader('Content-Type','application/pdf');
  res.setHeader('Content-Length',data.length);
  res.setHeader('Cache-Control','public, max-age=3600, s-maxage=86400');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.status(200).end(data);
 }catch(e){res.status(502).json({error:'Document temporarily unavailable.'})}
};
