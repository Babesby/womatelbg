// WOMATE Talent Discovery payments. Safe by default: test mode only until merchant approval.
const URL=Deno.env.get("SUPABASE_URL")||"";
const ANON=Deno.env.get("SUPABASE_ANON_KEY")||"";
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const PAYSTACK=Deno.env.get("PAYSTACK_SECRET_KEY")||"";
const ENABLED=Deno.env.get("WOMATE_TALENT_PAYMENTS_ENABLED")==="true";
const BASE="https://api.paystack.co";
const cors={"Access-Control-Allow-Origin":"https://www.womate.org","Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};
const respond=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers:cors});
async function postRpc(name:string,body:unknown,token:string,key:string){
 const res=await fetch(URL+"/rest/v1/rpc/"+name,{method:"POST",headers:{apikey:key,Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify(body)});
 const data=await res.json().catch(()=>null);
 if(!res.ok)throw Error(data?.message||"Request rejected");
 return data;
}
async function db(path:string,method:string,body?:unknown){
 const res=await fetch(URL+"/rest/v1/"+path,{method,headers:{apikey:SERVICE,Authorization:"Bearer "+SERVICE,"Content-Type":"application/json",Prefer:"return=representation"},body:body?JSON.stringify(body):undefined});
 const data=await res.json().catch(()=>null);
 if(!res.ok)throw Error("Database operation unavailable");
 return data;
}
async function verifyWithPaystack(reference:string){
 const response=await fetch(BASE+"/transaction/verify/"+encodeURIComponent(reference),{headers:{Authorization:"Bearer "+PAYSTACK}});
 const json=await response.json().catch(()=>null);
 if(!response.ok||json?.status!==true)throw Error("Provider verification unavailable");
 return json.data;
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return respond(405,{error:"Method not allowed"});
 if(!ENABLED||!PAYSTACK.startsWith("sk_test_")||!URL||!ANON||!SERVICE)return respond(503,{error:"WOMATE payment checkout is not enabled. No charge was made."});
 const bearer=req.headers.get("authorization")||"";
 if(!bearer.startsWith("Bearer "))return respond(401,{error:"Sign in required"});
 try{
  const data=await req.json();
  if(typeof data.request_id!=="string"||typeof data.access_token!=="string"||data.request_id.length>64||data.access_token.length>256)return respond(400,{error:"Invalid private request"});
  const ctx=await postRpc("canopy_finance_requester_checkout_context",{p_request:data.request_id,p_token:data.access_token},bearer.slice(7),ANON);
  if(ctx.currency!=="GHS"||ctx.status==="paid")return respond(409,{error:"Invoice not eligible for payment"});
  if(!Number.isSafeInteger(ctx.amount_minor)||ctx.amount_minor<100)return respond(400,{error:"Invalid invoice amount"});
  const invoiceId=ctx.invoice_id as string;
  const rows=await db("canopy_collaboration_invoices?id=eq."+encodeURIComponent(invoiceId)+"&select=id,status,payment_url,provider_reference","GET");
  const invoice=rows?.[0];
  if(!invoice||!["issued","pending_payment"].includes(invoice.status))return respond(409,{error:"Invoice cannot be charged"});
  if(invoice.payment_url&&invoice.provider_reference&&invoice.status==="pending_payment")return respond(200,{checkout_url:invoice.payment_url});
  const reference="WMTD-"+crypto.randomUUID().replaceAll("-","");
  await db("canopy_collaboration_payment_attempts","POST",{invoice_id:invoiceId,provider:"paystack",provider_reference:reference,amount_minor:ctx.amount_minor,currency:"GHS",status:"initialized"});
  let init;
  try{
   const p=await fetch(BASE+"/transaction/initialize",{method:"POST",headers:{Authorization:"Bearer "+PAYSTACK,"Content-Type":"application/json"},body:JSON.stringify({email:ctx.email,amount:String(ctx.amount_minor),currency:"GHS",reference,callback_url:"https://www.womate.org/talent/chat/"+data.request_id,metadata:JSON.stringify({womate_invoice_id:invoiceId,service:"talent_discovery"})})});
   init=await p.json();
   if(!p.ok||init?.status!==true||init?.data?.reference!==reference||!String(init?.data?.authorization_url||"").startsWith("https://checkout.paystack.com/"))throw Error("Checkout initialization failed");
  }catch{
   await db("canopy_collaboration_payment_attempts?provider_reference=eq."+encodeURIComponent(reference),"PATCH",{status:"failed"});
   return respond(502,{error:"Payment provider unavailable; no charge was made"});
  }
  await db("canopy_collaboration_invoices?id=eq."+encodeURIComponent(invoiceId)+"&status=eq.issued","PATCH",{status:"pending_payment",provider:"paystack",provider_reference:reference,payment_url:init.data.authorization_url,updated_at:new Date().toISOString()});
  return respond(200,{checkout_url:init.data.authorization_url});
 }catch(e){return respond(400,{error:e instanceof Error?e.message:"Unable to initialize payment"})}
});
