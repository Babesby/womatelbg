// Vercel server-side Google Sheets integration. Configure WOMATE_GOOGLE_SERVICE_ACCOUNT_JSON
// and share the spreadsheet with the service account email. Never expose credentials in VITE_ variables.
const crypto=require('node:crypto');
const SHEET='1xijb4f2CW3rT7cvj7sNAJNI0hAyb5E5G6qZbrHqccjU';
const b64=s=>Buffer.from(JSON.stringify(s)).toString('base64url');
const clean=value=>String(value??'').trim();
const safeCell=value=>{const s=clean(value);return /^[=+@\-\t\r]/.test(s)?"'"+s:s};
async function token(){
 const raw=process.env.WOMATE_GOOGLE_SERVICE_ACCOUNT_JSON;
 if(!raw)throw Error('Newsletter integration is not configured');
 const key=JSON.parse(raw),now=Math.floor(Date.now()/1000);
 if(!key.client_email||!key.private_key)throw Error('Invalid service account configuration');
 const data=b64({alg:'RS256',typ:'JWT'})+'.'+b64({iss:key.client_email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3300});
 const sig=crypto.sign('RSA-SHA256',Buffer.from(data),key.private_key).toString('base64url');
 const res=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:data+'.'+sig})});
 const json=await res.json();if(!res.ok||!json.access_token)throw Error('Google Sheets authorization failed');return json.access_token;
}
async function sheets(access,path,method='GET',body){
 const res=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+SHEET+path,{method,headers:{Authorization:'Bearer '+access,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 const json=await res.json().catch(()=>({}));
 if(!res.ok)throw Error('Google Sheets request failed: '+res.status);
 return json;
}
async function eventSheet(access){
 const meta=await sheets(access,'?fields=sheets.properties');
 if(!(meta.sheets||[]).some(s=>s.properties?.title==='Campaign Events')){
  await sheets(access,':batchUpdate','POST',{requests:[{addSheet:{properties:{title:'Campaign Events',gridProperties:{frozenRowCount:1}}}}]}).catch(async e=>{const second=await sheets(access,'?fields=sheets.properties');if(!(second.sheets||[]).some(s=>s.properties?.title==='Campaign Events'))throw e});
 }
 const v=await sheets(access,'/values/'+encodeURIComponent("'Campaign Events'!A1:G1"));
 if(!v.values?.length)await sheets(access,'/values/'+encodeURIComponent("'Campaign Events'!A1:G1")+'?valueInputOption=RAW','PUT',{values:[['Submitted At','Event','Email','First Name / Course','Rating','Recommendation','Feedback']]});
}
async function append(access,range,values){return sheets(access,'/values/'+encodeURIComponent(range)+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS','POST',{values:[values]})}
const response=(res,status,data)=>{res.setHeader('Cache-Control','no-store');res.status(status).json(data)};
module.exports=async function handler(req,res){
 if(req.method!=='POST')return response(res,405,{ok:false,error:'Method not allowed'});
 const host=String(req.headers.origin||'');
 if(host&&!/^https:\/\/(?:www\.)?womate\.org$/.test(host)&&!/^http:\/\/localhost(?::\d+)?$/.test(host))return response(res,403,{ok:false,error:'Invalid origin'});
 const body=req.body||{};
 if(JSON.stringify(body).length>5000)return response(res,413,{ok:false,error:'Request too large'});
 try{
  const access=await token(),date=new Date().toISOString();
  if(body.event==='newsletter_submit'){
   if(body.honey||body.consent!==true)return response(res,400,{ok:false,error:'Consent is required'});
   const email=clean(body.email).toLowerCase(),name=clean(body.name);
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!name||name.length>70)return response(res,400,{ok:false,error:'Please provide a valid name and email'});
   // Inspect the existing first column before writing: never insert an email already on the list.
   const existing=await sheets(access,'/values/'+encodeURIComponent("'Sheet1'!A1:A"));
   const present=(existing.values||[]).some(row=>clean(row[0]).toLowerCase()===email);
   if(present)return response(res,200,{ok:true,alreadySubscribed:true});
   await append(access,"'Sheet1'!A:B",[safeCell(email),date]);
   await eventSheet(access);
   await append(access,"'Campaign Events'!A:G",[date,'newsletter_submit',safeCell(email),safeCell(name),'','','']);
   return response(res,200,{ok:true,subscribed:true});
  }
  if(body.event==='course_feedback'){
   const rating=Number(body.rating),recommend=clean(body.recommend),course=clean(body.course),comment=clean(body.comment),auth=String(req.headers.authorization||'');
   if(!Number.isInteger(rating)||rating<1||rating>5||!['yes','maybe','no'].includes(recommend)||!course||course.length>160||comment.length>1500)return response(res,400,{ok:false,error:'Please complete the required feedback fields'});
   if(!/^Bearer\s+\S+/.test(auth))return response(res,401,{ok:false,error:'Sign in to submit course feedback'});
   const url=clean(process.env.SUPABASE_URL||process.env.VITE_CANOPY_SUPABASE_URL).replace(/\/$/,'');
   const anon=clean(process.env.SUPABASE_ANON_KEY||process.env.VITE_CANOPY_SUPABASE_ANON_KEY);
   if(!url||!anon)throw Error('Course feedback authorization not configured');
   const userRes=await fetch(url+'/auth/v1/user',{headers:{apikey:anon,Authorization:auth}});
   if(!userRes.ok)return response(res,401,{ok:false,error:'Session expired. Sign in again.'});
   const user=await userRes.json();
   if(!user?.id)return response(res,401,{ok:false,error:'Invalid session'});
   // Verify completion against Canopy's authenticated course-read RPC rather than
   // trusting a browser flag or a visitor-supplied course title.
   const slug=clean(body.course_slug);
   if(!/^[a-z0-9][a-z0-9-]{0,150}$/.test(slug))return response(res,400,{ok:false,error:'Invalid course'});
   const read=await fetch(url+'/rest/v1/rpc/womate_course_read',{method:'POST',headers:{apikey:anon,Authorization:auth,'Content-Type':'application/json'},body:JSON.stringify({p_slug:slug})});
   if(!read.ok)return response(res,403,{ok:false,error:'Course completion could not be verified'});
   const workspace=await read.json();
   const lessons=workspace.lessons||[],progress=workspace.progress||[],assessments=workspace.assessments||[],submissions=workspace.submissions||[];
   if(workspace.locked||workspace.course?.preview||workspace.course?.title!==course||!lessons.length||progress.length<lessons.length||!assessments.every(a=>submissions.some(s=>s.assessment_id===a.id&&s.status==='approved')))
     return response(res,403,{ok:false,error:'Course completion is not yet verified'});
   await eventSheet(access);
   const prior=await sheets(access,'/values/'+encodeURIComponent("'Campaign Events'!A2:D"));
   // One review per authenticated email and course. Check stored submissions before appending.
   const email=clean(user.email).toLowerCase();
   if((prior.values||[]).some(row=>row[1]==='course_feedback'&&clean(row[2]).toLowerCase()===email&&row[3]===course))return response(res,200,{ok:true,alreadySubmitted:true});
   await append(access,"'Campaign Events'!A:G",[date,'course_feedback',safeCell(email),safeCell(course),rating,recommend,safeCell(comment)]);
   return response(res,200,{ok:true});
  }
  return response(res,400,{ok:false,error:'Unknown event'});
 }catch(err){console.error('WOMATE engagement:',err.message);return response(res,503,{ok:false,error:'The service is temporarily unavailable. Please try again later.'})}
};