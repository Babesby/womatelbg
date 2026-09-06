const U=(import.meta.env.VITE_SUPABASE_URL||'').replace(/\/$/,'');
const K=import.meta.env.VITE_SUPABASE_ANON_KEY||'';

export const selectedCardConfigured=Boolean(U&&K);

async function rpc(fn,body){
  if(!selectedCardConfigured){
    throw new Error('Selection verification is not configured on this deployment.');
  }

  const response=await fetch(`${U}/rest/v1/rpc/${fn}`,{
    method:'POST',
    headers:{
      apikey:K,
      Authorization:`Bearer ${K}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify(body)
  });

  let data=null;
  try{data=await response.json()}catch{}

  if(!response.ok){
    throw new Error(
      data?.message||
      data?.error||
      'Unable to verify this WOMATE selection right now.'
    );
  }

  return data;
}

export async function verifySelectedLearner(email,code){
  const data=await rpc('womate_verify_selected_card',{
    p_email:String(email||'').trim().toLowerCase(),
    p_code:String(code||'').trim().toUpperCase()
  });

  if(!data?.verified){
    throw new Error(
      'We could not verify this selection. Check the email address and selection code in your WOMATE message.'
    );
  }

  return data;
}
