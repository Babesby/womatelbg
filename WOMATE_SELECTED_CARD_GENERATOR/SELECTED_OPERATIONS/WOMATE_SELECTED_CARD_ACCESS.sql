begin;

create extension if not exists pgcrypto;

create table if not exists
public.womate_selected_card_invites(
  id uuid primary key
    default gen_random_uuid(),

  email text not null,

  full_name text not null,

  programme_slug text not null
    default 'she-leads-2026',

  programme_name text not null
    default
    'She Leads Climate Mentorship Programme',

  cohort_label text not null
    default 'Cohort 2 · 2026',

  code_hash text not null,

  code_hint text,

  status text not null
    default 'active'
    check(
      status in(
        'active',
        'revoked',
        'expired'
      )
    ),

  expires_at timestamptz,

  created_by uuid,

  created_at timestamptz
    not null
    default now(),

  last_verified_at timestamptz
);

create unique index if not exists
womate_selected_card_invites_active_idx
on public.womate_selected_card_invites(
  lower(email),
  programme_slug
)
where status='active';

alter table
public.womate_selected_card_invites
enable row level security;


create or replace function
public.womate_create_selected_card_invite(
  p_email text,
  p_full_name text,
  p_programme_slug text
    default 'she-leads-2026',
  p_programme_name text
    default
    'She Leads Climate Mentorship Programme',
  p_cohort_label text
    default 'Cohort 2 · 2026',
  p_expires_at timestamptz
    default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_code text;
  v_id uuid;
begin

  if auth.uid() is null
     or not public.canopy_is_womate_admin(
       auth.uid()
     )
  then
    raise exception
      'Admin access required.';
  end if;

  if trim(coalesce(p_email,''))=''
     or trim(coalesce(p_full_name,''))=''
  then
    raise exception
      'Email and full name are required.';
  end if;

  v_code :=
    upper(
      substr(
        encode(
          gen_random_bytes(8),
          'hex'
        ),
        1,
        10
      )
    );

  update
    public.womate_selected_card_invites
  set status='revoked'
  where
    lower(email)=
      lower(trim(p_email))
    and programme_slug=
      p_programme_slug
    and status='active';

  insert into
    public.womate_selected_card_invites(
      email,
      full_name,
      programme_slug,
      programme_name,
      cohort_label,
      code_hash,
      code_hint,
      expires_at,
      created_by
    )
  values(
    lower(trim(p_email)),
    trim(p_full_name),
    p_programme_slug,
    p_programme_name,
    p_cohort_label,
    encode(
      digest(v_code,'sha256'),
      'hex'
    ),
    right(v_code,4),
    p_expires_at,
    auth.uid()
  )
  returning id into v_id;

  return jsonb_build_object(
    'id',v_id,
    'email',lower(trim(p_email)),
    'full_name',trim(p_full_name),
    'programme_name',p_programme_name,
    'cohort_label',p_cohort_label,
    'selection_code',v_code,
    'code_hint',right(v_code,4),
    'expires_at',p_expires_at
  );

end;
$$;


create or replace function
public.womate_verify_selected_card(
  p_email text,
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  r
    public.womate_selected_card_invites%rowtype;
begin

  select *
  into r
  from
    public.womate_selected_card_invites i
  where
    lower(i.email)=
      lower(trim(p_email))
    and i.status='active'
    and i.code_hash=
      encode(
        digest(
          upper(trim(p_code)),
          'sha256'
        ),
        'hex'
      )
  order by i.created_at desc
  limit 1;

  if not found then
    return jsonb_build_object(
      'verified',
      false
    );
  end if;

  if r.expires_at is not null
     and r.expires_at<now()
  then

    update
      public.womate_selected_card_invites
    set status='expired'
    where id=r.id;

    return jsonb_build_object(
      'verified',
      false
    );

  end if;

  update
    public.womate_selected_card_invites
  set last_verified_at=now()
  where id=r.id;

  return jsonb_build_object(
    'verified',true,
    'fullName',r.full_name,
    'programmeName',r.programme_name,
    'cohortLabel',r.cohort_label,
    'programmeSlug',r.programme_slug
  );

end;
$$;


create or replace function
public.womate_revoke_selected_card_invite(
  p_id uuid
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin

  if auth.uid() is null
     or not public.canopy_is_womate_admin(
       auth.uid()
     )
  then
    raise exception
      'Admin access required.';
  end if;

  update
    public.womate_selected_card_invites
  set status='revoked'
  where id=p_id;

end;
$$;


revoke all
on function
public.womate_verify_selected_card(
  text,
  text
)
from public;

grant execute
on function
public.womate_verify_selected_card(
  text,
  text
)
to anon,authenticated;


revoke all
on function
public.womate_create_selected_card_invite(
  text,
  text,
  text,
  text,
  text,
  timestamptz
)
from public;

grant execute
on function
public.womate_create_selected_card_invite(
  text,
  text,
  text,
  text,
  text,
  timestamptz
)
to authenticated;


revoke all
on function
public.womate_revoke_selected_card_invite(
  uuid
)
from public;

grant execute
on function
public.womate_revoke_selected_card_invite(
  uuid
)
to authenticated;

commit;
