// Server-only Paystack webhook. Rejects unsigned events and never trusts client payment status.
const KEY=Deno.env.get("PAYSTACK_SECRET_KEY")||"";
const SIGNING=Deno.env.get("PAYSTACK_WEBHOOK_SIGNING_SECRET")||"";
const URL=Deno.env.get("SUPABASE_URL")||"";
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const ENABLED=Deno.env.get("WOMATE_TALENT_PAYMENTS_ENABLED")==="true";
const response=(code:number)=>new Response(code===200?"ok":"rejected",{status:code,headers:{"Content-Type":"text/plain","Cache-Control":"no-store"}});
const enc=new TextEncoder();
function hex(bytes:Uint8Array){return Array.from(bytes).map(v=>v.toString(16).padStart(2,"0")).join("")}
async function sign(secret:string,value:Uint8Array){
 const k=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-512"},false,["sign"]);
 return hex(new Uint8Array(await crypto.subtle.sign("HMAC",k,value)));
}
function equal(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
async function signatureValid(headers:Headers,body:Uint8Array){
 const signed=headers.get("Paystack-Signature");
 if(signed&&SIGNING){
  const pieces=signed.split(",").map(s=>s.trim()),time=pieces.find(s=>s.startsWith("t="))?.slice(2);
  if(!time||!/^[0-9]{10,13}$/.test(time))return false;
  const sec=Number(time);
  if(Math.abs(Date.now()/1000-sec)>300)return false;
  const joined=new Uint8Array([...enc.encode(time+"."),...body]);
  const expected=await sign(SIGNING,joined);
  return pieces.some(part=>part.startsWith("v1=")&&equal(part.slice(3).split(":").slice(1).join(":").toLowerCase(),expected));
 }
 const legacy=headers.get("x-paystack-signature")||"";
 return Boolean(KEY)&&/^[0-9a-f]{128}$/i.test(legacy)&&equal(legacy.toLowerCase(),await sign(KEY,body));
}
async function verify(reference:string){
 const res=await fetch("https://api.paystack.co/transaction/verify/"+encodeURIComponent(reference),{headers:{Authorization:"Bearer "+KEY}});
 const data=await res.json().catch(()=>null);
 if(!res.ok||data?.status!==true||data?.data?.status!=="success"||data.data.domain!=="test")throw Error("Provider did not verify success in test mode");
 return data.data;
}
Deno.serve(async request=>{
 if(request.method!=="POST")return response(405);
 if(!ENABLED||!KEY.startsWith("sk_test_")||!SERVICE||!URL)return response(503);
 const bytes=new Uint8Array(await request.arrayBuffer());
 if(bytes.byteLength>200000||!await signatureValid(request.headers,bytes))return response(401);
 try{
  const event=JSON.parse(new TextDecoder().decode(bytes));
  if(event?.event!=="charge.success")return response(200);
  const reference=String(event?.data?.reference||"");
  if(!/^[A-Za-z0-9.=-]{8,100}$/.test(reference))return response(400);
  // Re-query the provider. Never mark paid based only on a webhook payload.
  const tx=await verify(reference);
  if(tx.reference!==reference||tx.currency!=="GHS"||!Number.isSafeInteger(tx.amount)||tx.amount<=0)return response(400);
  const result=await fetch(URL+"/rest/v1/rpc/canopy_finance_record_verified_payment",{
   method:"POST",headers:{apikey:SERVICE,Authorization:"Bearer "+SERVICE,"Content-Type":"application/json"},
   body:JSON.stringify({p_reference:reference,p_amount_minor:tx.amount,p_currency:tx.currency,p_transaction_id:String(tx.id)})
  });
  if(!result.ok)return response(503);
  return response(200);
 }catch{return response(503)}
});
