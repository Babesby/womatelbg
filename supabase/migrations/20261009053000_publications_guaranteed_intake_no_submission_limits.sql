-- WOMATE Publications guaranteed intake: no learner submission throttling
set lock_timeout='8s';
set statement_timeout='90s';

create or replace function public.womate_publication_allow(p_key text,p_action text,p_max int,p_window_minutes int)
returns boolean language plpgsql security definer set search_path=public as $$
declare n int;
begin
  if p_action in('submit','submit_v2') then return true; end if;
  if p_action<>'login' then return false; end if;
  if p_key is null or length(p_key)<>64 or p_max not between 1 and 100 or p_window_minutes not between 1 and 1440 then return false; end if;
  perform pg_advisory_xact_lock(hashtext('womate-publications-'||p_key||p_action)::bigint);
  select count(*) into n from public.womate_publication_rate_events
  where key_hash=p_key and action='login' and created_at>now()-make_interval(mins=>p_window_minutes);
  if n>=p_max then return false; end if;
  insert into public.womate_publication_rate_events(key_hash,action) values(p_key,'login');
  return true;
end;
$$;
revoke all on function public.womate_publication_allow(text,text,int,int) from public,anon,authenticated;
grant execute on function public.womate_publication_allow(text,text,int,int) to service_role;

alter table public.womate_publications drop constraint if exists womate_publications_name_check;
alter table public.womate_publications drop constraint if exists womate_publications_email_check;
alter table public.womate_publications drop constraint if exists womate_publications_phone_check;
alter table public.womate_publications drop constraint if exists womate_publications_country_check;
alter table public.womate_publications drop constraint if exists womate_publications_title_check;
alter table public.womate_publications drop constraint if exists womate_publications_kind_check;
alter table public.womate_publications drop constraint if exists womate_publications_summary_check;
alter table public.womate_publications drop constraint if exists womate_publications_document_url_check;
alter table public.womate_publications alter column consent_at drop not null;

delete from public.womate_publication_rate_events where action in('submit','submit_v2');

reset lock_timeout;
reset statement_timeout;
