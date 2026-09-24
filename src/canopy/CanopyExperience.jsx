import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowRight,Brain,BriefcaseBusiness,Check,ExternalLink,Play,Printer,RotateCcw,Sparkles,Star,Trophy,Users,Zap} from 'lucide-react';
import {modules} from './canopyData';
import {CANOPY_ASSIGNMENT_SCHEDULE,formatCanopyDate,getLiveSessionAt} from './canopySchedule';
import {getFeaturedSpotlights} from './canopyApi';

export const CANOPY_JOURNEY_STAGES=[
  {moduleId:'01',verb:'DISCOVER',label:'Understand',short:'Build the climate foundation.'},
  {moduleId:'02',verb:'STORY',label:'Empathise',short:'See who is affected and why.'},
  {moduleId:'03',verb:'INFLUENCE',label:'Influence',short:'Turn evidence into a policy ask.'},
  {moduleId:'04',verb:'ADVOCATE',label:'Advocate',short:'Move an audience toward action.'},
  {moduleId:'05',verb:'LEAD',label:'Lead',short:'Turn learning into your next move.'}
];

const REFLECTION_PROMPTS={
  '02.1':'Whose experience is easy to miss when we describe this climate issue?',
  '03.4':'Write the one sentence you would want a decision-maker to remember.',
  '04.4':'Which result would prove your campaign worked beyond views and likes?',
  '05.1':'What kind of climate leader do you want people to experience you as?'
};

const LESSON_ACTIVITIES={
  '02.2':{type:'truth-myth',eyebrow:'MYTH BUSTER',title:'Climate justice, fast.',intro:'You have 3 seconds per card. Swipe left for Myth, right for Truth — or use the buttons.',items:[
    ['All women experience climate impacts in the same way.',false,'Age, income, disability, location and livelihood can change both risk and capacity.'],
    ['Access to finance can change a person’s ability to adapt.',true,'Finance can affect whether someone can invest in safer livelihoods, tools or recovery.'],
    ['Migration is an equally available adaptation option for everyone.',false,'Money, care responsibilities, health, culture and safety can all shape whether someone can move.'],
    ['Care responsibilities can shape climate vulnerability.',true,'Extra care work can affect time, mobility, income and recovery after a shock.']
  ]},
  '02.3':{type:'scramble',eyebrow:'BRAIN TEASER',title:'Unscramble the justice lens.',intro:'Decode each climate-justice word. No grades, just a quick reset for your brain.',rounds:[
    ['YTIUQE','EQUITY',['EQUITY','ENERGY','EQUALITY']],
    ['ECIOV','VOICE',['VOICE','CHOICE','VALUE']],
    ['REWOP','POWER',['POWER','POLICY','PEOPLE']],
    ['YCNAGE','AGENCY',['AGENCY','ACCESS','ACTION']]
  ]},
  '02.4':{type:'choice',eyebrow:'30-SECOND DECISION',title:'Who gets a real seat at the table?',rounds:[
    {q:'A district is planning flood adaptation. Which option is most meaningful?',options:['Invite women after the plan is finished.','Include affected women early, listen to priorities and show how input changed the plan.','Ask one woman to speak for every community.'],answer:1,explanation:'Participation is meaningful when people can influence the decision, not simply attend.'}
  ]},
  '03.1':{type:'choice',eyebrow:'POLICY POWER CHECK',title:'Who can actually move the rule?',rounds:[
    {q:'A market needs enforceable waste-separation rules. Which actor is most likely to have formal authority?',options:['A random social-media account','The relevant local authority or regulator','A visiting influencer'],answer:1,explanation:'Good advocacy identifies the institution with the mandate to act.'}
  ]},
  '03.2':{type:'scramble',eyebrow:'BRAIN TEASER',title:'Policy word sprint.',rounds:[
    ['YCLIOP','POLICY',['POLICY','PUBLIC','PLAN']],
    ['TEGDUB','BUDGET',['BUDGET','TARGET','BRIDGE']],
    ['ATAD','DATA',['DATA','DATE','DUTY']],
    ['TYLIBATNUOCCA','ACCOUNTABILITY',['ACCOUNTABILITY','ADAPTABILITY','AVAILABILITY']]
  ]},
  '03.3':{type:'truth-myth',eyebrow:'POLICY MYTH BUSTER',title:'Ambition is not implementation.',items:[
    ['A strong policy on paper guarantees strong delivery.',false,'Delivery still depends on budget, capacity, coordination, timelines and accountability.'],
    ['Evidence can strengthen a policy ask.',true,'Specific evidence helps decision-makers understand scale, urgency and practical options.'],
    ['Young people can only influence policy after they hold public office.',false,'Consultations, research, coalitions, public comment and organised advocacy can all create entry points.'],
    ['Clear responsibility makes implementation easier to track.',true,'Named institutions, timelines and measurable actions make accountability more practical.']
  ]},
  '04.1':{type:'choice',eyebrow:'ADVOCACY SPRINT',title:'Choose the strongest call to action.',rounds:[
    {q:'Which ending gives an audience the clearest next step?',options:['Climate change is serious.','Someone should do something.','This Saturday, join the community drain clean-up and bring one reusable sack.'],answer:2,explanation:'A specific action, time and behaviour is easier to act on than a vague appeal.'}
  ]},
  '04.2':{type:'truth-myth',eyebrow:'TRUTH / MYTH',title:'Credible climate communication.',items:[
    ['A personal flood story can replace broader evidence about climate trends.',false,'Lived experience adds meaning, but it should not be presented as comprehensive scientific proof.'],
    ['A strong climate message can be emotional and evidence-based at the same time.',true,'Human stories and reliable evidence can strengthen each other when their roles are clear.'],
    ['More views always means a campaign created real-world change.',false,'Reach matters, but action, participation, policy response or behaviour change are stronger outcome measures.'],
    ['A clear audience makes an advocacy message easier to design.',true,'Knowing who must think, feel or act differently sharpens the message and call to action.']
  ]},
  '04.3':{type:'choice',eyebrow:'ETHICS QUICK CHECK',title:'Tell the story without exploiting it.',rounds:[
    {q:'You filmed a person affected by flooding. What is the strongest next step before publishing?',options:['Post immediately because the issue is important.','Get informed permission and avoid exposing details that could harm or embarrass them.','Add dramatic music so the clip performs better.'],answer:1,explanation:'Advocacy should protect dignity, consent and safety while communicating the issue.'}
  ]},
  '05.2':{type:'scramble',eyebrow:'CAREER BRAIN TEASER',title:'Decode your next move.',rounds:[
    ['KROWETN','NETWORK',['NETWORK','NOTEBOOK','TEAMWORK']],
    ['LLIKS','SKILL',['SKILL','SCALE','STORY']],
    ['TIOFOLROP','PORTFOLIO',['PORTFOLIO','PROTOCOL','POSITION']],
    ['NOITCA','ACTION',['ACTION','IMPACT','VISION']]
  ]},
  '05.3':{type:'choice',eyebrow:'NETWORKING DECISION',title:'Which follow-up builds a real relationship?',rounds:[
    {q:'You meet a climate professional after a session. What is the strongest follow-up?',options:['Send “Hi” every week.','Send one specific note about what you learned, connect it to your interest, and ask for one reasonable next step.','Immediately ask them to find you a job.'],answer:1,explanation:'Specific, respectful follow-up makes it easier for someone to remember you and respond.'}
  ]},
  '05.4':{type:'truth-myth',pair:true,eyebrow:'FINAL QUICKFIRE',title:'Play solo or challenge a colleague.',intro:'Fast cards, 3 seconds each. Build a combo. In colleague mode, turns alternate automatically.',items:[
    ['Leadership requires having the biggest title in the room.',false,'Leadership can be demonstrated through initiative, trust, delivery and influence.'],
    ['A portfolio can show evidence of what you can actually do.',true,'Practical work gives employers and fellowships something concrete to assess.'],
    ['Networking works best when every interaction starts with asking for a favour.',false,'Strong networks grow through relevance, reciprocity and thoughtful follow-up.'],
    ['A 30-day action can be more useful than a vague one-year ambition.',true,'A near-term action creates evidence, momentum and learning.'],
    ['Climate leadership can happen in communities, schools, policy, research, business and technology.',true,'There is no single climate-career pathway.']
  ]}
};

const NOTES_KEY='womate_canopy_reflection_notes_v1';
const PLAY_KEY='womate_canopy_learning_play_v1';

export function getCanopyReflectionNotes(){
  try{return JSON.parse(localStorage.getItem(NOTES_KEY)||'{}')||{}}catch{return {}}
}
function persistCanopyReflectionNotes(notes){
  try{localStorage.setItem(NOTES_KEY,JSON.stringify(notes))}catch{}
}
function getPlayProgress(){
  try{return JSON.parse(localStorage.getItem(PLAY_KEY)||'{}')||{}}catch{return {}}
}
function persistPlayProgress(progress){
  try{localStorage.setItem(PLAY_KEY,JSON.stringify(progress))}catch{}
}

export function CanopyJourneyMap({progress=[],compact=false}){
  const done=new Set((progress||[]).filter(x=>x.completed).map(x=>x.lesson_id));
  return <section className={`cx-journey ${compact?'is-compact':''}`} aria-label="She Leads learning journey">
    <div className="cx-journey-head"><div><span>YOUR JOURNEY</span><h2>{compact?'Five moves from learning to leadership':'From climate knowledge to climate leadership'}</h2></div>{!compact&&<p>Each module changes the kind of work you do — from understanding the issue to leading your next action.</p>}</div>
    <div className="cx-journey-track">
      {CANOPY_JOURNEY_STAGES.map((stage,index)=>{
        const module=modules.find(m=>m.id===stage.moduleId);
        const count=module?.lessons.filter(l=>done.has(l.id)).length||0;
        const total=module?.lessons.length||1;
        const complete=count===total;
        const active=!complete&&count>0;
        return <div className={`cx-journey-stop ${complete?'is-complete':active?'is-active':''}`} key={stage.moduleId}>
          <div className="cx-journey-node">{complete?<Check size={16}/>:String(index+1).padStart(2,'0')}</div>
          <div><small>{stage.verb}</small><strong>{stage.label}</strong><span>{stage.short}</span></div>
        </div>;
      })}
    </div>
  </section>;
}

function useCountdown(target){
  const[now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const t=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(t)},[]);
  const targetTime=target?new Date(target).getTime():now;
  const distance=Math.max(0,targetTime-now);
  return {
    ended:distance<=0,
    days:Math.floor(distance/86400000),
    hours:Math.floor((distance%86400000)/3600000),
    minutes:Math.floor((distance%3600000)/60000),
    seconds:Math.floor((distance%60000)/1000)
  };
}

export function CanopyLiveCountdown({item}){
  const liveAt=getLiveSessionAt(item);
  const countdown=useCountdown(liveAt);
  if(!item)return null;
  const speakerAt=new Date(item.speakerOpensAt);
  const now=new Date();
  const liveEnded=now>=speakerAt;
  const actionLabel=liveEnded?'Watch session / replay':countdown.ended?'Join live on YouTube':'Open YouTube session';
  return <section className={`cx-live ${item.livePoster?'has-poster':''} ${liveEnded?'is-complete':countdown.ended?'is-live':''}`}>
    {item.livePoster&&<img className="cx-live-poster" src={item.livePoster} alt={`Module ${item.moduleId} live session flyer`} loading="lazy"/>}
    <div className="cx-live-body">
      <div className="cx-live-pulse" aria-hidden="true"><span/></div>
      <div className="cx-live-copy"><small>{liveEnded?'SESSION COMPLETE':countdown.ended?'LIVE SESSION · NOW':'NEXT LIVE SESSION'}</small><h3>Module {item.moduleId} · {item.title}</h3><p>Thursday · 4:00 PM GMT{item.liveSpeaker?` · ${item.liveSpeaker}`:''}</p>{item.liveSpeakerRole&&<span className="cx-live-speaker-role">{item.liveSpeakerRole}</span>}</div>
      {!liveEnded&&!countdown.ended&&<div className="cx-countdown" aria-label={`${countdown.days} days ${countdown.hours} hours ${countdown.minutes} minutes until live session`}>
        {[['DAYS',countdown.days],['HRS',countdown.hours],['MIN',countdown.minutes],['SEC',countdown.seconds]].map(([label,value])=><div key={label}><strong>{String(value).padStart(2,'0')}</strong><span>{label}</span></div>)}
      </div>}
      {item.liveUrl?<a className="cx-link" href={item.liveUrl} target="_blank" rel="noreferrer">{actionLabel} <ExternalLink size={14}/></a>:<button type="button" className="cx-link" onClick={()=>{window.history.pushState({},'','/canopy/notifications');window.dispatchEvent(new PopStateEvent('popstate'))}}>Session details <ArrowRight size={14}/></button>}
    </div>
  </section>;
}

function currentAssignment(now=new Date()){
  const started=CANOPY_ASSIGNMENT_SCHEDULE.filter(x=>now>=new Date(x.weekStartsAt));
  const current=started.find(x=>now<=new Date(x.dueAt));
  if(current)return current;
  return CANOPY_ASSIGNMENT_SCHEDULE.find(x=>now<new Date(x.weekStartsAt))||started.at(-1)||null;
}

export function CanopyThisWeek({progress=[],submissions=[],next}){
  const item=currentAssignment();
  if(!item)return null;
  const submission=(submissions||[]).filter(s=>s.week_key===item.weekKey).sort((a,b)=>new Date(b.submitted_at)-new Date(a.submitted_at))[0];
  const now=new Date();
  const speakerOpen=now>=new Date(item.speakerOpensAt);
  const duePassed=now>new Date(item.dueAt);
  return <section className="cx-week">
    <header><div><span>THIS WEEK</span><h2>Know exactly what matters now.</h2></div><small>Module {item.moduleId}</small></header>
    <div className="cx-week-grid">
      <article className="cx-week-primary"><small>CONTINUE</small><h3>{next?next.l.title:item.title}</h3><p>{next?`Continue ${next.m.title}.`:'Your current learning is caught up.'}</p><button className="canopyPrimary" onClick={()=>{const path=next?`/canopy/course/she-leads/${next.m.id}/${next.l.id}`:'/canopy/course/she-leads';window.history.pushState({},'',path);window.dispatchEvent(new PopStateEvent('popstate'));window.scrollTo({top:0,behavior:'smooth'})}}>{next?'Continue where I left off':'Open course'} <ArrowRight size={15}/></button></article>
      <article><small>WEEKLY WORK</small><h3>{submission?'Submitted':duePassed?'Week closed':'Assignment in progress'}</h3><p>{submission?`Latest status: ${(submission.assessment_status||submission.status||'submitted').replaceAll('_',' ')}.`:`Due ${formatCanopyDate(item.dueAt)}.`}</p><button className="cx-text-action" onClick={()=>{window.history.pushState({},'','/canopy/assignments');window.dispatchEvent(new PopStateEvent('popstate'))}}>Open assignment <ArrowRight size={14}/></button></article>
      <article><small>SPEAKER CHALLENGE</small><h3>{speakerOpen?'Open now':'Unlocks Thursday'}</h3><p>{speakerOpen?'Add your LinkedIn challenge when ready.':'It unlocks after the live expert session at 6:00 PM GMT.'}</p><button className="cx-text-action" onClick={()=>{window.history.pushState({},'','/canopy/assignments');window.dispatchEvent(new PopStateEvent('popstate'))}}>View challenge <ArrowRight size={14}/></button></article>
    </div>
    <CanopyLiveCountdown item={item}/>
  </section>;
}

function savePlayResult(lessonId,result){
  const all=getPlayProgress();
  const next={...all,[lessonId]:{...result,lessonId,completedAt:new Date().toISOString()}};
  persistPlayProgress(next);
  return next[lessonId];
}

function ActivityComplete({saved,onReplay,pairMode=false}){
  return <div className="cx-game-complete"><div className="cx-game-trophy"><Trophy size={20}/></div><div><small>QUICK ACTIVITY COMPLETE</small><h4>{pairMode?'Nice teamwork.':'Nice work.'}</h4><p>{pairMode&&saved?.pairScores?`Player 1: ${saved.pairScores[0]} · Player 2: ${saved.pairScores[1]}`:`${saved?.score||0}/${saved?.total||0} correct${saved?.points?` · ${saved.points} pts`:''}${saved?.bestCombo>1?` · Best combo ×${saved.bestCombo}`:''}`}</p></div><button type="button" onClick={onReplay}><RotateCcw size={14}/> Replay</button></div>;
}

function TruthMythGame({lessonId,activity}){
  const stored=getPlayProgress()[lessonId];
  const[complete,setComplete]=useState(stored||null);
  const[playing,setPlaying]=useState(false);
  const[index,setIndex]=useState(0);
  const[time,setTime]=useState(3);
  const[score,setScore]=useState(0);
  const[points,setPoints]=useState(0);
  const[streak,setStreak]=useState(0);
  const[bestCombo,setBestCombo]=useState(0);
  const[feedback,setFeedback]=useState(null);
  const[pairMode,setPairMode]=useState(false);
  const[pairScores,setPairScores]=useState([0,0]);
  const dragStart=useRef(null);
  const items=activity.items||[];
  const current=items[index];
  function reset(){setComplete(null);setPlaying(false);setIndex(0);setTime(3);setScore(0);setPoints(0);setStreak(0);setBestCombo(0);setFeedback(null);setPairScores([0,0])}
  function finish(nextScore,nextPoints,nextBest,nextPair){setPlaying(false);setComplete(savePlayResult(lessonId,{type:'truth-myth',score:nextScore,points:nextPoints,total:items.length,bestCombo:nextBest,pairMode,pairScores:nextPair}))}
  function answer(choice){
    if(!playing||feedback||!current)return;
    const correct=choice===current[1];
    const nextStreak=correct?streak+1:0;
    const nextBest=Math.max(bestCombo,nextStreak);
    const correctPoint=correct?1:0;
    const nextScore=score+correctPoint;
    const earned=correct?Math.max(1,nextStreak):0;
    const nextPoints=points+earned;
    const player=index%2;
    const nextPair=[...pairScores];if(pairMode&&correct)nextPair[player]+=1;
    setScore(nextScore);setPoints(nextPoints);setStreak(nextStreak);setBestCombo(nextBest);setPairScores(nextPair);setFeedback(correct?'correct':'wrong');
    try{navigator.vibrate?.(correct?25:[35,30,35])}catch{}
    window.setTimeout(()=>{setFeedback(null);if(index>=items.length-1)finish(nextScore,nextPoints,nextBest,nextPair);else{setIndex(i=>i+1);setTime(3)}},520);
  }
  useEffect(()=>{if(!playing||feedback||complete)return;const t=window.setTimeout(()=>{if(time<=1)answer(null);else setTime(v=>v-1)},1000);return()=>window.clearTimeout(t)},[playing,feedback,complete,time,index]);
  if(complete)return <ActivityComplete saved={complete} pairMode={complete.pairMode} onReplay={reset}/>;
  if(!playing)return <div className="cx-game-start"><div><Brain size={20}/><small>{activity.eyebrow||'QUICK GAME'}</small><h3>{activity.title}</h3><p>{activity.intro||'A quick, ungraded challenge to test your instinct.'}</p></div>{activity.pair&&<label className="cx-pair-toggle"><input type="checkbox" checked={pairMode} onChange={e=>setPairMode(e.target.checked)}/><span><Users size={15}/> Play with a colleague</span></label>}<button type="button" onClick={()=>{setPlaying(true);setTime(3)}}><Play size={15}/> Start challenge</button></div>;
  const activePlayer=pairMode?(index%2)+1:null;
  return <div className={`cx-game cx-truthmyth ${feedback?`is-${feedback}`:''}`}>
    <div className="cx-game-top"><span>{activity.eyebrow||'MYTH BUSTER'}</span><div><b>{activePlayer?`PLAYER ${activePlayer}`:`COMBO ×${Math.max(1,streak)}`}</b><em>{time}s</em></div></div>
    <div className="cx-timer"><span style={{width:`${(time/3)*100}%`}}/></div>
    <div className="cx-game-card" onPointerDown={e=>{dragStart.current=e.clientX}} onPointerUp={e=>{if(dragStart.current==null)return;const delta=e.clientX-dragStart.current;dragStart.current=null;if(delta>55)answer(true);else if(delta<-55)answer(false)}}>
      <small>{index+1} / {items.length}</small><h3>{current?.[0]}</h3>{feedback&&<p>{current?.[2]}</p>}
    </div>
    <div className="cx-swipe-actions"><button type="button" className="is-myth" onClick={()=>answer(false)}>← Myth</button><button type="button" className="is-truth" onClick={()=>answer(true)}>Truth →</button></div>
    <p className="cx-swipe-hint">Swipe the card or tap a side. Not graded.</p>
  </div>;
}

function ScrambleGame({lessonId,activity}){
  const stored=getPlayProgress()[lessonId];
  const[complete,setComplete]=useState(stored||null);const[index,setIndex]=useState(0);const[score,setScore]=useState(0);const[feedback,setFeedback]=useState(null);
  const round=activity.rounds?.[index];
  function reset(){setComplete(null);setIndex(0);setScore(0);setFeedback(null)}
  function choose(option){if(feedback)return;const correct=option===round[1];const next=score+(correct?1:0);setScore(next);setFeedback(correct?'correct':'wrong');try{navigator.vibrate?.(correct?20:[30,25,30])}catch{};window.setTimeout(()=>{setFeedback(null);if(index>=activity.rounds.length-1)setComplete(savePlayResult(lessonId,{type:'scramble',score:next,total:activity.rounds.length}));else setIndex(i=>i+1)},500)}
  if(complete)return <ActivityComplete saved={complete} onReplay={reset}/>;
  return <div className={`cx-game cx-scramble ${feedback?`is-${feedback}`:''}`}><div className="cx-game-top"><span>{activity.eyebrow}</span><b>{index+1}/{activity.rounds.length}</b></div><h3>{activity.title}</h3>{activity.intro&&<p className="cx-game-intro">{activity.intro}</p>}<div className="cx-scramble-word">{round?.[0]}</div><div className="cx-choice-grid">{round?.[2].map(option=><button type="button" key={option} onClick={()=>choose(option)}>{option}</button>)}</div></div>;
}

function ChoiceGame({lessonId,activity}){
  const stored=getPlayProgress()[lessonId];
  const[complete,setComplete]=useState(stored||null);const[index,setIndex]=useState(0);const[score,setScore]=useState(0);const[feedback,setFeedback]=useState(null);
  const round=activity.rounds?.[index];
  function reset(){setComplete(null);setIndex(0);setScore(0);setFeedback(null)}
  function choose(choiceIndex){if(feedback)return;const correct=choiceIndex===round.answer;const next=score+(correct?1:0);setScore(next);setFeedback({correct,text:round.explanation});try{navigator.vibrate?.(correct?20:[30,25,30])}catch{};window.setTimeout(()=>{if(index>=activity.rounds.length-1)setComplete(savePlayResult(lessonId,{type:'choice',score:next,total:activity.rounds.length}));else{setIndex(i=>i+1);setFeedback(null)}},900)}
  if(complete)return <ActivityComplete saved={complete} onReplay={reset}/>;
  return <div className={`cx-game cx-choice ${feedback?(feedback.correct?'is-correct':'is-wrong'):''}`}><div className="cx-game-top"><span>{activity.eyebrow}</span><Zap size={16}/></div><h3>{activity.title}</h3><p className="cx-choice-question">{round?.q}</p><div className="cx-choice-grid">{round?.options.map((option,i)=><button type="button" key={option} onClick={()=>choose(i)}>{option}</button>)}</div>{feedback&&<p className="cx-game-feedback">{feedback.text}</p>}</div>;
}

function ReflectionCard({moduleId,lessonId,prompt}){
  const[notes,setNotes]=useState(()=>getCanopyReflectionNotes());
  const existing=notes[lessonId]?.text||'';
  const[value,setValue]=useState(existing);
  const[editing,setEditing]=useState(!existing);
  function save(){const text=value.trim();if(!text)return;const next={...notes,[lessonId]:{lessonId,moduleId,text,savedAt:new Date().toISOString()}};setNotes(next);persistCanopyReflectionNotes(next);setEditing(false)}
  if(existing&&!editing)return <aside className="cx-reflect is-saved"><div className="cx-reflect-icon"><Check size={17}/></div><div className="cx-reflect-main"><small>PAUSE & APPLY · SAVED</small><h3>{prompt}</h3><blockquote>{existing}</blockquote><div><button type="button" onClick={()=>setEditing(true)}>Edit note</button><span>Saved on this device</span></div></div></aside>;
  return <aside className="cx-reflect"><div className="cx-reflect-icon"><Sparkles size={17}/></div><div className="cx-reflect-main"><small>PAUSE & APPLY · PRIVATE NOTE</small><h3>{prompt}</h3><p>Not graded. Keep one thought for yourself and watch your thinking evolve across the programme.</p><textarea rows="3" value={value} onChange={e=>setValue(e.target.value)} placeholder="Write one honest thought…" maxLength={360}/><div><button type="button" onClick={save} disabled={!value.trim()}>Save reflection</button><span>{value.length}/360</span></div></div></aside>;
}

export function CanopyLessonActivity({moduleId,lessonId}){
  if(!['02','03','04','05'].includes(String(moduleId)))return null;
  const prompt=REFLECTION_PROMPTS[lessonId];
  if(prompt)return <ReflectionCard moduleId={moduleId} lessonId={lessonId} prompt={prompt}/>;
  const activity=LESSON_ACTIVITIES[lessonId];
  if(!activity)return null;
  if(activity.type==='truth-myth')return <TruthMythGame lessonId={lessonId} activity={activity}/>;
  if(activity.type==='scramble')return <ScrambleGame lessonId={lessonId} activity={activity}/>;
  return <ChoiceGame lessonId={lessonId} activity={activity}/>;
}

export function CanopyReflectionTimeline(){
  const[notes]=useState(()=>getCanopyReflectionNotes());
  const rows=Object.values(notes).filter(x=>x?.text).sort((a,b)=>String(a.lessonId).localeCompare(String(b.lessonId)));
  if(!rows.length)return null;
  return <section className="cx-reflection-timeline"><header><div><span>YOUR THINKING</span><h2>What changed along the way</h2></div><p>Private reflections saved on this device.</p></header><div>{rows.map(note=><article key={note.lessonId}><span>{note.lessonId}</span><div><small>MODULE {note.moduleId}</small><p>{note.text}</p></div></article>)}</div></section>;
}

export function CanopyModuleComplete({module,onClose}){
  const stage=CANOPY_JOURNEY_STAGES.find(x=>x.moduleId===module.id);
  return <div className="cx-complete-backdrop" role="dialog" aria-modal="true" aria-label={`Module ${module.id} completed`}>
    <section className="cx-complete"><div className="cx-complete-mark"><Check/></div><small>MODULE {module.id} COMPLETE</small><h2>{stage?.verb||'KEEP GOING'}.</h2><p>You completed the learning in <b>{module.title}</b>. Next, turn the ideas into the weekly practical work and speaker challenge.</p><div><button className="canopyPrimary" onClick={()=>{onClose?.();window.history.pushState({},'','/canopy/assignments');window.dispatchEvent(new PopStateEvent('popstate'))}}>Go to assignment <ArrowRight size={15}/></button><button className="canopySecondary" onClick={onClose}>Stay here</button></div></section>
  </div>;
}

export function CanopySpotlight({session}){
  const[items,setItems]=useState([]);
  useEffect(()=>{let live=true;getFeaturedSpotlights(session).then(x=>{if(live)setItems(x||[])}).catch(()=>{});return()=>{live=false}},[session?.access_token]);
  if(!items.length)return null;
  return <section className="cx-spotlight"><header><div><span>CANOPY SPOTLIGHT</span><h2>Work worth seeing.</h2></div><p>Selected by the WOMATE learning team for insight, application or leadership — not popularity.</p></header><div className="cx-spotlight-row">{items.slice(0,5).map(item=><article key={item.id}><div className="cx-spotlight-star"><Star size={16}/></div><small>MODULE {String(item.module_id||'').replace('module-','')}</small><h3>{item.learner_name||'She Leads fellow'}</h3><p>{item.note||'Featured learner work selected by WOMATE.'}</p>{item.artifact_url&&<a href={item.artifact_url} target="_blank" rel="noreferrer">View featured work <ExternalLink size={13}/></a>}</article>)}</div></section>;
}

function latestByWeek(submissions=[]){
  const map={};
  [...submissions].sort((a,b)=>new Date(a.submitted_at)-new Date(b.submitted_at)).forEach(s=>{map[s.week_key]=s});
  return map;
}

export function CanopyPortfolioPage({viewer,submissions=[]}){
  const latest=useMemo(()=>latestByWeek(submissions),[submissions]);
  const profile=viewer?.profile||{};
  const name=profile.full_name||viewer?.user?.user_metadata?.full_name||'She Leads Fellow';
  const country=profile.country||viewer?.user?.user_metadata?.country||'';
  const submitted=CANOPY_ASSIGNMENT_SCHEDULE.filter(item=>latest[item.weekKey]);
  function print(){window.print()}
  return <main className="cx-portfolio">
    <header className="cx-portfolio-hero"><div><span>MY SHE LEADS PORTFOLIO</span><h1>{name}</h1><p>{country?`${country} · `:''}She Leads Climate Mentorship · Cohort 2 · 2026</p></div><button className="canopyPrimary cx-print" onClick={print}><Printer size={16}/> Export / Save as PDF</button></header>
    <section className="cx-portfolio-intro"><BriefcaseBusiness/><div><h2>Evidence of learning, communication and climate leadership.</h2><p>This page organises your submitted practical work into a clean professional record. Keep your Google Drive links viewable before sharing the PDF with an employer, fellowship, internship or climate network.</p></div></section>
    <section className="cx-portfolio-grid">
      {CANOPY_ASSIGNMENT_SCHEDULE.map(item=>{const sub=latest[item.weekKey];const module=modules.find(m=>m.id===item.moduleId);const practical=module?.assignment||{};return <article className={sub?'is-ready':'is-pending'} key={item.weekKey}><div className="cx-portfolio-no">{item.moduleId}</div><div><small>{practical?.portfolioLabel||'PRACTICAL WORK'}</small><h2>{practical?.practicalTitle||module?.title}</h2><p>{practical?.portfolioSummary||practical?.practicalBrief||module?.summary}</p>{sub?<div className="cx-portfolio-links">{sub.canvas_link&&<a href={sub.canvas_link} target="_blank" rel="noreferrer">Open practical work <ExternalLink size={13}/></a>}{sub.linkedin_link&&<a href={sub.linkedin_link} target="_blank" rel="noreferrer">Open LinkedIn challenge <ExternalLink size={13}/></a>}</div>:<span className="cx-portfolio-pending">Not submitted yet</span>}</div></article>})}
    </section>
    {!submitted.length&&<p className="cx-portfolio-empty">Your portfolio will build automatically as you submit the weekly practical work.</p>}
    <footer className="cx-portfolio-footer"><span>WOMATE · SHE LEADS CLIMATE MENTORSHIP</span><span>Portfolio links point to participant-owned Google Drive / LinkedIn work.</span></footer>
  </main>;
}
