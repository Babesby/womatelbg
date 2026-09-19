const URL=(import.meta.env.VITE_CANOPY_SUPABASE_URL||'').replace(/\/$/,'');
const KEY=import.meta.env.VITE_CANOPY_SUPABASE_ANON_KEY||'';
const PAGE_SIZE=80;

function flag(code){
  if(!code||code==='AF')return '🌍';
  return String(code).toUpperCase().replace(/./g,c=>String.fromCodePoint(127397+c.charCodeAt()));
}

async function loadDirectory(){
  if(!URL||!KEY)throw new Error('Selection directory is not configured.');
  const r=await fetch(`${URL}/rest/v1/rpc/womate_public_selected_directory`,{
    method:'POST',
    headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,'Content-Type':'application/json'},
    body:'{}'
  });
  const txt=await r.text();
  let data=null;try{data=txt?JSON.parse(txt):null}catch{data=null}
  if(!r.ok)throw new Error(data?.message||data?.error||`Directory request failed (${r.status})`);
  return Array.isArray(data)?data:[];
}

function findCodeInput(){
  return [...document.querySelectorAll('input')].find(el=>{
    const bits=[el.name,el.id,el.placeholder,el.getAttribute('aria-label'),el.closest('label')?.textContent,el.parentElement?.textContent]
      .filter(Boolean).join(' ').toLowerCase();
    return bits.includes('selection code')||bits.includes('access code');
  });
}

function setInputValue(input,value){
  const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value')?.set;
  if(setter)setter.call(input,value);else input.value=value;
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.dispatchEvent(new Event('change',{bubbles:true}));
}

function safeText(el,value){el.textContent=value==null?'':String(value);}

function mountDirectory(){
  if(document.querySelector('[data-womate-selected-directory]'))return true;
  const host=document.querySelector('main');
  if(!host)return false;

  const section=document.createElement('section');
  section.className='selected-directory';
  section.dataset.womateSelectedDirectory='true';
  section.innerHTML=`
    <div class="selected-directory-head">
      <div>
        <div class="selected-directory-kicker">SHE LEADS · COHORT 2 · 2026</div>
        <h2>Find your name and selection code.</h2>
        <p>Filter by country or search your name. Only selected participant names, countries and selection codes are shown here.</p>
      </div>
      <div class="selected-directory-stat"><strong data-directory-count>—</strong><span>selected participants</span></div>
    </div>
    <div class="selected-directory-tools">
      <label class="selected-directory-search">
        <span>Search</span>
        <input type="search" placeholder="Type your name or selection code" autocomplete="off" />
      </label>
      <div class="selected-directory-country-label">Filter by country</div>
      <div class="selected-directory-countries" role="list" aria-label="Filter selected participants by country"></div>
    </div>
    <div class="selected-directory-status" aria-live="polite">Loading selected participants…</div>
    <div class="selected-directory-grid"></div>
    <button type="button" class="selected-directory-more" hidden>Show more</button>
  `;

  const form=host.querySelector('form');
  const anchor=form?.closest('section')||form?.parentElement;
  if(anchor&&anchor.parentElement===host)host.insertBefore(section,anchor);else host.prepend(section);

  const status=section.querySelector('.selected-directory-status');
  const grid=section.querySelector('.selected-directory-grid');
  const countries=section.querySelector('.selected-directory-countries');
  const search=section.querySelector('input[type="search"]');
  const more=section.querySelector('.selected-directory-more');
  const totalEl=section.querySelector('[data-directory-count]');

  let rows=[];
  let activeCountry='ALL';
  let limit=PAGE_SIZE;

  const renderCountries=()=>{
    const counts=new Map();
    for(const row of rows){const code=row.countryCode||'AF';counts.set(code,(counts.get(code)||0)+1)}
    const options=[['ALL','All countries',rows.length],...Array.from(counts.entries())
      .map(([code,count])=>[code,rows.find(r=>(r.countryCode||'AF')===code)?.countryName||'Other',count])
      .sort((a,b)=>a[1].localeCompare(b[1]))];
    countries.innerHTML='';
    for(const [code,name,count] of options){
      const b=document.createElement('button');
      b.type='button';
      b.className='selected-country-chip'+(code===activeCountry?' is-active':'');
      b.dataset.country=code;
      const icon=document.createElement('span');icon.className='selected-country-flag';icon.textContent=code==='ALL'?'🌍':flag(code);
      const label=document.createElement('span');label.textContent=name;
      const n=document.createElement('small');n.textContent=count;
      b.append(icon,label,n);
      b.onclick=()=>{activeCountry=code;limit=PAGE_SIZE;renderCountries();renderRows();};
      countries.appendChild(b);
    }
  };

  const filteredRows=()=>{
    const q=search.value.trim().toLowerCase();
    return rows.filter(row=>{
      const countryOk=activeCountry==='ALL'||(row.countryCode||'AF')===activeCountry;
      const searchOk=!q||String(row.fullName||'').toLowerCase().includes(q)||String(row.selectionCode||'').toLowerCase().includes(q);
      return countryOk&&searchOk;
    });
  };

  const useCode=(code)=>{
    const input=findCodeInput();
    if(input){
      setInputValue(input,code);
      input.focus();
      input.scrollIntoView({behavior:'smooth',block:'center'});
    }else{
      navigator.clipboard?.writeText(code);
    }
  };

  const renderRows=()=>{
    const filtered=filteredRows();
    const visible=filtered.slice(0,limit);
    grid.innerHTML='';
    status.textContent=`${filtered.length.toLocaleString()} ${filtered.length===1?'result':'results'}${activeCountry!=='ALL'?' in this country':''}.`;
    if(!visible.length){
      const empty=document.createElement('div');empty.className='selected-directory-empty';empty.textContent='No selected participant matched that search.';grid.appendChild(empty);
    }
    for(const row of visible){
      const card=document.createElement('article');card.className='selected-directory-card';
      const top=document.createElement('div');top.className='selected-directory-card-top';
      const f=document.createElement('span');f.className='selected-directory-card-flag';f.textContent=flag(row.countryCode);
      const country=document.createElement('span');country.className='selected-directory-card-country';safeText(country,row.countryName||'Other');
      top.append(f,country);
      const name=document.createElement('h3');safeText(name,row.fullName);
      const codeWrap=document.createElement('div');codeWrap.className='selected-directory-code';
      const label=document.createElement('span');label.textContent='Selection code';
      const code=document.createElement('strong');safeText(code,row.selectionCode);
      codeWrap.append(label,code);
      const actions=document.createElement('div');actions.className='selected-directory-actions';
      const use=document.createElement('button');use.type='button';use.textContent='Use code';use.onclick=()=>useCode(row.selectionCode);
      const copy=document.createElement('button');copy.type='button';copy.className='is-secondary';copy.textContent='Copy';copy.onclick=async()=>{await navigator.clipboard?.writeText(row.selectionCode);const old=copy.textContent;copy.textContent='Copied';setTimeout(()=>copy.textContent=old,1200)};
      actions.append(use,copy);
      card.append(top,name,codeWrap,actions);
      grid.appendChild(card);
    }
    more.hidden=filtered.length<=limit;
  };

  search.addEventListener('input',()=>{limit=PAGE_SIZE;renderRows();});
  more.addEventListener('click',()=>{limit+=PAGE_SIZE;renderRows();});

  loadDirectory().then(data=>{
    rows=data.filter(r=>r&&r.fullName&&r.selectionCode);
    safeText(totalEl,rows.length.toLocaleString());
    renderCountries();
    renderRows();
  }).catch(err=>{
    status.textContent='We could not load the selected-participant directory. Please refresh the page or contact WOMATE.';
    status.classList.add('is-error');
    console.error('[WOMATE selected directory]',err);
  });
  return true;
}

if(!mountDirectory()){
  const obs=new MutationObserver(()=>{if(mountDirectory())obs.disconnect()});
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>obs.disconnect(),15000);
}
