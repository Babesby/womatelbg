import React,{useEffect,useMemo,useState} from 'react';
import {formatCanopyDate,openAssignments,speakerChallengeOpen} from './canopySchedule';
const CANTEST_STORE='womate_cantest_assignment_submissions_v1';
const CANTEST_PUZZLES='womate_cantest_puzzles_v1';
const localRead=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return []}};
const localWrite=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const getWeeklyAssignmentSubmissions=async()=>localRead(CANTEST_STORE);
const getPuzzleProgress=async()=>localRead(CANTEST_PUZZLES);
const refreshLearningAutomation=async()=>true;
const savePuzzleCompletion=async(_session,weekKey)=>{const rows=localRead(CANTEST_PUZZLES).filter(x=>x.week_key!==weekKey);rows.push({week_key:weekKey,completed:true});localWrite(CANTEST_PUZZLES,rows);return true};
const submitWeeklyAssignment=async(_session,weekKey,payload)=>{const rows=localRead(CANTEST_STORE),n=rows.filter(x=>x.week_key===weekKey).length;if(n>=3)throw new Error('CANTEST: all three attempts have been used.');rows.push({id:crypto.randomUUID?.()||String(Date.now()),week_key:weekKey,attempt_no:n+1,...payload,status:'submitted',submitted_at:new Date().toISOString(),auto_score:null,release_at:new Date(0).toISOString()});localWrite(CANTEST_STORE,rows);return true};
import {canopyModules2026} from './canopyCurriculum2026';

function scramble(word){
  return word.split('').map((c,i)=>({c,k:(i*17+word.charCodeAt(i))%97})).sort((a,b)=>a.k-b.k).map(x=>x.c).join('');
}

function WordPuzzle({viewer,item,completed,onComplete}){
  const [answers,setAnswers]=useState({}),[msg,setMsg]=useState('');
  const done=item.puzzleTerms.every(w=>(answers[w]||'').trim().toUpperCase()===w);
  async function finish(){
    if(!done){setMsg('Keep going — each scrambled word belongs to this module.');return}
    await savePuzzleCompletion(viewer.session,item.weekKey); setMsg('Puzzle complete. This optional activity does not affect your score.'); onComplete();
  }
  return <details className="ca-puzzle">
    <summary>Optional word puzzle {completed?'· Complete':''}</summary>
    <p>Unscramble the four module words. This is optional and not graded.</p>
    <div className="ca-puzzle-grid">{item.puzzleTerms.map(w=><label key={w}><span>{scramble(w)}</span><input disabled={completed} value={answers[w]||''} onChange={e=>setAnswers(a=>({...a,[w]:e.target.value}))}/></label>)}</div>
    {!completed&&<button type="button" onClick={finish}>Check puzzle</button>}{msg&&<p>{msg}</p>}
  </details>
}

export default function CanopyAssignmentsV2({viewer}){
  const [subs,setSubs]=useState([]),[puzzles,setPuzzles]=useState([]),[drafts,setDrafts]=useState({}),[busy,setBusy]=useState(''),[message,setMessage]=useState('');
  const available=useMemo(()=>openAssignments(new Date()),[]);

  async function load(){
    try{await refreshLearningAutomation(viewer.session)}catch{}
    const [s,p]=await Promise.all([getWeeklyAssignmentSubmissions(viewer.session),getPuzzleProgress(viewer.session)]);
    setSubs(s||[]); setPuzzles(p||[]);
  }
  useEffect(()=>{load()},[]);

  const courseModule=(moduleId)=>canopyModules2026.find(m=>m.id===moduleId);
  const latest=(weekKey)=>subs.filter(x=>x.week_key===weekKey).sort((a,b)=>b.attempt_no-a.attempt_no)[0];
  const attempts=(weekKey)=>subs.filter(x=>x.week_key===weekKey).length;
  const scoreVisible=(s)=>s?.auto_score!=null && new Date()>=new Date(s.release_at);

  async function send(item){
    const d=drafts[item.weekKey]||{};
    const paragraph=(d.paragraph_response||'').trim();
    const canvas=(d.canvas_link||'').trim();
    const linkedin=(d.linkedin_link||'').trim();

    if(paragraph.split(/\s+/).filter(Boolean).length<80){setMessage('Your paragraph needs at least 80 words. Add enough detail to show what you learned and how you would apply it.');return}
    if(!/^https?:\/\//i.test(canvas)){setMessage('Upload your downloaded CanopyCanvas graphic to Google Drive, make it viewable by link, then paste the Drive link here.');return}
    if(!speakerChallengeOpen(item)){setMessage('Parts 01 and 02 are open now. The speaker challenge opens after Thursday’s live session.');return}
    if(!/^https?:\/\//i.test(linkedin)){setMessage('Paste the LinkedIn post link for the speaker challenge.');return}

    setBusy(item.weekKey); setMessage('');
    try{
      await submitWeeklyAssignment(viewer.session,item.weekKey,{paragraph_response:paragraph,canvas_link:canvas,linkedin_link:linkedin});
      setDrafts(x=>({...x,[item.weekKey]:{}})); await load(); setMessage('Assignment submitted successfully.');
    }catch(e){setMessage(e.message||'Submission failed.')}
    finally{setBusy('')}
  }

  return <section className="ca-page">
    <div className="ca-head">
      <span className="ca-kicker">CANTEST · ASSIGNMENTS</span>
      <h1>Work that follows the cohort.</h1>
      <p>All five assignment weeks are open in CANTEST. Speaker tasks are unlocked and timing is disabled so you can test the complete participant flow.</p>
    </div>

    {!available.length&&<div className="ca-empty"><h2>Your first assignment is not open yet.</h2><p>Module 01 opens Monday, 21 September 2026.</p></div>}

    <div className="ca-stack">
      {available.map(item=>{
        const sub=latest(item.weekKey), count=attempts(item.weekKey), d=drafts[item.weekKey]||{}, course=courseModule(item.moduleId);
        const mayResubmit=count<3;
        const puzzleDone=puzzles.some(p=>p.week_key===item.weekKey&&p.completed);
        const speakerOpen=speakerChallengeOpen(item);

        return <article className="ca-card" key={item.weekKey}>
          <div className="ca-card-head">
            <div><small>MODULE {item.moduleId}</small><h2>{item.title}</h2></div>
            <div className="ca-dates"><span>Due {formatCanopyDate(item.dueAt)}</span>{count>0&&<strong>Attempt {count} of 3</strong>}</div>
          </div>

          <div className="ca-threefold">
            <div><b>01</b><h3>Paragraph response</h3><p>{course?.assignment?.paragraphPrompt||'Respond to the weekly learning task with reflection, analysis and a concrete application to climate action.'}</p></div>
            <div><b>02</b><h3>CanopyCanvas campaign</h3><p>{course?.assignment?.canvasBrief||'Create the campaign graphic in CanopyCanvas, download it, upload it to your own Google Drive, make it viewable and attach the link.'}</p><a href="/canopy/cantest/canvas">Open CanopyCanvas →</a></div>
            <div><b>03</b><h3>Speaker challenge</h3>{speakerOpen?<><p>{item.speakerPrompt}</p><p>Submit the public LinkedIn post link.</p></>:<><p>Unlocks after Thursday’s live expert session.</p><p>Parts 01 and 02 are available now.</p></>}</div>
          </div>

          {sub&&<div className="ca-status">
            <div><span>Latest submission</span><strong>{new Date(sub.submitted_at).toLocaleString()}</strong></div>
            <div><span>Status</span><strong>{sub.status?.replaceAll('_',' ')}</strong></div>
            <div><span>Baseline score</span><strong>{scoreVisible(sub)?`${sub.auto_score}/100 · ${sub.score_band}`:'Releases after the week closes'}</strong></div>
            {scoreVisible(sub)&&sub.feedback_hint&&<div className="ca-feedback"><span>Feedback clue</span><strong>{sub.feedback_hint}</strong></div>}
          </div>}

          {(!sub||mayResubmit)&&<div className="ca-form">
            <label>Paragraph answer<textarea rows="8" value={d.paragraph_response||''} onChange={e=>setDrafts(x=>({...x,[item.weekKey]:{...d,paragraph_response:e.target.value}}))} placeholder="Write your response here…"/></label>
            <label>CanopyCanvas Google Drive link<input value={d.canvas_link||''} onChange={e=>setDrafts(x=>({...x,[item.weekKey]:{...d,canvas_link:e.target.value}}))} placeholder="https://drive.google.com/…"/></label>
            {speakerOpen&&<label>LinkedIn speaker-task post link<input value={d.linkedin_link||''} onChange={e=>setDrafts(x=>({...x,[item.weekKey]:{...d,linkedin_link:e.target.value}}))} placeholder="https://www.linkedin.com/posts/…"/></label>}
            <button type="button" disabled={busy===item.weekKey||!speakerOpen} onClick={()=>send(item)}>{!speakerOpen?'Final submission opens Thursday':busy===item.weekKey?'Submitting…':sub?'Submit revision':'Submit assignment'}</button>
            {sub&&<small>{3-count} resubmission{3-count===1?'':'s'} remaining.</small>}
          </div>}

          {sub&&!mayResubmit&&<p className="ca-locked">All three CANTEST attempts have been used.</p>}
          <WordPuzzle viewer={viewer} item={item} completed={puzzleDone} onComplete={load}/>
        </article>
      })}
    </div>
    {message&&<div className="ca-toast">{message}</div>}
  </section>
}
