import React,{useEffect,useState} from 'react';
import {CANOPY_ASSIGNMENT_SCHEDULE,formatCanopyDate,openAssignments,speakerChallengeOpen} from './canopySchedule';
import {getWeeklyAssignmentSubmissions,submitWeeklyAssignment,submitTesterWeeklyAssignment,getPuzzleProgress,savePuzzleCompletion,refreshLearningAutomation,getWeeklyAssignmentDrafts,saveWeeklyAssignmentDraft} from './canopyApi';
import {canopyModules2026} from './canopyCurriculum2026';
import {playCanopyCorrectSound,playCanopyErrorSound} from './canopyFeedbackAudio';

function scramble(word){
  return word.split('').map((c,i)=>({c,k:(i*17+word.charCodeAt(i))%97})).sort((a,b)=>a.k-b.k).map(x=>x.c).join('');
}

const PUZZLES={
  'module-01':{
    type:'unscramble',
    title:'Unscramble',
    intro:'Unscramble the four climate words. This is optional and not graded.'
  },
  'module-02':{
    type:'match',
    title:'Match the words',
    intro:'Match each Gender & Climate Justice term to the correct meaning. This is optional and not graded.',
    pairs:[
      ['JUSTICE','Fair treatment that recognises different needs, histories and burdens.'],
      ['EQUITY','Providing support according to need so people can reach fair outcomes.'],
      ['GENDER','Socially shaped roles, expectations and power relations linked to identity.'],
      ['INCLUSION','Ensuring affected people can participate meaningfully in decisions and solutions.']
    ]
  },
  'module-03':{
    type:'crossword',
    title:'Mini crossword',
    intro:'Use the clues to complete this Climate Governance & Policy mini crossword. This is optional and not graded.',
    clues:[
      ['POLICY','A formal course of action adopted by a government or institution.'],
      ['NDC','A country climate commitment submitted under the Paris Agreement.'],
      ['UNFCCC','The UN framework convention that anchors global climate negotiations.'],
      ['GOVERNANCE','The systems, institutions and rules through which decisions are made and implemented.']
    ]
  },
  'module-04':{
    type:'anagram',
    title:'Anagram challenge',
    intro:'Solve each advocacy anagram using the clue. This is optional and not graded.',
    clues:[
      ['ADVOCACY','Public action intended to influence decisions or behaviour.'],
      ['EVIDENCE','Reliable information used to support a claim or recommendation.'],
      ['DIGITAL','Using online tools, platforms or technology.'],
      ['MOBILISE','Bring people together around a shared action or cause.']
    ]
  },
  'module-05':{
    type:'jigsaw',
    title:'Leadership pathway jigsaw',
    intro:'Put the four leadership pathway pieces in the most useful order. This is optional and not graded.',
    pieces:['Identify your strengths','Build evidence of your work','Connect with people and opportunities','Take a focused 90-day action']
  }
};

function PracticalExample({assignment}){
  const[index,setIndex]=useState(0);
  if(!assignment)return null;
  if(assignment.exampleEmbed)return <div className="ca-practical-example ca-practical-video"><div className="ca-practical-frame"><iframe loading="lazy" src={assignment.exampleEmbed} title={assignment.exampleLabel||'Practical example'} allowFullScreen allow="fullscreen"/></div><small>{assignment.exampleLabel||'Example'}</small></div>;
  const images=assignment.exampleImages||[];
  if(!images.length)return null;
  const active=Math.min(index,images.length-1);
  return <div className="ca-practical-example ca-practical-slider-wrap"><div className="ca-practical-example-head"><small>{assignment.exampleLabel||'Example'}</small>{images.length>1&&<span>{active+1}/{images.length}</span>}</div><div className="ca-practical-slider"><figure><img src={images[active]} loading="lazy" alt={`Practical example ${active+1}`}/></figure>{images.length>1&&<><button type="button" className="ca-slide-prev" aria-label="Previous example" onClick={()=>setIndex(i=>(i-1+images.length)%images.length)}>‹</button><button type="button" className="ca-slide-next" aria-label="Next example" onClick={()=>setIndex(i=>(i+1)%images.length)}>›</button></>}</div>{images.length>1&&<div className="ca-slide-dots" aria-label="Example slides">{images.map((_,i)=><button type="button" key={i} className={i===active?'active':''} onClick={()=>setIndex(i)} aria-label={`Show example ${i+1}`}/>)}</div>}</div>;
}

function PuzzleShell({completed,title,intro,children}){
  return <details className="ca-puzzle">
    <summary>{title} {completed?'· Complete':''}</summary>
    <p>{intro}</p>
    {children}
  </details>
}

function WeeklyPuzzle({viewer,item,completed,onComplete}){
  const config=PUZZLES[item.weekKey]||PUZZLES['module-01'];
  const[answers,setAnswers]=useState({});
  const[order,setOrder]=useState(()=>config.pieces?[...config.pieces].reverse():[]);
  const[msg,setMsg]=useState('');
  const[busy,setBusy]=useState(false);

  async function saveIfCorrect(isCorrect,wrongMessage='Keep going — check each answer and try again.'){
    if(!isCorrect){setMsg(wrongMessage);playCanopyErrorSound();return}
    setBusy(true);setMsg('');
    try{await savePuzzleCompletion(viewer.session,item.weekKey);playCanopyCorrectSound();setMsg('Puzzle complete. This optional activity does not affect your score.');await onComplete?.()}
    catch(e){playCanopyErrorSound();setMsg(e?.message||'The puzzle result could not be saved. Try again.')}
    finally{setBusy(false)}
  }

  if(config.type==='unscramble'){
    const done=item.puzzleTerms.every(w=>(answers[w]||'').trim().toUpperCase()===w);
    return <PuzzleShell completed={completed} title="Optional puzzle · Unscramble" intro={config.intro}>
      <div className="ca-puzzle-grid">{item.puzzleTerms.map(w=><label key={w}><span>{scramble(w)}</span><input disabled={completed||busy} value={answers[w]||''} onChange={e=>setAnswers(a=>({...a,[w]:e.target.value}))}/></label>)}</div>
      {!completed&&<button type="button" disabled={busy} onClick={()=>saveIfCorrect(done,'Keep going — each scrambled word belongs to Module 01.')}>{busy?'Saving…':'Check puzzle'}</button>}{msg&&<p>{msg}</p>}
    </PuzzleShell>
  }

  if(config.type==='match'){
    const options=config.pairs.map(([word])=>word);
    const done=config.pairs.every(([word])=>answers[word]===word);
    return <PuzzleShell completed={completed} title="Optional puzzle · Match the words" intro={config.intro}>
      <div className="ca-match-grid">{config.pairs.map(([word,meaning],i)=><div className="ca-match-row" key={word}><b>{String(i+1).padStart(2,'0')}</b><p>{meaning}</p><select disabled={completed||busy} value={answers[word]||''} onChange={e=>setAnswers(a=>({...a,[word]:e.target.value}))}><option value="">Choose term</option>{options.map(opt=><option key={opt} value={opt}>{opt}</option>)}</select></div>)}</div>
      {!completed&&<button type="button" disabled={busy} onClick={()=>saveIfCorrect(done,'Not quite yet — match every definition to the correct Module 02 term.')}>{busy?'Saving…':'Check matches'}</button>}{msg&&<p>{msg}</p>}
    </PuzzleShell>
  }

  if(config.type==='crossword'){
    const done=config.clues.every(([word])=>(answers[word]||'').trim().toUpperCase()===word);
    return <PuzzleShell completed={completed} title="Optional puzzle · Mini crossword" intro={config.intro}>
      <div className="ca-crossword">{config.clues.map(([word,clue],i)=><label key={word}><b>{i+1}.</b><span>{clue} <small>({word.length})</small></span><input disabled={completed||busy} maxLength={word.length} value={answers[word]||''} onChange={e=>setAnswers(a=>({...a,[word]:e.target.value}))} /></label>)}</div>
      {!completed&&<button type="button" disabled={busy} onClick={()=>saveIfCorrect(done,'Some crossword answers are still incorrect. Use the Module 03 clues and try again.')}>{busy?'Saving…':'Check crossword'}</button>}{msg&&<p>{msg}</p>}
    </PuzzleShell>
  }

  if(config.type==='anagram'){
    const done=config.clues.every(([word])=>(answers[word]||'').trim().toUpperCase()===word);
    return <PuzzleShell completed={completed} title="Optional puzzle · Anagram challenge" intro={config.intro}>
      <div className="ca-anagram-grid">{config.clues.map(([word,clue])=><label key={word}><span>{scramble(word)}</span><small>{clue}</small><input disabled={completed||busy} value={answers[word]||''} onChange={e=>setAnswers(a=>({...a,[word]:e.target.value}))}/></label>)}</div>
      {!completed&&<button type="button" disabled={busy} onClick={()=>saveIfCorrect(done,'A few anagrams are still out of place. Use the Module 04 clues and try again.')}>{busy?'Saving…':'Check anagrams'}</button>}{msg&&<p>{msg}</p>}
    </PuzzleShell>
  }

  const target=config.pieces;
  const move=(index,delta)=>setOrder(current=>{const next=[...current];const to=index+delta;if(to<0||to>=next.length)return current;[next[index],next[to]]=[next[to],next[index]];return next});
  const done=order.every((piece,i)=>piece===target[i]);
  return <PuzzleShell completed={completed} title="Optional puzzle · Leadership pathway jigsaw" intro={config.intro}>
    <div className="ca-jigsaw">{order.map((piece,i)=><div className="ca-jigsaw-piece" key={piece}><b>{String(i+1).padStart(2,'0')}</b><span>{piece}</span>{!completed&&<div><button type="button" className="ca-jigsaw-move" disabled={busy||i===0} onClick={()=>move(i,-1)} aria-label={`Move ${piece} up`}>↑</button><button type="button" className="ca-jigsaw-move" disabled={busy||i===order.length-1} onClick={()=>move(i,1)} aria-label={`Move ${piece} down`}>↓</button></div>}</div>)}</div>
    {!completed&&<button type="button" disabled={busy} onClick={()=>saveIfCorrect(done,'The pathway is not in the strongest order yet. Think: strengths → evidence → connections → action.')}>{busy?'Saving…':'Check jigsaw'}</button>}{msg&&<p>{msg}</p>}
  </PuzzleShell>
}

export default function CanopyAssignmentsV2({viewer}){
  const[subs,setSubs]=useState([]);
  const[puzzles,setPuzzles]=useState([]);
  const[drafts,setDrafts]=useState({});
  const[busy,setBusy]=useState('');
  const[draftBusy,setDraftBusy]=useState('');
  const[draftNotes,setDraftNotes]=useState({});
  const[message,setMessage]=useState('');
  const[now,setNow]=useState(()=>new Date());
  const tester=String(viewer?.user?.email||'').trim().toLowerCase()==='p.viewmultimedia@gmail.com';
  const available=tester?CANOPY_ASSIGNMENT_SCHEDULE:openAssignments(now);
  const moduleContent=moduleId=>canopyModules2026.find(module=>module.id===moduleId);

  async function load(){
    try{await refreshLearningAutomation(viewer.session)}catch{}
    const[s,p]=await Promise.all([getWeeklyAssignmentSubmissions(viewer.session),getPuzzleProgress(viewer.session)]);
    setSubs(s||[]);setPuzzles(p||[]);
  }
  /* WOMATE_PROGRESSIVE_DRAFT_LOADER */
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
  },[viewer?.session?.access_token]);
  useEffect(()=>{const timer=window.setInterval(()=>setNow(new Date()),60000);return()=>window.clearInterval(timer)},[]);

  const latest=weekKey=>subs.filter(x=>x.week_key===weekKey).sort((a,b)=>b.attempt_no-a.attempt_no)[0];
  const attempts=weekKey=>subs.filter(x=>x.week_key===weekKey).length;
  const scoreVisible=s=>s&&(s.final_score!=null||s.auto_score!=null)&&(tester||now>=new Date(s.release_at));
  const finalScore=s=>s?.final_score??s?.auto_score;
  const finalFeedback=s=>s?.final_feedback||s?.feedback_hint||'';
  const reviewLabel=s=>s?.review_source==='manual'?'WOMATE review':'Automated formative baseline';

  function assignmentPartState(d,speakerOpen){
    const paragraphWords=(d?.paragraph_response||'')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .length;

    const paragraphReady=paragraphWords>=80;

    const canvasReady=/^https:\/\/(drive|docs)\.google\.com\//i
      .test((d?.canvas_link||'').trim());

    const linkedinReady=!!speakerOpen &&
      /^https:\/\/(?:(?:[a-z0-9-]+\.)*linkedin\.com\/|lnkd\.in\/)/i
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

  async function send(item){
    const d=drafts[item.weekKey]||{};
    const paragraph=(d.paragraph_response||'').trim();
    const canvas=(d.canvas_link||'').trim();
    const linkedin=(d.linkedin_link||'').trim();
    if(paragraph.split(/\s+/).filter(Boolean).length<80){setMessage('Your paragraph needs at least 80 words. Add enough detail to show what you learned and how you would apply it.');return}
    if(!/^https:\/\/(drive|docs)\.google\.com\//i.test(canvas)){
      const practicalTitle=moduleContent(item.moduleId)?.assignment?.practicalTitle||'practical challenge';
      setMessage(`Upload your completed ${practicalTitle.toLowerCase()} to Google Drive, make it viewable by link, then paste the Drive link here.`);return
    }
    if(!tester&&!speakerChallengeOpen(item,now)){setMessage('Parts 01 and 02 are open now. The speaker challenge opens after Thursday’s live session.');return}
    if(!/^https:\/\/(?:(?:[a-z0-9-]+\.)*linkedin\.com\/|lnkd\.in\/)/i.test(linkedin)){setMessage('Paste a LinkedIn post link. LinkedIn.com and lnkd.in short links are accepted.');return}
    setBusy(item.weekKey);setMessage('');
    try{
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
    }
    catch(e){setMessage(e?.message||'Submission failed. Try again.')}
    finally{setBusy('')}
  }

  return <section className="ca-page">
    <div className="ca-head"><span className="ca-kicker">ASSIGNMENTS</span><h1>Weekly work.</h1><p>Save Parts 01–02 as you work. Part 03 opens after Thursday’s live session.</p></div>
    {!available.length&&<div className="ca-empty"><h2>Your first assignment is not open yet.</h2><p>Module 01 opens Monday, 21 September 2026.</p></div>}
    <div className="ca-stack">
      {available.map(item=>{
        const sub=latest(item.weekKey),count=attempts(item.weekKey),d=drafts[item.weekKey]||{};
        const mayResubmit=tester||(count<3&&now<=new Date(item.resubmitUntil));
        const puzzleDone=puzzles.some(p=>p.week_key===item.weekKey&&p.completed);
        const speakerOpen=tester||speakerChallengeOpen(item,now);
        const parts=assignmentPartState(d,speakerOpen);
        const visible=scoreVisible(sub),score=finalScore(sub),status=(sub?.assessment_status||sub?.status||'submitted').replaceAll('_',' ');
        const curriculum=moduleContent(item.moduleId);
        const paragraphPrompt=curriculum?.assignment?.paragraphPrompt||'Respond to the weekly learning task with reflection, analysis and a concrete application to climate action.';
        const practicalTitle=curriculum?.assignment?.practicalTitle||'Practical challenge';
        const practicalBrief=curriculum?.assignment?.practicalBrief||curriculum?.assignment?.canvasBrief||'Create the practical work for this module and submit a viewable Google Drive link.';
        const practicalInstructions=curriculum?.assignment?.practicalInstructions||'Upload the completed work to your own Google Drive, make the file viewable by link, and attach that link below.';
        const practicalHref=curriculum?.assignment?.practicalHref||'';
        const practicalActionLabel=curriculum?.assignment?.practicalActionLabel||'';
        const practicalLinkLabel=curriculum?.assignment?.practicalLinkLabel||'Practical challenge Google Drive link';
        return <article className="ca-card" key={item.weekKey}>
          <div className="ca-card-head"><div><small>MODULE {item.moduleId}</small><h2>{item.title}</h2></div><div className="ca-dates"><span>Due {formatCanopyDate(item.dueAt)}</span>{count>0&&<strong>Attempt {count} of 3</strong>}</div></div>
          <div className="ca-threefold">
            <div><b>01</b><h3>Paragraph response</h3><p>{paragraphPrompt}</p></div>
            <div className="ca-practical-brief"><b>02</b><small className="ca-challenge-tag">PRACTICAL</small><h3>{practicalTitle}</h3><p>{practicalBrief}</p>{practicalInstructions&&<details className="ca-instructions"><summary>How to submit</summary><p>{practicalInstructions}</p></details>}{practicalHref&&<a href={practicalHref}>{practicalActionLabel||'Open tool →'}</a>}<PracticalExample assignment={curriculum?.assignment}/></div>
            <div><b>03</b><h3>Speaker challenge</h3>{speakerOpen?<><p>{item.speakerPrompt}</p><p>Submit the LinkedIn post link.</p></>:<p>Opens after Thursday’s live session.</p>}</div>
          </div>
          {sub&&<div className="ca-status">
            <div><span>Latest submission</span><strong>{new Date(sub.submitted_at).toLocaleString()}</strong></div>
            <div><span>Status</span><strong>{status}</strong></div>
            <div><span>Final score</span><strong>{visible?`${score}/100 · ${sub.score_band||''}`:'Releases after the week closes'}</strong>{visible&&<small>{reviewLabel(sub)}</small>}</div>
            {visible&&finalFeedback(sub)&&<div className="ca-feedback"><span>Feedback</span><strong>{finalFeedback(sub)}</strong></div>}
            {visible&&(['revision_required','needs_manual_review'].includes(sub.assessment_status)||Number(score)<70)&&<div className="ca-feedback ca-revision"><span>Next step</span><strong>Revision required. Use the feedback above and submit again within the resubmission window if an attempt remains.</strong></div>}
          </div>}
          {(!sub||mayResubmit)&&<div className="ca-form">

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
                  {parts.canvasReady?'✓':'02'} Practical task
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
              {practicalLinkLabel}

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
                LinkedIn speaker-task post link (LinkedIn or lnkd.in)

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
                  placeholder="https://linkedin.com/… or https://lnkd.in/…"
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

          </div>}
          {sub&&!mayResubmit&&<p className="ca-locked">Submission window closed or all three attempts have been used.</p>}
          <WeeklyPuzzle viewer={viewer} item={item} completed={puzzleDone} onComplete={load}/>
        </article>
      })}
    </div>
    {message&&<div className="ca-toast" role="status">{message}</div>}
  </section>
}
