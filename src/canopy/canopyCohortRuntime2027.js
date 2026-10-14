// WOMATE Canopy participant runtime registry for post-2026 cohorts.
// IMPORTANT: Cohort 2 is intentionally excluded. Its production runtime remains in CanopyApp.jsx.

export const CANOPY_POST_2026_RUNTIMES=Object.freeze({
  'she-leads-climate-c3-2027':Object.freeze({
    cohortKey:'she-leads-climate-c3-2027',
    shortName:'Cohort 3',
    programme:'She Leads Climate Mentorship',
    fullName:'She Leads Climate Mentorship · Cohort 3 · 2027',
    year:2027,
    region:'Global',
    track:'standard',
    accessModel:'free',
    status:'planning',
    audience:'Undergraduates, recent graduates, early-career participants and emerging women climate leaders.',
    promise:'A structured climate leadership journey built around learning, expert sessions, applied assignments and evidence of action.',
    modulesStatus:'configuration_pending',
    assignmentsStatus:'configuration_pending',
    liveSessionsStatus:'configuration_pending',
    certificateStatus:'configuration_pending',
    paymentGate:false,
    regionalDelivery:false
  }),
  'she-leads-asia-c1-2027':Object.freeze({
    cohortKey:'she-leads-asia-c1-2027',
    shortName:'Asia Cohort 1',
    programme:'She Leads Asia',
    fullName:'She Leads Asia · Cohort 1 · 2027',
    year:2027,
    region:'Asia',
    track:'asia',
    accessModel:'free',
    status:'planning',
    audience:'Undergraduates, recent graduates and emerging women leaders across Asia.',
    promise:'An Asia-led climate leadership journey shaped by regional speakers, coordinators, examples and delivery context.',
    modulesStatus:'configuration_pending',
    assignmentsStatus:'configuration_pending',
    liveSessionsStatus:'configuration_pending',
    certificateStatus:'configuration_pending',
    paymentGate:false,
    regionalDelivery:true,
    timezoneAware:true,
    languageSupport:'planned_evaluation'
  }),
  'she-leads-advanced-c1-2027':Object.freeze({
    cohortKey:'she-leads-advanced-c1-2027',
    shortName:'Advanced Cohort 1',
    programme:'She Leads Advanced',
    fullName:'She Leads Advanced · Cohort 1 · 2027',
    year:2027,
    region:'Global',
    track:'advanced',
    accessModel:'paid',
    status:'planning',
    audience:'Experienced and senior professionals, with postgraduate-level profiles and equivalent senior experience considered.',
    promise:'A premium advanced leadership track with distinct assignments, professional outputs, premium speakers and direct feedback.',
    modulesStatus:'configuration_pending',
    assignmentsStatus:'configuration_pending',
    liveSessionsStatus:'configuration_pending',
    certificateStatus:'configuration_pending',
    paymentGate:true,
    installmentsAllowed:true,
    regionalDelivery:false
  })
});

export function canopyPost2026Runtime(cohortKey){
  return CANOPY_POST_2026_RUNTIMES[String(cohortKey||'')]||null;
}

export function isPost2026RuntimeCohort(cohortKey){
  return Boolean(canopyPost2026Runtime(cohortKey));
}
