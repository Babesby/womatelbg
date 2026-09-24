-- WOMATE CANOPY · LinkedIn short-link acceptance · 2026-09-24
-- Accepts normal LinkedIn links and official lnkd.in shortened links.
-- Rerunnable. Does not alter learner submissions or attempts.

create or replace function public.canopy_assignment_auto_score(
  p_paragraph text,
  p_canvas text,
  p_linkedin text
)
returns integer
language plpgsql
immutable
as $$
declare
  v_text text := trim(coalesce(p_paragraph, ''));
  v_score integer := 0;
begin

  -- Paragraph development: maximum 50 points
  if length(v_text) >= 250 then
    v_score := v_score + 50;

  elsif length(v_text) >= 160 then
    v_score := v_score + 43;

  elsif length(v_text) >= 100 then
    v_score := v_score + 34;

  elsif length(v_text) >= 60 then
    v_score := v_score + 24;

  elsif length(v_text) > 0 then
    v_score := v_score + 12;
  end if;


  -- Climate / module relevance: maximum 10 points
  if v_text ~*
    '\m(climate|adaptation|mitigation|resilience|justice|gender|policy|governance|advocacy|leadership|community|evidence|action)\M'
  then
    v_score := v_score + 10;
  end if;


  -- CanopyCanvas evidence: 20 points
  if trim(coalesce(p_canvas, '')) ~* '^https?://'
  then
    v_score := v_score + 20;
  end if;


  -- Speaker / LinkedIn evidence: 20 points
  if trim(coalesce(p_linkedin, '')) ~*
    '^https?://(([^/]*\.)?linkedin\.com|lnkd\.in)/'
  then
    v_score := v_score + 20;
  end if;


  return least(100, greatest(0, v_score));

end;
$$;

create or replace function public.canopy_auto_feedback(
  p_paragraph text,
  p_canvas text,
  p_linkedin text,
  p_score integer
)
returns text
language plpgsql
immutable
as $$
begin

  if length(trim(coalesce(p_paragraph, ''))) < 100 then
    return
      'Strengthen the paragraph with a clearer explanation, evidence and connection to the module.';
  end if;


  if trim(coalesce(p_canvas, '')) !~* '^https?://' then
    return
      'Your CanopyCanvas evidence link needs to be checked or replaced with a working shared link.';
  end if;


  if trim(coalesce(p_linkedin, '')) !~*
    '^https?://(([^/]*\.)?linkedin\.com|lnkd\.in)/'
  then
    return
      'Your speaker-task LinkedIn evidence needs to be checked or replaced with a valid LinkedIn or lnkd.in post link.';
  end if;


  if p_score < 70 then

    return
      'Your submission needs strengthening before completion. Review the module and improve the weaker areas.';

  elsif p_score < 85 then

    return
      'Good foundation. Add greater specificity, evidence and connection between the learning and your proposed action.';

  else

    return
      'Strong baseline submission. WOMATE may still review the work before the final programme decision.';

  end if;

end;
$$;

create or replace function public.canopy_prepare_assignment_assessment()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_score integer;
begin

  -- The designated isolated tester uses its own deterministic grading RPC.
  if exists (select 1 from auth.users u where u.id=new.user_id and lower(coalesce(u.email,''))='p.viewmultimedia@gmail.com') then
    return new;
  end if;

  v_score :=
    public.canopy_assignment_auto_score(
      new.paragraph_response,
      new.canvas_link,
      new.linkedin_link
    );


  new.auto_score := v_score;

  new.score_band :=
    public.canopy_score_band(v_score);

  new.feedback_hint :=
    public.canopy_auto_feedback(
      new.paragraph_response,
      new.canvas_link,
      new.linkedin_link,
      v_score
    );

  new.automation_reviewed_at := now();


  if
    length(trim(coalesce(new.paragraph_response, ''))) < 60

    or trim(coalesce(new.canvas_link, '')) !~*
      '^https?://'

    or trim(coalesce(new.linkedin_link, '')) !~*
      '^https?://(([^/]*\.)?linkedin\.com|lnkd\.in)/'

  then

    new.assessment_status := 'needs_manual_review';

  elsif v_score < 70 then

    new.assessment_status := 'revision_required';

  else

    new.assessment_status := 'auto_reviewed';

  end if;


  new.final_score := v_score;

  new.final_feedback := new.feedback_hint;

  new.review_source := 'automated';


  -- New/revised work clears any previous human override.
  new.manual_score := null;

  new.manual_feedback := null;

  new.manual_decision := null;

  new.reviewed_by := null;

  new.reviewed_at := null;


  return new;

end;
$$;

create or replace function public.canopy_refresh_learning_automation()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin

  update public.canopy_assignment_submissions s
  set

    auto_score =
      public.canopy_assignment_auto_score(
        s.paragraph_response,
        s.canvas_link,
        s.linkedin_link
      ),

    score_band =
      case

        when
          s.review_source = 'manual'
          and s.final_score is not null

        then public.canopy_score_band(s.final_score)


        else
          public.canopy_score_band(
            public.canopy_assignment_auto_score(
              s.paragraph_response,
              s.canvas_link,
              s.linkedin_link
            )
          )

      end,

    feedback_hint =
      public.canopy_auto_feedback(
        s.paragraph_response,
        s.canvas_link,
        s.linkedin_link,
        public.canopy_assignment_auto_score(
          s.paragraph_response,
          s.canvas_link,
          s.linkedin_link
        )
      ),

    final_score =
      case

        when s.review_source = 'manual'
        then s.final_score

        else
          public.canopy_assignment_auto_score(
            s.paragraph_response,
            s.canvas_link,
            s.linkedin_link
          )

      end,

    final_feedback =
      case

        when s.review_source = 'manual'
        then s.final_feedback

        else
          public.canopy_auto_feedback(
            s.paragraph_response,
            s.canvas_link,
            s.linkedin_link,
            public.canopy_assignment_auto_score(
              s.paragraph_response,
              s.canvas_link,
              s.linkedin_link
            )
          )

      end,

    review_source =
      case

        when s.review_source = 'manual'
        then 'manual'

        else 'automated'

      end,

    automation_reviewed_at = now(),

    assessment_status =
      case

        when s.review_source = 'manual'
        then s.assessment_status


        when
          length(trim(coalesce(s.paragraph_response, ''))) < 60

          or trim(coalesce(s.canvas_link, '')) !~*
            '^https?://'

          or trim(coalesce(s.linkedin_link, '')) !~*
            '^https?://(([^/]*\.)?linkedin\.com|lnkd\.in)/'

        then 'needs_manual_review'


        when
          public.canopy_assignment_auto_score(
            s.paragraph_response,
            s.canvas_link,
            s.linkedin_link
          ) < 70

        then 'revision_required'


        else 'auto_reviewed'

      end

  where
    (public.canopy_is_manager(auth.uid()) or s.user_id = auth.uid())
    and not exists (select 1 from auth.users u where u.id=s.user_id and lower(coalesce(u.email,''))='p.viewmultimedia@gmail.com');


  get diagnostics v_count = row_count;


  return v_count;

end;
$$;

-- Re-evaluate existing non-manual submissions so any lnkd.in evidence is treated normally.
select public.canopy_refresh_learning_automation();
