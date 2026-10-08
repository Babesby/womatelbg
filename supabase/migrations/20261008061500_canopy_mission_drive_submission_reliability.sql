-- WOMATE Canopy · Mission Drive submission reliability
-- 2026-10-08
-- Optional report proof remains optional. Final group evidence remains required.

begin;

create or replace function public.canopy_clean_mission_drive_url(p_value text, p_required boolean default false)
returns text language plpgsql immutable set search_path=public as $$
declare raw text:=trim(coalesce(p_value,'')); candidate text;
begin
  if raw='' then
    if p_required then raise exception 'Add the shared mission evidence link.'; end if;
    return null;
  end if;
  candidate:=substring(raw from '(?i)https?://[^[:space:]<>"'']+');
  if candidate is null then
    candidate:=regexp_replace(raw,'^[[:space:]("\[<{]+|[[:space:])"\]}>.,;:]+$','','g');
    if candidate ~* '^(www\.)?(drive|docs)\.google\.com/' then candidate:='https://' || regexp_replace(candidate,'^www\.','','i'); end if;
  end if;
  candidate:=regexp_replace(candidate,'[[:space:])\]}>.,;:]+$','','g');
  if candidate !~* '^https?://(www\.)?(drive|docs)\.google\.com(/|$)' then
    if p_required then raise exception 'Paste a Google Drive or Google Docs share link for the final mission evidence.';
    else raise exception 'Proof link must be a Google Drive or Google Docs share link, or leave it blank.'; end if;
  end if;
  return candidate;
end;$$;

create or replace function public.canopy_submit_mission_report(p_summary text,p_proof_url text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare m public.canopy_mission_group_members%rowtype; clean text:=trim(coalesce(p_summary,'')); clean_proof text;
begin
  select * into m from public.canopy_mission_group_members where user_id=auth.uid() and invitation_status='accepted' order by invited_at desc limit 1;
  if m.id is null then raise exception 'Mission group access is required.'; end if;
  if now()>(select deadline_at from public.canopy_mission_groups where id=m.group_id) then raise exception 'The group mission submission window has closed.'; end if;
  if char_length(clean)<20 then raise exception 'Add a short report of at least 20 characters.'; end if;
  clean_proof:=public.canopy_clean_mission_drive_url(p_proof_url,false);
  insert into public.canopy_mission_reports(group_id,user_id,mission_no,summary,proof_url) values(m.group_id,auth.uid(),m.mission_no,clean,clean_proof)
  on conflict(group_id,user_id) do update set summary=excluded.summary,proof_url=excluded.proof_url,updated_at=now();
  return public.canopy_get_my_mission_hub();
end;$$;
revoke all on function public.canopy_submit_mission_report(text,text) from public;
grant execute on function public.canopy_submit_mission_report(text,text) to authenticated;

create or replace function public.canopy_submit_mission_group(p_folder_url text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare gid uuid; accepted_count integer; report_count integer; deadline timestamptz; clean_folder text;
begin
  select group_id into gid from public.canopy_mission_group_members where user_id=auth.uid() and invitation_status='accepted' order by invited_at desc limit 1;
  if gid is null then raise exception 'Mission group access is required.'; end if;
  select deadline_at into deadline from public.canopy_mission_groups where id=gid;
  if now()>deadline then raise exception 'The group mission submission window has closed.'; end if;
  clean_folder:=public.canopy_clean_mission_drive_url(p_folder_url,true);
  select count(*) into accepted_count from public.canopy_mission_group_members where group_id=gid and invitation_status='accepted';
  select count(distinct mission_no) into report_count from public.canopy_mission_reports where group_id=gid;
  if accepted_count<>5 then raise exception 'All five mission members must accept before the group can submit.'; end if;
  if report_count<>5 then raise exception 'All five mission leads must submit their report before the group can submit.'; end if;
  update public.canopy_mission_groups set evidence_folder_url=clean_folder,status='submitted',submitted_at=now(),updated_at=now() where id=gid;
  insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
  select p.user_id,'mission_admin','Mission group ready for WOMATE verification','A cross-country Canopy Mission group has submitted its complete evidence folder for verification.','/canopy/manage/missions','mission-admin:'||gid::text||':'||p.user_id::text
  from public.canopy_profiles p where p.role in('manager','admin') on conflict(fingerprint) do nothing;
  return public.canopy_get_my_mission_hub();
end;$$;
revoke all on function public.canopy_submit_mission_group(text) from public;
grant execute on function public.canopy_submit_mission_group(text) to authenticated;
commit;
