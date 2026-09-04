// WOMATE CANOPY — She Leads Climate Mentorship · Cohort 2 · 2026
// Weekly work opens Monday 00:00 GMT.
// The speaker/LinkedIn task unlocks Thursday after the live session.
// Everything required for that week is due Sunday 23:59 GMT.

export const CANOPY_ASSIGNMENT_SCHEDULE = [
  {
    weekKey:'module-01', moduleId:'01', title:'Understanding Climate Change',
    weekStartsAt:'2026-09-21T00:00:00Z',
    speakerOpensAt:'2026-09-24T18:00:00Z',
    dueAt:'2026-09-27T23:59:59Z',
    resubmitUntil:'2026-09-30T23:59:59Z',
    puzzleTerms:['CLIMATE','ADAPTATION','MITIGATION','RESILIENCE'],
    speakerPrompt:'Complete the challenge announced by the expert during the Thursday live session and publish the required reflection or action post on LinkedIn.'
  },
  {
    weekKey:'module-02', moduleId:'02', title:'Gender & Climate Justice',
    weekStartsAt:'2026-09-28T00:00:00Z',
    speakerOpensAt:'2026-10-01T18:00:00Z',
    dueAt:'2026-10-04T23:59:59Z',
    resubmitUntil:'2026-10-07T23:59:59Z',
    puzzleTerms:['JUSTICE','EQUITY','GENDER','INCLUSION'],
    speakerPrompt:'Complete the challenge announced by the expert during the Thursday live session and publish the required reflection or action post on LinkedIn.'
  },
  {
    weekKey:'module-03', moduleId:'03', title:'Climate Governance & Policy',
    weekStartsAt:'2026-10-05T00:00:00Z',
    speakerOpensAt:'2026-10-08T18:00:00Z',
    dueAt:'2026-10-11T23:59:59Z',
    resubmitUntil:'2026-10-14T23:59:59Z',
    puzzleTerms:['POLICY','NDC','UNFCCC','GOVERNANCE'],
    speakerPrompt:'Complete the challenge announced by the expert during the Thursday live session and publish the required reflection or action post on LinkedIn.'
  },
  {
    weekKey:'module-04', moduleId:'04', title:'Climate Advocacy & Digital Innovation',
    weekStartsAt:'2026-10-12T00:00:00Z',
    speakerOpensAt:'2026-10-15T18:00:00Z',
    dueAt:'2026-10-18T23:59:59Z',
    resubmitUntil:'2026-10-21T23:59:59Z',
    puzzleTerms:['ADVOCACY','EVIDENCE','DIGITAL','MOBILISE'],
    speakerPrompt:'Complete the challenge announced by the expert during the Thursday live session and publish the required reflection or action post on LinkedIn.'
  },
  {
    weekKey:'module-05', moduleId:'05', title:'Leadership & Professional Pathways',
    weekStartsAt:'2026-10-19T00:00:00Z',
    speakerOpensAt:'2026-10-22T18:00:00Z',
    dueAt:'2026-10-25T23:59:59Z',
    resubmitUntil:'2026-10-28T23:59:59Z',
    puzzleTerms:['LEADERSHIP','NETWORK','CAREER','ACTION'],
    speakerPrompt:'Complete the final challenge announced by the expert during the Thursday live session and publish the required reflection or action post on LinkedIn.'
  }
];

export function openAssignments(now=new Date()){
  return CANOPY_ASSIGNMENT_SCHEDULE.filter(item => now >= new Date(item.weekStartsAt));
}

export function speakerChallengeOpen(item,now=new Date()){
  return now >= new Date(item.speakerOpensAt);
}

export function formatCanopyDate(value){
  return new Intl.DateTimeFormat('en-GB',{
    weekday:'short',day:'numeric',month:'short',year:'numeric',
    hour:'2-digit',minute:'2-digit',timeZone:'UTC',timeZoneName:'short'
  }).format(new Date(value));
}
