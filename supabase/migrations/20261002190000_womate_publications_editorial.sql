-- WOMATE public knowledge library (independent from Canopy).
create table if not exists public.womate_publications (
 id uuid primary key default gen_random_uuid(),
 name text not null check(char_length(name) between 2 and 120),
 email text not null check(char_length(email) between 5 and 200),
 phone text not null check(char_length(phone) between 3 and 40),
 country text not null check(char_length(country) between 2 and 100),
 affiliation text not null default '',
 title text not null check(char_length(title) between 5 and 180),
 kind text not null check(kind in ('Research paper','Article','Policy brief','Case study','Perspective','Other')),
 summary text not null check(char_length(summary) between 40 and 2500),
 document_url text not null check(char_length(document_url) between 12 and 1500),
 consent_at timestamptz not null,
 status text not null default 'pending' check(status in ('pending','approved','declined')),
 feedback text not null default '',
 reviewed_by text,
 reviewed_at timestamptz,
 published_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists womate_publications_review_idx on public.womate_publications(status,created_at desc);
create table if not exists public.womate_publication_rate_events(
 id bigint generated always as identity primary key,
 key_hash text not null,
 action text not null check(action in ('submit','login')),
 created_at timestamptz not null default now()
);
create index if not exists womate_publication_rate_idx on public.womate_publication_rate_events(key_hash,action,created_at desc);
alter table public.womate_publications enable row level security;
alter table public.womate_publication_rate_events enable row level security;
revoke all on public.womate_publications from anon, authenticated, public;
revoke all on public.womate_publication_rate_events from anon, authenticated, public;
-- A serialized, service-role-only limit avoids public direct table access.
create or replace function public.womate_publication_allow(p_key text,p_action text,p_max int,p_window_minutes int)
returns boolean language plpgsql security definer set search_path=public as $$
declare n int;
begin
 if p_key is null or length(p_key) <> 64 or p_action not in ('submit','login') or p_max not between 1 and 20 or p_window_minutes not between 1 and 1440 then return false; end if;
 perform pg_advisory_xact_lock(hashtext('womate-publications-'||p_key||p_action)::bigint);
 select count(*) into n from public.womate_publication_rate_events where key_hash=p_key and action=p_action and created_at>now()-make_interval(mins=>p_window_minutes);
 if n>=p_max then return false; end if;
 insert into public.womate_publication_rate_events(key_hash,action) values(p_key,p_action);
 return true;
end;
$$;
revoke all on function public.womate_publication_allow(text,text,int,int) from public,anon,authenticated;
grant execute on function public.womate_publication_allow(text,text,int,int) to service_role;
