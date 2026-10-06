-- Milestone 01: role model, registration, verification RPC, RLS.
-- Verification status lives on university_memberships (single source of truth).

create type public.member_role as enum ('STUDENT', 'DRIVER');

create table public.university_memberships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  university_id uuid not null references public.universities (id) on delete restrict,
  role public.member_role not null,
  verification_status public.verification_status not null default 'PENDING',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, university_id, role),
  unique (id, university_id, profile_id)
);
create index memberships_university_status_idx on public.university_memberships (university_id, role, verification_status);
create index memberships_profile_idx on public.university_memberships (profile_id);
create trigger memberships_updated_at before update on public.university_memberships
  for each row execute function public.set_updated_at();

create table public.students (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null unique,
  profile_id uuid not null,
  university_id uuid not null,
  student_number text not null check (char_length(student_number) between 2 and 40),
  created_at timestamptz not null default now(),
  foreign key (membership_id, university_id, profile_id)
    references public.university_memberships (id, university_id, profile_id) on delete cascade,
  unique (university_id, student_number)
);
create index students_profile_idx on public.students (profile_id);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null unique,
  profile_id uuid not null,
  university_id uuid not null,
  license_number text not null check (char_length(license_number) between 3 and 40),
  vehicle_plate text check (vehicle_plate is null or char_length(vehicle_plate) <= 20),
  vehicle_description text check (vehicle_description is null or char_length(vehicle_description) <= 200),
  created_at timestamptz not null default now(),
  foreign key (membership_id, university_id, profile_id)
    references public.university_memberships (id, university_id, profile_id) on delete cascade,
  unique (university_id, license_number)
);
create index drivers_profile_idx on public.drivers (profile_id);

create table public.driver_verifications (
  id bigint generated always as identity primary key,
  driver_id uuid not null references public.drivers (id) on delete cascade,
  university_id uuid not null references public.universities (id) on delete restrict,
  from_status public.verification_status,
  to_status public.verification_status not null,
  reviewer_id uuid references public.profiles (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index driver_verifications_driver_idx on public.driver_verifications (driver_id, created_at desc);

create table public.university_admins (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  university_id uuid not null references public.universities (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, university_id)
);
create index university_admins_university_idx on public.university_admins (university_id);

create table public.platform_admins (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Authorization helpers (security definer so policies do not recurse).
create function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.platform_admins where profile_id = (select auth.uid())) $$;

create function public.is_university_admin(target_university uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (
  select 1 from public.university_admins
  where profile_id = (select auth.uid()) and university_id = target_university
) $$;

revoke all on function public.is_platform_admin() from public, anon;
revoke all on function public.is_university_admin(uuid) from public, anon;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_university_admin(uuid) to authenticated;

-- Registration: runs inside the auth.users insert, so account + profile + membership + role row are atomic.
-- Only STUDENT and DRIVER can be requested, always as PENDING. Admin roles are never granted from metadata.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name text := nullif(trim(meta ->> 'full_name'), '');
  v_role text := meta ->> 'registration_role';
  v_uni uuid;
  v_membership uuid;
  v_driver uuid;
begin
  if v_name is null then
    v_name := nullif(split_part(coalesce(new.email, ''), '@', 1), '');
  end if;
  if v_name is null or char_length(v_name) < 2 then
    v_name := 'Shuttler user';
  end if;

  insert into public.profiles (id, full_name, phone)
  values (new.id, left(v_name, 200), nullif(trim(meta ->> 'phone'), ''));

  if v_role is null then
    return new; -- accounts created without a registration role (for example administrators)
  end if;
  if v_role not in ('STUDENT', 'DRIVER') then
    raise exception 'Invalid registration role';
  end if;

  begin
    v_uni := (meta ->> 'university_id')::uuid;
  exception when invalid_text_representation then
    raise exception 'Invalid university';
  end;
  if not exists (select 1 from public.universities where id = v_uni and status = 'ACTIVE') then
    raise exception 'University is not available for registration';
  end if;

  insert into public.university_memberships (profile_id, university_id, role)
  values (new.id, v_uni, v_role::public.member_role)
  returning id into v_membership;

  if v_role = 'STUDENT' then
    insert into public.students (membership_id, profile_id, university_id, student_number)
    values (v_membership, new.id, v_uni, nullif(trim(meta ->> 'student_number'), ''));
  else
    insert into public.drivers (membership_id, profile_id, university_id, license_number, vehicle_plate, vehicle_description)
    values (
      v_membership, new.id, v_uni,
      nullif(trim(meta ->> 'license_number'), ''),
      nullif(trim(meta ->> 'vehicle_plate'), ''),
      nullif(trim(meta ->> 'vehicle_description'), '')
    )
    returning id into v_driver;
    insert into public.driver_verifications (driver_id, university_id, from_status, to_status)
    values (v_driver, v_uni, null, 'PENDING');
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Verification decisions. Only a university administrator of that university may call this,
-- and never for their own membership.
create function public.review_membership(
  p_membership_id uuid,
  p_decision public.verification_status,
  p_note text default null
) returns public.university_memberships
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  m public.university_memberships;
  old_status public.verification_status;
  allowed boolean;
begin
  if actor is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into m from public.university_memberships where id = p_membership_id for update;
  if not found then
    raise exception 'Membership not found' using errcode = 'P0002';
  end if;
  if not public.is_university_admin(m.university_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if m.profile_id = actor then
    raise exception 'You cannot review your own verification' using errcode = '42501';
  end if;

  old_status := m.verification_status;
  allowed := case old_status
    when 'PENDING' then p_decision in ('UNDER_REVIEW', 'APPROVED', 'REJECTED')
    when 'UNDER_REVIEW' then p_decision in ('APPROVED', 'REJECTED')
    when 'APPROVED' then p_decision = 'SUSPENDED'
    when 'SUSPENDED' then p_decision = 'APPROVED'
    when 'REJECTED' then p_decision = 'UNDER_REVIEW'
    else false
  end;
  if not allowed then
    raise exception 'Invalid status change from % to %', old_status, p_decision;
  end if;
  if p_decision in ('REJECTED', 'SUSPENDED') and nullif(trim(coalesce(p_note, '')), '') is null then
    raise exception 'A note is required for this decision';
  end if;

  update public.university_memberships
     set verification_status = p_decision,
         reviewed_by = actor,
         reviewed_at = now(),
         review_note = nullif(trim(coalesce(p_note, '')), '')
   where id = p_membership_id
   returning * into m;

  if m.role = 'DRIVER' then
    insert into public.driver_verifications (driver_id, university_id, from_status, to_status, reviewer_id, note)
    select d.id, m.university_id, old_status, p_decision, actor, m.review_note
      from public.drivers d where d.membership_id = m.id;
  end if;

  insert into public.audit_logs (actor_id, university_id, action, entity_type, entity_id, metadata)
  values (actor, m.university_id, 'MEMBERSHIP_REVIEWED', 'university_membership', m.id::text,
          jsonb_build_object('role', m.role, 'from', old_status, 'to', p_decision));

  return m;
end;
$$;

revoke all on function public.review_membership(uuid, public.verification_status, text) from public, anon;
grant execute on function public.review_membership(uuid, public.verification_status, text) to authenticated;

-- Table privileges: clients never write these tables directly.
revoke insert, update, delete on
  public.university_memberships, public.students, public.drivers, public.driver_verifications,
  public.university_admins, public.platform_admins, public.audit_logs
  from anon, authenticated;
revoke all on public.university_memberships, public.students, public.drivers, public.driver_verifications,
  public.university_admins, public.platform_admins from anon;

-- Profiles: users may edit only name and phone, never account_status.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
create policy "users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

alter table public.university_memberships enable row level security;
alter table public.students enable row level security;
alter table public.drivers enable row level security;
alter table public.driver_verifications enable row level security;
alter table public.university_admins enable row level security;
alter table public.platform_admins enable row level security;

create policy "members read own membership" on public.university_memberships for select to authenticated
  using (profile_id = (select auth.uid()));
create policy "university admins read their memberships" on public.university_memberships for select to authenticated
  using (public.is_university_admin(university_id));
create policy "platform admins read memberships" on public.university_memberships for select to authenticated
  using (public.is_platform_admin());

create policy "students read own row" on public.students for select to authenticated
  using (profile_id = (select auth.uid()));
create policy "university admins read their students" on public.students for select to authenticated
  using (public.is_university_admin(university_id));
create policy "platform admins read students" on public.students for select to authenticated
  using (public.is_platform_admin());

create policy "drivers read own row" on public.drivers for select to authenticated
  using (profile_id = (select auth.uid()));
create policy "university admins read their drivers" on public.drivers for select to authenticated
  using (public.is_university_admin(university_id));
create policy "platform admins read drivers" on public.drivers for select to authenticated
  using (public.is_platform_admin());

create policy "drivers read own verification history" on public.driver_verifications for select to authenticated
  using (exists (select 1 from public.drivers d where d.id = driver_id and d.profile_id = (select auth.uid())));
create policy "university admins read verification history" on public.driver_verifications for select to authenticated
  using (public.is_university_admin(university_id));
create policy "platform admins read verification history" on public.driver_verifications for select to authenticated
  using (public.is_platform_admin());

create policy "admins read own admin rows" on public.university_admins for select to authenticated
  using (profile_id = (select auth.uid()));
create policy "platform admins read university admins" on public.university_admins for select to authenticated
  using (public.is_platform_admin());
create policy "platform admins read own row" on public.platform_admins for select to authenticated
  using (profile_id = (select auth.uid()));

create policy "university admins read member profiles" on public.profiles for select to authenticated
  using (exists (
    select 1 from public.university_memberships m
    where m.profile_id = profiles.id and public.is_university_admin(m.university_id)
  ));
create policy "platform admins read profiles" on public.profiles for select to authenticated
  using (public.is_platform_admin());

create policy "members and admins read their university" on public.universities for select to authenticated
  using (
    public.is_platform_admin()
    or public.is_university_admin(id)
    or exists (select 1 from public.university_memberships m where m.university_id = universities.id and m.profile_id = (select auth.uid()))
  );

create policy "university admins read their audit logs" on public.audit_logs for select to authenticated
  using (university_id is not null and public.is_university_admin(university_id));
create policy "platform admins read audit logs" on public.audit_logs for select to authenticated
  using (public.is_platform_admin());
