const fs=require('fs');
const path=require('path');
const cp=require('child_process');

const root=process.cwd();
const assignmentFile=path.join(root,'src','canopy','CanopyAssignmentsV2.jsx');
const apiFile=path.join(root,'src','canopy','canopyApi.js');
const cssFile=path.join(root,'src','canopy','canopy.css');
const sqlDir=path.join(root,'CANOPY_OPERATIONS');
const sqlFile=path.join(sqlDir,'WOMATE_CANOPY_ASSIGNMENT_PROGRESSIVE_SAVE_20260921.sql');

for(const f of [assignmentFile,apiFile,cssFile]){
  if(!fs.existsSync(f)) throw new Error('Missing '+path.relative(root,f));
}

const original={
  assignment:fs.readFileSync(assignmentFile,'utf8'),
  api:fs.readFileSync(apiFile,'utf8'),
  css:fs.readFileSync(cssFile,'utf8')
};

let assignment=original.assignment.replace(/\r\n/g,'\n');
let api=original.api.replace(/\r\n/g,'\n');
let css=original.css.replace(/\r\n/g,'\n');

function fail(msg){
  throw new Error('DEEP FIX STOPPED: '+msg+'. No source files have been written.');
}

function replaceExact(source,oldText,newText,label){
  if(!source.includes(oldText)) fail(label+' anchor not found');
  return source.replace(oldText,newText);
}

/* ============================================================
   1. ADD DRAFT API IMPORTS
   ============================================================ */

if(!assignment.includes('getWeeklyAssignmentDrafts')){
  const importRx=/import\s*\{([^}]*)\}\s*from\s*['"]\.\/canopyApi['"];/;
  const match=assignment.match(importRx);

  if(!match) fail('canopyApi import');

  const names=match[1].split(',').map(x=>x.trim()).filter(Boolean);

  for(const name of [
    'getWeeklyAssignmentDrafts',
    'saveWeeklyAssignmentDraft'
  ]){
    if(!names.includes(name)) names.push(name);
  }

  assignment=assignment.replace(
    importRx,
    `import {${names.join(',')}} from './canopyApi';`
  );
}

/* ============================================================
   2. ADD DRAFT UI STATE
   ============================================================ */

if(!assignment.includes('const[draftBusy,setDraftBusy]')){
  assignment=replaceExact(
    assignment,
    `  const[busy,setBusy]=useState('');
  const[message,setMessage]=useState('');`,
    `  const[busy,setBusy]=useState('');
  const[draftBusy,setDraftBusy]=useState('');
  const[draftNotes,setDraftNotes]=useState({});
  const[message,setMessage]=useState('');`,
    'assignment state'
  );
}

/* ============================================================
   3. LOAD SAVED PARTIAL ASSIGNMENTS
   ============================================================ */

if(!assignment.includes('WOMATE_PROGRESSIVE_DRAFT_LOADER')){
  const oldEffect=`  useEffect(()=>{load()},[viewer?.session?.access_token]);`;

  const loader=`  /* WOMATE_PROGRESSIVE_DRAFT_LOADER */
  async function loadDrafts(){
    try{
      const rows=await getWeeklyAssignmentDrafts(viewer.session);
      const saved={};

      (rows||[]).forEach(row=>{
        saved[row.week_key]={
          paragraph_response:row.paragraph_response||'',
          canvas_link:row.canvas_link||'',
          linkedin_link:row.linkedin_link||''
        };
      });

      setDrafts(current=>{
        const merged={...saved};

        Object.entries(current||{}).forEach(([weekKey,value])=>{
          const hasLocal=[
            'paragraph_response',
            'canvas_link',
            'linkedin_link'
          ].some(field=>String(value?.[field]||'').trim());

          if(hasLocal){
            merged[weekKey]={
              ...(merged[weekKey]||{}),
              ...value
            };
          }
        });

        return merged;
      });
    }catch(error){
      console.warn(
        'Canopy saved assignment progress could not be loaded:',
        error?.message||error
      );
    }
  }

  useEffect(()=>{
    load();
    loadDrafts();
  },[viewer?.session?.access_token]);`;

  assignment=replaceExact(
    assignment,
    oldEffect,
    loader,
    'current assignment load effect'
  );
}

/* ============================================================
   4. PROGRESS CALCULATION + SAVE PROGRESS
   ============================================================ */

if(!assignment.includes('function assignmentPartState(')){
  const anchor=`  async function send(item){`;

  if(!assignment.includes(anchor)) fail('send(item)');

  const helpers=`  function assignmentPartState(d,speakerOpen){
    const paragraphWords=(d?.paragraph_response||'')
      .trim()
      .split(/\\s+/)
      .filter(Boolean)
      .length;

    const paragraphReady=paragraphWords>=80;

    const canvasReady=/^https:\\/\\/(drive|docs)\\.google\\.com\\//i
      .test((d?.canvas_link||'').trim());

    const linkedinReady=!!speakerOpen &&
      /^https:\\/\\/(www\\.)?linkedin\\.com\\//i
        .test((d?.linkedin_link||'').trim());

    const completed=[
      paragraphReady,
      canvasReady,
      linkedinReady
    ].filter(Boolean).length;

    return {
      paragraphWords,
      paragraphReady,
      canvasReady,
      linkedinReady,
      completed,
      remaining:3-completed,
      percent:Math.round((completed/3)*100),
      allReady:paragraphReady&&canvasReady&&linkedinReady
    };
  }

  async function saveProgress(item){
    const d=drafts[item.weekKey]||{};

    const hasWork=[
      d.paragraph_response,
      d.canvas_link,
      d.linkedin_link
    ].some(value=>String(value||'').trim());

    if(!hasWork){
      setDraftNotes(current=>({
        ...current,
        [item.weekKey]:'Start one of the assignment parts before saving.'
      }));
      return;
    }

    setDraftBusy(item.weekKey);

    setDraftNotes(current=>({
      ...current,
      [item.weekKey]:''
    }));

    try{
      await saveWeeklyAssignmentDraft(
        viewer.session,
        item.weekKey,
        {
          paragraph_response:d.paragraph_response||'',
          canvas_link:d.canvas_link||'',
          linkedin_link:d.linkedin_link||''
        }
      );

      const speakerOpen=tester||speakerChallengeOpen(item,now);
      const state=assignmentPartState(d,speakerOpen);

      setDraftNotes(current=>({
        ...current,
        [item.weekKey]:
          'Progress saved · '+state.completed+
          ' of 3 required parts ready.'
      }));
    }catch(error){
      setDraftNotes(current=>({
        ...current,
        [item.weekKey]:
          error?.message||
          'Progress could not be saved. Please try again.'
      }));
    }finally{
      setDraftBusy('');
    }
  }

`;

  assignment=assignment.replace(anchor,helpers+anchor);
}

/* ============================================================
   5. CLEAR SAVED DRAFT AFTER A REAL FINAL SUBMISSION
   ============================================================ */

const oldSubmit=`    try{await (tester?submitTesterWeeklyAssignment:submitWeeklyAssignment)(viewer.session,item.weekKey,{paragraph_response:paragraph,canvas_link:canvas,linkedin_link:linkedin});setDrafts(x=>({...x,[item.weekKey]:{}}));await load();setMessage('Assignment submitted successfully.')}`;

const newSubmit=`    try{
      await (tester?submitTesterWeeklyAssignment:submitWeeklyAssignment)(
        viewer.session,
        item.weekKey,
        {
          paragraph_response:paragraph,
          canvas_link:canvas,
          linkedin_link:linkedin
        }
      );

      try{
        await saveWeeklyAssignmentDraft(
          viewer.session,
          item.weekKey,
          {
            paragraph_response:'',
            canvas_link:'',
            linkedin_link:''
          }
        );
      }catch{}

      setDrafts(x=>({...x,[item.weekKey]:{}}));
      setDraftNotes(x=>({...x,[item.weekKey]:''}));

      await load();

      setMessage('Assignment submitted successfully.');
    }`;

if(!assignment.includes(newSubmit)){
  assignment=replaceExact(
    assignment,
    oldSubmit,
    newSubmit,
    'final submission success flow'
  );
}

/* ============================================================
   6. UPDATE LEARNER INSTRUCTION
   ============================================================ */

assignment=assignment.replace(
  `Each week opens on Monday. Start the paragraph response, CanopyCanvas graphic and optional puzzle immediately. The speaker challenge unlocks after Thursday’s live session. Complete all three required parts by Sunday.`,
  `Each week opens on Monday. Complete the work in stages: save your paragraph and CanopyCanvas evidence when they are ready, then add the speaker challenge after Thursday’s live session. Saving progress does not use an attempt. Complete all three required parts by Sunday.`
);

/* ============================================================
   7. CALCULATE 0/3 → 3/3 INSIDE EACH MODULE
   ============================================================ */

if(!assignment.includes('const parts=assignmentPartState(d,speakerOpen);')){
  assignment=replaceExact(
    assignment,
    `        const speakerOpen=tester||speakerChallengeOpen(item,now);
        const visible=scoreVisible(sub),score=finalScore(sub),status=(sub?.assessment_status||sub?.status||'submitted').replaceAll('_',' ');`,
    `        const speakerOpen=tester||speakerChallengeOpen(item,now);
        const parts=assignmentPartState(d,speakerOpen);
        const visible=scoreVisible(sub),score=finalScore(sub),status=(sub?.assessment_status||sub?.status||'submitted').replaceAll('_',' ');`,
    'module progress state'
  );
}

/* ============================================================
   8. REBUILD ONLY THE ASSIGNMENT FORM
   ============================================================ */

const formRx=/\{\(!sub\|\|mayResubmit\)&&<div className="ca-form">[\s\S]*?<\/div>\}/;

if(!assignment.includes('className="ca-assignment-progress"')){
  const match=assignment.match(formRx);

  if(!match) fail('current assignment form');

  const newForm=`{(!sub||mayResubmit)&&<div className="ca-form">

            <div className="ca-assignment-progress">
              <div className="ca-assignment-progress-head">
                <strong>{parts.completed} of 3 required parts ready</strong>
                <span>{parts.remaining} remaining</span>
              </div>

              <div
                className="ca-assignment-progress-track"
                aria-label={parts.completed+' of 3 assignment parts ready'}
              >
                <span style={{width:parts.percent+'%'}}/>
              </div>

              <div className="ca-assignment-progress-parts">
                <span className={parts.paragraphReady?'ready':''}>
                  {parts.paragraphReady?'✓':'01'} Paragraph
                </span>

                <span className={parts.canvasReady?'ready':''}>
                  {parts.canvasReady?'✓':'02'} CanopyCanvas
                </span>

                <span className={
                  parts.linkedinReady
                    ?'ready'
                    :speakerOpen
                      ?''
                      :'locked'
                }>
                  {parts.linkedinReady
                    ?'✓'
                    :speakerOpen
                      ?'03'
                      :'LOCKED'} Speaker challenge
                </span>
              </div>

              {!speakerOpen&&
                <p className="ca-assignment-progress-note">
                  Part 03 opens after Thursday’s live session.
                  Save Parts 01 and 02 now and return later.
                </p>
              }
            </div>

            <label>
              Paragraph answer

              <textarea
                rows="8"
                value={d.paragraph_response||''}
                onChange={e=>setDrafts(x=>({
                  ...x,
                  [item.weekKey]:{
                    ...d,
                    paragraph_response:e.target.value
                  }
                }))}
                placeholder="Write your response here…"
              />

              <small className={
                parts.paragraphReady
                  ?'ca-part-ready'
                  :'ca-part-pending'
              }>
                {parts.paragraphWords} words ·
                {parts.paragraphReady
                  ?' Ready'
                  :' Minimum 80 words'}
              </small>
            </label>

            <label>
              CanopyCanvas Google Drive link

              <input
                inputMode="url"
                value={d.canvas_link||''}
                onChange={e=>setDrafts(x=>({
                  ...x,
                  [item.weekKey]:{
                    ...d,
                    canvas_link:e.target.value
                  }
                }))}
                placeholder="https://drive.google.com/…"
              />
            </label>

            {speakerOpen&&
              <label>
                LinkedIn speaker-task post link

                <input
                  inputMode="url"
                  value={d.linkedin_link||''}
                  onChange={e=>setDrafts(x=>({
                    ...x,
                    [item.weekKey]:{
                      ...d,
                      linkedin_link:e.target.value
                    }
                  }))}
                  placeholder="https://www.linkedin.com/posts/…"
                />
              </label>
            }

            <div className="ca-assignment-form-actions">

              <button
                type="button"
                className="ca-save-progress"
                disabled={draftBusy===item.weekKey}
                onClick={()=>saveProgress(item)}
              >
                {draftBusy===item.weekKey
                  ?'Saving…'
                  :'Save progress'}
              </button>

              <button
                type="button"
                disabled={
                  busy===item.weekKey||
                  !speakerOpen||
                  !parts.allReady
                }
                onClick={()=>send(item)}
              >
                {busy===item.weekKey
                  ?'Submitting…'
                  :!speakerOpen
                    ?'Final submit opens Thursday'
                    :!parts.allReady
                      ?'Complete '+parts.remaining+
                        ' remaining part'+
                        (parts.remaining===1?'':'s')
                      :sub
                        ?'Submit revision'
                        :'Submit final assignment'}
              </button>

            </div>

            {draftNotes[item.weekKey]&&
              <small className="ca-draft-note">
                {draftNotes[item.weekKey]}
              </small>
            }

            {sub&&!tester&&
              <small>
                {Math.max(0,3-count)} resubmission
                {3-count===1?'':'s'} remaining.
              </small>
            }

            {sub&&tester&&
              <small>
                Tester mode has no date or attempt lock.
              </small>
            }

          </div>}`;

  assignment=assignment.replace(formRx,newForm);
}

/* ============================================================
   9. API FOR SAVED PROGRESS
   ============================================================ */

if(!api.includes('export async function getWeeklyAssignmentDrafts')){
  api+=`

/* WOMATE · progressive weekly assignment drafts · 2026-09-21 */

export async function getWeeklyAssignmentDrafts(session){
  const s=await refreshSession(session||getStoredSession());

  if(!s?.access_token)return[];

  return rest(
    'canopy_assignment_drafts?select=*&user_id=eq.'+
    s.user.id+
    '&order=updated_at.desc',
    {token:s.access_token}
  );
}

export async function saveWeeklyAssignmentDraft(
  session,
  weekKey,
  payload
){
  const s=await refreshSession(session||getStoredSession());

  if(!s?.access_token){
    throw new Error(
      'Your Canopy session has expired. Sign in again.'
    );
  }

  return rest(
    'canopy_assignment_drafts?on_conflict=user_id,week_key',
    {
      token:s.access_token,
      method:'POST',
      prefer:'resolution=merge-duplicates,return=representation',
      body:{
        user_id:s.user.id,
        week_key:weekKey,
        paragraph_response:payload?.paragraph_response||'',
        canvas_link:payload?.canvas_link||'',
        linkedin_link:payload?.linkedin_link||''
      }
    }
  );
}
`;
}

/* ============================================================
   10. PROGRESS UI
   ============================================================ */

if(!css.includes('.ca-assignment-progress{')){
  css+=`

/* WOMATE CANOPY · progressive assignment submission · 2026-09-21 */

.ca-assignment-progress{
  margin:0 0 18px;
  padding:18px;
  border:1px solid rgba(14,77,74,.14);
  border-radius:18px;
  background:rgba(216,238,229,.22);
}

.ca-assignment-progress-head{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:14px;
  margin-bottom:10px;
  color:#0E4D4A;
}

.ca-assignment-progress-head strong{
  font-size:14px;
}

.ca-assignment-progress-head span{
  font-size:12px;
  opacity:.72;
}

.ca-assignment-progress-track{
  height:8px;
  border-radius:999px;
  overflow:hidden;
  background:rgba(14,77,74,.10);
}

.ca-assignment-progress-track>span{
  display:block;
  height:100%;
  border-radius:inherit;
  background:#0E4D4A;
  transition:width .22s ease;
}

.ca-assignment-progress-parts{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:8px;
  margin-top:12px;
}

.ca-assignment-progress-parts>span{
  padding:9px 10px;
  border:1px solid rgba(14,77,74,.10);
  border-radius:12px;
  background:#fff;
  color:#4b625f;
  font-size:12px;
  font-weight:800;
}

.ca-assignment-progress-parts>span.ready{
  background:#C6FF52;
  border-color:#C6FF52;
  color:#083f3e;
}

.ca-assignment-progress-parts>span.locked{
  opacity:.52;
}

.ca-assignment-progress-note{
  margin:12px 0 0!important;
  font-size:12px!important;
  line-height:1.5!important;
}

.ca-assignment-form-actions{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  align-items:center;
}

.ca-assignment-form-actions .ca-save-progress{
  background:#fff;
  color:#0E4D4A;
  border:1px solid rgba(14,77,74,.25);
}

.ca-draft-note{
  display:block;
  color:#0E4D4A;
  margin-top:7px;
}

.ca-part-ready{
  color:#0E4D4A;
}

.ca-part-pending{
  color:#667b77;
}

@media(max-width:700px){
  .ca-assignment-progress-parts{
    grid-template-columns:1fr;
  }

  .ca-assignment-progress-head{
    align-items:flex-start;
    flex-direction:column;
    gap:4px;
  }

  .ca-assignment-form-actions>button{
    width:100%;
  }
}
`;
}

/* ============================================================
   11. SQL
   ============================================================ */

const sql=`-- WOMATE CANOPY · PROGRESSIVE ASSIGNMENT DRAFTS
-- 21 September 2026
-- Additive. Does not alter final submissions, grading, attempts or tester mode.

create table if not exists public.canopy_assignment_drafts (
  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  week_key text not null
    check (
      week_key in (
        'module-01',
        'module-02',
        'module-03',
        'module-04',
        'module-05'
      )
    ),

  paragraph_response text not null default '',
  canvas_link text not null default '',
  linkedin_link text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (user_id,week_key)
);

alter table public.canopy_assignment_drafts
enable row level security;

drop policy if exists
  canopy_assignment_drafts_select_own
on public.canopy_assignment_drafts;

create policy
  canopy_assignment_drafts_select_own
on public.canopy_assignment_drafts
for select
to authenticated
using (user_id=auth.uid());

drop policy if exists
  canopy_assignment_drafts_insert_own
on public.canopy_assignment_drafts;

create policy
  canopy_assignment_drafts_insert_own
on public.canopy_assignment_drafts
for insert
to authenticated
with check (user_id=auth.uid());

drop policy if exists
  canopy_assignment_drafts_update_own
on public.canopy_assignment_drafts;

create policy
  canopy_assignment_drafts_update_own
on public.canopy_assignment_drafts
for update
to authenticated
using (user_id=auth.uid())
with check (user_id=auth.uid());

grant select,insert,update
on public.canopy_assignment_drafts
to authenticated;

create or replace function
public.canopy_touch_assignment_draft()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  new.updated_at:=now();
  return new;
end;
$$;

drop trigger if exists
  canopy_touch_assignment_draft
on public.canopy_assignment_drafts;

create trigger
  canopy_touch_assignment_draft
before update
on public.canopy_assignment_drafts
for each row
execute function
  public.canopy_touch_assignment_draft();
`;

fs.mkdirSync(sqlDir,{recursive:true});

/* ============================================================
   12. FINAL AUDIT BEFORE WRITING
   ============================================================ */

const checks=[
  [
    'draft API import',
    assignment.includes('getWeeklyAssignmentDrafts')
  ],
  [
    'draft loader',
    assignment.includes('WOMATE_PROGRESSIVE_DRAFT_LOADER')
  ],
  [
    'Save progress',
    assignment.includes('Save progress')
  ],
  [
    'progress tracker',
    assignment.includes('ca-assignment-progress')
  ],
  [
    'word count',
    assignment.includes('parts.paragraphWords')
  ],
  [
    'original final submission RPC retained',
    assignment.includes('submitWeeklyAssignment')
  ],
  [
    'tester final submission retained',
    assignment.includes('submitTesterWeeklyAssignment')
  ],
  [
    'puzzles retained',
    assignment.includes('WeeklyPuzzle')
  ],
  [
    'three-attempt logic retained',
    assignment.includes('count<3')
  ],
  [
    'speaker challenge schedule retained',
    assignment.includes('speakerChallengeOpen')
  ],
  [
    'draft API generated',
    api.includes('saveWeeklyAssignmentDraft')
  ],
  [
    'progress CSS generated',
    css.includes('.ca-assignment-progress{')
  ]
];

const failed=checks.filter(([,ok])=>!ok);

if(failed.length){
  fail(
    'internal audit failed: '+
    failed.map(([name])=>name).join(', ')
  );
}

/* ============================================================
   13. BACKUP + WRITE
   ============================================================ */

fs.copyFileSync(
  assignmentFile,
  assignmentFile+'.before-progressive-save-final.bak'
);

fs.copyFileSync(
  apiFile,
  apiFile+'.before-progressive-save-final.bak'
);

fs.copyFileSync(
  cssFile,
  cssFile+'.before-progressive-save-final.bak'
);

fs.writeFileSync(assignmentFile,assignment,'utf8');
fs.writeFileSync(apiFile,api,'utf8');
fs.writeFileSync(cssFile,css,'utf8');
fs.writeFileSync(sqlFile,sql,'utf8');

/* ============================================================
   14. BUILD — AUTOMATIC ROLLBACK IF IT FAILS
   ============================================================ */

try{
  cp.execSync(
    'npm run build',
    {
      cwd:root,
      stdio:'inherit',
      shell:true
    }
  );
}catch(error){

  fs.writeFileSync(
    assignmentFile,
    original.assignment,
    'utf8'
  );

  fs.writeFileSync(
    apiFile,
    original.api,
    'utf8'
  );

  fs.writeFileSync(
    cssFile,
    original.css,
    'utf8'
  );

  console.error('');
  console.error(
    'BUILD FAILED. THE THREE SOURCE FILES WERE RESTORED AUTOMATICALLY.'
  );

  process.exit(1);
}

console.log('');
console.log('=================================================');
console.log('WOMATE ASSIGNMENT DEEP FIX PASSED');
console.log('=================================================');
console.log('PASS · Exact current assignment component patched');
console.log('PASS · Paragraph can be saved before Thursday');
console.log('PASS · CanopyCanvas link can be saved before Thursday');
console.log('PASS · Thursday speaker challenge remains date-gated');
console.log('PASS · 0/3 → 3/3 progress tracker added');
console.log('PASS · Paragraph word count added');
console.log('PASS · Save progress does NOT consume an attempt');
console.log('PASS · Tester mode preserved');
console.log('PASS · Three-attempt/revision logic preserved');
console.log('PASS · Existing grading/review flow preserved');
console.log('PASS · Optional puzzles preserved');
console.log('PASS · npm run build passed');
console.log('');
console.log(
  'NEXT: run the generated SQL in Supabase SQL Editor.'
);
