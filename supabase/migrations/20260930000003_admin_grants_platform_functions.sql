-- Milestone 02: admin grants by verified email, platform university management.

create table public.admin_grants (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email) and char_length(email) <= 254),
  role text not null check (role in ('PLATFORM_ADMIN', 'UNIVERSITY_ADMIN')),
  university_id uuid references public.universities (id) on delete cascade,
  granted_by uuid references public.profiles (id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((role = 'UNIVERSITY_ADMIN') = (university_id is not null)),
  unique nulls not distinct (email, role, university_id)
);
alter table public.admin_grants enable row level security;
revoke all on public.admin_grants from anon, authenticated;
grant select on public.admin_grants to authenticated;
create policy "platform admins read admin grants" on public.admin_grants for select to authenticated
  using (public.is_platform_admin());

-- Internal: applies grants for a user whose email is verified. Not callable by clients.
create function public.apply_admin_grants(p_user uuid) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_email text;
  v_confirmed timestamptz;
  v_count integer;
begin
  select lower(email), email_confirmed_at into v_email, v_confirmed from auth.users where id = p_user;
  if v_email is null or v_confirmed is null then
    return 0;
  end if;

  insert into public.platform_admins (profile_id)
  select p_user where exists (
    select 1 from public.admin_grants g where g.email = v_email and g.role = 'PLATFORM_ADMIN'
  ) on conflict do nothing;

  insert into public.university_admins (profile_id, university_id)
  select p_user, g.university_id from public.admin_grants g
  where g.email = v_email and g.role = 'UNIVERSITY_ADMIN'
  on conflict do nothing;

  update public.admin_grants set claimed_at = now() where email = v_email and claimed_at is null;
  get diagnostics v_count = row_count;

  if v_count > 0 then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (p_user, 'ADMIN_GRANTS_APPLIED', 'profile', p_user::text, jsonb_build_object('grants', v_count));
  end if;
  return v_count;
end;
$$;
revoke all on function public.apply_admin_grants(uuid) from public, anon, authenticated;

-- Called by the signed-in user at login; only affects their own verified email.
create function public.claim_admin_grants() returns integer
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  return public.apply_admin_grants((select auth.uid()));
end;
$$;
revoke all on function public.claim_admin_grants() from public, anon;
grant execute on function public.claim_admin_grants() to authenticated;

create function public.platform_save_university(
  p_id uuid, p_name text, p_short_name text, p_slug text, p_status public.university_status
) returns public.universities
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  u public.universities;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_id is null then
    insert into public.universities (name, short_name, slug, status)
    values (trim(p_name), nullif(trim(coalesce(p_short_name, '')), ''), lower(trim(p_slug)), p_status)
    returning * into u;
    insert into public.audit_logs (actor_id, university_id, action, entity_type, entity_id, metadata)
    values (actor, u.id, 'UNIVERSITY_CREATED', 'university', u.id::text, jsonb_build_object('status', u.status));
  else
    update public.universities
       set name = trim(p_name), short_name = nullif(trim(coalesce(p_short_name, '')), ''),
           slug = lower(trim(p_slug)), status = p_status
     where id = p_id
     returning * into u;
    if not found then
      raise exception 'University not found' using errcode = 'P0002';
    end if;
    insert into public.audit_logs (actor_id, university_id, action, entity_type, entity_id, metadata)
    values (actor, u.id, 'UNIVERSITY_UPDATED', 'university', u.id::text, jsonb_build_object('status', u.status));
  end if;
  return u;
end;
$$;
revoke all on function public.platform_save_university(uuid, text, text, text, public.university_status) from public, anon;
grant execute on function public.platform_save_university(uuid, text, text, text, public.university_status) to authenticated;

-- Returns 'ASSIGNED' when the person already has a verified account, otherwise 'INVITED'.
create function public.platform_assign_university_admin(p_university_id uuid, p_email text) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  v_email text := lower(trim(coalesce(p_email, '')));
  v_user uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then
    raise exception 'Enter a valid email address';
  end if;
  if not exists (select 1 from public.universities where id = p_university_id) then
    raise exception 'University not found' using errcode = 'P0002';
  end if;

  insert into public.admin_grants (email, role, university_id, granted_by)
  values (v_email, 'UNIVERSITY_ADMIN', p_university_id, actor)
  on conflict do nothing;

  insert into public.audit_logs (actor_id, university_id, action, entity_type, entity_id, metadata)
  values (actor, p_university_id, 'UNIVERSITY_ADMIN_GRANTED', 'university', p_university_id::text, jsonb_build_object('email', v_email));

  select id into v_user from auth.users where lower(email) = v_email and email_confirmed_at is not null limit 1;
  if v_user is not null then
    perform public.apply_admin_grants(v_user);
    return 'ASSIGNED';
  end if;
  return 'INVITED';
end;
$$;
revoke all on function public.platform_assign_university_admin(uuid, text) from public, anon;
grant execute on function public.platform_assign_university_admin(uuid, text) to authenticated;
