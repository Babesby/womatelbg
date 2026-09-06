const SUPABASE_URL=(import.meta.env.VITE_SUPABASE_URL||import.meta.env.VITE_CANOPY_SUPABASE_URL||'').replace(/\/$/,'');
const SUPABASE_ANON_KEY=import.meta.env.VITE_SUPABASE_ANON_KEY||import.meta.env.VITE_CANOPY_SUPABASE_ANON_KEY||'';

function configured(){return Boolean(SUPABASE_URL&&SUPABASE_ANON_KEY)}
function headers(session){
 if(!configured())throw new Error('Canopy team access is not configured. Add the Supabase environment variables.');
 if(!session?.access_token)throw new Error('Sign in before using WOMATE team access.');
 return {'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,'Authorization':`Bearer ${session.access_token}`};
}
async function rpc(session,name,payload={}){
 const res=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:headers(session),body:JSON.stringify(payload)});
 const text=await res.text();
 let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
 if(!res.ok){const message=data?.message||data?.hint||data?.details||String(data||`Request failed (${res.status})`);throw new Error(message)}
 return data;
}
const first=v=>Array.isArray(v)?(v[0]??null):v;

export async function getStaffAccess(session){return first(await rpc(session,'canopy_current_staff_access',{}))}
export async function activateTeamAccess(session,code){
 const value=String(code||'').trim();
 if(!value)throw new Error('Enter your WOMATE Team Access Code.');
 return first(await rpc(session,'canopy_activate_team_access',{p_code:value}));
}
export async function createTeamAccessCode(session,{role,moduleId=null,expiresAt=null}){
 return await rpc(session,'canopy_generate_team_access_code',{p_role:role,p_module_id:moduleId||null,p_expires_at:expiresAt||null});
}
export async function generateStandardTeamPack(session,{expiresAt=null}={}){
 return await rpc(session,'canopy_generate_standard_team_pack',{p_expires_at:expiresAt||null});
}
export async function listTeamAccess(session){return first(await rpc(session,'canopy_list_team_access',{}))||{codes:[],members:[]}}
export async function revokeTeamAccessCode(session,codeId){return first(await rpc(session,'canopy_revoke_team_access_code',{p_code_id:codeId}))}
export async function setStaffMembershipStatus(session,userId,status){return first(await rpc(session,'canopy_set_staff_membership_status',{p_user_id:userId,p_status:status}))}
export async function getStaffDashboard(session){return first(await rpc(session,'canopy_staff_dashboard',{}))}
export async function getStaffDashboardPreview(session,{role,moduleId=null}){return first(await rpc(session,'canopy_admin_preview_staff_dashboard',{p_role:role,p_module_id:moduleId||null}))}
export async function nominateCanopySpotlight(session,{submissionId,category,note=''}){
 return first(await rpc(session,'canopy_nominate_spotlight',{p_submission_id:submissionId,p_category:category,p_note:note||null}));
}
export async function updateCanopySpotlightStatus(session,{nominationId,status}){
 return first(await rpc(session,'canopy_update_spotlight_status',{p_nomination_id:nominationId,p_status:status}));
}
