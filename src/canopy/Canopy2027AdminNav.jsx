import React from 'react';
import {LayoutDashboard,ClipboardList,Users,BookOpenCheck,GraduationCap,Compass,ArrowUpRight} from 'lucide-react';
import './Canopy2027AdminNav.css';

const sections=[
 {name:'Overview',Icon:LayoutDashboard,links:[['/canopy/manage','Dashboard'],['/canopy/manage/reports','Reports']]},
 {name:'Admissions',Icon:ClipboardList,links:[['/canopy/manage/admissions','Applications & selection'],['/canopy/manage/communications','Email & reminders'],['/canopy/manage/access','Learner access']]},
 {name:'Learning',Icon:BookOpenCheck,links:[['/canopy/manage/reviews','Assignment reviews'],['/canopy/manage/attendance','Live attendance']]},
 {name:'Completion',Icon:GraduationCap,links:[['/canopy/manage/certificates','Eligibility & certificates']]},
 {name:'Opportunities',Icon:Compass,links:[['/canopy/manage/missions','Mission groups'],['/canopy/manage/funding','Funding calls']]}
];
const allLinks=sections.flatMap(s=>s.links.map(([path,label])=>({path,label,group:s.name})));
export default function Canopy2027AdminNav({path,onNavigate,cohort}){
 const active=allLinks.find(x=>x.path===path)||allLinks[0];
 return <nav className="c27-adminNav" aria-label="2027 cohort operations navigation">
   <div className="c27-adminNavHeading"><div><strong>2027 cohort workspace</strong><span>{cohort?.display_name||'Selected programme'} · One management hub</span></div><span className="c27-adminNavCurrent">Viewing: {active.label}</span></div>
   <label className="c27-adminMobileSelect"><span>Choose management area</span><select value={active.path} onChange={e=>onNavigate(e.target.value)}>{sections.map(s=><optgroup key={s.name} label={s.name}>{s.links.map(([url,label])=><option key={url} value={url}>{label}</option>)}</optgroup>)}</select></label>
   <div className="c27-adminNavGroups">{sections.map(s=><section className={'c27-adminNavGroup'+(s.links.some(([url])=>url===active.path)?' is-current':'')} key={s.name} aria-label={s.name}><div className="c27-adminNavLabel"><s.Icon size={16} aria-hidden="true"/><span>{s.name}</span></div><div className="c27-adminNavLinks">{s.links.map(([url,label])=><button key={url} type="button" aria-current={active.path===url?'page':undefined} className={active.path===url?'is-active':''} onClick={()=>onNavigate(url)}>{label}<ArrowUpRight size={13} aria-hidden="true"/></button>)}</div></section>)}</div>
 </nav>;
}
