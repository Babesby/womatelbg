import React,{useEffect,useState}from'react';

const U=(
  import.meta.env.VITE_CANOPY_SUPABASE_URL||
  import.meta.env.VITE_SUPABASE_URL||
  ''
).replace(/\/$/,'');

const K=
  import.meta.env.VITE_CANOPY_SUPABASE_ANON_KEY||
  import.meta.env.VITE_SUPABASE_ANON_KEY||
  '';

async function rpc(session,name,body={}){
  if(!U||!K)throw new Error('Supabase is not configured.');

  const r=await fetch(`${U}/rest/v1/rpc/${name}`,{
    method:'POST',
    headers:{
      apikey:K,
      Authorization:`Bearer ${session?.access_token||K}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify(body)
  });

  let data=null;
  try{data=await r.json()}catch{}

  if(!r.ok){
    throw new Error(
      data?.message||
      data?.error||
      'The selection-code request failed.'
    );
  }

  return data;
}

export default function CanopySelectionCodes({session,cohort=null}){
  const[form,setForm]=useState({
    full_name:'',
    email:'',
    programme_name:'She Leads Climate Mentorship Programme',
    programme_slug:'she-leads-2026',
    cohort_label:'Cohort 2 · 2026',
    expires_at:''
  });

  const[rows,setRows]=useState([]);
  const[generated,setGenerated]=useState(null);
  const[busy,setBusy]=useState('');
  const[msg,setMsg]=useState('');
  const[directoryState,setDirectoryState]=useState(null);
  const[directoryBusy,setDirectoryBusy]=useState(false);
  const is2027Directory=['she-leads-climate-c3-2027','she-leads-asia-c1-2027'].includes(cohort?.cohort_key);

  const loadDirectoryState=async()=>{
    if(!is2027Directory){setDirectoryState(null);return}
    try{setDirectoryState(await rpc(session,'womate_2027_admin_directory_state',{p_cohort:cohort.cohort_key}))}
    catch(e){setMsg('Directory status: '+e.message)}
  };
  const publishDirectory=async publish=>{
    if(!is2027Directory)return;
    if(publish&&!window.confirm('Publish the '+cohort.display_name+' selected-participant directory? Only accepted participants who explicitly opted in will be listed. Personal selection codes will stay private.'))return;
    setDirectoryBusy(true);setMsg('');
    try{
      await rpc(session,'womate_2027_admin_publish_selected_directory',{p_cohort:cohort.cohort_key,p_publish:publish});
      await loadDirectoryState();
      setMsg(publish?'The selected-participant showcase is now published. Only consented, accepted participants are visible.':'This cohort’s public selected-participant showcase is now hidden.');
    }catch(e){setMsg(e.message)}finally{setDirectoryBusy(false)}
  };


  const load=async()=>{
    try{
      const data=await rpc(
        session,
        'womate_list_selected_card_invites'
      );
      setRows(Array.isArray(data)?data:[]);
    }catch(e){
      setMsg(e.message);
    }
  };

  useEffect(()=>{
    const isLegacy=!cohort||cohort.cohort_key==='she-leads-climate-c2-2026';
    setForm(v=>({...v,
      programme_name:cohort?.display_name?.split(' · ')[0]||'She Leads Climate Mentorship Programme',
      programme_slug:cohort?.programme_key||'she-leads-2026',
      cohort_label:isLegacy?'Cohort 2 · 2026':(cohort?.display_name||'')
    }));
    load();
    loadDirectoryState();
  },[cohort?.cohort_key]);
  const acceptedLabels=new Set([
    cohort?.display_name,
    cohort?.cohort_key==='she-leads-climate-c2-2026'?'Cohort 2 · 2026':null
  ].filter(Boolean));
  const displayRows=cohort?rows.filter(row=>acceptedLabels.has(row.cohort_label)):rows;

  const create=async(e)=>{
    e?.preventDefault?.();

    if(!form.full_name.trim()||!form.email.trim())return;

    setBusy('create');
    setMsg('');
    setGenerated(null);

    try{
      const result=await rpc(
        session,
        'womate_create_selected_card_invite',
        {
          p_email:form.email.trim(),
          p_full_name:form.full_name.trim(),
          p_programme_slug:form.programme_slug,
          p_programme_name:form.programme_name,
          p_cohort_label:form.cohort_label,
          p_expires_at:form.expires_at
            ?new Date(form.expires_at).toISOString()
            :null
        }
      );

      setGenerated(result);

      setMsg(
        'Selection code generated. Copy it now — only its secure hash is stored in WOMATE.'
      );

      await load();
    }catch(e){
      setMsg(e.message);
    }finally{
      setBusy('');
    }
  };

  const regenerate=async(row)=>{
    setBusy(row.id);
    setMsg('');
    setGenerated(null);

    try{
      const result=await rpc(
        session,
        'womate_create_selected_card_invite',
        {
          p_email:row.email,
          p_full_name:row.full_name,
          p_programme_slug:row.programme_slug,
          p_programme_name:row.programme_name,
          p_cohort_label:row.cohort_label,
          p_expires_at:row.expires_at
        }
      );

      setGenerated(result);
      setMsg('A new selection code has been generated.');

      await load();
    }catch(e){
      setMsg(e.message);
    }finally{
      setBusy('');
    }
  };

  const revoke=async(row)=>{
    if(!window.confirm(
      `Revoke the selection code for ${row.full_name}?`
    ))return;

    setBusy(row.id);
    setMsg('');

    try{
      await rpc(
        session,
        'womate_revoke_selected_card_invite',
        {p_id:row.id}
      );

      setMsg('Selection code revoked.');
      await load();
    }catch(e){
      setMsg(e.message);
    }finally{
      setBusy('');
    }
  };

  const copy=async()=>{
    if(!generated?.selection_code)return;

    await navigator.clipboard.writeText(
      generated.selection_code
    );

    setMsg('Selection code copied.');
  };

  return(
    <main className="canopyManager canopyOps">

      <div className="canopyPageHead">
        <span className="canopyEyebrow">
          WOMATE · SELECTED
        </span>

        <h1>Selection codes</h1>{cohort&&<p><b>{cohort.display_name}</b></p>}

        <p>
          Generate secure verification codes for learners
          officially selected for She Leads.
        </p>
      </div>

      {msg&&(
        <p className="canopyFormMsg" role="status">
          {msg}
        </p>
      )}

      {is2027Directory&&(
        <section className="canopy2027-directory-admin" style={{background:'#f7fbf6',border:'1px solid #c8dfca',borderRadius:18,padding:'24px',marginBottom:'24px'}}>
          <span className="canopyEyebrow">PUBLIC SELECTED-PARTICIPANT SHOWCASE · 2027</span>
          <h2 style={{margin:'10px 0'}}>Publish selected participants</h2>
          <p>The showcase reads verified selections directly from WOMATE’s admissions database. A learner’s name and country are visible only after they accept their offer, explicitly choose to be listed, and you publish this cohort. Private selection codes, emails and phone numbers are never published.</p>
          <div style={{display:'flex',gap:20,flexWrap:'wrap',margin:'16px 0',fontSize:13}}>
            <span><b>{directoryState?.selected_notified??'—'}</b> selected and notified</span>
            <span><b>{directoryState?.opted_in??'—'}</b> opted in</span>
            <span><b>{directoryState?.accepted_opted_in??'—'}</b> eligible to display</span>
          </div>
          <p><strong>Status: {directoryState?.published?'Published':'Not published'}</strong></p>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            <button type="button" className="canopyPrimary" disabled={directoryBusy||directoryState?.published===true} onClick={()=>publishDirectory(true)}>Publish approved showcase</button>
            <button type="button" className="canopySecondary" disabled={directoryBusy||!directoryState?.published} onClick={()=>publishDirectory(false)}>Unpublish cohort showcase</button>
            <button type="button" className="canopySecondary" disabled={directoryBusy} onClick={loadDirectoryState}>Refresh status</button>
          </div>
          <p style={{fontSize:12,marginTop:14,color:'#537465'}}>Publication is manual and separate for Africa and Asia. Historical 2026 records are unchanged.</p>
        </section>
      )}

      {generated&&(
        <section
          style={{
            background:'#17382b',
            color:'#fff',
            padding:'28px',
            borderRadius:'22px',
            marginBottom:'28px'
          }}
        >
          <small
            style={{
              color:'#CAFF58',
              fontWeight:800,
              letterSpacing:'.12em'
            }}
          >
            NEW SELECTION CODE
          </small>

          <h2 style={{margin:'10px 0 4px'}}>
            {generated.full_name}
          </h2>

          <p style={{opacity:.75}}>
            {generated.email}
          </p>

          <div
            style={{
              display:'flex',
              flexWrap:'wrap',
              alignItems:'center',
              gap:'14px',
              marginTop:'20px'
            }}
          >
            <strong
              style={{
                background:'#CAFF58',
                color:'#17382b',
                padding:'14px 20px',
                borderRadius:'12px',
                fontSize:'24px',
                letterSpacing:'.12em'
              }}
            >
              {generated.selection_code}
            </strong>

            <button
              className="canopySecondary"
              onClick={copy}
            >
              Copy code
            </button>
          </div>

          <p
            style={{
              marginTop:'16px',
              opacity:.7,
              fontSize:'13px'
            }}
          >
            Include this code in the learner's official
            WOMATE selection email.
          </p>
        </section>
      )}

      <section
        style={{
          background:'#fff',
          borderRadius:'22px',
          padding:'28px',
          marginBottom:'32px'
        }}
      >
        <h2>Generate learner code</h2>

        <form
          onSubmit={create}
          style={{
            display:'grid',
            gridTemplateColumns:
              'repeat(auto-fit,minmax(230px,1fr))',
            gap:'18px',
            marginTop:'22px'
          }}
        >

          <label>
            Full name
            <input
              required
              value={form.full_name}
              onChange={e=>setForm({
                ...form,
                full_name:e.target.value
              })}
            />
          </label>

          <label>
            Email address
            <input
              required
              type="email"
              value={form.email}
              onChange={e=>setForm({
                ...form,
                email:e.target.value
              })}
            />
          </label>

          <label>
            Programme
            <input
              readOnly={Boolean(cohort)}
              value={form.programme_name}
              onChange={e=>setForm({
                ...form,
                programme_name:e.target.value
              })}
            />
          </label>

          <label>
            Cohort
            <input
              readOnly={Boolean(cohort)}
              value={form.cohort_label}
              onChange={e=>setForm({
                ...form,
                cohort_label:e.target.value
              })}
            />
          </label>

          <label>
            Code expiry
            <input
              type="datetime-local"
              value={form.expires_at}
              onChange={e=>setForm({
                ...form,
                expires_at:e.target.value
              })}
            />
          </label>

          <div style={{display:'flex',alignItems:'end'}}>
            <button
              className="canopyPrimary"
              disabled={busy==='create'}
              type="submit"
            >
              {busy==='create'
                ?'Generating…'
                :'Generate selection code'}
            </button>
          </div>

        </form>
      </section>

      <section
        style={{
          background:'#fff',
          borderRadius:'22px',
          padding:'28px'
        }}
      >
        <div style={{
          display:'flex',
          justifyContent:'space-between',
          gap:'20px',
          alignItems:'center',
          marginBottom:'22px'
        }}>
          <div>
            <small className="canopyEyebrow">
              SELECTED LEARNERS
            </small>
            <h2>Generated codes</h2>
          </div>

          <button
            className="canopySecondary"
            onClick={load}
          >
            Refresh
          </button>
        </div>

        {!displayRows.length?(
          <p>No selection codes have been generated yet.</p>
        ):(
          <div style={{display:'grid',gap:'12px'}}>
            {displayRows.map(row=>(
              <article
                key={row.id}
                style={{
                  border:'1px solid rgba(23,56,43,.12)',
                  borderRadius:'16px',
                  padding:'18px',
                  display:'grid',
                  gridTemplateColumns:
                    'minmax(220px,1fr) auto',
                  gap:'18px',
                  alignItems:'center'
                }}
              >
                <div>
                  <strong>{row.full_name}</strong>
                  <div style={{
                    marginTop:'4px',
                    fontSize:'14px',
                    opacity:.68
                  }}>
                    {row.email}
                  </div>

                  <div style={{
                    marginTop:'8px',
                    fontSize:'12px'
                  }}>
                    {row.status.toUpperCase()}
                    {row.code_hint
                      ?` · CODE ENDS ${row.code_hint}`
                      :''}
                  </div>
                </div>

                <div style={{
                  display:'flex',
                  flexWrap:'wrap',
                  gap:'8px'
                }}>
                  {row.status==='active'&&(
                    <>
                      <button
                        className="canopySecondary"
                        disabled={busy===row.id}
                        onClick={()=>regenerate(row)}
                      >
                        Regenerate
                      </button>

                      <button
                        className="canopySecondary"
                        disabled={busy===row.id}
                        onClick={()=>revoke(row)}
                      >
                        Revoke
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

    </main>
  );
}
