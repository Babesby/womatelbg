import {CANOPY_HELP_FALLBACK,CANOPY_HELP_TOPICS} from './canopyHelpData';

const STOP_WORDS=new Set(['a','an','and','are','at','be','can','do','does','for','from','how','i','in','is','it','me','my','of','on','or','the','this','to','what','when','where','why','with']);

export function normalizeCanopyHelpText(value=''){
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,' ')
    .trim();
}

function tokens(value){
  return normalizeCanopyHelpText(value).split(/\s+/).filter(token=>token&&(!STOP_WORDS.has(token)||token.length>4));
}

function topicScore(topic,query){
  const normalized=normalizeCanopyHelpText(query);
  if(!normalized)return 0;
  const queryTokens=new Set(tokens(normalized));
  let score=0;
  const phrases=[topic.title,...(topic.phrases||[])];
  for(const phrase of phrases){
    const p=normalizeCanopyHelpText(phrase);
    if(!p)continue;
    if(normalized===p)score=Math.max(score,28);
    else if(p.length>=6&&normalized.includes(p))score+=11;
    else if(normalized.length>=6&&p.includes(normalized))score+=6;
    const pTokens=tokens(p);
    const overlap=pTokens.filter(token=>queryTokens.has(token)).length;
    if(overlap)score+=overlap*(pTokens.length===1?2:3);
  }
  for(const keyword of topic.keywords||[]){
    const key=normalizeCanopyHelpText(keyword);
    if(!key)continue;
    if(normalized.includes(key))score+=key.includes(' ')?6:3;
  }
  return score;
}

export function matchCanopyHelpQuestion(query,{now=new Date()}={}){
  const ranked=CANOPY_HELP_TOPICS
    .map(topic=>({topic,score:topicScore(topic,query)}))
    .sort((a,b)=>b.score-a.score);
  const best=ranked[0];
  if(!best||best.score<6)return {...CANOPY_HELP_FALLBACK,matched:false,score:best?.score||0};
  const topic=best.topic;
  const answer=typeof topic.answer==='function'?topic.answer({query,now}):topic.answer;
  return {...topic,answer,matched:true,score:best.score};
}
