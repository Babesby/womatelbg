import React,{useEffect,useState} from 'react';
import {formatCanopyDate,openAssignments,speakerChallengeOpen} from './canopySchedule';
import {getWeeklyAssignmentSubmissions,submitWeeklyAssignment,getPuzzleProgress,savePuzzleCompletion,refreshLearningAutomation} from './canopyApi';

function scramble(word){
  return word.split('').map((c,i)=>({c,k:(i*17+word.charCodeAt(i))%97})).sort((a,b)=>a.k-b.k).map(x=>x.c).join('');
}

function WordPuzzle({viewer,item,completed,onComplete}){
  const[answers,setAnswers]=useState({});
  const[msg,setMsg]=useState('');
  const[busy,setBusy]=useState(false);
  const done=item.puzzleTerms.every(w=>(answers[w]||'').trim().toUpperCase()===w);
  async function finish(){
    if(!done){setMsg('Keep going — each scrambled word belongs to this module.');return}
    setBusy(true);setMsg('');
    try{await savePuzzleCompletion(viewer.session,item.weekKey);setMsg('Puzzle complete. This optional activity does not affect your score.');await onComplete?.()}
    catch(e){setMsg(e?.message||'The puzzle result could not be saved. Try again.')}
    finally{setBusy(false)}
  }
  return <details className="ca-puzzle">
    <summary>Optional word puzzle {completed?'· Complete':''}</summary>
    <p>Unscramble the four module words. This is optional and not graded.</p>
    <div className="ca-puzzle-grid">{item.puzzleTerms.map(w=><label key={w}><span>{scramble(w)}</span><input disabled={completed||busy} value={answers[w]||''} onChange={e=>setAnswers(a=>({...a,[w]:e.target.value}))}/></label>)}</div>
    {!completed&&<button type="button" disabled={busy} onClick={finish}>{busy?'Saving…':'Check puzzle'}</button>}{msg&&<p>{msg}</p>}
  </details>
}

export default function CanopyAssignmentsV2({viewer}){
  const[subs,setSubs]=useState([]);
  const[puzzles,setPuzzles]=useState([]);
  const[drafts,setDrafts]=useState({});
  const[busy,setBusy]=useState('');
  const[message,setMessage]=useState('');
  const[now,setNow]=useState(()=>new Date());
  const available=openAssignments(now);

  async function load(){
    try{await refreshLearningAutomation(viewer.session)}catch{}
    const[s,p]=await Promise.all([getWeeklyAssignmentSubmissions(viewer.session),getPuzzleProgress(viewer.session)]);
    setSubs(s||[]);setPuzzles(p||[]);
  }
  useEffect(()=>{load()},[viewer?.session?.access_token]);
  useEffect(()=>{const timer=window.setInterval(()=>setNow(new Date()),60000);return()=>window.clearInterval(timer)},[]);

  const latest=weekKey=>subs.filter(x=>x.week_key===weekKey).sort((a,b)=>b.attempt_no-a.attempt_no)[0];
  const attempts=weekKey=>subs.filter(x=>x.week_key===weekKey).length;
  const scoreVisible=s=>s&&(s.final_score!=null||s.auto_score!=null)&&now>=new Date(s.release_at);
  const finalScore=s=>s?.final_score??s?.auto_score;
  const finalFeedback=s=>s?.final_feedback||s?.feedback_hint||'';
  const reviewLabel=s=>s?.review_source==='manual'?'WOMATE review':'Automated formative baseline';

  async function send(item){
    const d=drafts[item.weekKey]||{};
    const paragraph=(d.paragraph_response||'').trim();
    const canvas=(d.canvas_link||'').trim();
    const linkedin=(d.linkedin_link||'').trim();
    if(paragraph.split(/\s+/).filter(Boolean).length<80){setMessage('Your paragraph needs at least 80 words. Add enough detail to show what you learned and how you would apply it.');return}
    if(!/^https:\/\/(drive|docs)\.google\.com\//i.test(canvas)){setMessage('Upload your downloaded CanopyCanvas graphic to Google Drive, make it viewable by link, then paste the Drive link here.');return}
    if(!speakerChallengeOpen(item,now)){setMessage('Parts 01 and 02 are open now. The speaker challenge opens after Thursday’s live session.');return}
    if(!/^https:\/\/(www\.)?linkedin\.com\//i.test(linkedin)){setMessage('Paste the LinkedIn post link for the speaker challenge.');return}
    setBusy(item.weekKey);setMessage('');
    try{await submitWeeklyAssignment(viewer.session,item.weekKey,{paragraph_response:paragraph,canvas_link:canvas,linkedin_link:linkedin});setDrafts(x=>({...x,[item.weekKey]:{}}));await load();setMessage('Assignment submitted successfully.')}
    catch(e){setMessage(e?.message||'Submission failed. Try again.')}
    finally{setBusy('')}
  }

  return <section className="ca-page">
    <div className="ca-head"><span className="ca-kicker">ASSIGNMENTS</span><h1>Work that follows the cohort.</h1><p>Each week opens on Monday. Start the paragraph response, CanopyCanvas graphic and optional puzzle immediately. The speaker challenge unlocks after Thursday’s live session. Complete all three required parts by Sunday.</p></div>
    {!available.length&&<div className="ca-empty"><h2>Your first assignment is not open yet.</h2><p>Module 01 opens Monday, 21 September 2026.</p></div>}
    <div className="ca-stack">
      {available.map(item=>{
        const sub=latest(item.weekKey),count=attempts(item.weekKey),d=drafts[item.weekKey]||{};
        const mayResubmit=count<3&&now<=new Date(item.resubmitUntil);
        const puzzleDone=puzzles.some(p=>p.week_key===item.weekKey&&p.completed);
        const speakerOpen=speakerChallengeOpen(item,now);
        const visible=scoreVisible(sub),score=finalScore(sub),status=(sub?.assessment_status||sub?.status||'submitted').replaceAll('_',' ');
        return <article className="ca-card" key={item.weekKey}>
          <div className="ca-card-head"><div><small>MODULE {item.moduleId}</small><h2>{item.title}</h2></div><div className="ca-dates"><span>Due {formatCanopyDate(item.dueAt)}</span>{count>0&&<strong>Attempt {count} of 3</strong>}</div></div>
          <div className="ca-threefold">
            <div><b>01</b><h3>Paragraph response</h3><p>Respond to the weekly learning task with reflection, analysis and a concrete application to climate action.</p></div>
            <div><b>02</b><h3>CanopyCanvas campaign</h3><p>Create the campaign graphic in CanopyCanvas, download it, upload it to your own Google Drive, make it viewable and attach the link.</p><a href="/canopy/canvas">Open CanopyCanvas →</a></div>
            <div><b>03</b><h3>Speaker challenge</h3>{speakerOpen?<><p>{item.speakerPrompt}</p><p>Submit the public LinkedIn post link.</p></>:<><p>Unlocks after Thursday’s live expert session.</p><p>Parts 01 and 02 are available now.</p></>}</div>
          </div>
          {sub&&<div className="ca-status">
            <div><span>Latest submission</span><strong>{new Date(sub.submitted_at).toLocaleString()}</strong></div>
            <div><span>Status</span><strong>{status}</strong></div>
            <div><span>Final score</span><strong>{visible?`${score}/100 · ${sub.score_band||''}`:'Releases after the week closes'}</strong>{visible&&<small>{reviewLabel(sub)}</small>}</div>
            {visible&&finalFeedback(sub)&&<div className="ca-feedback"><span>Feedback</span><strong>{finalFeedback(sub)}</strong></div>}
            {visible&&(['revision_required','needs_manual_review'].includes(sub.assessment_status)||Number(score)<70)&&<div className="ca-feedback ca-revision"><span>Next step</span><strong>Revision required. Use the feedback above and submit again within the resubmission window if an attempt remains.</strong></div>}
          </div>}
          {(!sub||mayResubmit)&&<div className="ca-form">
            <label>Paragraph answer<textarea rows="8" value={d.paragraph_response||''} onChange={e=>setDrafts(x=>({...x,[item.weekKey]:{...d,paragraph_response:e.target.value}}))} placeholder="Write your response here…"/></label>
            <label>CanopyCanvas Google Drive link<input inputMode="url" value={d.canvas_link||''} onChange={e=>setDrafts(x=>({...x,[item.weekKey]:{...d,canvas_link:e.target.value}}))} placeholder="https://drive.google.com/…"/></label>
            {speakerOpen&&<label>LinkedIn speaker-task post link<input inputMode="url" value={d.linkedin_link||''} onChange={e=>setDrafts(x=>({...x,[item.weekKey]:{...d,linkedin_link:e.target.value}}))} placeholder="https://www.linkedin.com/posts/…"/></label>}
            <button type="button" disabled={busy===item.weekKey||!speakerOpen} onClick={()=>send(item)}>{!speakerOpen?'Final submission opens Thursday':busy===item.weekKey?'Submitting…':sub?'Submit revision':'Submit assignment'}</button>
            {sub&&<small>{Math.max(0,3-count)} resubmission{3-count===1?'':'s'} remaining.</small>}
          </div>}
          {sub&&!mayResubmit&&<p className="ca-locked">Submission window closed or all three attempts have been used.</p>}
          <WordPuzzle viewer={viewer} item={item} completed={puzzleDone} onComplete={load}/>
        </article>
      })}
    </div>
    {message&&<div className="ca-toast" role="status">{message}</div>}
  </section>
}
