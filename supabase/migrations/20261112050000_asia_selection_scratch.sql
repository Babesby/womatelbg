-- STAGED ONLY: apply to Supabase before deploying the associated Asia admissions worker.
-- Secure random bearer link for each real selected-email queue item. No token in public SQL tables.
create extension if not exists pgcrypto;
create table if not exists private.womate_selection_scratch_links (
  queue_id uuid primary key references public.womate_admissions_email_queue(id) on delete cascade,
  application_id uuid not null references public.womate_cohort_applications(id) on delete cascade,
  token_digest text not null unique,
  created_at timestamptz not null default now()
);
revoke all on private.womate_selection_scratch_links from public,anon,authenticated;
alter table private.womate_selection_scratch_links enable row level security;

create or replace function private.womate_queue_selection_scratch()
returns trigger language plpgsql security definer set search_path=public,private,pg_temp as $$
declare token text;
begin
 if new.template_key='selected' and new.cohort_key='she-leads-asia-c1-2027'
    and new.application_id is not null then
   token:=encode(extensions.gen_random_bytes(32),'hex');
   insert into private.womate_selection_scratch_links(queue_id,application_id,token_digest)
     values(new.id,new.application_id,encode(extensions.digest(token,'sha256'),'hex'))
     on conflict(queue_id) do update set token_digest=excluded.token_digest,application_id=excluded.application_id;
   update public.womate_admissions_email_queue set
     payload=coalesce(payload,'{}'::jsonb)||jsonb_build_object(
       'scratch_path','https://www.womate.org/she-leads/selection-card#token='||token
     )
   where id=new.id;
 end if;
 return null;
end $$;
drop trigger if exists womate_queue_selection_scratch on public.womate_admissions_email_queue;
create trigger womate_queue_selection_scratch after insert on public.womate_admissions_email_queue
 for each row execute function private.womate_queue_selection_scratch();

create or replace function public.womate_reveal_selection_scratch(p_token text)
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare a public.womate_cohort_applications%rowtype;
  v_code text;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
   return jsonb_build_object('ok',false,'message','Invalid selection link');
 end if;
 select a0.* into a from private.womate_selection_scratch_links l
 join public.womate_cohort_applications a0 on a0.id=l.application_id
 join public.womate_admissions_email_queue q0 on q0.id=l.queue_id
 where l.token_digest=encode(extensions.digest(p_token,'sha256'),'hex')
 and q0.status='sent' and q0.template_key='selected' and q0.cohort_key='she-leads-asia-c1-2027'
 limit 1;
 if not found or a.status<>'selected' or a.cohort_key<>'she-leads-asia-c1-2027'
    or a.offer_expires_at is null or a.offer_expires_at<=now() then
   return jsonb_build_object('ok',false,'message','This selection link is unavailable or the offer has expired');
 end if;
 select i.public_code into v_code from public.womate_selected_card_invites i
 where lower(i.email)=lower(a.email) and i.programme_slug=a.cohort_key
   and i.status='active' and i.code_hash=a.offer_code_hash and i.expires_at>now()
 order by i.created_at desc limit 1;
 if v_code is null then
   return jsonb_build_object('ok',false,'message','The selection code is not yet available');
 end if;
 return jsonb_build_object('ok',true,'reference',a.application_reference,'email',a.email,
  'name',a.full_name,'cohort','She Leads Asia · Cohort 1, 2027',
  'code',v_code,'expires_at',a.offer_expires_at,
  'preview',a.reviewer_note_private='WOMATE_EMAIL_FLOW_TEST');
end $$;
revoke all on function public.womate_reveal_selection_scratch(text) from public;
grant execute on function public.womate_reveal_selection_scratch(text) to anon,authenticated;
