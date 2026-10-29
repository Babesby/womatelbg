import React,{useState} from 'react';
import {Check,ExternalLink,ShieldCheck} from 'lucide-react';
import './canopyMissionClosed.css';
const modes=[['both','Both verified'],['individual','Individual verified'],['final','Final team verified'],['none','Not verified']];
export default function CanopyMissionClosedPreview(){
 const[mode,setMode]=useState('both');
 const individual=mode==='both'||mode==='individual',team=mode==='both'||mode==='final',done=individual||team;
 return <main className="cm-page cm-closed-page">
   <div className="cce-tester-controls"><div><strong>TESTER ONLY · MISSION CLOSEOUT</strong><p>Preview only. No learner records are changed.</p></div><label>View as<select value={mode} onChange={e=>setMode(e.target.value)}>{modes.map(([v,t])=><option value={v} key={v}>{t}</option>)}</select></label></div>
   <section className="cm-closed-hero"><span className="cm-closed-eyebrow">WOMATE · SHE LEADS CLIMATE · COHORT 2</span><div className="cm-closed-pill"><ShieldCheck size={15}/> Mission phase concluded</div>
   {done?<><h1>Congratulations, Fellow.</h1><p>Your verified Mission achievement is part of your Impact Portfolio.</p><div className="cm-closed-achievements">{individual&&<span><Check size={16}/> Individual Mission · Verified</span>}{team&&<span><Check size={16}/> Final Team Mission · Verified</span>}</div><p className="cm-closed-opportunity">This achievement strengthens your profile for WOMATE opportunities, funding and paid work. Selection is subject to each programme's requirements.</p><div className="cm-closed-actions"><a href="/canopy/portfolio">Impact Portfolio / Save as PDF <ExternalLink size={16}/></a><a href="/canopy/talent">Talent Discovery <ExternalLink size={16}/></a></div></>:<><h1>The Mission chapter is complete.</h1><p>Thank you for taking part in She Leads Climate. Mission submissions are closed.</p><a className="cm-closed-simple" href="/canopy/portfolio">View Impact Portfolio <ExternalLink size={16}/></a></>}
   </section>{done&&<section className="cm-closed-record"><span>YOUR VERIFIED ACHIEVEMENT</span><h2>Cross-country Climate Mission</h2><p>Official WOMATE Mission recognition · She Leads Climate 2026</p></section>}
 </main>;
}