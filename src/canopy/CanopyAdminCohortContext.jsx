import React from 'react';
import {ChevronDown,FolderKanban,UsersRound} from 'lucide-react';

export const LEGACY_CANOPY_COHORT='she-leads-climate-c2-2026';

export function CanopyAdminCohortBar({cohorts=[],value,onChange}){
  const selected=cohorts.find(x=>x.cohort_key===value)||cohorts[0]||null;
  return <section className="canopyAdminCohortBar" aria-label="Admin cohort context">
    <div className="canopyAdminCohortIdentity">
      <span><FolderKanban size={17}/> MANAGING COHORT</span>
      <strong>{selected?.display_name||'Loading cohort context…'}</strong>
      {selected&&<small>{selected.region} · {selected.access_model==='paid'?'Paid':'Free'} · {String(selected.status||'').replaceAll('_',' ')}</small>}
    </div>
    <label className="canopyAdminCohortSelect">
      <span>Switch cohort</span>
      <div>
        <select value={selected?.cohort_key||value||''} onChange={e=>onChange?.(e.target.value)} disabled={!cohorts.length}>
          {cohorts.map(c=><option key={c.cohort_key} value={c.cohort_key}>{c.display_name}</option>)}
        </select>
        <ChevronDown size={17}/>
      </div>
    </label>
    {selected&&<div className="canopyAdminCohortCount"><UsersRound size={17}/><span><b>{Number(selected.member_count||0)}</b> member{Number(selected.member_count||0)===1?'':'s'}</span></div>}
  </section>;
}

export function CanopyAdminCohortEmpty({cohort,section='this area'}){
  return <main className="canopyManager canopyCohortEmpty">
    <div className="canopyCohortEmptyIcon"><FolderKanban/></div>
    <span className="canopyEyebrow">COHORT WORKSPACE</span>
    <h1>No learner data in this cohort yet.</h1>
    <p><b>{cohort?.display_name||'This cohort'}</b> is ready in Canopy, but no learners have been enrolled yet. {section} will remain empty rather than showing records from another cohort.</p>
    <div className="canopyCohortEmptyRule">Cohort 2 records are intentionally isolated and are not reused here.</div>
  </main>;
}

export function CanopyAdminCohortSafeHold({cohort,section='This management area'}){
  return <main className="canopyManager canopyCohortEmpty">
    <div className="canopyCohortEmptyIcon"><FolderKanban/></div>
    <span className="canopyEyebrow">COHORT-SCOPED WORKSPACE</span>
    <h1>{section} is isolated for {cohort?.display_name||'this cohort'}.</h1>
    <p>This cohort now has members, but this particular operational module has not yet been switched to its cohort-specific data adapter. Canopy is blocking legacy records here so another cohort's data cannot leak into this workspace.</p>
    <div className="canopyCohortEmptyRule">Safe by default: no cross-cohort management actions are allowed.</div>
  </main>;
}
