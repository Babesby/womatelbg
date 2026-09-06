begin;

drop function if exists public.canopy_manager_review_assignment(uuid,integer,text,text);
drop function if exists public.canopy_manager_review_assignment(uuid,numeric,text,text);
drop function if exists public.canopy_manager_review_assignment(text,integer,text,text);
drop function if exists public.canopy_manager_review_assignment(text,numeric,text,text);

create function public.canopy_manager_review_assignment(
  p_submission_id uuid,
  p_score integer,
  p_feedback text,
  p_decision text
)
returns setof public.canopy_assignment_submissions
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  r public.canopy_assignment_submissions%rowtype;
  v_status text;
  v_band text;
  v_title text;
  v_body text;
  v_feedback text := nullif(trim(coalesce(p_feedback,'')),'');
begin
  if auth.uid() is null or not public.canopy_is_manager(auth.uid()) then
    raise exception 'Only an authorised WOMATE manager can review assignments.';
  end if;

  if p_score is null or p_score < 0 or p_score > 100 then
    raise exception 'Final score must be between 0 and 100.';
  end if;

  if p_decision not in ('completed','revision_required','needs_manual_review') then
    raise exception 'Unsupported review decision.';
  end if;

  select * into r
  from public.canopy_assignment_submissions
  where id=p_submission_id
  for update;

  if not found then
    raise exception 'Assignment submission not found.';
  end if;

  v_status := case
    when p_decision='completed' then 'satisfactory'
    when p_decision='revision_required' then 'revision_requested'
    else r.status
  end;

  v_band := case
    when p_score >= 85 then 'Strong'
    when p_score >= 70 then 'Satisfactory'
    when p_score >= 55 then 'Developing'
    else 'Needs strengthening'
  end;

  update public.canopy_assignment_submissions
  set
    status=v_status,
    assessment_status=p_decision,
    final_score=p_score,
    final_feedback=coalesce(v_feedback, feedback_hint, ''),
    score_band=v_band,
    review_source='manual'
  where id=p_submission_id
  returning * into r;

  if p_decision='completed' then
    v_title := 'WOMATE assignment review complete';
    v_body := 'Final WOMATE score: '||p_score||'/100 · '||v_band||
              case when v_feedback is not null then '. '||v_feedback else '.' end;
  elsif p_decision='revision_required' then
    v_title := 'Assignment revision required';
    v_body := 'WOMATE review: '||p_score||'/100 · '||v_band||'. Revision required.'||
              case when v_feedback is not null then ' '||v_feedback else '' end;
  else
    v_title := 'Assignment review in progress';
    v_body := 'WOMATE has marked this submission for further manual review. Current reviewed score: '||
              p_score||'/100 · '||v_band||
              case when v_feedback is not null then '. '||v_feedback else '.' end;
  end if;

  insert into public.canopy_notifications(user_id,type,title,body,link,fingerprint)
  values(
    r.user_id,
    'assignment_score',
    v_title,
    v_body,
    '/canopy/assignments',
    'assignment-review:'||r.id::text
  )
  on conflict(fingerprint) do update
    set title=excluded.title,
        body=excluded.body,
        link=excluded.link,
        type=excluded.type,
        read_at=null;

  return next r;
end;
$$;

revoke all on function public.canopy_manager_review_assignment(uuid,integer,text,text) from public;
grant execute on function public.canopy_manager_review_assignment(uuid,integer,text,text) to authenticated;

create or replace function public.canopy_sync_tester_assignment_score_notification()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_score integer;
  v_band text;
  v_feedback text;
begin
  v_score := coalesce(new.final_score,new.auto_score);
  v_band := coalesce(
    new.score_band,
    case
      when v_score >= 85 then 'Strong'
      when v_score >= 70 then 'Satisfactory'
      when v_score >= 55 then 'Developing'
      else 'Needs strengthening'
    end
  );
  v_feedback := coalesce(new.final_feedback,new.feedback_hint,'');

  update public.canopy_notifications
  set
    title = case
      when new.review_source='manual' then 'WOMATE assignment review complete'
      else 'Tester assignment score ready'
    end,
    body = case
      when new.review_source='manual'
        then 'Final WOMATE score: '||v_score||'/100 · '||v_band||
             case when nullif(trim(v_feedback),'') is not null then '. '||v_feedback else '.' end
      else 'Immediate automated tester score: '||v_score||'/100 · '||v_band||
             case when nullif(trim(v_feedback),'') is not null then '. '||v_feedback else '.' end
    end,
    read_at=null
  where fingerprint='tester-score:'||new.id::text;

  return new;
end;
$$;

drop trigger if exists canopy_sync_tester_assignment_score_notification
on public.canopy_assignment_submissions;

create trigger canopy_sync_tester_assignment_score_notification
after update of auto_score,final_score,score_band,feedback_hint,final_feedback,review_source,assessment_status
on public.canopy_assignment_submissions
for each row
execute function public.canopy_sync_tester_assignment_score_notification();

update public.canopy_notifications n
set
  title = case
    when s.review_source='manual' then 'WOMATE assignment review complete'
    else 'Tester assignment score ready'
  end,
  body = case
    when s.review_source='manual'
      then 'Final WOMATE score: '||coalesce(s.final_score,s.auto_score)::text||'/100 · '||coalesce(s.score_band,'')||
           case when nullif(trim(coalesce(s.final_feedback,s.feedback_hint,'')),'') is not null
                then '. '||coalesce(s.final_feedback,s.feedback_hint,'') else '.' end
    else 'Immediate automated tester score: '||coalesce(s.final_score,s.auto_score)::text||'/100 · '||coalesce(s.score_band,'')||
         case when nullif(trim(coalesce(s.final_feedback,s.feedback_hint,'')),'') is not null
              then '. '||coalesce(s.final_feedback,s.feedback_hint,'') else '.' end
  end,
  read_at=null
from public.canopy_assignment_submissions s
where n.fingerprint='tester-score:'||s.id::text
  and coalesce(s.final_score,s.auto_score) is not null;

select
  id,user_id,week_key,attempt_no,status,assessment_status,
  auto_score,final_score,score_band,review_source
from public.canopy_assignment_submissions
order by submitted_at desc
limit 20;

commit;
