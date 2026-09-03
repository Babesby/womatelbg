const fs=require('fs'), path=require('path');

const root=process.cwd();
const main=path.join(root,'src','main.jsx');
const publicDir=path.join(root,'public','assets','she-leads','testimonials');
if(!fs.existsSync(main)){console.error('ERROR: src/main.jsx not found. Run from WOMATE project root.');process.exit(1)}
fs.mkdirSync(publicDir,{recursive:true});

const expected=['3','4','5','6','7','8','9','10','11'].map(n=>`testimonial-${n}.png`);
const missing=expected.filter(n=>!fs.existsSync(path.join(publicDir,n)));
if(missing.length){
  console.error('ERROR: testimonial files are missing from public/assets/she-leads/testimonials:');
  missing.forEach(n=>console.error(' - '+n));
  process.exit(2);
}

let s=fs.readFileSync(main,'utf8');
const backup=main+'.before-she-testimonial-slider-fixed.bak';
if(!fs.existsSync(backup)) fs.copyFileSync(main,backup);

const slides=expected.map(n=>`/assets/she-leads/testimonials/${n}`);
const component=`const sheTestimonialSlides=${JSON.stringify(slides)};
function SheTestimonialSlider(){
 const[index,setIndex]=useState(0);
 useEffect(()=>{const id=setInterval(()=>setIndex(i=>(i+1)%sheTestimonialSlides.length),7000);return()=>clearInterval(id)},[]);
 return <div className="sheTestimonialSlider" aria-label="She Leads fellow testimonials">
   <div className="sheTestimonialStage">
    {sheTestimonialSlides.map((src,i)=><img key={src} src={src} alt={i===0?'She Leads Climate outstanding fellows':\`She Leads fellow testimonial \${i+1}\`} className={i===index?'active':''} loading={i===0?'eager':'lazy'} />)}
   </div>
   <div className="sheTestimonialDots" aria-label="Choose testimonial">
    {sheTestimonialSlides.map((_,i)=><button type="button" key={i} className={i===index?'active':''} onClick={()=>setIndex(i)} aria-label={\`Show testimonial \${i+1}\`}/>)}
   </div>
 </div>
}
`;

// Remove an older injected slider block if present, then reinsert a clean one.
s=s.replace(/const sheTestimonialSlides=\[[\s\S]*?\nfunction SheTestimonialSlider\(\)\{[\s\S]*?\n\}\n(?=function SheLeads\(\))/,'');
if(!s.includes('const sheTestimonialSlides=')){
  const marker='function SheLeads()';
  const pos=s.indexOf(marker);
  if(pos<0){console.error('ERROR: SheLeads component not found.');process.exit(3)}
  s=s.slice(0,pos)+component+s.slice(pos);
}

// Replace static image if still present.
s=s.replace(/<img\b[^>]*src=["']\/assets\/img\/she\.png["'][^>]*>/g,'<SheTestimonialSlider/>');

fs.writeFileSync(main,s,'utf8');

console.log('FIXED: testimonial assets verified at:');
expected.forEach(n=>console.log(' /assets/she-leads/testimonials/'+n));
console.log('Slider interval: 7 seconds');
console.log('Backup:',backup);
