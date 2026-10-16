-- One final Admin-only complaint resolution workflow, no automatic resolutions.
begin;
create or replace function public.canopy_admin_c2_open_complaints()
returns table(id text,learner_id uuid,full_name text,subject text,message text,status text)
language plpgsql security definer set search_path=public,auth as $$
begin
 if not exists(select 1 from public.canopy_profiles where user_id=auth.uid() and role='admin') then raise exception 'Admin required'; end if;
 return query select a.id::text,a.learner_id,p.full_name::text,a.subject::text,a.message::text,a.status::text
 from public.canopy_manager_actions a left join public.canopy_profiles p on p.user_id=a.learner_id
 where a.action_type='complaint' and a.status='open' order by a.created_at desc limit 300;
end $$;
revoke all on function public.canopy_admin_c2_open_complaints() from public,anon;
grant execute on function public.canopy_admin_c2_open_complaints() to authenticated;

create or replace function public.canopy_admin_c2_respond_complaint(p_id text,p_response text,p_resolved boolean default false)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_user uuid;v_status text;
begin
 if not exists(select 1 from public.canopy_profiles where user_id=auth.uid() and role='admin') then raise exception 'Admin required'; end if;
 if char_length(btrim(coalesce(p_response,'')))<30 then raise exception 'Write a substantive reply'; end if;
 select learner_id,status into v_user,v_status from public.canopy_manager_actions
 where id::text=p_id and action_type='complaint' for update;
 if v_user is null or v_status<>'open' then raise exception 'Complaint not found or no longer open'; end if;
 update public.canopy_manager_actions set response_message=btrim(p_response),responded_at=now(),
 status=case when p_resolved then 'resolved' else 'open' end,
 resolved_at=case when p_resolved then now() else null end
 where id::text=p_id;
 insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
 values(v_user,'complaint_response','WOMATE has replied to your complaint',btrim(p_response),'/canopy/help',
 'complaint-reply:'||p_id||':'||extract(epoch from clock_timestamp())::bigint);
 return jsonb_build_object('id',p_id,'status',case when p_resolved then 'resolved' else 'open' end);
end $$;
revoke all on function public.canopy_admin_c2_respond_complaint(text,text,boolean) from public,anon;
grant execute on function public.canopy_admin_c2_respond_complaint(text,text,boolean) to authenticated;
commit;
