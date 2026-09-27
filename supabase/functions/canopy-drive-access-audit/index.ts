const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS'
};

function json(body:unknown,status=200){
  return new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'}});
}

function driveTarget(raw:string){
  const url=new URL(raw);
  const host=url.hostname.toLowerCase();
  if(host!=='drive.google.com'&&host!=='docs.google.com')throw new Error('Only Google Drive or Google Docs links can be checked.');
  let id='';
  const path=url.pathname;
  const pathMatch=path.match(/\/(?:file|document|presentation|spreadsheets|forms)\/d\/([A-Za-z0-9_-]+)/i);
  if(pathMatch)id=pathMatch[1];
  if(!id)id=url.searchParams.get('id')||'';
  if(!id)throw new Error('Could not read the Google Drive file ID.');
  if(/\/document\/d\//i.test(path))return {id,probe:`https://docs.google.com/document/d/${id}/export?format=pdf`};
  if(/\/presentation\/d\//i.test(path))return {id,probe:`https://docs.google.com/presentation/d/${id}/export/pdf`};
  if(/\/spreadsheets\/d\//i.test(path))return {id,probe:`https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`};
  return {id,probe:`https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`};
}

async function classify(raw:string){
  const {id,probe}=driveTarget(raw);
  const response=await fetch(probe,{redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 WOMATE-Canopy-Access-Check/1.0','Accept':'*/*'}});
  const contentType=(response.headers.get('content-type')||'').toLowerCase();
  const finalUrl=response.url||probe;
  if(response.status===401||response.status===403)return {status:'restricted',file_id:id,reason:`Google returned ${response.status}.`};
  if(finalUrl.includes('accounts.google.com'))return {status:'restricted',file_id:id,reason:'Google requires sign-in.'};
  if(!response.ok)return {status:'unknown',file_id:id,reason:`Google returned ${response.status}.`};
  if(!contentType.includes('text/html')&&!contentType.includes('text/plain'))return {status:'public',file_id:id,reason:'Anonymous download/export succeeded.'};
  const text=(await response.text()).slice(0,240000).toLowerCase();
  const restrictedMarkers=[
    'request access','you need access','you need permission','access denied',
    'permission required','ask for access','sign in to continue to google drive',
    'sign in to continue to google docs','you don\'t have access'
  ];
  if(restrictedMarkers.some(marker=>text.includes(marker)))return {status:'restricted',file_id:id,reason:'Google displayed an access-permission screen.'};
  const publicMarkers=['download-form','download_warning','virus scan warning','drive.usercontent.google.com'];
  if(publicMarkers.some(marker=>text.includes(marker)||finalUrl.includes(marker)))return {status:'public',file_id:id,reason:'Google exposed an anonymous download flow.'};
  return {status:'unknown',file_id:id,reason:'The link response was ambiguous, so Canopy left the submission unchanged.'};
}

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return json({error:'Method not allowed.'},405);
  const auth=req.headers.get('authorization')||'';
  if(!auth.toLowerCase().startsWith('bearer '))return json({error:'Sign in to Canopy first.'},401);
  try{
    const body=await req.json();
    const raw=String(body?.url||'').trim();
    if(!raw)return json({error:'A Google Drive link is required.'},400);
    return json(await classify(raw));
  }catch(error){
    const message=error instanceof Error?error.message:'Drive access check failed.';
    return json({status:'unknown',reason:message},400);
  }
});
