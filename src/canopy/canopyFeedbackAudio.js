let feedbackAudioContext=null;

function getFeedbackAudioContext(){
  if(typeof window==='undefined')return null;
  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtx)return null;
  if(!feedbackAudioContext)feedbackAudioContext=new AudioCtx();
  return feedbackAudioContext;
}

export function primeCanopyFeedbackAudio(){
  try{
    const ctx=getFeedbackAudioContext();
    if(ctx?.state==='suspended')ctx.resume().catch(()=>{});
  }catch{}
}

function playTone({frequency=440,endFrequency=null,start=0,duration=.08,volume=.026,type='sine'}){
  try{
    const ctx=getFeedbackAudioContext();
    if(!ctx)return;
    const render=()=>{
      const now=ctx.currentTime+.008+start;
      const osc=ctx.createOscillator();
      const gain=ctx.createGain();
      osc.type=type;
      osc.frequency.setValueAtTime(frequency,now);
      if(endFrequency)osc.frequency.exponentialRampToValueAtTime(endFrequency,now+duration);
      gain.gain.setValueAtTime(.0001,now);
      gain.gain.exponentialRampToValueAtTime(volume,now+.012);
      gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
      osc.connect(gain);gain.connect(ctx.destination);
      osc.start(now);osc.stop(now+duration+.02);
    };
    if(ctx.state==='suspended')ctx.resume().then(render).catch(()=>{});else render();
  }catch{}
}

export function playCanopyCorrectSound(){
  playTone({frequency:620,start:0,duration:.075,volume:.024,type:'sine'});
  playTone({frequency:880,start:.072,duration:.105,volume:.028,type:'sine'});
}

export function playCanopyErrorSound(){
  playTone({frequency:210,endFrequency:135,start:0,duration:.13,volume:.03,type:'triangle'});
  playTone({frequency:145,endFrequency:112,start:.09,duration:.105,volume:.022,type:'triangle'});
}
