-- Reuse the complete Cohort 2 mission data model and reviews for Africa C3 / Asia C1.
-- Existing Cohort 2 mission records and functions remain unchanged.
create or replace function private.canopy_27_mission_member(p_cohort text,p_user uuid)
returns boolean language sql stable security definer set search_path=public,auth,private,pg_temp as $$
 select p_cohort in ('she-leads-climate-c3-2027','she-leads-asia-c1-2027')
 and exists(select 1 from public.canopy_cohort_memberships m
 where m.cohort_key=p_cohort and m.user_id=p_user and m.status='active');
$$;
revoke all on function private.canopy_27_mission_member(text,uuid) from public,anon,authenticated;

create or replace function private.canopy_27_mission_eligible(p_cohort text,p_user uuid)
returns boolean language sql stable security definer set search_path=public,auth,private,pg_temp as $$
 select private.canopy_27_mission_member(p_cohort,p_user) and (
 exists(select 1 from public.canopy_2027_submissions s where s.cohort_key=p_cohort and s.user_id=p_user and s.status='approved')
 or exists(select 1 from public.canopy_2027_lesson_progress l where l.cohort_key=p_cohort and l.user_id=p_user group by l.user_id having count(*)>=4)
 );
$$;
revoke all on function private.canopy_27_mission_eligible(text,uuid) from public,anon,authenticated;

create or replace function public.canopy_27_mission_view(p_cohort text)
returns jsonb language plpgsql security definer set search_path=public,auth,private,pg_temp as $$
declare me uuid:=auth.uid(); m public.canopy_mission_group_members%rowtype; g public.canopy_mission_groups%rowtype;
begin
 if not private.canopy_27_mission_member(p_cohort,me) then raise exception 'Active 2027 cohort membership required'; end if;
 select x.* into m from public.canopy_mission_group_members x join public.canopy_mission_groups cg on cg.id=x.group_id
 where x.user_id=me and cg.cohort_key=p_cohort and x.invitation_status in ('invited','accepted')
 order by x.invited_at desc limit 1;
 if m.id is null then return jsonb_build_object('cohort_key',p_cohort,'eligible',private.canopy_27_mission_eligible(p_cohort,me),
 'state',case when private.canopy_27_mission_eligible(p_cohort,me) then 'waiting' else 'locked' end); end if;
 select * into g from public.canopy_mission_groups where id=m.group_id;
 return jsonb_build_object(
 'cohort_key',p_cohort,'state',m.invitation_status,'eligible',true,'member',to_jsonb(m),
 'group',to_jsonb(g),
 'my_review',(select jsonb_build_object('decision',v.decision,'reason',v.reason,'reviewed_at',v.reviewed_at)
 from public.canopy_mission_contribution_reviews v where v.group_id=g.id and v.user_id=me),
 'members',case when m.invitation_status='accepted' then coalesce((select jsonb_agg(jsonb_build_object(
 'user_id',x.user_id,'name',coalesce(p.full_name,'Learner'),'country',x.country,
 'seat_no',x.seat_no,'mission_no',x.mission_no,'status',x.invitation_status) order by x.seat_no)
 from public.canopy_mission_group_members x left join public.canopy_profiles p on p.user_id=x.user_id
 where x.group_id=g.id and x.invitation_status in ('invited','accepted')),'[]'::jsonb) else '[]'::jsonb end,
 'messages',case when m.invitation_status='accepted' then coalesce((select jsonb_agg(jsonb_build_object(
 'id',msg.id,'user_id',msg.user_id,'body',msg.body,'created_at',msg.created_at,
 'sender_name',coalesce(p.full_name,'Learner')) order by msg.created_at)
 from public.canopy_mission_messages msg left join public.canopy_profiles p on p.user_id=msg.user_id
 where msg.group_id=g.id),'[]'::jsonb) else '[]'::jsonb end,
 'reports',case when m.invitation_status='accepted' then coalesce((select jsonb_agg(jsonb_build_object(
 'id',r.id,'user_id',r.user_id,'mission_no',r.mission_no,'summary',r.summary,'proof_url',r.proof_url,
 'name',coalesce(p.full_name,'Learner'),'submitted_at',r.submitted_at,'updated_at',r.updated_at) order by r.mission_no)
 from public.canopy_mission_reports r left join public.canopy_profiles p on p.user_id=r.user_id where r.group_id=g.id),'[]'::jsonb)
 else '[]'::jsonb end
 );
end $$;
revoke all on function public.canopy_27_mission_view(text) from public,anon;
grant execute on function public.canopy_27_mission_view(text) to authenticated;

create or replace function public.canopy_27_mission_publish(p_cohort text,p_deadline timestamptz)
returns boolean language plpgsql security definer set search_path=public,auth,private,pg_temp as $$
begin
 if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then raise exception 'Admin only'; end if;
 if p_cohort not in ('she-leads-climate-c3-2027','she-leads-asia-c1-2027')
 or p_deadline<=now()+interval '24 hours' then raise exception 'Select a 2027 cohort and a future deadline'; end if;
 update public.canopy_programme_cohorts
 set delivery_rules=jsonb_set(coalesce(delivery_rules,'{}'::jsonb),'{mission_deadline}',to_jsonb(to_char(p_deadline at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')),true)
 where cohort_key=p_cohort and cohort_year=2027;
 return found;
end $$;
revoke all on function public.canopy_27_mission_publish(text,timestamptz) from public,anon;
grant execute on function public.canopy_27_mission_publish(text,timestamptz) to authenticated;

create or replace function public.canopy_27_mission_form_teams(p_cohort text)
returns jsonb language plpgsql security definer set search_path=public,auth,private,pg_temp as $$
declare deadline timestamptz; g_id uuid; bucket uuid[]:=array[]::uuid[]; names text[]:=array[]::text[];
 c record; formed int:=0; seat int;
begin
 if auth.uid() is null or not public.canopy_is_womate_admin(auth.uid()) then raise exception 'Admin only'; end if;
 if p_cohort not in ('she-leads-climate-c3-2027','she-leads-asia-c1-2027') then raise exception 'Unsupported cohort'; end if;
 select nullif(delivery_rules->>'mission_deadline','')::timestamptz into deadline from public.canopy_programme_cohorts where cohort_key=p_cohort;
 if deadline is null or deadline<=now() then raise exception 'Publish a future Mission deadline first'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_cohort||':mission-formation',0));
 for c in select m.user_id,coalesce(nullif(p.country,''),'Not recorded') country
 from public.canopy_cohort_memberships m join public.canopy_profiles p on p.user_id=m.user_id
 where m.cohort_key=p_cohort and m.status='active'
 and private.canopy_27_mission_eligible(p_cohort,m.user_id)
 and not exists(select 1 from public.canopy_mission_group_members x
 join public.canopy_mission_groups g on g.id=x.group_id
 where x.user_id=m.user_id and g.cohort_key=p_cohort and x.invitation_status in ('invited','accepted'))
 order by md5(m.user_id::text||p_cohort)
 loop
  bucket:=array_append(bucket,c.user_id);
  names:=array_append(names,c.country);
  if cardinality(bucket)=5 then
   insert into public.canopy_mission_groups(cohort_key,deadline_at,name,status)
   values(p_cohort,deadline,'Cross-country climate mission','inviting') returning id into g_id;
   for seat in 1..5 loop
    insert into public.canopy_mission_group_members(group_id,user_id,country,seat_no,mission_no,invitation_status)
    values(g_id,bucket[seat],names[seat],seat,seat,'invited');
    insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
    values(bucket[seat],'mission_invite','Your 2027 WOMATE Mission invitation',
    'Your cross-country Mission team invitation is ready. Open Canopy to respond.','/canopy/opportunities',
    'mission-2027-invite:'||g_id||':'||bucket[seat]) on conflict(fingerprint) do nothing;
   end loop;
   formed:=formed+1;bucket:=array[]::uuid[];names:=array[]::text[];
  end if;
 end loop;
 return jsonb_build_object('teams_formed',formed,'awaiting_team_assignment',cardinality(bucket));
end $$;
revoke all on function public.canopy_27_mission_form_teams(text) from public,anon;
grant execute on function public.canopy_27_mission_form_teams(text) to authenticated;

create or replace function public.canopy_27_mission_respond(p_cohort text,p_accept boolean)
returns jsonb language plpgsql security definer set search_path=public,auth,private,pg_temp as $$
declare m public.canopy_mission_group_members%rowtype; accepted int;
begin
 if not private.canopy_27_mission_member(p_cohort,auth.uid()) then raise exception 'Membership required'; end if;
 select x.* into m from public.canopy_mission_group_members x join public.canopy_mission_groups g on g.id=x.group_id
 where g.cohort_key=p_cohort and x.user_id=auth.uid() and x.invitation_status='invited'
 order by x.invited_at desc limit 1 for update of x;
 if m.id is null then raise exception 'No pending invitation'; end if;
 update public.canopy_mission_group_members set invitation_status=case when p_accept then 'accepted' else 'declined' end,responded_at=now() where id=m.id;
 select count(*) into accepted from public.canopy_mission_group_members where group_id=m.group_id and invitation_status='accepted';
 if accepted=5 then update public.canopy_mission_groups set status='active',updated_at=now() where id=m.group_id; end if;
 return public.canopy_27_mission_view(p_cohort);
end $$;
revoke all on function public.canopy_27_mission_respond(text,boolean) from public,anon;
grant execute on function public.canopy_27_mission_respond(text,boolean) to authenticated;

create or replace function public.canopy_27_mission_message(p_cohort text,p_message text)
returns jsonb language plpgsql security definer set search_path=public,auth,private,pg_temp as $$
declare gid uuid;
begin
 if not private.canopy_27_mission_member(p_cohort,auth.uid()) then raise exception 'Membership required'; end if;
 if length(btrim(coalesce(p_message,''))) not between 2 and 1500 then raise exception 'Message must be 2–1500 characters'; end if;
 select m.group_id into gid from public.canopy_mission_group_members m join public.canopy_mission_groups g on g.id=m.group_id
 where g.cohort_key=p_cohort and m.user_id=auth.uid() and m.invitation_status='accepted' order by m.invited_at desc limit 1;
 if gid is null then raise exception 'Accept your Mission invitation first'; end if;
 insert into public.canopy_mission_messages(group_id,user_id,body) values(gid,auth.uid(),btrim(p_message));
 return public.canopy_27_mission_view(p_cohort);
end $$;
revoke all on function public.canopy_27_mission_message(text,text) from public,anon;
grant execute on function public.canopy_27_mission_message(text,text) to authenticated;

create or replace function public.canopy_27_mission_update(p_cohort text,p_name text,p_choice text,p_brief text)
returns jsonb language plpgsql security definer set search_path=public,auth,private,pg_temp as $$
declare gid uuid;
begin
 if not private.canopy_27_mission_member(p_cohort,auth.uid()) then raise exception 'Membership required'; end if;
 select m.group_id into gid from public.canopy_mission_group_members m join public.canopy_mission_groups g on g.id=m.group_id
 where g.cohort_key=p_cohort and g.status='active' and m.user_id=auth.uid() and m.invitation_status='accepted' limit 1;
 if gid is null then raise exception 'No active Mission'; end if;
 if length(btrim(coalesce(p_name,''))) not between 4 and 100
 or lower(btrim(p_name)) in ('mission','cross-country climate mission')
 or p_choice not in ('standard','custom')
 or (p_choice='custom' and length(btrim(coalesce(p_brief,'')))<40)
 then raise exception 'Enter a meaningful Mission name and a complete custom brief if needed'; end if;
 update public.canopy_mission_groups set name=btrim(p_name),mission_choice=p_choice,
 custom_brief=case when p_choice='custom' then left(btrim(p_brief),4000) else null end,updated_at=now()
 where id=gid;
 return public.canopy_27_mission_view(p_cohort);
end $$;
revoke all on function public.canopy_27_mission_update(text,text,text,text) from public,anon;
grant execute on function public.canopy_27_mission_update(text,text,text,text) to authenticated;

create or replace function public.canopy_27_mission_submit_report(p_cohort text,p_summary text,p_proof text)
returns jsonb language plpgsql security definer set search_path=public,auth,private,pg_temp as $$
declare m public.canopy_mission_group_members%rowtype; deadline timestamptz;
begin
 if not private.canopy_27_mission_member(p_cohort,auth.uid()) then raise exception 'Membership required'; end if;
 select x.* into m from public.canopy_mission_group_members x join public.canopy_mission_groups g on g.id=x.group_id
 where g.cohort_key=p_cohort and g.status in ('active','submitted') and x.user_id=auth.uid() and x.invitation_status='accepted' limit 1;
 if m.id is null then raise exception 'Accepted active Mission required'; end if;
 select deadline_at into deadline from public.canopy_mission_groups where id=m.group_id;
 if now()>deadline then raise exception 'Mission report deadline passed'; end if;
 if length(btrim(coalesce(p_summary,''))) not between 20 and 12000 then raise exception 'Report must be 20–12000 characters'; end if;
 if p_proof !~* '^https://(drive|docs)\.google\.com/' or length(p_proof)>1000 then raise exception 'Provide a secure Google Drive or Docs link'; end if;
 if exists(select 1 from public.canopy_mission_contribution_reviews v where v.group_id=m.group_id and v.user_id=auth.uid() and v.decision='approved')
 or exists(select 1 from public.canopy_mission_completions c where c.group_id=m.group_id and c.user_id=auth.uid() and c.status='completed') then raise exception 'Approved work cannot be changed'; end if;
 insert into public.canopy_mission_reports(group_id,user_id,mission_no,summary,proof_url)
 values(m.group_id,auth.uid(),m.mission_no,btrim(p_summary),btrim(p_proof))
 on conflict(group_id,user_id) do update set summary=excluded.summary,proof_url=excluded.proof_url,updated_at=now();
 return public.canopy_27_mission_view(p_cohort);
end $$;
revoke all on function public.canopy_27_mission_submit_report(text,text,text) from public,anon;
grant execute on function public.canopy_27_mission_submit_report(text,text,text) to authenticated;

create or replace function public.canopy_27_mission_submit_team(p_cohort text,p_folder text)
returns jsonb language plpgsql security definer set search_path=public,auth,private,pg_temp as $$
declare gid uuid; deadline timestamptz; accepted int; reports int;
begin
 if not private.canopy_27_mission_member(p_cohort,auth.uid()) then raise exception 'Membership required'; end if;
 select g.id,g.deadline_at into gid,deadline from public.canopy_mission_groups g join public.canopy_mission_group_members m on m.group_id=g.id
 where g.cohort_key=p_cohort and g.status='active' and m.user_id=auth.uid() and m.invitation_status='accepted' limit 1;
 if gid is null then raise exception 'Active Mission group required'; end if;
 if now()>deadline then raise exception 'Mission deadline passed'; end if;
 if p_folder !~* '^https://(drive|docs)\.google\.com/' or length(p_folder)>1000 then raise exception 'Google Drive or Docs evidence required'; end if;
 select count(*) into accepted from public.canopy_mission_group_members where group_id=gid and invitation_status='accepted';
 select count(*) into reports from public.canopy_mission_reports where group_id=gid;
 if accepted<>5 or reports<>5 then raise exception 'All five group members and their individual reports are required'; end if;
 update public.canopy_mission_groups set status='submitted',evidence_folder_url=btrim(p_folder),submitted_at=now(),updated_at=now() where id=gid;
 return public.canopy_27_mission_view(p_cohort);
end $$;
revoke all on function public.canopy_27_mission_submit_team(text,text) from public,anon;
grant execute on function public.canopy_27_mission_submit_team(text,text) to authenticated;
