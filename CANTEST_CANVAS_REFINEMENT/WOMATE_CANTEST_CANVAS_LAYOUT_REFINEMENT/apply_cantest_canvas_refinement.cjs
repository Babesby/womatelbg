const fs=require('fs'),path=require('path');
const root=process.cwd();
const file=path.join(root,'src','cantest','CanopyCanvas.jsx');
const cssFile=path.join(root,'src','cantest','canopy.css');
if(!fs.existsSync(file)||!fs.existsSync(cssFile)){console.error('ERROR: src/cantest is missing.');process.exit(1)}
const original=fs.readFileSync(file,'utf8'), originalCss=fs.readFileSync(cssFile,'utf8');
fs.writeFileSync(file+'.before-canvas-layout-refinement.bak',original,'utf8');
fs.writeFileSync(cssFile+'.before-canvas-layout-refinement.bak',originalCss,'utf8');

let s=original;
s=s.replace("const formats=['Square post','Portrait post','Landscape card'];",
"const formats=['Square post','Portrait post','Landscape card'];\nconst buttonShapes=['Pill','Rectangle'];\nconst MESSAGE_LIMIT=180;");
s=s.replace("texture:'none',icons:['leaf'],message:''","texture:'none',icons:['leaf'],buttonShape:'Pill',message:''");

s=s.replace("onChange={e=>update('message',e.target.value)} placeholder={suggestion}",
"maxLength={MESSAGE_LIMIT} onChange={e=>update('message',e.target.value.slice(0,MESSAGE_LIMIT))} placeholder={suggestion}");
s=s.replace('<span className="cc-message-helper"><Sparkles size={14}/> Tone suggestion: {suggestion}</span>',
'<div className="cc-message-meta"><span className="cc-message-helper"><Sparkles size={14}/> Tone suggestion: {suggestion}</span><b>{form.message.length}/{MESSAGE_LIMIT}</b></div>');

s=s.replace("<label>Format<select value={form.format} onChange={e=>update('format',e.target.value)}>{formats.map(x=><option key={x}>{x}</option>)}</select></label>",
"<label>Format<select value={form.format} onChange={e=>update('format',e.target.value)}>{formats.map(x=><option key={x}>{x}</option>)}</select></label><label>Action button shape<select value={form.buttonShape} onChange={e=>update('buttonShape',e.target.value)}>{buttonShapes.map(x=><option key={x}>{x}</option>)}</select></label>");

s=s.replace("<strong>{form.actionTarget}</strong>",
"<button type=\"button\" className={`cc-action-button ${form.buttonShape==='Pill'?'is-pill':'is-rectangle'}`}>{form.actionTarget}</button>");

const oldExport="ctx.fillStyle=palette.accent;ctx.font=`700 ${Math.round(w*.025)}px Arial`;wrap(ctx,form.actionTarget,pad,h*.80,w*.82,h*.04,3);";
const newExport="const btnText=form.actionTarget,btnFont=Math.round(w*.020);ctx.font=`700 ${btnFont}px Arial`;const maxBtnW=w*.72,measured=Math.min(maxBtnW,ctx.measureText(btnText).width+w*.07);const btnH=Math.max(54,h*.062),btnX=pad,btnY=h*.78-btnH/2;ctx.fillStyle=palette.accent;const radius=form.buttonShape==='Pill'?btnH/2:Math.max(8,w*.008);ctx.beginPath();ctx.roundRect(btnX,btnY,measured,btnH,radius);ctx.fill();ctx.fillStyle='#0E4D4A';ctx.textBaseline='middle';ctx.fillText(btnText,btnX+w*.035,btnY+btnH/2);ctx.textBaseline='alphabetic';";
s=s.replace(oldExport,newExport);

const oldMsg="ctx.fillStyle=palette.text;ctx.font=`700 ${Math.round(w*(form.tone==='Professional'?.050:.056))}px Arial`;\n    wrap(ctx,form.message||suggestion,pad,h*.31,w*.82,h*.072,6);";
const newMsg="ctx.fillStyle=palette.text;const msg=(form.message||suggestion).slice(0,MESSAGE_LIMIT);const portrait=form.format==='Portrait post',landscape=form.format==='Landscape card';const base=landscape?.043:portrait?.058:.052;const lengthScale=msg.length>145?.80:msg.length>105?.90:1;ctx.font=`700 ${Math.round(w*base*lengthScale)}px Arial`;const messageY=landscape?h*.27:portrait?h*.255:h*.265;const messageW=landscape?w*.72:w*.84;wrap(ctx,msg,pad,messageY,messageW,h*(landscape?.067:.061),portrait?7:6);";
s=s.replace(oldMsg,newMsg);

s=s.replace("form.icons.forEach((id,i)=>drawSimpleIcon(ctx,id,w*.78+i*w*.06,h*.13,w*.065,palette.accent));",
"form.icons.forEach((id,i)=>drawSimpleIcon(ctx,id,w*.78+i*w*.06,h*.105,w*.058,palette.accent));");

s=s.replace("className={`cc-preview cc-preview-upgraded ${form.format.toLowerCase().replace(/\\s+/g,'-')} tone-${form.tone.toLowerCase().replace(/[^a-z]+/g,'-')}`}",
"className={`cc-preview cc-preview-upgraded format-${form.format.toLowerCase().replace(/\\s+/g,'-')} tone-${form.tone.toLowerCase().replace(/[^a-z]+/g,'-')}`}");
fs.writeFileSync(file,s,'utf8');

let css=originalCss;
if(!css.includes('/* CANTEST CANVAS LAYOUT REFINEMENT */')) css+=`
/* CANTEST CANVAS LAYOUT REFINEMENT */
.cc-message-meta{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-top:8px}
.cc-message-meta .cc-message-helper{margin-top:0}.cc-message-meta>b{font-size:11px;white-space:nowrap;opacity:.55}
.cc-preview-upgraded{display:flex;flex-direction:column;justify-content:flex-start;padding:clamp(28px,5vw,64px);min-height:620px}
.cc-preview-upgraded .cc-preview-icons{margin:0 0 clamp(12px,2vw,24px) auto}
.cc-preview-upgraded>small{margin-bottom:clamp(10px,1.5vw,16px)}
.cc-preview-upgraded>h2{margin:0;max-width:92%;font-size:clamp(34px,4.6vw,68px);line-height:.99;text-wrap:balance}
.cc-preview-upgraded>p{margin:clamp(20px,3vw,34px) 0 10px}
.cc-action-button{align-self:flex-start;max-width:88%;border:0;background:var(--cc-accent);color:#0E4D4A;padding:13px 22px;font:inherit;font-size:13px;font-weight:900;line-height:1.25;text-align:center;cursor:default;margin-top:8px}
.cc-action-button.is-pill{border-radius:999px}.cc-action-button.is-rectangle{border-radius:7px}
.cc-preview-upgraded>em{margin-top:clamp(16px,2.5vw,28px)}
.cc-preview-upgraded.format-square-post{aspect-ratio:1/1;min-height:auto}
.cc-preview-upgraded.format-portrait-post{aspect-ratio:4/5;min-height:auto}
.cc-preview-upgraded.format-landscape-card{aspect-ratio:16/9;min-height:auto;padding:clamp(24px,3.4vw,48px)}
.cc-preview-upgraded.format-landscape-card>h2{font-size:clamp(28px,3.6vw,54px);max-width:78%;line-height:1}
.cc-preview-upgraded.format-landscape-card .cc-preview-icons{margin-bottom:10px}
.cc-preview-upgraded.format-landscape-card>p{margin-top:16px}
.cc-preview-upgraded.format-portrait-post>h2{font-size:clamp(36px,5vw,72px);max-width:94%}
@media(max-width:700px){.cc-preview-upgraded{padding:28px}.cc-preview-upgraded>h2,.cc-preview-upgraded.format-portrait-post>h2{font-size:clamp(30px,9vw,48px);max-width:100%}.cc-preview-upgraded.format-landscape-card>h2{font-size:clamp(24px,7vw,38px);max-width:88%}.cc-action-button{max-width:100%;font-size:12px;padding:11px 17px}}
`;
fs.writeFileSync(cssFile,css,'utf8');
console.log('CANTEST CanopyCanvas refinement applied ONLY to src/cantest.');
console.log(' - Desired action is a CTA button');
console.log(' - Pill / Rectangle button shape');
console.log(' - 180-character message limit + counter');
console.log(' - format-responsive message sizing/position');
console.log(' - excess top whitespace reduced');
console.log(' - live src/canopy untouched');
console.log('\\nRun: npm run build');
