import React,{useMemo} from 'react';
import {ArrowRight,BriefcaseBusiness,ExternalLink,Leaf,Sparkles,Users} from 'lucide-react';

const MISSIONS=[
  {module:'01',stage:'SEE',title:'Map one local climate signal',brief:'Document one climate-related change you can directly observe in your community. Separate what you know from what you infer, then identify one practical response.',evidence:'A short field note, photo record or observation summary.'},
  {module:'02',stage:'UNDERSTAND',title:'Ask five women',brief:'Speak with five women about one environmental change affecting daily life. Look for differences in exposure, care work, income, mobility or access to support.',evidence:'Five responses plus a short pattern summary.'},
  {module:'03',stage:'CONNECT',title:'Talk to power',brief:'Identify the institution or decision-maker responsible for one local climate issue. Send one concise, evidence-based recommendation.',evidence:'Your recommendation and proof it was sent.'},
  {module:'04',stage:'ACT',title:'Make one message travel',brief:'Turn one climate issue into a responsible public message for a defined audience and ask for one realistic action.',evidence:'A public post, campaign asset or community message.'},
  {module:'05',stage:'MULTIPLY',title:'Bring one more person in',brief:'Help another person understand a climate issue and take one concrete action. Leadership becomes stronger when capability spreads.',evidence:'A short reflection showing what changed because you involved someone else.'}
];

const OPPORTUNITY_SOURCES=[
  {name:'Climatebase',type:'Jobs, fellowships and climate community',href:'https://www.climatebase.org/',note:'Explore climate roles across technology, policy, operations, finance, communications and more.'},
  {name:'UNFCCC',type:'Climate policy and programme roles',href:'https://unfccc.int/secretariat/employment/recruitment',note:'Current openings supporting international climate action and implementation.'},
  {name:'Green Climate Fund',type:'Jobs, internships and consultancies',href:'https://www.greenclimate.fund/about/careers',note:'Explore staff vacancies, internships and consultancy opportunities in climate finance.'}
];

function completedModules(submissions=[]){
  const set=new Set();
  for(const s of submissions||[]){if(String(s.assessment_status||'').toLowerCase()==='completed')set.add(String(s.module_id||String(s.week_key||'').replace('module-','')).padStart(2,'0'))}
  return set;
}

export default function CanopyOpportunityHub({viewer,submissions=[]}){
  const verified=useMemo(()=>completedModules(submissions),[submissions]);
  const name=viewer?.profile?.full_name||viewer?.user?.user_metadata?.full_name||viewer?.user?.email?.split('@')[0]||'Learner';
  const firstName=String(name).trim().split(/\s+/)[0]||'Learner';
  return <main className="cx-opportunity-hub">
    <header className="cx-opportunity-hero">
      <div><span>OPPORTUNITIES</span><h1>Turn learning into your next move.</h1><p>{firstName}, use Canopy to build evidence in the real world, then take that evidence into climate opportunities.</p></div>
      <div className="cx-opportunity-hero-mark"><Leaf size={28}/><small>LEARN</small><strong>DO</strong><small>PROVE</small></div>
    </header>

    <section className="cx-mission-section">
      <header><div><span>CANOPY MISSIONS</span><h2>Do something that exists beyond the classroom.</h2></div><p>These missions are optional and are not graded. Keep your evidence. Strong work can later strengthen your Impact Profile, applications and WOMATE opportunity matching.</p></header>
      <div className="cx-mission-grid">
        {MISSIONS.map(m=><article key={m.module} className={verified.has(m.module)?'is-verified':''}>
          <div className="cx-mission-top"><span>MODULE {m.module}</span><b>{m.stage}</b></div>
          <h3>{m.title}</h3><p>{m.brief}</p>
          <footer><div><small>KEEP AS EVIDENCE</small><span>{m.evidence}</span></div>{verified.has(m.module)&&<strong>Module verified by WOMATE</strong>}</footer>
        </article>)}
      </div>
    </section>

    <section className="cx-opportunity-board">
      <header><div><span>OPPORTUNITY BOARD</span><h2>Start looking where climate work already exists.</h2></div><p>WOMATE curated opportunities can grow here over time. For now, these trusted external sources help you explore real climate career pathways.</p></header>
      <div className="cx-opportunity-list">
        {OPPORTUNITY_SOURCES.map(o=><a key={o.name} href={o.href} target="_blank" rel="noreferrer"><div className="cx-opportunity-icon"><BriefcaseBusiness size={19}/></div><div><small>{o.type}</small><h3>{o.name}</h3><p>{o.note}</p></div><ExternalLink size={17}/></a>)}
      </div>
      <div className="cx-opportunity-next"><Sparkles size={20}/><div><small>WHAT COMES NEXT</small><strong>WOMATE curated grants, fellowships, internships and paid climate missions.</strong><p>The next layer can match opportunities to the verified evidence already building in each learner's Impact Profile.</p></div><button type="button" onClick={()=>{window.history.pushState({},'','/canopy/portfolio');window.dispatchEvent(new PopStateEvent('popstate'));window.scrollTo({top:0,behavior:'smooth'})}}>Open Impact Profile <ArrowRight size={15}/></button></div>
    </section>

    <aside className="cx-opportunity-note"><Users size={18}/><p><strong>Your record should get more useful as you act.</strong> Keep links, proof and outcomes from work you do outside the classroom. Canopy is moving toward connecting verified capability with real opportunities.</p></aside>
  </main>;
}