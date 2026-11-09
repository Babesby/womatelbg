import React,{useEffect,useState} from 'react';
import {ArrowUpRight} from 'lucide-react';

const CACHE_KEY='womate_public_expert_catalog_v1';
let catalogCache=(()=>{
 try{
  const parsed=JSON.parse(sessionStorage.getItem(CACHE_KEY)||'null');
  return Array.isArray(parsed)?parsed:null;
 }catch{return null}
})();
let catalogRequest=null;

const fetchCatalog=async()=>{
 if(catalogCache)return catalogCache;
 if(catalogRequest)return catalogRequest;
 const root=(import.meta.env.VITE_CANOPY_SUPABASE_URL||'').replace(/\/$/,'');
 const key=import.meta.env.VITE_CANOPY_SUPABASE_ANON_KEY||'';
 if(!root||!key)return [];
 catalogRequest=fetch(root+'/rest/v1/rpc/womate_course_public_catalog',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:'{}'})
  .then(async response=>{
   if(!response.ok)return [];
   const values=await response.json();
   const rows=Array.isArray(values)?values.filter(x=>x.category==='expert_masterclass'):[];
   catalogCache=rows;
   try{sessionStorage.setItem(CACHE_KEY,JSON.stringify(rows))}catch{}
   return rows;
  })
  .finally(()=>{catalogRequest=null});
 return catalogRequest;
};
export default function ExpertPublicCourses({slug=null}){
 const [items,setItems]=useState(()=>catalogCache||[]),[loading,setLoading]=useState(()=>!catalogCache);
 useEffect(()=>{let live=true;fetchCatalog().then(rows=>{if(live)setItems(rows)}).catch(()=>{}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[]);
 if(slug){
  const course=items.find(x=>x.slug===slug);
  if(loading)return <div className="wl-wrap" aria-busy="true"/>;
  if(!course)return <section className="wl-section"><h1>Course details will be available soon.</h1><a href="/courses">Explore courses</a></section>;
  return <div className="wl-wrap"><header className="wl-hero"><h1>{course.title}</h1><p>{course.summary}</p></header><section className="wl-section"><h2>{course.instructor||'WOMATE expert'}</h2><p>A focused masterclass designed to turn expertise into practical climate action.</p></section></div>;
 }
 if(!items.length)return null;
 return <section className="wl-section"><h2>Expert masterclasses</h2><div className="wl-grid">{items.map(x=><article className="wl-card" key={x.slug}><div className="wl-cardContent"><h3>{x.title}</h3><p>{x.summary}</p><div className="wl-cardMeta"><span>{x.instructor||'WOMATE expert'}</span></div><a className="wl-cardLink" href={'/courses/'+x.slug}>Explore masterclass <ArrowUpRight size={17}/></a></div></article>)}</div></section>;
}