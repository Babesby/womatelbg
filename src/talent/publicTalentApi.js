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
