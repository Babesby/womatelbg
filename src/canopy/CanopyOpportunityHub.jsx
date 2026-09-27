// WOMATE CANOPY PHASE 2 OPTIONAL MISSION CONTROL V3
import React,{useEffect,useMemo,useState} from 'react';
import {ArrowRight,BriefcaseBusiness,Check,ExternalLink,FolderOpen,Leaf,MapPin,Users} from 'lucide-react';

const MISSIONS=[
  {module:'01',stage:'SEE',title:'Local Climate Signal',brief:'Notice one climate-related change in your community and document what you can directly observe.',steps:['Choose one issue you can see locally.','Record what you directly observe.','Add one photo, note or short voice record as proof.','Write one realistic action that could help.'],proof:'Observation note plus one piece of evidence.'},
  {module:'02',stage:'UNDERSTAND',title:'Five Women, Five Views',brief:'Ask five women how one environmental change is affecting daily life, then look for one shared pattern.',steps:['Choose one local environmental change.','Speak with five women.','Note the key point from each conversation.','Write one pattern you noticed.'],proof:'Five short responses plus your one-paragraph pattern summary.'},
  {module:'03',stage:'CONNECT',title:'Talk to Power',brief:'Identify who has responsibility for one local climate issue and send one clear, evidence-based recommendation.',steps:['Choose one local issue.','Identify the responsible institution or decision-maker.','Write one practical recommendation.','Send it and keep proof.'],proof:'Your recommendation plus proof it was sent.'},
  {module:'04',stage:'ACT',title:'Make the Message Travel',brief:'Create one public climate message for a specific audience and ask for one realistic action.',steps:['Choose your audience.','Choose one clear climate issue.','Create one simple message or visual.','Publish or share it and save proof.'],proof:'A link, screenshot or copy of the public message.'},
  {module:'05',stage:'MULTIPLY',title:'Bring One More Person In',brief:'Help at least one other person understand a climate issue and take one concrete action.',steps:['Choose one person or small group.','Share one climate issue in simple language.','Agree on one action together.','Record what happened after.'],proof:'A short reflection plus simple evidence of the action.'}
];

const OPPORTUNITY_SOURCES=[
  {name:'Climatebase',type:'Climate jobs and fellowships',href:'https://www.climatebase.org/',note:'Explore roles across technology, policy, operations, finance and communications.'},
  {name:'UNFCCC',type:'Climate policy and programme roles',href:'https://unfccc.int/secretariat/employment/recruitment',note:'Explore current international climate action and implementation roles.'},
  {name:'Green Climate Fund',type:'Jobs, internships and consultancies',href:'https://www.greenclimate.fund/about/careers',note:'Explore opportunities in climate finance and programme delivery.'}
];

function completedModules(submissions=[]){
  const set=new Set();
  for(const s of submissions||[]){
    if(String(s.assessment_status||'').toLowerCase()==='completed'){
      set.add(String(s.module_id||String(s.week_key||'').replace('module-','')).padStart(2,'0'));
    }
  }
  return set;
}

function safeRead(key,fallback){
  try{const raw=window.localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}
}

export default function CanopyOpportunityHub({viewer,submissions=[]}){
  const verified=useMemo(()=>completedModules(submissions),[submissions]);
  const name=viewer?.profile?.full_name||viewer?.user?.user_metadata?.full_name||viewer?.user?.email?.split('@')[0]||'Learner';
  const firstName=String(name).trim().split(/\s+/)[0]||'Learner';
  const owner=viewer?.user?.id||viewer?.user?.email||firstName;
  const storageKey=`womate-canopy-missions:${owner}`;
  const [state,setState]=useState(()=>safeRead(storageKey,{mode:'solo',checks:{},folder:'',activeMission:0}));

  useEffect(()=>{try{window.localStorage.setItem(storageKey,JSON.stringify(state))}catch{}},[storageKey,state]);

  const activeIndex=Math.max(0,Math.min(Number(state.activeMission||0),MISSIONS.length-1));
  const current=MISSIONS[activeIndex];
  const missionDone=(m)=>m.steps.every((_,i)=>Boolean(state.checks?.[`${m.module}-${i}`]));
  const completedCount=MISSIONS.filter(m=>missionDone(m)).length;
  const stepCount=current.steps.filter((_,i)=>state.checks?.[`${current.module}-${i}`]).length;
  const progress=Math.round((stepCount/current.steps.length)*100);
  const toggleStep=(i)=>setState(prev=>({...prev,checks:{...prev.checks,[`${current.module}-${i}`]:!prev.checks?.[`${current.module}-${i}`]}}));
  const goNext=()=>setState(prev=>({...prev,activeMission:Math.min(activeIndex+1,MISSIONS.length-1)}));
  const goPrevious=()=>setState(prev=>({...prev,activeMission:Math.max(activeIndex-1,0)}));

  return <main className="cx-opportunity-hub">
    <header className="cx-opportunity-hero">
      <div><span>OPPORTUNITIES</span><h1>Take your learning into the field.</h1><p>{firstName}, these missions are optional ways to turn each module into real-world evidence. Do them when they fit your life, solo or with others.</p></div>
      <div className="cx-opportunity-hero-mark"><Leaf size={28}/><small>OPTIONAL MISSION</small><strong>{String(activeIndex+1).padStart(2,'0')}</strong><small>OF 05</small></div>
    </header>

    <section className="cx-mission-control">
      <div className="cx-mission-progress-head">
        <div><span>MISSION CONTROL</span><h2>Module {current.module}: {current.title}</h2></div>
        <div className="cx-mission-progress-value"><strong>{progress}%</strong><span>{stepCount}/{current.steps.length} steps</span></div>
      </div>
      <div className="cx-mission-progress-track"><i style={{width:`${progress}%`}}/></div>

      <div className="cx-mission-layout">
        <article className="cx-mission-briefing">
          <div className="cx-mission-kicker"><MapPin size={15}/><span>MODULE {current.module}</span><b>{current.stage}</b>{verified.has(current.module)&&<em>Module verified</em>}</div>
          <h3>{current.brief}</h3>
          <p style={{margin:'-8px 0 0',fontSize:12,lineHeight:1.5,color:'var(--canopy-muted)'}}>Optional. No deadline, no grade and no effect on your module progress.</p>

          <div className="cx-mission-mode">
            <span>How would you like to do it?</span>
            <div><button className={state.mode==='solo'?'is-active':''} onClick={()=>setState(p=>({...p,mode:'solo'}))} type="button">Solo</button><button className={state.mode==='group'?'is-active':''} onClick={()=>setState(p=>({...p,mode:'group'}))} type="button"><Users size={14}/> Group</button></div>
          </div>

          <div className="cx-mission-checklist">
            <span>YOUR ROUTE</span>
            {current.steps.map((step,i)=><button key={step} type="button" className={state.checks?.[`${current.module}-${i}`]?'is-done':''} onClick={()=>toggleStep(i)}><i>{state.checks?.[`${current.module}-${i}`]?<Check size={15}/>:i+1}</i><span>{step}</span></button>)}
          </div>

          <div className="cx-mission-proof"><small>PROOF TO KEEP</small><p>{current.proof}</p></div>
          <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
            {activeIndex>0&&<button type="button" className="cx-impact-link" onClick={goPrevious}>Previous mission</button>}
            {activeIndex<MISSIONS.length-1&&<button type="button" className="cx-impact-link" onClick={goNext}>{missionDone(current)?'Next optional mission':'Skip for now'} <ArrowRight size={14}/></button>}
          </div>
        </article>

        <aside className="cx-proof-folder">
          <div className="cx-proof-folder-icon"><FolderOpen size={24}/></div>
          <span>MISSION PROOF FOLDER</span>
          <h3>Keep every mission in one place.</h3>
          <p>Create one Google Drive folder called <strong>WOMATE Canopy Missions - {firstName}</strong>. Add a subfolder whenever you choose to complete a mission.</p>
          <label><span>Optional folder link</span><input type="url" value={state.folder||''} onChange={e=>setState(p=>({...p,folder:e.target.value}))} placeholder="Paste your Google Drive folder link"/></label>
          {state.folder&&<a href={state.folder} target="_blank" rel="noreferrer">Open proof folder <ExternalLink size={13}/></a>}
          <small>This folder belongs to you. Missions are optional and can be completed in any order over time.</small>
        </aside>
      </div>

      <div className="cx-mission-queue"><span>YOUR MISSION JOURNEY</span><div>{MISSIONS.map((m,i)=><div key={m.module} className={`${i===activeIndex?'is-current':''} ${missionDone(m)?'is-done':''}`}><i>{missionDone(m)?<Check size={12}/>:i+1}</i><span>Module {m.module}</span></div>)}</div><small style={{color:'var(--canopy-muted)',fontSize:10}}>{completedCount} of 5 optional missions completed</small></div>
    </section>

    <section className="cx-opportunity-board">
      <header><div><span>OPPORTUNITY BOARD</span><h2>Explore where climate skills can take you.</h2></div><p>Use these trusted sources to explore climate roles, fellowships and internships. Always confirm eligibility and closing dates on the official opportunity page.</p></header>
      <div className="cx-opportunity-list">{OPPORTUNITY_SOURCES.map(item=><a key={item.name} href={item.href} target="_blank" rel="noreferrer"><div className="cx-opportunity-icon"><BriefcaseBusiness size={19}/></div><div><small>{item.type.toUpperCase()}</small><h3>{item.name}</h3><p>{item.note}</p></div><ExternalLink size={17}/></a>)}</div>
      <button type="button" className="cx-impact-link" onClick={()=>{window.location.href='/canopy/portfolio'}}>View your Impact Profile <ArrowRight size={14}/></button>
    </section>
  </main>
}
