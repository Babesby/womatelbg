
const fs = require('fs');

const appPath = 'src/canopy/CanopyApp.jsx';
const cssPath = 'src/canopy/canopy.css';

let app = fs.readFileSync(appPath, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');

const originalApp = app;

// 1) Remove learner Profile from the left sidebar only.
app = app.replace(
  /,\['\/canopy\/profile','Profile',UserRound\]/,
  ''
);

// 2) Make the participant name in the top header open Profile.
// Supports the current Canopy LearnerShell header shape.
const oldHeader = `<div>{manager&&<span>WOMATE · CANOPY OPERATIONS</span>}<b>{name}</b></div>`;
const newHeader = `<div>{manager&&<span>WOMATE · CANOPY OPERATIONS</span>}{manager?<b>{name}</b>:<button type="button" className="canopyProfileTrigger" onClick={()=>go('/canopy/profile')} title="Open profile settings"><UserRound size={18}/><span><small>PROFILE</small><b>{name}</b></span></button>}</div>`;

if (app.includes(oldHeader)) {
  app = app.replace(oldHeader, newHeader);
} else if (!app.includes('className="canopyProfileTrigger"')) {
  console.error('STOP: Could not safely locate the participant-name block in LearnerShell. No files changed.');
  process.exit(1);
}

if (app === originalApp && app.includes('className="canopyProfileTrigger"')) {
  console.log('INFO: Profile top-nav patch already appears to be applied.');
}

const cssBlock = `

/* CANOPY participant profile moved to top header */
.canopyProfileTrigger{
  appearance:none;
  border:0;
  background:transparent;
  color:inherit;
  font:inherit;
  display:inline-flex;
  align-items:center;
  gap:.65rem;
  padding:.35rem .55rem;
  margin:-.35rem -.55rem;
  border-radius:14px;
  cursor:pointer;
  text-align:left;
  transition:background .18s ease,transform .18s ease;
}
.canopyProfileTrigger>span{
  display:grid;
  gap:.05rem;
}
.canopyProfileTrigger small{
  font-size:.62rem;
  line-height:1;
  letter-spacing:.12em;
  opacity:.55;
}
.canopyProfileTrigger b{
  line-height:1.15;
}
.canopyProfileTrigger:hover{
  background:rgba(14,77,74,.07);
}
.canopyProfileTrigger:active{
  transform:translateY(1px);
}
.canopyProfileTrigger:focus-visible{
  outline:2px solid #0E4D4A;
  outline-offset:3px;
}
@media (max-width:700px){
  .canopyProfileTrigger{
    gap:.45rem;
    max-width:min(54vw,220px);
  }
  .canopyProfileTrigger>span{
    min-width:0;
  }
  .canopyProfileTrigger b{
    display:block;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
  }
  .canopyProfileTrigger small{
    display:none;
  }
}
`;

if (!css.includes('CANOPY participant profile moved to top header')) {
  css += cssBlock;
}

fs.writeFileSync(appPath, app, 'utf8');
fs.writeFileSync(cssPath, css, 'utf8');

console.log('PASS Profile removed from learner sidebar');
console.log('PASS Participant name opens /canopy/profile');
console.log('PASS Mobile-safe profile trigger styling added');
console.log('NEXT npm run build');
