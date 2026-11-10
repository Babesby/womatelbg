const API=(import.meta.env.VITE_CANOPY_SUPABASE_URL||'').replace(/\/$/,'');
const KEY=import.meta.env.VITE_CANOPY_SUPABASE_ANON_KEY||'';

async function rpc(name,body={},session=null){
 if(!API||!KEY)throw new Error('Admissions service is unavailable.');
 const token=session?.access_token||KEY;
 const r=await fetch(API+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
 let data=null;try{data=await r.json()}catch{}
 if(!r.ok)throw new Error(data?.message||data?.error||'Admissions request failed.');
 return data;
}
export const getAdmissionsState=cohortKey=>rpc('womate_public_cohort_admissions_state',{p_cohort:cohortKey});
export const submitCohortApplication=(cohortKey,form)=>rpc('womate_submit_cohort_application',{
 p_cohort:cohortKey,p_full_name:form.full_name,p_email:form.email,p_country:form.country,p_city_region:form.city_region||'',
 p_climate_focus:form.climate_focus,p_motivation:form.motivation,p_experience:form.experience,p_commitment:form.commitment,
 p_consent:Boolean(form.consent),p_privacy_accepted:Boolean(form.privacy_accepted),p_website:form.website||''
});
export const getApplicationStatus=(reference,email)=>rpc('womate_public_application_status',{p_reference:reference,p_email:email});
export const acceptCohortOffer=(reference,email,code,accept)=>rpc('womate_accept_cohort_offer',{p_reference:reference,p_email:email,p_code:code,p_accept:Boolean(accept)});
export const listCohortApplications=(cohortKey,session)=>rpc('womate_admin_list_cohort_applications',{p_cohort:cohortKey},session);
export const setCohortAdmissions=(cohortKey,isOpen,opensAt,closesAt,session)=>rpc('womate_admin_set_admissions',{p_cohort:cohortKey,p_is_open:Boolean(isOpen),p_opens_at:opensAt||null,p_closes_at:closesAt||null},session);
export const reviewCohortApplication=(id,status,score,privateNote,publicNote,offerExpiresAt,session)=>rpc('womate_admin_review_application',{
 p_application:id,p_status:status,p_score:score===''||score==null?null:Number(score),p_private_note:privateNote||null,p_public_note:publicNote||null,p_offer_expires_at:offerExpiresAt||null
},session);
export const claimAcceptedAdmission=(reference,session)=>rpc('womate_claim_accepted_admission',{p_reference:reference},session);
export const completeCohortOnboarding=(reference,form,session)=>rpc('womate_complete_cohort_onboarding',{
 p_reference:reference,p_timezone:form.timezone,p_whatsapp:form.whatsapp||'',p_learning_goal:form.learning_goal,
 p_participant_agreement:Boolean(form.participant_agreement),p_notifications:Boolean(form.notifications)
},session);
