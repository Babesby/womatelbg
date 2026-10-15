import React from 'react';
import {BookOpen, CalendarClock, ClipboardList, GraduationCap, LockKeyhole, ShieldCheck} from 'lucide-react';
import {getCanopy2027Draft} from './config2027';
import './canopy2027DraftPreview.css';

const twoDigit = value => String(value).padStart(2, '0');
const emptyLabel = value => value || 'Not scheduled';

export default function Canopy2027DraftPreview({cohortKey, section}) {
  // This component is rendered ONLY by the tester route. It never changes publication state.
  const cfg = getCanopy2027Draft(cohortKey);
  if (!cfg || cfg.lifecycle !== 'draft' || cfg.publication?.published || cfg.publication?.approved) {
    return <section className="canopy27DraftEmpty" role="status">No unpublished preview configuration is available for this cohort.</section>;
  }
  const modules = [...cfg.modules].sort((a,b) => a.order - b.order);
  const intro = {
    overview: ['Curriculum review','Review the proposed learning journey. All content is editorial draft only.'],
    course: ['Draft curriculum','Module outcomes and lesson structures proposed for review.'],
    assignments: ['Draft assessments','Assignment titles are proposals. Briefs, rubrics and deadlines are not approved.'],
    schedule: ['Delivery planning','No speakers, coordinators, dates or session links are confirmed.'],
    progress: ['Progress rules','Progress tracking and learner completion remain inactive.'],
    certificate: ['Certification policy','Certification is disabled until requirements and manual review are approved.']
  };
  const [heading, description] = intro[section] || intro.overview;
  return <section className="canopy27DraftRoot" aria-label="2027 unpublished programme preview">
    <div className="canopy27DraftBanner"><ShieldCheck size={19}/><div><strong>TESTER ONLY · UNPUBLISHED DRAFT</strong><p>Previewing proposed material for {cfg.name}. This does not open lessons, accept submissions, grant access, or issue certificates.</p></div></div>
    <div className="canopy27DraftHeading"><div><span className="canopyEyebrow">2027 PROGRAMME CONFIGURATION</span><h2>{heading}</h2><p>{description}</p></div><span className="canopy27DraftCounter">{modules.length} proposed modules</span></div>
    {(section === 'overview' || section === 'course') && <div className="canopy27DraftModules">
      {modules.map(m => <article key={m.id} className="canopy27DraftModule"><div className="canopy27DraftModuleTop"><span className="canopy27DraftNumber">{twoDigit(m.order)}</span><div><span className="canopy27DraftKicker">MODULE · PROPOSED</span><h3>{m.title}</h3></div></div><p>{m.learningOutcomes?.join(' · ') || 'Learning outcomes pending review.'}</p><div className="canopy27DraftLessonList">{(m.lessons || []).map(l => <span key={l.id}><BookOpen size={14}/>{l.title}</span>)}</div><div className="canopy27DraftModuleFoot"><span><ClipboardList size={15}/> {m.assignment?.title || 'Assignment pending'}</span><span><CalendarClock size={15}/> Session unscheduled</span></div></article>)}
    </div>}
    {section === 'assignments' && <div className="canopy27DraftModules">{modules.map(m => <article key={m.id} className="canopy27DraftModule"><span className="canopy27DraftKicker">MODULE {twoDigit(m.order)} · DRAFT ASSIGNMENT</span><h3>{m.assignment?.title || 'Assignment pending'}</h3><p>{m.title}</p><div className="canopy27DraftModuleFoot"><span>Brief and rubric pending</span><span>Submissions disabled</span><span>Deadline not set</span></div></article>)}</div>}
    {section === 'schedule' && <div className="canopy27DraftModules">{modules.map(m => <article key={m.id} className="canopy27DraftModule"><span className="canopy27DraftKicker">SESSION {twoDigit(m.order)} · NOT SCHEDULED</span><h3>{m.title}</h3><p>Speaker and coordinator: not assigned</p><div className="canopy27DraftModuleFoot"><span><CalendarClock size={15}/> {emptyLabel(m.liveSession?.startsAt)}</span><span>Planning timezone: {m.liveSession?.timezone || cfg.timezone}</span><span>Session link unavailable</span></div></article>)}</div>}
    {(section === 'progress' || section === 'certificate') && <div className="canopy27DraftPolicy"><div className="canopy27DraftPolicyIcon">{section === 'certificate' ? <GraduationCap/> : <LockKeyhole/>}</div><h3>{section === 'certificate' ? 'Certificate issuance is disabled' : 'No learner progress is activated'}</h3><p>Attendance thresholds, assignment pass requirements and completion eligibility remain unapproved. Manual review is required. This preview does not read learner records.</p><div className="canopy27DraftPolicyTags"><span>Attendance threshold: pending</span><span>Assignment pass threshold: pending</span><span>Manual review: required</span>{cfg.accessModel === 'paid' && <span>Payment gateway: not configured</span>}</div></div>}
    <p className="canopy27DraftDisclaimer">Planning proposal only. No confirmed speakers, published resources, learner deadlines or assessment rights.</p>
  </section>;
}
