begin;

-- Follow-up reconciliation for an already-applied Priscilla recognition migration.
-- This intentionally updates live rows instead of rewriting migration history.

update public.canopy_special_recognitions
set
  label='TWO-TIME CANOPY SPOTLIGHT',
  title='WOMATE sees you, Priscilla 💚',
  body='Priscilla, WOMATE sees the consistency, care and leadership behind your work. Being selected for Canopy Spotlight twice is exceptional, and your Module 03 Climate Advocacy & Digital Innovation work shows the depth, clarity and commitment you continue to bring to this programme. We are deeply proud of you and grateful for the standard you are setting. Your work reflects the spirit of She Leads, thoughtful learning, applied climate leadership and consistent excellence. Please join us in celebrating Priscilla for this remarkable second Spotlight recognition. 💚',
  visible=true
where recognition_key='priscilla-double-spotlight-2026';

update public.canopy_notifications
set
  title='Priscilla, twice in Canopy Spotlight. WOMATE sees you 💚',
  body='Priscilla, congratulations on becoming the first learner in this cohort to be selected for Canopy Spotlight twice. WOMATE sees your consistency, thoughtfulness and leadership, and we deeply appreciate the care you bring to your work. Your second Spotlight has now made you specially eligible for Talent Discovery. Please keep your professional profile complete and current. A third Spotlight would place you in a very rare circle we will be watching closely as we shape a special She Leads 2026 recognition and representation opportunity. We have also added a celebration song to your Spotlight recognition, this moment is yours. 💚',
  link='/canopy#spotlight',
  type='special_recognition',
  read_at=null,
  created_at=now()
where fingerprint='special-recognition:priscilla-double-spotlight-2026';

do $$
declare
  public_count integer;
  private_count integer;
begin
  select count(*) into public_count
  from public.canopy_special_recognitions
  where recognition_key='priscilla-double-spotlight-2026'
    and body like '%Your work reflects the spirit of She Leads%';

  select count(*) into private_count
  from public.canopy_notifications
  where fingerprint='special-recognition:priscilla-double-spotlight-2026'
    and body like '%specially eligible for Talent Discovery%'
    and body like '%A third Spotlight would place you in a very rare circle%';

  if public_count<>1 then
    raise exception 'Priscilla public recognition reconciliation failed, expected 1 row, found %',public_count;
  end if;

  if private_count<>1 then
    raise exception 'Priscilla private notification reconciliation failed, expected 1 row, found %',private_count;
  end if;
end;
$$;

commit;
