// Public WOMATE publications API. Deploy with --no-verify-jwt; all private actions
// are authenticated here using a short-lived HMAC token and server-side code.
const URL=Deno.env.get('SUPABASE_URL')||'';
const SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const ADMIN_CODE=Deno.env.get('PUBLICATIONS_ADMIN_CODE')||'';
const SIGNING=Deno.env.get('PUBLICATIONS_SIGNING_SECRET')||'';
const ALLOWED=[...new Set([...(Deno.env.get('PUBLICATIONS_ALLOWED_ORIGIN')||'').split(',').map(x=>x.trim()).filter(Boolean),'https://www.womate.org','https://womate.org'])];
const REVIEWERS=['Ruby Damenshie Brown','Asaa','Phillipa Aidoo','Hamza Abubakar'];
const TYPES=['Research paper','Article','Policy brief','Case study','Position paper','Editorial','Annual report','Blog','Perspective','Other'];
const enc=new TextEncoder();
function cors(origin:string){return {'Access-Control-Allow-Origin':ALLOWED.includes(origin)?origin:ALLOWED[0],'Vary':'Origin','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};}
function out(body:unknown,status=200,origin=''){return new Response(JSON.stringify(body),{status,headers:{...cors(origin),'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
function s(v:unknown,max:number){return typeof v==='string'?v.trim().slice(0,max+1):'';}
function b64(bytes:Uint8Array){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
async function sha(v:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(v)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function mac(signed:string){const key=await crypto.subtle.importKey('raw',enc.encode(SIGNING),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(signed))));}
function equal(a:string,b:string){const x=enc.encode(a),y=enc.encode(b);let diff=x.length^y.length;for(let i=0;i<Math.max(x.length,y.length);i++)diff|=(x[i]||0)^(y[i]||0);return diff===0;}
async function authorized(req:Request){const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');const [payload,sig,extra]=token.split('.');if(!payload||!sig||extra||!equal(sig,await mac(payload)))return '';try{const data=JSON.parse(atob(payload.replace(/-/g,'+').replace(/_/g,'/')));if(data.exp<Date.now()||!REVIEWERS.includes(data.name))return '';return data.name;}catch{return '';}}
async function db(path:string,method='GET',body?:unknown){const response=await fetch(`${URL}/rest/v1/${path}`,{method,headers:{apikey:SERVICE,Authorization:`Bearer ${SERVICE}`,'Content-Type':'application/json',Prefer:'return=representation'},...(body===undefined?{}:{body:JSON.stringify(body)})});const json=await response.json().catch(()=>null);if(!response.ok){console.error('Publication database error',response.status,JSON.stringify(json).slice(0,400));throw new Error('Publication database request failed (HTTP '+response.status+', code '+String(json?.code||'unknown')+').');}return json;}
async function allowed(req:Request,action:'submit'|'submit_v2'|'login',max:number,mins:number){const ip=(req.headers.get('x-forwarded-for')||'').split(',')[0].trim()||req.headers.get('cf-connecting-ip')||'unknown';const key=await sha(ip+SIGNING);const data=await db('rpc/womate_publication_allow','POST',{p_key:key,p_action:action,p_max:max,p_window_minutes:mins});return data===true;}
function cleanText(v:unknown,max:number){return s(v,max).replace(/[\u200B-\u200D\uFEFF]/g,'').trim();}
function cleanPublicationReference(v:unknown){
 return cleanText(v,1500);
}
function canonicalKind(v:unknown){const raw=cleanText(v,40).toLowerCase();return TYPES.find(x=>x.toLowerCase()===raw)||'';}
Deno.serve(async(req)=>{
 const origin=req.headers.get('origin')||'';
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
 if(req.method!=='POST')return out({error:'Method not allowed.'},405,origin);
 if(origin&&!ALLOWED.includes(origin))return out({error:'Origin not allowed.'},403,origin);
 if(!URL||!SERVICE||!ADMIN_CODE||!SIGNING||!/^\d{4}$/.test(ADMIN_CODE)||SIGNING.length<32)return out({error:'Publication service is not configured.'},503,origin);
 if(Number(req.headers.get('content-length')||0)>13000)return out({error:'Submission is too large.'},413,origin);
 let input:Record<string,any>;
 try{input=await req.json();}catch{return out({error:'Invalid request.'},400,origin);}
 try{
 switch(input.action){
 case 'list':{
  const rows=await db('womate_publications?select=id,name,affiliation,title,kind,summary,document_url,published_at&status=eq.approved&order=published_at.desc&limit=60');return out({items:rows},200,origin);
 }
 case 'submit':{
  const e=input.entry||{};
  const name=cleanText(e.name,120),email=cleanText(e.email,200).toLowerCase(),phone=cleanText(e.phone,40),country=cleanText(e.country,100),affiliation=cleanText(e.affiliation,160),title=cleanText(e.title,180),kind=canonicalKind(e.kind),summary=cleanText(e.summary,2500),document_url=cleanPublicationReference(e.document_url);
  if(name.length<2||name.length>120)return out({error:'Please enter your full name.'},400,origin);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return out({error:'Please enter a valid email address.'},400,origin);
  if(phone.length<3)return out({error:'Please enter a valid phone number.'},400,origin);
  if(!country)return out({error:'Please enter your country.'},400,origin);
  if(title.length<5)return out({error:'Publication title must be at least 5 characters.'},400,origin);
  if(!TYPES.includes(kind))return out({error:'Please choose a valid publication type.'},400,origin);
  if(summary.length<40)return out({error:'Abstract / summary must be at least 40 characters.'},400,origin);
  if(summary.length>2500)return out({error:'Abstract / summary is too long.'},400,origin);
  if(!document_url)return out({error:'Please add your document or evidence reference.'},400,origin);
  if(e.consent!==true)return out({error:'Please confirm the publication consent checkbox.'},400,origin);
  if(!(await allowed(req,'submit_v2',4,1440)))return out({error:'Submission limit reached. Please try again later.'},429,origin);
  await db('womate_publications','POST',{name,email,phone,country,affiliation,title,kind,summary,document_url,consent_at:new Date().toISOString()});
  return out({ok:true},200,origin);
 }
 case 'login':{
  if(!(await allowed(req,'login',4,60)))return out({error:'Too many attempts. Please try again in an hour.'},429,origin);
  const name=s(input.reviewer,100),code=s(input.code,200);
   if(!REVIEWERS.includes(name))return out({error:'Incorrect reviewer or access code.'},401,origin);
   const reviewerKey=await sha('reviewer:'+name+SIGNING);
   if((await db('rpc/womate_publication_allow','POST',{p_key:reviewerKey,p_action:'login',p_max:12,p_window_minutes:60}))!==true)return out({error:'Too many attempts for this reviewer. Please try again later.'},429,origin);
  const correct=equal(await sha(code),await sha(ADMIN_CODE));
  if(!REVIEWERS.includes(name)||!correct)return out({error:'Incorrect reviewer or access code.'},401,origin);
  const payload=b64(enc.encode(JSON.stringify({name,exp:Date.now()+30*60*1000})));
  return out({token:`${payload}.${await mac(payload)}`},200,origin);
 }
 case 'queue':{
  if(!await authorized(req))return out({error:'Your editorial session has expired. Please sign in again.'},401,origin);
  const rows=await db('womate_publications?select=id,name,email,phone,country,affiliation,title,kind,summary,document_url,status,feedback,reviewed_by,created_at&order=created_at.desc&limit=200');return out({items:rows},200,origin);
 }
 case 'review':{
  const reviewer=await authorized(req);if(!reviewer)return out({error:'Your editorial session has expired. Please sign in again.'},401,origin);
  const id=s(input.id,80),status=s(input.status,20),feedback=s(input.feedback,1800);
  if(!/^[a-f0-9-]{36}$/i.test(id)||!['approved','declined'].includes(status))return out({error:'Invalid editorial decision.'},400,origin);
  const patch={status,feedback,reviewed_by:reviewer,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString(),published_at:status==='approved'?new Date().toISOString():null};
  const rows=await db(`womate_publications?id=eq.${id}`,'PATCH',patch);
  if(!rows?.length)return out({error:'Submission not found.'},404,origin);
  return out({ok:true},200,origin);
 }
 default:return out({error:'Unknown action.'},400,origin);
 }
 }catch(error){console.error('Publication request failed',error);return out({error:error instanceof Error?error.message:'Publication service temporarily unavailable.'},500,origin);}
});
