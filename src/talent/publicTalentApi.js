const URL=(import.meta.env.VITE_CANOPY_SUPABASE_URL||'').replace(/\/$/,'');
const KEY=import.meta.env.VITE_CANOPY_SUPABASE_ANON_KEY||'';
const headers=()=>({apikey:KEY,Authorization:`Bearer ${KEY}`,'Content-Type':'application/json'});
async function rpc(name,body={}){
  if(!URL||!KEY)throw new Error('Talent Discovery is not configured.');
  const r=await fetch(`${URL}/rest/v1/rpc/${name}`,{method:'POST',headers:headers(),body:JSON.stringify(body)});
  const txt=await r.text();let data=null;try{data=txt?JSON.parse(txt):null}catch{data=txt}
  if(!r.ok)throw new Error(data?.message||data?.error||data?.hint||`Request failed (${r.status})`);
  return data;
}
export const publicTalentPhotoUrl=path=>{const clean=String(path||'').replace(/^\/+/,'');return clean&&URL?`${URL}/storage/v1/object/public/canopy-profile-images/${clean}`:''};
export const getPublicTalentDirectory=({query='',after=null,limit=24,country='',achievement='',missionGroupId=null,collaborationOpen=null}={})=>rpc('canopy_public_talent_directory',{p_query:query||null,p_after_slug:after||null,p_limit:limit,p_country:country||null,p_achievement:achievement||null,p_mission_group:missionGroupId||null,p_collaboration_open:collaborationOpen});
export const getPublicTalentFilterOptions=()=>rpc('canopy_public_talent_filter_options');
export const getPublicTalentProfile=slug=>rpc('canopy_public_talent_profile',{p_slug:slug});
export const submitPublicCollaborationRequest=payload=>rpc('canopy_public_submit_collaboration_request',{
 p_slug:payload.slug,p_name:payload.name,p_email:payload.email,p_organization:payload.organization||null,p_message:payload.message
});
export const getPublicCollaborationThread=(id,token)=>rpc('canopy_public_collaboration_thread',{p_request:id,p_token:token});
export const sendPublicCollaborationMessage=(id,token,message)=>rpc('canopy_public_collaboration_send_message',{p_request:id,p_token:token,p_message:message});

export const getPublicC2Achievement=slug=>rpc('womate_public_c2_achievement',{p_slug:slug});

export const submitPublicCollaborationSafetyReport=(id,token,reason,description)=>rpc('canopy_visitor_report_collaboration',{p_request:id,p_token:token,p_reason:reason,p_description:description});

export const submitPublicOrganisationReview=(id,token,website,proofUrl)=>rpc('canopy_visitor_submit_organisation_review',{p_request:id,p_token:token,p_website:website,p_proof_url:proofUrl||null});

export const verifyPublicRequesterEmail=(id,token,accessToken)=>{if(!URL||!KEY)throw new Error('Talent Discovery is not configured.');return fetch(`${URL}/rest/v1/rpc/canopy_verify_collaboration_requester_email`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({p_request:id,p_token:token})}).then(async response=>{const raw=await response.text();let data;try{data=JSON.parse(raw)}catch{data=raw}if(!response.ok)throw new Error(data?.message||'Email verification failed');return data})};
export const getPublicRequesterVerificationStatus=(id,token)=>rpc('canopy_public_collaboration_verification_status',{p_request:id,p_token:token});

export const getPublicFacilitationTerms=(id,token)=>rpc('canopy_public_facilitation_terms',{p_request:id,p_token:token});
export const decidePublicFacilitationTerms=(id,token,accept,accessToken)=>{if(!URL||!KEY)throw new Error('Talent Discovery is not configured.');return fetch(`${URL}/rest/v1/rpc/canopy_requester_decide_facilitation_terms`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({p_request:id,p_token:token,p_accept:Boolean(accept)})}).then(async response=>{const raw=await response.text();let data;try{data=JSON.parse(raw)}catch{data=raw}if(!response.ok)throw new Error(data?.message||'Facilitation response failed');return data})};


export const getPublicTalentInvoice=(id,token)=>rpc('canopy_finance_public_invoice',{p_request:id,p_token:token});
export const getPublicTalentCloseout=(id,token)=>rpc('canopy_finance_public_closeout',{p_request:id,p_token:token});
export const respondPublicTalentCloseout=(id,token,confirm,reason,accessToken)=>{if(!URL||!KEY)throw new Error('Talent Discovery is not configured.');return fetch(`${URL}/rest/v1/rpc/canopy_finance_requester_closeout`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({p_request:id,p_token:token,p_confirm:Boolean(confirm),p_reason:reason||null})}).then(async response=>{const raw=await response.text();let data;try{data=JSON.parse(raw)}catch{data=raw}if(!response.ok)throw new Error(data?.message||'Completion response failed');return data})};


export const startPublicTalentCheckout=async(id,token,authToken)=>{
 if(!URL||!KEY)throw new Error('Talent Discovery is not configured.');
 const r=await fetch(URL+'/functions/v1/womate-talent-checkout',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+authToken,'Content-Type':'application/json'},body:JSON.stringify({request_id:id,access_token:token})});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(data?.error||'WOMATE secure checkout is unavailable');
 return data;
};
