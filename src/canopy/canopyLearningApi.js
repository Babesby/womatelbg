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
export const getCohortAssignmentDrafts=(cohort,s)=>rpc('canopy_27_get_assignment_drafts',{p_cohort:cohort},s);
export const saveCohortAssignmentDraft=(cohort,module,draft,s)=>rpc('canopy_27_save_assignment_draft',{p_cohort:cohort,p_module:module,p_paragraph:draft.paragraph_response||'',p_evidence:draft.evidence_url||'',p_speaker:draft.speaker_url||''},s);
export const submitCohortAssignmentV2=(cohort,module,draft,s)=>rpc('canopy_27_submit_assignment_v2',{p_cohort:cohort,p_module:module,p_response:draft.paragraph_response||'',p_evidence:draft.evidence_url||'',p_speaker:draft.speaker_url||''},s);
export const getCohortAdminWorkspace=(cohort,s)=>rpc('canopy_27_admin_workspace',{p_cohort:cohort},s);
export const reviewCohortAssignment=(id,decision,score,feedback,s)=>rpc('canopy_27_admin_review_assignment',{p_id:id,p_decision:decision,p_score:Number(score),p_feedback:feedback},s);
export const approveCohortCertificate=(cohort,user,approve,note,s)=>rpc('canopy_27_admin_approve_certificate',{p_cohort:cohort,p_user:user,p_approve:approve,p_note:note},s);
export const issueCohortCertificate=(cohort,user,url,s)=>rpc('canopy_27_admin_issue_certificate',{p_cohort:cohort,p_user:user,p_url:url},s);

export const setCohortAttendance=(cohort,user,module,attended,s)=>rpc('canopy_admin_set_cohort_attendance',{p_cohort_key:cohort,p_user_id:user,p_module_id:module,p_attended:Boolean(attended)},s);

export const getCourseCertificateQueue=(s)=>rpc('womate_course_admin_eligible_learners',{},s);
export const approveCourseCertificate=(course,user,note,s)=>rpc('womate_course_admin_approve_certificate',{p_course:course,p_user:user,p_note:note},s);
export const issueCourseCertificate=(course,user,url,s)=>rpc('womate_course_admin_issue_certificate',{p_course:course,p_user:user,p_url:url},s);

export const saveExpertAssessment=(course,module,title,instructions,s)=>rpc('womate_course_expert_save_assessment',{p_course:course,p_module:Number(module),p_title:title,p_instructions:instructions},s);

export const getCohortMissionGroups=(cohort,s)=>rpc('canopy_admin_cohort_mission_groups',{p_cohort_key:cohort},s);
export const getCohortFundingCalls=(cohort,s)=>rpc('canopy_admin_cohort_funding_calls',{p_cohort_key:cohort},s);

export const get2027Graduation=(cohort,s)=>rpc('canopy_27_graduation_view',{p_cohort:cohort},s);
export const save2027GraduationReflection=(cohort,name,note,s)=>rpc('canopy_27_graduation_reflect',{p_cohort:cohort,p_name:name,p_reflection:note},s);
export const get2027AdminGraduationReflections=(cohort,s)=>rpc('canopy_27_admin_graduation_reflections',{p_cohort:cohort},s);
export const moderate2027GraduationReflection=(cohort,user,state,s)=>rpc('canopy_27_admin_moderate_graduation_reflection',{p_cohort:cohort,p_user:user,p_state:state},s);

export const get2027Mission=(cohort,s)=>rpc('canopy_27_mission_view',{p_cohort:cohort},s);
export const respond2027Mission=(cohort,accept,s)=>rpc('canopy_27_mission_respond',{p_cohort:cohort,p_accept:accept},s);
export const message2027Mission=(cohort,body,s)=>rpc('canopy_27_mission_message',{p_cohort:cohort,p_message:body},s);
export const edit2027Mission=(cohort,name,choice,brief,s)=>rpc('canopy_27_mission_update',{p_cohort:cohort,p_name:name,p_choice:choice,p_brief:brief},s);
export const submit2027MissionReport=(cohort,summary,proof,s)=>rpc('canopy_27_mission_submit_report',{p_cohort:cohort,p_summary:summary,p_proof:proof},s);
export const submit2027MissionTeam=(cohort,folder,s)=>rpc('canopy_27_mission_submit_team',{p_cohort:cohort,p_folder:folder},s);
export const publish2027Mission=(cohort,deadline,s)=>rpc('canopy_27_mission_publish',{p_cohort:cohort,p_deadline:deadline},s);
export const form2027MissionTeams=(cohort,s)=>rpc('canopy_27_mission_form_teams',{p_cohort:cohort},s);

export const get2027Support=(cohort,s)=>rpc('canopy_27_support_view',{p_cohort:cohort},s);
export const submit2027Complaint=(cohort,subject,message,s)=>rpc('canopy_27_submit_complaint',{p_cohort:cohort,p_subject:subject,p_message:message},s);
export const send2027SupportAction=(cohort,user,kind,subject,message,s)=>rpc('canopy_27_admin_send_action',{p_cohort:cohort,p_user:user,p_kind:kind,p_subject:subject,p_message:message},s);
export const reply2027Complaint=(cohort,id,reply,resolved,s)=>rpc('canopy_27_admin_reply_complaint',{p_cohort:cohort,p_id:id,p_reply:reply,p_resolved:resolved},s);
export const get2027Inactivity=(cohort,days,s)=>rpc('canopy_27_admin_inactivity',{p_cohort:cohort,p_days:days},s);

export const get2027ModuleSchedule=(cohort,s)=>rpc('canopy_27_module_schedule',{p_cohort:cohort},s);
export const publish2027ModuleSchedule=(cohort,module,data,s)=>rpc('canopy_27_admin_publish_module_schedule',{p_cohort:cohort,p_module:module,p_live:data.live,p_speaker_unlock:data.unlock,p_due:data.due,p_speaker_name:data.speaker,p_speaker_role:data.role||'',p_live_url:data.url,p_poster:data.poster||null,p_grace:data.grace||null},s);
