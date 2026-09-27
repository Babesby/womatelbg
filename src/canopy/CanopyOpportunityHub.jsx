// WOMATE CANOPY PHASE 2 MISSION CONTROL V2
import React,{useEffect,useMemo,useState} from 'react';
import {ArrowRight,BriefcaseBusiness,Check,ExternalLink,FolderOpen,Leaf,Lock,MapPin,Users} from 'lucide-react';

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
  const [state,setState]=useState(()=>safeRead(storageKey,{mode:'solo',checks:{},folder:''}));

  useEffect(()=>{try{window.localStorage.setItem(storageKey,JSON.stringify(state))}catch{}},[storageKey,state]);

  const missionDone=(m)=>m.steps.every((_,i)=>Boolean(state.checks?.[`${m.module}-${i}`]));
  const completedCount=MISSIONS.filter(m=>missionDone(m)).length;
  const currentIndex=Math.min(completedCount,MISSIONS.length-1);
  const current=MISSIONS[currentIndex];
  const allDone=completedCount===MISSIONS.length;
  const stepCount=current.steps.filter((_,i)=>state.checks?.[`${current.module}-${i}`]).length;
  const progress=allDone?100:Math.round((stepCount/current.steps.length)*100);
  const toggleStep=(i)=>setState(prev=>({...prev,checks:{...prev.checks,[`${current.module}-${i}`]:!prev.checks?.[`${current.module}-${i}`]}}));

  return <main className="cx-opportunity-hub">
    <header className="cx-opportunity-hero">
      <div><span>OPPORTUNITIES</span><h1>Take your learning into the field.</h1><p>{firstName}, complete one mission at a time, keep your proof, and build a climate record you can actually use.</p></div>
      <div className="cx-opportunity-hero-mark"><Leaf size={28}/><small>MISSION</small><strong>{allDone?'05':String(currentIndex+1).padStart(2,'0')}</strong><small>OF 05</small></div>
    </header>

    <section className="cx-mission-control">
      <div className="cx-mission-progress-head">
        <div><span>MISSION CONTROL</span><h2>{allDone?'All missions complete':`Mission ${current.module}: ${current.title}`}</h2></div>
        <div className="cx-mission-progress-value"><strong>{progress}%</strong><span>{allDone?'Complete':`${stepCount}/${current.steps.length} steps`}</span></div>
      </div>
      <div className="cx-mission-progress-track"><i style={{width:`${progress}%`}}/></div>

      <div className="cx-mission-layout">
        <article className="cx-mission-briefing">
          <div className="cx-mission-kicker"><MapPin size={15}/><span>MODULE {current.module}</span><b>{current.stage}</b>{verified.has(current.module)&&<em>Module verified</em>}</div>
          <h3>{current.brief}</h3>

          <div className="cx-mission-mode">
            <span>How are you doing this mission?</span>
            <div><button className={state.mode==='solo'?'is-active':''} onClick={()=>setState(p=>({...p,mode:'solo'}))} type="button">Solo</button><button className={state.mode==='group'?'is-active':''} onClick={()=>setState(p=>({...p,mode:'group'}))} type="button"><Users size={14}/> Group</button></div>
          </div>

          <div className="cx-mission-checklist">
            <span>YOUR ROUTE</span>
            {current.steps.map((step,i)=><button key={step} type="button" className={state.checks?.[`${current.module}-${i}`]?'is-done':''} onClick={()=>toggleStep(i)}><i>{state.checks?.[`${current.module}-${i}`]?<Check size={15}/>:i+1}</i><span>{step}</span></button>)}
          </div>

          <div className="cx-mission-proof"><small>PROOF TO KEEP</small><p>{current.proof}</p></div>
        </article>

        <aside className="cx-proof-folder">
          <div className="cx-proof-folder-icon"><FolderOpen size={24}/></div>
          <span>MISSION PROOF FOLDER</span>
          <h3>Keep every mission in one place.</h3>
          <p>Create one Google Drive folder called <strong>WOMATE Canopy Missions - {firstName}</strong>. Add a subfolder for each mission as you unlock it.</p>
          <label><span>Optional folder link</span><input type="url" value={state.folder||''} onChange={e=>setState(p=>({...p,folder:e.target.value}))} placeholder="Paste your Google Drive folder link"/></label>
          {state.folder&&<a href={state.folder} target="_blank" rel="noreferrer">Open my proof folder <ExternalLink size={14}/></a>}
          <small>Your checklist and folder link are saved on this device so you can keep track as you go.</small>
        </aside>
      </div>

      <div className="cx-mission-queue">
        <span>MISSION PATH</span>
        <div>{MISSIONS.map((m,i)=>{const done=missionDone(m);const unlocked=i<=currentIndex;return <div key={m.module} className={`${done?'is-done':''} ${i===currentIndex&&!allDone?'is-current':''}`}><i>{done?<Check size={13}/>:unlocked?m.module:<Lock size={12}/>}</i><span>{i===currentIndex&&!allDone?m.title:`Mission ${m.module}`}</span></div>})}</div>
      </div>
    </section>

    <section className="cx-opportunity-board">
      <header><div><span>OPPORTUNITY BOARD</span><h2>Explore where climate work already exists.</h2></div><p>Use trusted external sources to discover jobs, fellowships, internships and climate career pathways.</p></header>
      <div className="cx-opportunity-list">
        {OPPORTUNITY_SOURCES.map(o=><a key={o.name} href={o.href} target="_blank" rel="noreferrer"><div className="cx-opportunity-icon"><BriefcaseBusiness size={19}/></div><div><small>{o.type}</small><h3>{o.name}</h3><p>{o.note}</p></div><ExternalLink size={17}/></a>)}
      </div>
      <button type="button" className="cx-impact-link" onClick={()=>{window.history.pushState({},'','/canopy/portfolio');window.dispatchEvent(new PopStateEvent('popstate'));window.scrollTo({top:0,behavior:'smooth'})}}>Open Impact Profile <ArrowRight size={15}/></button>
    </section>
  </main>;
}