import {canopyModules2026,canopySources} from './canopyCurriculum2026';

export const CANOPY_BRAND={
  name:'WOMATE Canopy',
  short:'Canopy',
  strap:'Climate learning by WOMATE',
  programme:'She Leads Climate Mentorship',
  cohort:'Cohort 2 · 2026',
  duration:'8 weeks',
  level:'Foundational',
  cost:'Free'
};

const envVideo=(...keys)=>{
  for(const key of keys){
    const value=import.meta.env?.[key];
    if(value)return value;
  }
  return '';
};

const videoFor=(moduleId)=>envVideo(
  `VITE_CANOPY_VIDEO_MODULE_${Number(moduleId)}`,
  `VITE_CANOPY_MODULE_${moduleId}_VIDEO_ID`,
  `VITE_CANOPY_VIDEO_${moduleId}`
);

export const modules=canopyModules2026.map((m)=>({
  id:m.id,
  slug:m.slug,
  number:m.id,
  week:m.weekLabel,
  weekLabel:m.weekLabel,
  liveDate:m.liveDate,
  title:m.title,
  question:m.framingQuestion,
  summary:m.overview,
  outcomes:m.outcomes,
  youtubeId:videoFor(m.id),
  lessons:m.lessons.map((l)=>({
    id:l.id,
    title:l.title,
    minutes:l.minutes,
    body:l.body,
    takeaway:l.keyIdea,
    keyIdea:l.keyIdea,
    check:l.check,
    sources:l.sources
  })),
  quiz:m.lessons.map((l)=>({
    q:l.check.question,
    options:l.check.options,
    answer:l.check.answer,
    explanation:l.check.explanation
  })),
  caseStudy:m.caseStudy,
  assignment:{
    title:m.id==='05'?'Final Assignment · 90-day Climate Action Note':`Assignment ${m.id}`,
    prompt:m.assignment.paragraphPrompt,
    paragraphPrompt:m.assignment.paragraphPrompt,
    canvasBrief:m.assignment.canvasBrief,
    puzzle:m.assignment.puzzle,
    rubric:m.assignment.rubric
  },
  sources:m.sources
}));

export const totalLessons=modules.reduce((sum,m)=>sum+m.lessons.length,0);

export const resources=[
  ...Object.values(canopySources).map(s=>({title:s.label,type:'Authoritative climate reference',url:s.url})),
  {title:'WOMATE — She Leads',type:'Programme page',url:'https://www.womate.org/she-leads'},
  {title:'WOMATE — Circle',type:'Community',url:'https://www.womate.org/circle'}
];
