import './selectedDirectory.css';
import './selectedBrandEnhancements.js';
import React,{useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import SelectedCard from './SelectedCard';
import {mountSelectedDirectory} from './selectedDirectory.js';

function SelectedWithDirectory(){
 useEffect(()=>{
   const frame=requestAnimationFrame(()=>mountSelectedDirectory());
   return()=>cancelAnimationFrame(frame);
 },[]);
 return <SelectedCard/>;
}
const mount=document.getElementById('root');
if(!mount)throw new Error('WOMATE root element was not found.');
createRoot(mount).render(<React.StrictMode><SelectedWithDirectory/></React.StrictMode>);
