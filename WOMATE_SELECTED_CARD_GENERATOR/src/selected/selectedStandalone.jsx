import React from 'react';
import {createRoot} from 'react-dom/client';
import SelectedCard from './SelectedCard';

const mount=document.getElementById('root');

if(!mount){
  throw new Error(
    'WOMATE root element was not found.'
  );
}

createRoot(mount).render(
  <React.StrictMode>
    <SelectedCard/>
  </React.StrictMode>
);
