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

function emailHtml(heading,body,ctaLabel,ctaUrl,decisionNote,selectedAsia=false,recipientName=''){
  const note=decisionNote?'<div style="margin:22px 0;padding:16px 18px;border-radius:14px;background:#f2f7f4;color:#2f5147;line-height:1.55"><strong>WOMATE note</strong><br>'+esc(decisionNote)+'</div>':"";
  const cta=ctaLabel&&ctaUrl?'<p style="margin:26px 0 0"><a href="'+esc(ctaUrl)+'" style="display:inline-block;background:#073B39;color:#fff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:999px">'+esc(ctaLabel)+'</a></p>':"";
  const topBanner=selectedAsia?'<tr><td><img src="https://www.womate.org/assets/asia/selected-congratulations.avif" alt="Congratulations! You have been selected" width="640" style="width:100%;max-width:640px;height:auto;display:block;border:0"/></td></tr>':'';
  const hello=selectedAsia?'<p style="margin:0 0 18px;font-size:16px;color:#073B39;font-weight:700">Dear '+esc(recipientName?.split(' ')[0]||'participant')+',</p>':'';
  return '<!doctype html><html><body style="margin:0;background:#f5f8f6;font-family:Arial,Helvetica,sans-serif;color:#073B39"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f8f6;padding:30px 14px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #dce8e1;border-radius:22px;overflow:hidden">'+topBanner+'<tr><td style="background:#073B39;padding:24px 28px;color:#fff"><div style="font-size:11px;font-weight:800;letter-spacing:.12em;color:#C6FF52">'+(selectedAsia?'WOMATE · SHE LEADS ASIA · COHORT 1 · 2027':'WOMATE · SHE LEADS CLIMATE MENTORSHIP')+'</div></td></tr><tr><td style="padding:34px 28px">'+hello+'<h1 style="font-size:30px;line-height:1.08;margin:0 0 16px;color:#073B39">'+esc(heading)+'</h1><div style="font-size:15px;line-height:1.7;color:#38584e">'+esc(body).replace(/\r?\n/g,"<br>")+'</div>'+note+cta+'<p style="margin:30px 0 0;padding-top:20px;border-top:1px solid #e0e9e4;font-size:12px;line-height:1.55;color:#6a7e77">WOMATE · Driving inclusive climate action with technology<br><a href="https://www.womate.org" style="color:#073B39">womate.org</a> · womatead@gmail.com</p></td></tr></table></td></tr></table></body></html>';
}

// RFC 2047 subjects and base64 MIME bodies prevent broken UTF-8 characters.
function mimeBase64(value){
 const bytes=new TextEncoder().encode(String(value||""));let data="";
 for(const byte of bytes)data+=String.fromCharCode(byte);
 return btoa(data);
}
function mimeLines(value){return mimeBase64(value).match(/.{1,76}/g)?.join("\r\n")||""}
function mimeSubject(value){
 const clean=String(value||"").replace(/[\r\n]+/g," ").trim();
 if(/^[\x20-\x7e]*$/.test(clean))return clean;
 const encoder=new TextEncoder(),words=[];let part="";
 for(const char of clean){
  if(part&&encoder.encode(part+char).length>42){words.push("=?UTF-8?B?"+mimeBase64(part)+"?=");part=""}
  part+=char;
 }
 if(part)words.push("=?UTF-8?B?"+mimeBase64(part)+"?=");
 return words.join(" ");
}
function asiaSelectionEmail(row,p,deadline,isPreview){
 const safe=s=>esc(s);
 const link=(label,url,tone="lime")=>{
  const bg=tone==="lime"?"#C6FF52":"#0E4D4A";
  const fg=tone==="lime"?"#073B39":"#FFFFFF";
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:14px 0 7px"><tr><td bgcolor="${bg}" style="background:${bg};border-radius:8px"><a href="${safe(url)}" target="_blank" style="display:inline-block;padding:13px 21px;color:${fg};background:${bg};font:700 13px Arial,Helvetica,sans-serif;text-decoration:none;border-radius:8px;letter-spacing:.15px">${safe(label)} &rarr;</a></td></tr></table>`;
 };
 const section=(step,heading,desc,button,secondary="")=>`<tr><td style="padding:0 0 17px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-bottom:1px solid #e2eae5"><tr><td style="padding:17px 0 20px"><div style="color:#4a755f;font-size:10px;font-weight:700;letter-spacing:1.5px">${step}</div><h3 style="font-size:18px;line-height:1.35;color:#073B39;margin:8px 0 8px;font-weight:700">${heading}</h3><p style="font-size:14px;line-height:1.75;color:#415c52;margin:0">${desc}</p>${button}${secondary?`<p style="font-size:12px;line-height:1.5;color:#6b8077;margin:9px 0 0">${secondary}</p>`:""}</td></tr></table></td></tr>`;
 const firstName=String(row.recipient_name||"participant").trim().split(/\s+/)[0];
 const displayDeadline=new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"long",year:"numeric",hour:"numeric",minute:"2-digit",timeZone:"UTC",timeZoneName:"short"}).format(deadline);
 const youtube="https://www.youtube.com/@womategh";
 const group="https://chat.whatsapp.com/Kl9MuJX2TrVEzKoCSx8DOU";
 const channel="https://whatsapp.com/channel/0029Vb8vqDA0rGiKGUnnDA3A";
 const scratch=p.scratch_path;
 const preheader="Your place in She Leads Asia Cohort 1, 2027. Please accept your offer and prepare for the journey.";
 const intro=`Following the review of applications for the <strong>She Leads Climate Mentorship Programme 2027 — Asia Cohort 1</strong>, we are delighted to officially welcome you as a <strong>selected participant</strong>.`;
 const previewNote=isPreview?`<tr><td style="background:#eef4e5;padding:14px 34px;color:#315d46;font-size:12px;font-weight:700">PREVIEW ONLY — THIS IS NOT AN OFFICIAL ADMISSION OR RESERVED SEAT.</td></tr>`:"";
 const modules=["Understanding Climate Change","Gender & Climate Justice","Climate Governance & Policy","Climate Advocacy & Digital Innovation","Leadership & Professional Pathways"];
 const moduleRows=modules.map((title,i)=>`<tr><td style="padding:10px 0;border-bottom:1px solid #e5eee8"><span style="display:inline-block;min-width:36px;color:#5e8665;font-size:12px;font-weight:800">${String(i+1).padStart(2,"0")}</span><span style="color:#153f34;font-weight:700;font-size:14px">${title}</span></td></tr>`).join("");
 return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>WOMATE She Leads Asia Selection</title></head><body style="margin:0;padding:0;background:#f2f6f2;color:#123d32;font-family:Arial,Helvetica,sans-serif">
 <div style="display:none;font-size:1px;color:#f2f6f2;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${preheader}</div>
 <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f6f2"><tr><td align="center" style="padding:30px 12px">
 <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;background:#fff;border:1px solid #e1e9e4">
 <tr><td style="padding:26px 34px 22px;background:#073B39;color:#fff"><div style="font-size:27px;font-weight:800;letter-spacing:1px;line-height:1.15;color:#fff">WOMATE<span style="color:#C6FF52">.</span></div><div style="font-size:10px;letter-spacing:2px;color:#cce7df;margin-top:3px;font-weight:700">WOMEN IN CLIMATE</div></td></tr>
 <tr><td style="padding:38px 34px 36px;background:#0E4D4A;color:#fff"><div style="font-size:11px;letter-spacing:1.7px;color:#C6FF52;font-weight:800">SHE LEADS ASIA · COHORT 1 · 2027</div><div style="font-family:Georgia,'Times New Roman',serif;font-size:38px;line-height:1.06;letter-spacing:-.8px;margin-top:15px;color:#C6FF52">Congratulations!</div><div style="font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-.5px;margin-top:12px;color:#fff">You have been selected.</div><div style="height:3px;width:48px;background:#C6FF52;margin-top:22px"></div></td></tr>
 ${previewNote}
 <tr><td style="padding:34px 34px 10px">
 <p style="font-size:16px;color:#073B39;font-weight:700;margin:0 0 18px">Dear ${safe(firstName)},</p>
 <p style="font-size:15px;line-height:1.8;color:#3a574c;margin:0 0 16px">${intro}</p>
 <p style="font-size:15px;line-height:1.8;color:#3a574c;margin:0 0 16px">Your selection is an invitation to learn alongside a new community of women committed to climate leadership, innovation and meaningful action.</p>
 <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;background:#f1f8e8;border-left:4px solid #a6dc55"><tr><td style="padding:20px 22px"><div style="font-size:10px;font-weight:800;color:#31704b;letter-spacing:1.4px">AT WOMATE</div><p style="color:#073B39;font:700 18px/1.5 Georgia,'Times New Roman',serif;margin:9px 0 12px">We do not see women simply as beneficiaries of climate programmes. We see women as climate actors, leaders, innovators and changemakers.</p><p style="font-size:14px;line-height:1.6;color:#385d46;font-weight:700;margin:0">And now, you are part of that community.</p></td></tr></table>
 </td></tr>
 <tr><td style="padding:16px 34px 30px">
 <div style="font-size:11px;letter-spacing:1.6px;color:#4a795c;font-weight:800">YOUR SHE LEADS JOURNEY</div><h2 style="font:700 25px/1.25 Georgia,'Times New Roman',serif;color:#073B39;margin:10px 0 13px">Welcome to Asia Cohort 1.</h2>
 <p style="font-size:14px;line-height:1.8;color:#425e52;margin:0 0 13px">Beginning <strong>8 March 2027</strong>, your five-week mentorship experience combines weekly live sessions, Canopy lessons, practical assignments, expert insights and a community of emerging climate leaders.</p>
 <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="margin:16px 0 21px">${moduleRows}</table>
 <p style="font-size:14px;line-height:1.8;color:#425e52;margin:0">Completing this journey takes more than attending sessions. Work through each module, engage actively, and submit your assignments within the published timelines.</p>
 </td></tr>
 <tr><td style="padding:30px 34px 24px;background:#f5f9f4">
 <div style="font-size:11px;letter-spacing:1.6px;color:#4a795c;font-weight:800">ACTION REQUIRED</div>
 <h2 style="font:700 27px/1.25 Georgia,'Times New Roman',serif;color:#073B39;margin:9px 0 11px">Your onboarding starts here.</h2>
 <p style="font-size:14px;line-height:1.75;color:#415c52;margin:0 0 12px">Your place is offered for a limited time. Confirm it first, then complete the following connections so you are ready for the first week.</p>
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:17px 0 24px;background:#073B39;border-radius:10px"><tr><td style="padding:19px 21px;color:#fff"><div style="color:#C6FF52;font-size:10px;font-weight:800;letter-spacing:1.5px">ACCEPT YOUR OFFER BY</div><div style="font-size:18px;font-weight:800;line-height:1.4;margin-top:6px">${safe(displayDeadline)}</div><p style="font-size:12px;line-height:1.6;color:#d0e6dc;margin:9px 0 0">This seven-day deadline is personal to your selection email.</p></td></tr></table>
 ${section("STEP 01 · MAKE IT OFFICIAL","Reveal your selection card and accept your offer.","Open your secure personal card, scratch to reveal your unique selection code, and confirm acceptance before your deadline.",link("REVEAL MY SELECTION CARD",scratch),"Keep this private link and the code it reveals to yourself.")}
 ${section("STEP 02 · MANDATORY","Subscribe to WOMATE on YouTube.","Our weekly She Leads sessions and learning broadcasts take place on our official YouTube channel. Subscribe before the programme begins.",link("SUBSCRIBE TO WOMATE",youtube,"teal"))}
 ${section("STEP 03 · MANDATORY","Join the official Asia cohort group.","The Asia cohort WhatsApp group is required for session reminders, programme announcements and community connection.",link("JOIN ASIA COHORT GROUP",group,"teal"))}
 ${section("STEP 04 · AFTER ACCEPTANCE","Enter your Canopy learning space.","Once you accept your offer, sign in with the same email address used in your application, finish onboarding and confirm access to your learning space.",link("ENTER WOMATE CANOPY","https://www.womate.org/canopy","teal"))}
 <div style="padding:13px 17px;border-radius:8px;background:#eaf2e8"><p style="font-size:12px;color:#496859;margin:0 0 5px"><strong>OPTIONAL COMMUNITY CHANNEL</strong></p><p style="font-size:13px;line-height:1.6;color:#496859;margin:0">You may also <a href="${channel}" style="color:#0E4D4A;font-weight:700;text-decoration:underline">follow WOMATE’s WhatsApp channel</a> for wider news and opportunities. This is not a condition of your selection.</p></div>
 </td></tr>
 <tr><td style="padding:32px 34px">
 <div style="font-size:11px;letter-spacing:1.6px;color:#4a795c;font-weight:800">NOW THE JOURNEY BEGINS</div><h2 style="font:700 26px/1.3 Georgia,'Times New Roman',serif;color:#073B39;margin:12px 0">Selection opens the door. Your commitment carries you forward.</h2>
 <p style="font-size:14px;line-height:1.85;color:#415c52;margin:0 0 20px">Show up for your weekly sessions. Complete all five learning modules. Submit your assignments, ask questions, build relationships and put your learning into action beyond Canopy.</p>
 <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f7ec"><tr><td style="padding:19px 21px;color:#123d32"><div style="font-size:11px;letter-spacing:1.3px;color:#4a795c;font-weight:800">GRADUATION &amp; CERTIFICATION</div><p style="font-size:14px;line-height:1.75;margin:10px 0 0">Your Certificate of Completion is earned through the programme's published lesson, assignment and live-attendance requirements, subject to WOMATE's final review. It recognises your completion, not selection alone.</p></td></tr></table>
 <p style="font-size:15px;line-height:1.8;color:#415c52;margin:24px 0 8px"><strong>Congratulations once again. Welcome to WOMATE.</strong></p>
 <p style="font-size:14px;line-height:1.7;color:#415c52;margin:0">With warm congratulations,<br><strong>The WOMATE Team</strong></p>
 </td></tr>
 <tr><td style="padding:25px 34px;background:#073B39;color:#d5e8e0"><div style="color:#fff;font-size:16px;font-weight:800;letter-spacing:.7px">WOMATE<span style="color:#C6FF52">.</span></div><p style="font-size:11px;line-height:1.7;margin:9px 0 0;color:#d5e8e0">Women in Climate · <a href="https://www.womate.org" style="color:#C6FF52">womate.org</a><br>Official admissions: womatead@gmail.com</p></td></tr>
 </table></td></tr></table></body></html>`;
}

async function sendGmail(accessToken,to,subject,html){
 const text=html.replace(/<br\s*\/?>/gi,"\n").replace(/<\/p>/gi,"\n\n")
   .replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<")
   .replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim();
 const boundary="womate_"+crypto.randomUUID().replaceAll("-","");
 const raw=[
  "From: "+mimeSubject(WOMATE_GMAIL_NAME)+" <"+WOMATE_GMAIL_FROM+">",
  "To: "+String(to).replace(/[\r\n]/g,""),
  "Subject: "+mimeSubject(subject),
  "MIME-Version: 1.0",
  'Content-Type: multipart/alternative; boundary="'+boundary+'"',
  "",
  "--"+boundary,
  'Content-Type: text/plain; charset="UTF-8"',
  "Content-Transfer-Encoding: base64",
  "",
  mimeLines(text),
  "",
  "--"+boundary,
  'Content-Type: text/html; charset="UTF-8"',
  "Content-Transfer-Encoding: base64",
  "",
  mimeLines(html),
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
  // Isolated, authenticated diagnostics never touch the admissions queue.
  // All test mail goes to the configured WOMATE sender, never arbitrary recipients.
  const diagnostic=await req.json().catch(()=>({}));
  if(diagnostic?.action==="check_oauth"||diagnostic?.action==="send_self_test"){
    try{
      const accessToken=await gmailAccessToken();
      if(diagnostic.action==="check_oauth")return json({ok:true,oauth:"refresh_succeeded",queue_unchanged:true});
      const html=emailHtml("WOMATE Gmail delivery test","This is an isolated admissions-mail delivery test. No applicant has been contacted.",null,null,null);
      const recipient=WOMATE_GMAIL_FROM;
      const result=await sendGmail(accessToken,recipient,"WOMATE admissions mail test",html);
      return json({ok:true,oauth:"refresh_succeeded",gmail_message_id:result.id||null,recipient,queue_unchanged:true,inbox_receipt_verified:false});
    }catch(e){return json({ok:false,stage:"gmail_diagnostic",error:String(e instanceof Error?e.message:e).slice(0,400)},502)}
  }


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
    let gmailAccepted=false;
    try{
      await rest("womate_admissions_email_queue?id=eq."+row.id,{method:"PATCH",body:JSON.stringify({status:"sending",attempts:Number(row.attempts||0)+1,updated_at:new Date().toISOString()})});
      const templates=await rest("womate_admissions_email_templates?template_key=eq."+encodeURIComponent(row.template_key)+"&select=*");
      const tpl=templates&&templates[0];
      if(!tpl)throw new Error("Email template not found");
      const p={...(row.payload||{})};
      // Every selected person receives seven full days beginning when Gmail
      // accepts their own email, regardless of their batch position.
      const offerTime=new Date();
      const expiryTime=new Date(offerTime.getTime()+7*24*60*60*1000);
      if(row.template_key==="selected")p.offer_deadline=expiryTime.toUTCString();
      const selectedAsia=row.template_key==="selected"&&row.cohort_key==="she-leads-asia-c1-2027";
      const testPreview=selectedAsia&&p.test_preview===true&&p.participant_view!==true;
      if(selectedAsia&&!p.scratch_path)throw new Error("Missing secure Asia selection scratch link; delivery held");
      const subject=testPreview?"[TEST PREVIEW — NOT AN ADMISSION] WOMATE She Leads Asia selection":selectedAsia?"Congratulations — Your WOMATE She Leads Asia selection":apply(tpl.subject_template,p);
      const heading=testPreview?"Your selection experience — preview":selectedAsia?"Congratulations. You have been selected.":apply(tpl.heading,p);
      const bodyText=selectedAsia?[
        testPreview?"TEST PREVIEW ONLY — This message demonstrates the selection and scratch-card experience. It is not an admissions decision or a reserved place.":"We are delighted to offer you a place in She Leads Asia · Cohort 1, 2027.",
        "",
        "YOUR SELECTION — ACTION REQUIRED",
        testPreview?"Open your private scratch card to see how a selected applicant reveals their code. The acceptance action is a demonstration only. No admission or enrolment will result.":"Open your private selection card to reveal your personal code, then accept your offer by "+p.offer_deadline+". Please keep the link and code private.",
        "",
        "MANDATORY NEXT STEPS",
        "1. Subscribe to the official WOMATE YouTube channel: https://www.youtube.com/@womategh",
        "2. Join the official Asia Cohort WhatsApp group: https://chat.whatsapp.com/Kl9MuJX2TrVEzKoCSx8DOU",
        "",
        "OPTIONAL",
        "Follow the WOMATE WhatsApp channel: https://whatsapp.com/channel/0029Vb8vqDA0rGiKGUnnDA3A",
        "",
        "YOUR JOURNEY",
        "Five climate-learning modules, live sessions, assignments and community learning begin 8 March 2027. After accepting your offer, sign in to Canopy with your application email and complete onboarding.",
        "",
        "We look forward to the leadership and ideas you will bring.",
        "",
        "With warm congratulations,",
        "The WOMATE Team"
      ].join("\n"):apply(tpl.body_template,p);
      const ctaLabel=testPreview?"Open test scratch card":selectedAsia?"Open my secure selection card":apply(tpl.cta_label||"",p);
      const ctaUrl=selectedAsia?p.scratch_path:apply(tpl.cta_path||"",p);
      const html=selectedAsia?asiaSelectionEmail(row,p,expiryTime,testPreview):emailHtml(heading,bodyText,ctaLabel,ctaUrl,String(p.decision_note||""),false,row.recipient_name);
      const msg=await sendGmail(accessToken,row.recipient_email,subject,html);
      gmailAccepted=true;
      // Atomic DB finalization updates the real deadline, selection-card
      // expiry and mail ledger together. Never retry an accepted message.
      await rest("rpc/womate_mail_confirm_offer_delivery",{method:"POST",body:JSON.stringify({
        p_queue:row.id,p_gmail_message_id:msg.id,p_sent_at:offerTime.toISOString(),p_acceptance_days:7
      })});
      sent++;
    }catch(e){
      const attempts=Number(row.attempts||0)+1;
      const mins=Math.min(360,Math.max(5,Math.pow(2,Math.min(attempts,6))*5));
      const err=String(e instanceof Error?e.message:e).slice(0,1000);
      // If Gmail already accepted the message, leave it in 'sending' for
      // administrator reconciliation. Marking failed would resend it twice.
      try{await rest("womate_admissions_email_queue?id=eq."+row.id,{method:"PATCH",body:JSON.stringify(gmailAccepted?
        {status:"sending",last_error:"Gmail accepted message; finalization needs manual review: "+err,updated_at:new Date().toISOString()}:
        {status:"failed",last_error:err,next_attempt_at:new Date(Date.now()+mins*60000).toISOString(),updated_at:new Date().toISOString()}
      )})}catch{}
      failed++;
    }
  }
  return json({ok:true,processed:rows.length,sent,failed});
});