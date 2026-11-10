// WOMATE Canopy participant runtime registry for post-2026 cohorts.
// IMPORTANT: Cohort 2 is intentionally excluded. Its production runtime remains in CanopyApp.jsx.

export const CANOPY_POST_2026_RUNTIMES=Object.freeze({
  'she-leads-climate-c3-2027':Object.freeze({
    cohortKey:'she-leads-climate-c3-2027',
    shortName:'Cohort 3',
    programme:'She Leads Climate Mentorship',
    fullName:'She Leads Climate Mentorship · Cohort 3 · 2027',
    year:2027,
    region:'Africa',
    applicationWindow:'10–20 September 2027',
    sessions:'Programme opens 4 October 2027 · Modules release weekly from 11 October · Graduation 15 November 2027',
    track:'standard',
    accessModel:'free',
    status:'planning',
    audience:'Undergraduates, recent graduates, early-career participants and emerging women climate leaders.',
    promise:'A structured climate leadership journey built around learning, expert sessions, applied assignments and evidence of action.',
    modulesStatus:'ready',
    assignmentsStatus:'ready',
    liveSessionsStatus:'planned',
    certificateStatus:'ready',
    paymentGate:false,
    regionalDelivery:false,
    programmeOpenDate:'2027-10-04',
    moduleReleaseDates:{'01':'2027-10-11','02':'2027-10-18','03':'2027-10-25','04':'2027-11-01','05':'2027-11-08'},
    graduationDate:'2027-11-15',
    admissions:{opens:'2027-09-10',closes:'2027-09-20',decision:'2027-09-26',acceptanceDaysAfterEmail:7,onboardingDeadline:'2027-10-10',seatCapacity:1000}
  }),
  'she-leads-asia-c1-2027':Object.freeze({
    cohortKey:'she-leads-asia-c1-2027',
    shortName:'Cohort 1 · 2027 · Asia',
    programme:'She Leads Climate Mentorship',
    fullName:'She Leads Climate Mentorship · Cohort 1 · 2027',
    year:2027,
    region:'Asia',
    applicationWindow:'15 January–15 February 2027',
    sessions:'Programme opens 1 March 2027 · Modules release weekly from 8 March · Graduation 12 April 2027',
    track:'asia',
    accessModel:'free',
    status:'planning',
    audience:'Undergraduates, recent graduates and emerging women leaders across Asia.',
    promise:'An Asia-led climate leadership journey shaped by regional speakers, coordinators, examples and delivery context.',
    modulesStatus:'ready',
    assignmentsStatus:'ready',
    liveSessionsStatus:'planned',
    certificateStatus:'ready',
    paymentGate:false,
    regionalDelivery:true,
    programmeOpenDate:'2027-03-01',
    moduleReleaseDates:{'01':'2027-03-08','02':'2027-03-15','03':'2027-03-22','04':'2027-03-29','05':'2027-04-05'},
    graduationDate:'2027-04-12',
    timezoneAware:true,
    admissions:{opens:'2027-01-15',closes:'2027-02-15',decision:'2027-02-22',acceptanceDaysAfterEmail:7,onboardingDeadline:'2027-03-07',seatCapacity:1000},
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
