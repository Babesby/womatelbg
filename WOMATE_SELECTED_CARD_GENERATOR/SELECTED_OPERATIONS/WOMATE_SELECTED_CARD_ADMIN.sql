begin;

create or replace function
public.womate_list_selected_card_invites()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_result jsonb;
begin

  if auth.uid() is null
     or not public.canopy_is_womate_admin(auth.uid())
  then
    raise exception 'Admin access required.';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',i.id,
        'email',i.email,
        'full_name',i.full_name,
        'programme_slug',i.programme_slug,
        'programme_name',i.programme_name,
        'cohort_label',i.cohort_label,
        'code_hint',i.code_hint,
        'status',i.status,
        'expires_at',i.expires_at,
        'created_at',i.created_at,
        'last_verified_at',i.last_verified_at
      )
      order by i.created_at desc
    ),
    '[]'::jsonb
  )
  into v_result
  from public.womate_selected_card_invites i;

  return v_result;
end;
$$;

revoke all
on function public.womate_list_selected_card_invites()
from public;

grant execute
on function public.womate_list_selected_card_invites()
to authenticated;

commit;
