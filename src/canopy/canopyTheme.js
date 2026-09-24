const CANOPY_THEME_KEY='womate_canopy_theme_v1';

export function getCanopyTheme(){
  if(typeof window==='undefined')return'light';
  try{return localStorage.getItem(CANOPY_THEME_KEY)==='dark'?'dark':'light'}catch{return'light'}
}

export function applyCanopyTheme(theme,{persist=true}={}){
  const next=theme==='dark'?'dark':'light';
  if(typeof document!=='undefined')document.documentElement.dataset.canopyTheme=next;
  if(persist&&typeof window!=='undefined'){
    try{localStorage.setItem(CANOPY_THEME_KEY,next)}catch{}
  }
  return next;
}
