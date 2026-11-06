import {getStoredSession,refreshSession} from './canopyApi';

const URL=(import.meta.env.VITE_CANOPY_SUPABASE_URL||'').replace(/\/$/,'');
const KEY=import.meta.env.VITE_CANOPY_SUPABASE_ANON_KEY||'';
async function rpc(method,body={},session=null){
  if(!URL||!KEY)throw new Error('Canopy is not configured');
  const s=await refreshSession(session||getStoredSession());
  if(!s?.access_token)throw new Error('Sign in to Canopy to continue');
  const response=await fetch(`${URL}/rest/v1/rpc/${method}`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  let data;try{data=await response.json()}catch{data=null}
  if(!response.ok)throw new Error(data?.message||data?.error||'Unable to complete your request');
  return data;
}
export const getCourseWorkspace=(s)=>rpc('womate_course_catalog_workspace',{},s);
export const readCourse=(slug,s)=>rpc('womate_course_read',{p_slug:slug},s);
export const completeCourseLesson=(id,s)=>rpc('womate_course_complete_lesson',{p_lesson:id},s);
export const submitCourseAssessment=(id,response,evidence,s)=>rpc('womate_course_submit_assessment',{p_assessment:id,p_response:response,p_evidence:evidence||null},s);
export const applyExpert=(name,headline,bio,portfolio,s)=>rpc('womate_course_apply_instructor',{p_name:name,p_headline:headline,p_bio:bio,p_profile:portfolio||null},s);
export const createExpertCourse=(title,summary,price,s)=>rpc('womate_course_expert_create',{p_title:title,p_summary:summary,p_price:Number(price)},s);
export const saveExpertLesson=(course,module,number,title,objective,body,activity,s)=>rpc('womate_course_expert_save_lesson',{p_course:course,p_module:module,p_number:number,p_title:title,p_objective:objective,p_body:body,p_activity:activity},s);
export const submitExpertCourse=(id,s)=>rpc('womate_course_expert_submit',{p_course:id},s);
export const adminCourseQueue=(s)=>rpc('womate_course_admin_queue',{},s);
export const adminReviewExpert=(id,approve,note,s)=>rpc('womate_course_admin_review_instructor',{p_user:id,p_approve:approve,p_note:note},s);
export const adminReviewCourse=(id,decision,note,s)=>rpc('womate_course_admin_review_course',{p_course:id,p_decision:decision,p_note:note},s);
export const adminReviewAssessment=(id,decision,score,feedback,s)=>rpc('womate_course_admin_review_assessment',{p_submission:id,p_decision:decision,p_score:Number(score),p_feedback:feedback},s);
export const getCohortWorkspace=(cohort,s)=>rpc('canopy_27_my_workspace',{p_cohort:cohort},s);
export const completeCohortLesson=(cohort,id,s)=>rpc('canopy_27_complete_lesson',{p_cohort:cohort,p_lesson:id},s);
export const submitCohortAssignment=(cohort,module,response,evidence,s)=>rpc('canopy_27_submit_assignment',{p_cohort:cohort,p_module:module,p_response:response,p_evidence:evidence||null},s);
export const getCohortAdminWorkspace=(cohort,s)=>rpc('canopy_27_admin_workspace',{p_cohort:cohort},s);
export const reviewCohortAssignment=(id,decision,score,feedback,s)=>rpc('canopy_27_admin_review_assignment',{p_id:id,p_decision:decision,p_score:Number(score),p_feedback:feedback},s);
export const approveCohortCertificate=(cohort,user,approve,note,s)=>rpc('canopy_27_admin_approve_certificate',{p_cohort:cohort,p_user:user,p_approve:approve,p_note:note},s);
export const issueCohortCertificate=(cohort,user,url,s)=>rpc('canopy_27_admin_issue_certificate',{p_cohort:cohort,p_user:user,p_url:url},s);

export const setCohortAttendance=(cohort,user,module,attended,s)=>rpc('canopy_admin_set_cohort_attendance',{p_cohort_key:cohort,p_user_id:user,p_module_id:module,p_attended:Boolean(attended)},s);

export const getCourseCertificateQueue=(s)=>rpc('womate_course_admin_eligible_learners',{},s);
export const approveCourseCertificate=(course,user,note,s)=>rpc('womate_course_admin_approve_certificate',{p_course:course,p_user:user,p_note:note},s);
export const issueCourseCertificate=(course,user,url,s)=>rpc('womate_course_admin_issue_certificate',{p_course:course,p_user:user,p_url:url},s);
