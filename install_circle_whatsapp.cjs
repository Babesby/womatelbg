const fs=require('fs'), path=require('path');

const main=path.resolve(process.cwd(),'src','main.jsx');
if(!fs.existsSync(main)){
  console.error('ERROR: src/main.jsx not found. Run from the WOMATE project root.');
  process.exit(1);
}
let s=fs.readFileSync(main,'utf8');
const backup=main+'.before-circle-whatsapp-premium.bak';
if(!fs.existsSync(backup)) fs.copyFileSync(main,backup);

// -----------------------------------------------------------------------------
// 1. COPY: lock the requested wording.
// -----------------------------------------------------------------------------
const replacements = new Map([
  ['One direct route into the Circle.','The WOMATE Circle is free to join.'],
  ['One clear route into the Circle.','The WOMATE Circle is free to join.'],
  ['Enter the community, introduce yourself and connect to learning, opportunities and peers.','Enter the community, introduce yourself and connect to learning, opportunities and peers.'],
  ['Access learning, resources, opportunities and peer exchange without a membership fee.','Access learning, resources, opportunities and peer exchange.'],
  ['There is no membership payment. The Circle is WOMATE’s open community pathway.',''],
  ["There is no membership payment. The Circle is WOMATE's open community pathway.",'']
]);
for(const [a,b] of replacements) s=s.split(a).join(b);

// If the direct-route description is an older paid-membership version, replace it.
s=s.replace(
  /Complete your credentials first\. Free members continue to community onboarding; Practitioner and Vanguard members complete the annual membership payment before WhatsApp admission\./g,
  'Enter the community, introduce yourself and connect to learning, opportunities and peers.'
);

// Normalize requested free-access sentence if an older variant exists.
s=s.replace(
  /Access learning, resources, opportunities and peer exchange[^<"'`]*membership fee\./g,
  'Access learning, resources, opportunities and peer exchange.'
);

// -----------------------------------------------------------------------------
// 2. REMOVE the entire "Ready to enter?" / payment-gating access block.
//    Handles the current free version and the older "Already registered?" block.
// -----------------------------------------------------------------------------
s=s.replace(
  /<section className="circleAccess">[\s\S]*?<\/section>/g,
  ''
);
s=s.replace(
  /<section[^>]*>[\s\S]*?<h2>Ready to enter\?<\/h2>[\s\S]*?Open WhatsApp community[\s\S]*?<\/section>/g,
  ''
);

// Remove any leftover exact Ready-to-enter fragment if not wrapped as expected.
s=s.replace(
  /<div[^>]*>\s*<h2>Ready to enter\?<\/h2>[\s\S]*?Open WhatsApp community[\s\S]*?<\/div>/g,
  ''
);

// -----------------------------------------------------------------------------
// 3. ADD a real interactive WhatsApp widget component.
// Uses existing CIRCLE_WHATSAPP as the real community destination.
// If VITE_CIRCLE_WHATSAPP_CHAT_URL is later set to a wa.me URL, typed messages
// are passed as ?text=. With the existing group invite, it opens the real group.
// -----------------------------------------------------------------------------
if(!s.includes('function CircleWhatsAppWidget(')){
  const marker='function Circle(';
  const pos=s.indexOf(marker);
  if(pos<0){
    console.error('ERROR: Circle component not found.');
    process.exit(2);
  }

  const widget=`
function CircleWhatsAppWidget(){
 const[open,setOpen]=useState(true);
 const[message,setMessage]=useState('');
 const chatUrl=import.meta.env.VITE_CIRCLE_WHATSAPP_CHAT_URL||'';
 const communityUrl=typeof CIRCLE_WHATSAPP!=='undefined'?CIRCLE_WHATSAPP:(import.meta.env.VITE_CIRCLE_WHATSAPP_URL||'');
 const launch=()=>{
   const typed=message.trim();
   let target=chatUrl||communityUrl;
   if(!target){alert('Add VITE_CIRCLE_WHATSAPP_URL to your .env to activate the WOMATE Circle WhatsApp route.');return}
   if(chatUrl&&typed){
     try{
       const u=new URL(chatUrl);
       u.searchParams.set('text',typed);
       target=u.toString();
     }catch(_){}
   }
   window.open(target,'_blank','noopener,noreferrer');
 };
 return <div className={'circleWaShell '+(open?'isOpen':'')} aria-live="polite">
   {open&&<aside className="circleWaPanel" aria-label="WOMATE Circle WhatsApp">
     <div className="circleWaHead">
       <div className="circleWaAvatar"><img src="/assets/img/logo.svg" alt=""/></div>
       <div><strong>WOMATE Circle</strong><span>Community support on WhatsApp</span></div>
       <button type="button" className="circleWaClose" onClick={()=>setOpen(false)} aria-label="Close WhatsApp widget">×</button>
     </div>
     <div className="circleWaBody">
       <span className="circleWaToday">Today</span>
       <div className="circleWaBubble">Welcome to the WOMATE Circle. Join the community to connect with women in climate, learning and opportunities.</div>
       <span className="circleWaTime">WOMATE</span>
     </div>
     <div className="circleWaCompose">
       <div className="circleWaInputRow">
         <input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')launch()}} placeholder="Type a message..." aria-label="Message WOMATE on WhatsApp"/>
         <button type="button" className="circleWaSend" onClick={launch} aria-label="Open WhatsApp">➤</button>
       </div>
       <button type="button" className="circleWaStart" onClick={launch}>Open WOMATE Circle on WhatsApp</button>
       {!chatUrl&&<small>Opens the official WOMATE Circle WhatsApp community.</small>}
     </div>
   </aside>}
   {!open&&<button type="button" className="circleWaFab" onClick={()=>setOpen(true)} aria-label="Open WOMATE Circle WhatsApp">
     <svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M19.11 17.21c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.19 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35z"/><path fill="currentColor" d="M16.02 3C8.84 3 3 8.82 3 15.98c0 2.29.6 4.53 1.74 6.5L3 29l6.68-1.75a13 13 0 0 0 6.33 1.61h.01C23.2 28.86 29 23.04 29 15.88 29 8.72 23.2 3 16.02 3zm0 23.67h-.01a10.8 10.8 0 0 1-5.51-1.51l-.4-.24-3.96 1.04 1.06-3.86-.26-.4a10.75 10.75 0 0 1-1.66-5.72c0-5.93 4.83-10.76 10.77-10.76 5.94 0 10.77 4.83 10.77 10.76 0 5.94-4.85 10.69-10.8 10.69z"/></svg>
   </button>}
 </div>
}
`;
  s=s.slice(0,pos)+widget+s.slice(pos);
}

// -----------------------------------------------------------------------------
// 4. Place widget BESIDE the Inner Ring intro, exactly where requested.
// -----------------------------------------------------------------------------
const introRegex=/<section className="circleIntro">\s*<span>THE INNER RING OF CLIMATE LEADERSHIP<\/span>\s*<div>([\s\S]*?)<\/div>\s*<\/section>/;
if(introRegex.test(s)){
  s=s.replace(introRegex,(m,inner)=>`<section className="circleIntro circleIntroWithWhatsApp"><span>THE INNER RING OF CLIMATE LEADERSHIP</span><div className="circleIntroCopy">${inner}</div><CircleWhatsAppWidget/></section>`);
}else if(!s.includes('circleIntroWithWhatsApp')){
  console.error('ERROR: Could not locate THE INNER RING OF CLIMATE LEADERSHIP section.');
  process.exit(3);
}

// -----------------------------------------------------------------------------
// 5. Remove old tier/payment language if it survived from an older Circle.
// This keeps the Circle free-only as already requested.
// -----------------------------------------------------------------------------
s=s.replace(/<section id="circle-pathways" className="circlePathways">[\s\S]*?<\/section>/g,'');
s=s.replace(/<a className="pill ghost" href=\{CIRCLE_PAYMENT\}[\s\S]*?<\/a>/g,'');
s=s.replace(/Secure annual membership/g,'');
s=s.replace(/Explore membership/g,'Explore the Circle');

// -----------------------------------------------------------------------------
// 6. Make direct-route copy deterministic where that section exists.
// -----------------------------------------------------------------------------
s=s.replace(
  /(<section className="circlePath">[\s\S]*?<div className="circlePathCopy"><h2>)[\s\S]*?(<\/h2><p>)[\s\S]*?(<\/p>)/,
  '$1The WOMATE Circle is free to join.$2Enter the community, introduce yourself and connect to learning, opportunities and peers.$3'
);

// Remove membership-fee wording globally only in visible sentences.
s=s.split('Access learning, resources, opportunities and peer exchange without a membership fee.').join('Access learning, resources, opportunities and peer exchange.');

fs.writeFileSync(main,s,'utf8');

// Validation
const checks=[];
if(!s.includes('The WOMATE Circle is free to join.'))checks.push('requested free-to-join heading missing');
if(!s.includes('Enter the community, introduce yourself and connect to learning, opportunities and peers.'))checks.push('requested community description missing');
if(s.includes('Ready to enter?'))checks.push('"Ready to enter?" still exists');
if(s.includes('There is no membership payment. The Circle is WOMATE’s open community pathway.'))checks.push('old payment sentence still exists');
if(!s.includes('function CircleWhatsAppWidget('))checks.push('WhatsApp widget component missing');
if(!s.includes('circleIntroWithWhatsApp'))checks.push('WhatsApp widget was not placed beside Inner Ring');
if(checks.length){
 console.error('\\nCIRCLE PATCH VALIDATION FAILED:');
 checks.forEach(x=>console.error(' - '+x));
 console.error('Backup:',backup);
 process.exit(4);
}
console.log('\\nWOMATE CIRCLE PREMIUM WHATSAPP UPDATE COMPLETE');
console.log('✓ Free-to-join copy updated');
console.log('✓ Membership-fee wording removed');
console.log('✓ Ready-to-enter block removed');
console.log('✓ Interactive WhatsApp widget added beside Inner Ring intro');
console.log('✓ Existing VITE_CIRCLE_WHATSAPP_URL used as real community destination');
console.log('Backup:',backup);
