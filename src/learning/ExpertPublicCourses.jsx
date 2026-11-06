import React,{useEffect,useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
const fetchCatalog=async()=>{
 const root=(import.meta.env.VITE_CANOPY_SUPABASE_URL||'').replace(/\/$/,'');
 const key=import.meta.env.VITE_CANOPY_SUPABASE_ANON_KEY||'';
 if(!root||!key)return [];
 const response=await fetch(root+'/rest/v1/rpc/womate_course_public_catalog',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:'{}'});
 if(!response.ok)return [];
 const values=await response.json();
 return Array.isArray(values)?values.filter(x=>x.category==='expert_masterclass'):[];
};
export default function ExpertPublicCourses({slug=null}){
 const [items,setItems]=useState([]),[loading,setLoading]=useState(true);
 useEffect(()=>{let live=true;fetchCatalog().then(rows=>{if(live)setItems(rows)}).catch(()=>{}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[]);
 if(slug){
  const course=items.find(x=>x.slug===slug);
  if(!course)return <section className="wl-section"><h1>{loading?'Opening masterclass…':'This course is awaiting WOMATE approval.'}</h1><p>Only expert courses approved by WOMATE appear publicly.</p><a href="/courses">All courses</a></section>;
  return <div className="wl-wrap"><header className="wl-hero"><div className="wl-eyebrow">WOMATE EXPERT MASTERCLASS · COMING SOON</div><h1>{course.title}</h1><p>{course.summary}</p><div className="wl-actions"><a className="wl-button" href={'/canopy/courses/'+course.slug}>Preview in Canopy <ArrowUpRight size={17}/></a></div></header><section className="wl-section"><div className="wl-sectionLabel">APPROVED EDUCATOR</div><h2>{course.instructor||'WOMATE-approved expert'}</h2><p>Enrolment and payments are not open. This public preview does not issue credentials or confirm admission.</p></section></div>;
 }
 if(!items.length)return null;
 return <section className="wl-section"><div className="wl-sectionLabel">INDEPENDENT EXPERTISE · QUALITY REVIEWED</div><h2>Expert masterclasses</h2><div className="wl-grid">{items.map(x=><article className="wl-card" key={x.slug}><div className="wl-cardContent"><span className="wl-eyebrow small">COMMUNITY COURSE · COMING SOON</span><h3>{x.title}</h3><p>{x.summary}</p><div className="wl-cardMeta"><span>{x.instructor||'WOMATE-approved expert'}</span></div><a className="wl-cardLink" href={'/courses/'+x.slug}>Explore masterclass <ArrowUpRight size={17}/></a></div></article>)}</div></section>;
}