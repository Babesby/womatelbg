import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")||"";
const legacyService=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
let secretKey="";
try{secretKey=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||""}catch{}
const SERVICE_KEY=secretKey||legacyService;
const GOOGLE_CLIENT_ID=Deno.env.get("GOOGLE_CLIENT_ID")||"";
const GOOGLE_CLIENT_SECRET=Deno.env.get("GOOGLE_CLIENT_SECRET")||"";
const GOOGLE_REFRESH_TOKEN=Deno.env.get("GOOGLE_REFRESH_TOKEN")||"";
const WOMATE_GMAIL_FROM=Deno.env.get("WOMATE_GMAIL_FROM")||"womatead@gmail.com";
const WOMATE_GMAIL_NAME=Deno.env.get("WOMATE_GMAIL_NAME")||"WOMATE";

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json"}})}
function b64url(input){
  const bytes=new TextEncoder().encode(input);let bin="";
  for(const b of bytes)bin+=String.fromCharCode(b);
  return btoa(bin).replaceAll("+","-").replaceAll("/","_").replace(/=+$/,"");
}
function esc(s){return String(s||"").replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c})}
function apply(s,p){return String(s||"").replace(/{{\s*([a-z0-9_]+)\s*}}/gi,function(_,k){return String((p&&p[k])??"")})}

async function rest(path,init={}){
  const headers=Object.assign({apikey:SERVICE_KEY,Authorization:"Bearer "+SERVICE_KEY,"Content-Type":"application/json"},init.headers||{});
  const r=await fetch(SUPABASE_URL+"/rest/v1/"+path,Object.assign({},init,{headers}));
  const raw=await r.text();let data=null;try{data=raw?JSON.parse(raw):null}catch{data=raw}
  if(!r.ok)throw new Error(typeof data==="string"?data:(data&&data.message)||"Supabase request failed");
  return data;
}

async function gmailAccessToken(){
  const body=new URLSearchParams({client_id:GOOGLE_CLIENT_ID,client_secret:GOOGLE_CLIENT_SECRET,refresh_token:GOOGLE_REFRESH_TOKEN,grant_type:"refresh_token"});
  const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});
  const data=await r.json();
  if(!r.ok||!data.access_token)throw new Error(data.error_description||data.error||"Could not refresh Gmail access token");
  return data.access_token;
}

function emailHtml(heading,body,ctaLabel,ctaUrl,decisionNote){
  const note=decisionNote?'<div style="margin:22px 0;padding:16px 18px;border-radius:14px;background:#f2f7f4;color:#2f5147;line-height:1.55"><strong>WOMATE note</strong><br>'+esc(decisionNote)+'</div>':"";
  const cta=ctaLabel&&ctaUrl?'<p style="margin:26px 0 0"><a href="'+esc(ctaUrl)+'" style="display:inline-block;background:#073B39;color:#fff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:999px">'+esc(ctaLabel)+'</a></p>':"";
  return '<!doctype html><html><body style="margin:0;background:#f5f8f6;font-family:Arial,Helvetica,sans-serif;color:#073B39"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f8f6;padding:30px 14px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #dce8e1;border-radius:22px;overflow:hidden"><tr><td style="background:#073B39;padding:24px 28px;color:#fff"><div style="font-size:11px;font-weight:800;letter-spacing:.12em;color:#C6FF52">WOMATE · SHE LEADS CLIMATE MENTORSHIP</div></td></tr><tr><td style="padding:34px 28px"><h1 style="font-size:30px;line-height:1.08;margin:0 0 16px;color:#073B39">'+esc(heading)+'</h1><div style="font-size:15px;line-height:1.7;color:#38584e">'+esc(body).replace(/\\r?\\n/g,"<br>")+'</div>'+note+cta+'<p style="margin:30px 0 0;padding-top:20px;border-top:1px solid #e0e9e4;font-size:12px;line-height:1.55;color:#6a7e77">WOMATE · Driving inclusive climate action with technology<br><a href="https://www.womate.org" style="color:#073B39">womate.org</a> · womatead@gmail.com</p></td></tr></table></td></tr></table></body></html>';
}

async function sendGmail(accessToken,to,subject,html){
  const text=html.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
  const boundary="womate_"+crypto.randomUUID().replaceAll("-","");
  const raw=[
    "From: "+WOMATE_GMAIL_NAME+" <"+WOMATE_GMAIL_FROM+">",
    "To: "+to,
    "Subject: "+subject,
    "MIME-Version: 1.0",
    'Content-Type: multipart/alternative; boundary="'+boundary+'"',
    "",
    "--"+boundary,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    text,
    "",
    "--"+boundary,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    html,
    "",
    "--"+boundary+"--"
  ].join("\r\n");
  const r=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",{method:"POST",headers:{Authorization:"Bearer "+accessToken,"Content-Type":"application/json"},body:JSON.stringify({raw:b64url(raw)})});
  const data=await r.json();
  if(!r.ok)throw new Error((data.error&&data.error.message)||"Gmail send failed");
  return data;
}

Deno.serve(async function(req){
  if(req.method!=="POST")return json({error:"POST required"},405);
  if(!SUPABASE_URL||!SERVICE_KEY)return json({error:"Supabase service configuration missing"},503);
  const workerToken=req.headers.get("x-womate-mail-secret")||"";
  let auth=false;
  try{auth=await rest("rpc/womate_mail_worker_authorize",{method:"POST",body:JSON.stringify({p_token:workerToken})})}catch{}
  if(auth!==true)return json({error:"Mail worker disabled or unauthorized"},401);
  if(!GOOGLE_CLIENT_ID||!GOOGLE_CLIENT_SECRET||!GOOGLE_REFRESH_TOKEN)return json({error:"WOMATE Gmail OAuth is not configured yet"},503);

  // WOMATE policy: send at most 200 admissions messages in any rolling 24 hours.
  // Small batches avoid bursts and preserve Gmail allowance for regular account use.
  const DAILY_LIMIT=200;
  const BATCH_LIMIT=2;
  const now=Date.now();
  const dayStart=encodeURIComponent(new Date(now-24*60*60*1000).toISOString());
  const hourStart=encodeURIComponent(new Date(now-60*60*1000).toISOString());
  const sentDay=await rest("womate_admissions_email_queue?select=id&status=eq.sent&sent_at=gte."+dayStart+"&limit=201");
  const sentHour=await rest("womate_admissions_email_queue?select=id&status=eq.sent&sent_at=gte."+hourStart+"&limit=25");
  const available=Math.max(0,Math.min(DAILY_LIMIT-(sentDay?.length||0),20-(sentHour?.length||0),BATCH_LIMIT));
  if(available===0)return json({ok:true,processed:0,sent:0,failed:0,paused_for_rate_limit:true,daily_limit:DAILY_LIMIT});
  const cutoff=encodeURIComponent(new Date(now).toISOString());
  const rows=await rest("womate_admissions_email_queue?select=*&status=in.(pending,failed)&next_attempt_at=lte."+cutoff+"&order=created_at.asc&limit="+available);
  if(!Array.isArray(rows)||rows.length===0)return json({ok:true,processed:0,sent:0,failed:0});

  const accessToken=await gmailAccessToken();
  let sent=0,failed=0;
  for(const row of rows){
    try{
      await rest("womate_admissions_email_queue?id=eq."+row.id,{method:"PATCH",body:JSON.stringify({status:"sending",attempts:Number(row.attempts||0)+1,updated_at:new Date().toISOString()})});
      const templates=await rest("womate_admissions_email_templates?template_key=eq."+encodeURIComponent(row.template_key)+"&select=*");
      const tpl=templates&&templates[0];
      if(!tpl)throw new Error("Email template not found");
      const p=row.payload||{};
      const subject=apply(tpl.subject_template,p);
      const heading=apply(tpl.heading,p);
      const bodyText=apply(tpl.body_template,p);
      const ctaLabel=apply(tpl.cta_label||"",p);
      const ctaUrl=apply(tpl.cta_path||"",p);
      const html=emailHtml(heading,bodyText,ctaLabel,ctaUrl,String(p.decision_note||""));
      const msg=await sendGmail(accessToken,row.recipient_email,subject,html);
      await rest("womate_admissions_email_queue?id=eq."+row.id,{method:"PATCH",body:JSON.stringify({status:"sent",sent_at:new Date().toISOString(),gmail_message_id:msg.id||null,last_error:null,updated_at:new Date().toISOString()})});
      await rest("womate_cohort_applications?id=eq."+row.application_id,{method:"PATCH",body:JSON.stringify({decision_email_status:"sent",decision_email_sent_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
      sent++;
    }catch(e){
      const attempts=Number(row.attempts||0)+1;
      const mins=Math.min(360,Math.max(5,Math.pow(2,Math.min(attempts,6))*5));
      const err=String(e instanceof Error?e.message:e).slice(0,1000);
      try{await rest("womate_admissions_email_queue?id=eq."+row.id,{method:"PATCH",body:JSON.stringify({status:"failed",last_error:err,next_attempt_at:new Date(Date.now()+mins*60000).toISOString(),updated_at:new Date().toISOString()})})}catch{}
      failed++;
    }
  }
  return json({ok:true,processed:rows.length,sent,failed});
});