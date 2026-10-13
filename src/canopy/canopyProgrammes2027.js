// WOMATE She Leads 2027 product foundation.
// Planning configuration only. No current Cohort 2 runtime imports this file yet.

export const SHE_LEADS_2027_PROGRAMMES = Object.freeze({
  cohort3: Object.freeze({
    cohortKey:'she-leads-climate-c3-2027',
    name:'She Leads Climate Mentorship · Cohort 3 · 2027',
    region:'Global',
    accessModel:'free',
    competitive:true,
    audience:['undergraduate','recent_graduate','early_career','emerging_leader'],
    curriculumTrack:'standard',
    status:'planning'
  }),
  asia: Object.freeze({
    cohortKey:'she-leads-asia-c1-2027',
    name:'She Leads Asia · Cohort 1 · 2027',
    region:'Asia',
    accessModel:'free',
    competitive:true,
    audience:['undergraduate','recent_graduate','early_career','emerging_leader'],
    curriculumTrack:'asia',
    regionalDelivery:true,
    regionalSpeakers:true,
    regionalCoordinators:true,
    languageSupport:'evaluate_if_low_cost',
    womateRole:'coordination_and_quality_assurance',
    status:'planning'
  }),
  advanced: Object.freeze({
    cohortKey:'she-leads-advanced-c1-2027',
    name:'She Leads Advanced · Cohort 1 · 2027',
    region:'Global',
    accessModel:'paid',
    competitive:true,
    installmentsAllowed:true,
    audience:['experienced_professional','senior_professional'],
    educationFocus:['masters','phd'],
    equivalentSeniorExperienceMayBeConsidered:true,
    excludedPrimaryAudience:['undergraduate','recent_graduate'],
    curriculumTrack:'advanced',
    premiumSpeakers:true,
    distinctAssignments:true,
    directFeedback:true,
    professionalOutputs:true,
    status:'planning'
  })
});

export function sheLeads2027Programme(key){
  return SHE_LEADS_2027_PROGRAMMES[key]||null;
}
