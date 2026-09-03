const fs=require('fs'), path=require('path');
const f=path.resolve('src/main.jsx');
if(!fs.existsSync(f)){console.error('src/main.jsx not found');process.exit(1)}
let s=fs.readFileSync(f,'utf8');
const bak=f+'.before-she-testimonial-slider.bak';
if(!fs.existsSync(bak))fs.copyFileSync(f,bak);

const slides=[
'/assets/she-leads/testimonials/testimonial-3.png',
'/assets/she-leads/testimonials/testimonial-4.png',
'/assets/she-leads/testimonials/testimonial-5.png',
'/assets/she-leads/testimonials/testimonial-6.png',
'/assets/she-leads/testimonials/testimonial-7.png',
'/assets/she-leads/testimonials/testimonial-8.png',
'/assets/she-leads/testimonials/testimonial-9.png',
'/assets/she-leads/testimonials/testimonial-10.png',
'/assets/she-leads/testimonials/testimonial-11.png'
];

if(!s.includes('const sheTestimonialSlides=')){
  const marker='function SheLeads()';
  const i=s.indexOf(marker);
  if(i<0){console.error('SheLeads component not found');process.exit(2)}
  s=s.slice(0,i)+`const sheTestimonialSlides=${JSON.stringify(slides)};\nfunction SheTestimonialSlider(){const[index,setIndex]=useState(0);useEffect(()=>{const id=setInterval(()=>setIndex(i=>(i+1)%sheTestimonialSlides.length),6500);return()=>clearInterval(id)},[]);return <div className="sheTestimonialSlider" aria-label="She Leads fellow testimonials"><div className="sheTestimonialStage">{sheTestimonialSlides.map((src,i)=><img key={src} src={src} alt={i===0?'She Leads Climate outstanding fellows':\`She Leads fellow testimonial \${i}\`} className={i===index?'active':''} loading={i===0?'eager':'lazy'}/>)}</div><div className="sheTestimonialDots" aria-label="Choose testimonial">{sheTestimonialSlides.map((_,i)=><button type="button" key={i} className={i===index?'active':''} onClick={()=>setIndex(i)} aria-label={\`Show testimonial \${i+1}\`}/>)}</div></div>}\n`+s.slice(i);
}

// Replace the existing she.png image only in the cohort/network section.
const re=/<img\b[^>]*src=["']\/assets\/img\/she\.png["'][^>]*>/;
if(!re.test(s)){console.error('Could not find /assets/img/she.png in main.jsx');process.exit(3)}
s=s.replace(re,'<SheTestimonialSlider/>');

fs.writeFileSync(f,s,'utf8');
console.log('She Leads testimonial slider installed.');
console.log('Slides: 9 | Interval: 6.5 seconds | Crossfade: enabled');
console.log('Backup:',bak);
