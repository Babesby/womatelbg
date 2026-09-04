const URL=(import.meta.env.VITE_CANOPY_SUPABASE_URL||'').replace(/\/$/,'');
const KEY=import.meta.env.VITE_CANOPY_SUPABASE_ANON_KEY||'';
const STORE='womate_canopy_session_v1';

export const canopyConfigured=Boolean(URL&&KEY);
const headers=(token,extra={})=>({apikey:KEY,'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{Authorization:`Bearer ${KEY}`}),...extra});

export function getStoredSession(){
  try{return JSON.parse(localStorage.getItem(STORE)||'null')}catch{return null}
}
export function storeSession(session){
  if(session)localStorage.setItem(STORE,JSON.stringify(session));else localStorage.removeItem(STORE);
}
async function parse(r){const txt=await r.text();let data=null;try{data=txt?JSON.parse(txt):null}catch{data=txt}if(!r.ok)throw new Error(data?.msg||data?.message||data?.error_description||data?.error||`Request failed (${r.status})`);return data}

const callbackUrl=()=>`${window.location.origin}/canopy/auth/callback`;
const recoveryUrl=()=>`${window.location.origin}/canopy/auth/callback`;

export async function signIn(email,password){
  if(!canopyConfigured)throw new Error('Canopy authentication is not configured yet.');
  const r=await fetch(`${URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:headers(),body:JSON.stringify({email:email.trim(),password})});
  const data=await parse(r);const session=data?.session||data;if(!session?.access_token)throw new Error('Supabase signed in but did not return a usable session.');storeSession(session);return session;
}
export async function signUp({email,password,full_name,country}){
  if(!canopyConfigured)throw new Error('Canopy authentication is not configured yet.');
  const redirect=encodeURIComponent(callbackUrl());
  const r=await fetch(`${URL}/auth/v1/signup?redirect_to=${redirect}`,{method:'POST',headers:headers(),body:JSON.stringify({email:email.trim(),password,data:{full_name:full_name.trim(),country:country.trim()}})});
  const data=await parse(r);
  if(data?.access_token)storeSession(data);
  const identities=data?.user?.identities;
  return {...data,possible_existing_account:Array.isArray(identities)&&identities.length===0};
}
export async function resendConfirmation(email){
  if(!canopyConfigured)throw new Error('Canopy authentication is not configured yet.');
  if(!email?.trim())throw new Error('Enter your email address first.');
  const r=await fetch(`${URL}/auth/v1/resend`,{method:'POST',headers:headers(),body:JSON.stringify({type:'signup',email:email.trim(),options:{emailRedirectTo:callbackUrl()}})});
  return parse(r);
}
export async function requestPasswordReset(email){
  if(!canopyConfigured)throw new Error('Canopy authentication is not configured yet.');
  if(!email?.trim())throw new Error('Enter your email address first.');
  const redirect=encodeURIComponent(recoveryUrl());
  const r=await fetch(`${URL}/auth/v1/recover?redirect_to=${redirect}`,{method:'POST',headers:headers(),body:JSON.stringify({email:email.trim()})});
  return parse(r);
}
export async function updatePassword(password,session=getStoredSession()){
  if(!session?.access_token)throw new Error('Your password-reset session is missing or has expired. Request a new reset link.');
  const r=await fetch(`${URL}/auth/v1/user`,{method:'PUT',headers:headers(session.access_token),body:JSON.stringify({password})});
  return parse(r);
}
export async function consumeAuthCallback(){
  const hash=new URLSearchParams(window.location.hash.replace(/^#/,''));
  const query=new URLSearchParams(window.location.search);
  const error=hash.get('error_description')||query.get('error_description')||hash.get('error')||query.get('error');
  if(error)throw new Error(decodeURIComponent(error.replace(/\+/g,' ')));
  const access_token=hash.get('access_token');
  const refresh_token=hash.get('refresh_token');
  const type=hash.get('type')||query.get('type')||'signup';
  if(!access_token)return {type,session:getStoredSession()};
  const expires_in=Number(hash.get('expires_in')||3600);
  const expires_at=Number(hash.get('expires_at')||Math.floor(Date.now()/1000)+expires_in);
  const ur=await fetch(`${URL}/auth/v1/user`,{headers:headers(access_token)});
  const user=await parse(ur);
  const session={access_token,refresh_token,expires_in,expires_at,token_type:hash.get('token_type')||'bearer',user};
  storeSession(session);
  window.history.replaceState({},'',window.location.pathname);
  return {type,session};
}
export async function refreshSession(session){
  if(!session?.refresh_token||!canopyConfigured)return session;
  if(session.expires_at&&Date.now()/1000 < session.expires_at-90)return session;
  const r=await fetch(`${URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:headers(),body:JSON.stringify({refresh_token:session.refresh_token})});
  const data=await parse(r);storeSession(data);return data;
}
export async function signOut(){
  const session=getStoredSession();
  try{if(session?.access_token&&canopyConfigured)await fetch(`${URL}/auth/v1/logout`,{method:'POST',headers:headers(session.access_token)})}catch{}
  storeSession(null);
}
async function rest(path,{token,method='GET',body,prefer}={}){
  if(!canopyConfigured)throw new Error('Canopy database is not configured yet.');
  const r=await fetch(`${URL}/rest/v1/${path}`,{method,headers:{...headers(token),...(prefer?{Prefer:prefer}:{})},body:body?JSON.stringify(body):undefined});
  return parse(r);
}
export async function getViewer(session){
  const fresh=await refreshSession(session||getStoredSession());
  if(!fresh?.access_token)return null;
  const userId=fresh.user?.id;
  const [profiles,enrollments,announcements]=await Promise.all([
    rest(`canopy_profiles?select=*&user_id=eq.${userId}&limit=1`,{token:fresh.access_token}),
    rest(`canopy_enrollments?select=*&user_id=eq.${userId}&order=created_at.desc`,{token:fresh.access_token}),
    rest(`canopy_announcements?select=*&published=eq.true&order=published_at.desc&limit=8`,{token:fresh.access_token})
  ]);
  return {session:fresh,user:fresh.user,profile:profiles?.[0]||null,enrollments:enrollments||[],announcements:announcements||[]};
}
export async function getProgress(session){
  const s=await refreshSession(session||getStoredSession());if(!s?.access_token)return[];
  return rest(`canopy_lesson_progress?select=*&user_id=eq.${s.user.id}`,{token:s.access_token});
}
export async function markLesson(session,lessonId,moduleId,completed=true){
  const s=await refreshSession(session||getStoredSession());
  return rest('canopy_lesson_progress?on_conflict=user_id,lesson_id',{token:s.access_token,method:'POST',prefer:'resolution=merge-duplicates,return=representation',body:{user_id:s.user.id,lesson_id:lessonId,module_id:moduleId,completed,completed_at:completed?new Date().toISOString():null}});
}
export async function saveQuiz(session,moduleId,score,total){
  const s=await refreshSession(session||getStoredSession());
  return rest('canopy_quiz_attempts',{token:s.access_token,method:'POST',prefer:'return=representation',body:{user_id:s.user.id,module_id:moduleId,score,total}});
}
export async function getSubmissions(session){
  const s=await refreshSession(session||getStoredSession());if(!s?.access_token)return[];
  return rest(`canopy_submissions?select=*&user_id=eq.${s.user.id}&order=submitted_at.desc`,{token:s.access_token});
}
export async function submitAssignment(session,moduleId,title,response){
  const s=await refreshSession(session||getStoredSession());
  return rest('canopy_submissions',{token:s.access_token,method:'POST',prefer:'return=representation',body:{user_id:s.user.id,module_id:moduleId,title,response,status:'submitted'}});
}
export async function getManagerSnapshot(session){
  const s=await refreshSession(session||getStoredSession());if(!s?.access_token)return null;
  try{await rest('rpc/canopy_refresh_learning_automation',{token:s.access_token,method:'POST',body:{}})}catch{}
  const [profiles,enrollments,progress,submissions,actions]=await Promise.all([
    rest('canopy_profiles?select=user_id,full_name,country,role&order=full_name.asc',{token:s.access_token}),
    rest('canopy_enrollments?select=*&order=created_at.asc',{token:s.access_token}),
    rest('canopy_lesson_progress?select=*',{token:s.access_token}),
    rest('rpc/canopy_manager_weekly_submissions',{token:s.access_token,method:'POST',body:{}}),
    rest('canopy_manager_actions?select=*&order=created_at.desc',{token:s.access_token})
  ]);
  return {profiles:profiles||[],enrollments:enrollments||[],progress:progress||[],submissions:submissions||[],actions:actions||[]};
}


export async function setLearnerEnrollmentStatus(session,userId,status){
  const s=await refreshSession(session||getStoredSession());
  if(!s?.access_token)throw new Error('Your Canopy session has expired. Sign in again.');
  if(!['active','inactive','paused'].includes(status))throw new Error('Invalid enrolment status.');
  const dbStatus=status==='inactive'?'paused':status;

  const existing=await rest(
    `canopy_enrollments?select=*&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=1`,
    {token:s.access_token}
  );

  if(!existing?.length){
    throw new Error('This learner does not yet have a Canopy enrolment record. Create the learner enrolment in Supabase first, then activate it here.');
  }

  const row=existing[0];
  const key=row.id ? `id=eq.${encodeURIComponent(row.id)}` : `user_id=eq.${encodeURIComponent(userId)}`;
  return rest(
    `canopy_enrollments?${key}`,
    {
      token:s.access_token,
      method:'PATCH',
      prefer:'return=representation',
      body:{status:dbStatus}
    }
  );
}


export async function getManagerActions(session){
  const s=await refreshSession(session||getStoredSession());if(!s?.access_token)return[];
  return rest('canopy_manager_actions?select=*&order=created_at.desc',{token:s.access_token});
}
export async function createManagerAction(session,payload){
  const s=await refreshSession(session||getStoredSession());
  if(!s?.access_token)throw new Error('Your Canopy session has expired. Sign in again.');
  return rest('canopy_manager_actions',{token:s.access_token,method:'POST',prefer:'return=representation',body:{...payload,created_by:s.user.id}});
}
export async function updateManagerAction(session,id,body){
  const s=await refreshSession(session||getStoredSession());
  if(!s?.access_token)throw new Error('Your Canopy session has expired. Sign in again.');
  return rest(`canopy_manager_actions?id=eq.${encodeURIComponent(id)}`,{token:s.access_token,method:'PATCH',prefer:'return=representation',body});
}


export async function reviewWeeklyAssignment(session,{submissionId,score,feedback,decision}){
  const s=await refreshSession(session||getStoredSession());
  if(!s?.access_token)throw new Error('Your Canopy session has expired. Sign in again.');
  return rest('rpc/canopy_manager_review_assignment',{token:s.access_token,method:'POST',body:{
    p_submission_id:submissionId,
    p_score:Number(score),
    p_feedback:feedback||'',
    p_decision:decision||'completed'
  }});
}


// ---- WOMATE CANOPY automated learning ---------------------------------------
export async function refreshLearningAutomation(session){
  const s=await refreshSession(session||getStoredSession());if(!s?.access_token)return null;
  return rest('rpc/canopy_refresh_learning_automation',{token:s.access_token,method:'POST',body:{}});
}
export async function getWeeklyAssignmentSubmissions(session){
  const s=await refreshSession(session||getStoredSession());if(!s?.access_token)return[];
  return rest(`canopy_assignment_submissions?select=*&user_id=eq.${s.user.id}&order=submitted_at.desc`,{token:s.access_token});
}
export async function submitWeeklyAssignment(session,weekKey,payload){
  const s=await refreshSession(session||getStoredSession());if(!s?.access_token)throw new Error('Your Canopy session has expired. Sign in again.');
  return rest('rpc/canopy_submit_weekly_assignment',{token:s.access_token,method:'POST',body:{
    p_week_key:weekKey,p_paragraph_response:payload.paragraph_response,p_canvas_link:payload.canvas_link,p_linkedin_link:payload.linkedin_link
  }});
}
export async function getPuzzleProgress(session){
  const s=await refreshSession(session||getStoredSession());if(!s?.access_token)return[];
  return rest(`canopy_puzzle_progress?select=*&user_id=eq.${s.user.id}`,{token:s.access_token});
}
export async function savePuzzleCompletion(session,weekKey){
  const s=await refreshSession(session||getStoredSession());
  return rest('canopy_puzzle_progress?on_conflict=user_id,week_key',{token:s.access_token,method:'POST',prefer:'resolution=merge-duplicates,return=representation',body:{user_id:s.user.id,week_key:weekKey,completed:true,completed_at:new Date().toISOString()}});
}
export async function getCanopyNotifications(session){
  const s=await refreshSession(session||getStoredSession());if(!s?.access_token)return[];
  return rest(`canopy_notifications?select=*&user_id=eq.${s.user.id}&order=created_at.desc&limit=100`,{token:s.access_token});
}
export async function markNotificationRead(session,id){
  const s=await refreshSession(session||getStoredSession());
  return rest(`canopy_notifications?id=eq.${encodeURIComponent(id)}&user_id=eq.${s.user.id}`,{token:s.access_token,method:'PATCH',prefer:'return=representation',body:{read_at:new Date().toISOString()}});
}
export async function getCertificates(session){
  const s=await refreshSession(session||getStoredSession());if(!s?.access_token)return[];
  return rest(`canopy_certificates?select=*&user_id=eq.${s.user.id}&order=issued_at.desc`,{token:s.access_token});
}

