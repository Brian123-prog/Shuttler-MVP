-- Milestone 07b: personal QR codes for drivers (issued by the university administrator) and profile pictures.

-- Profile pictures (private storage bucket; access decided by can_view_avatar)
alter table public.profiles add column avatar_path text check (avatar_path is null or avatar_path like (id::text || '/%'));
grant update (avatar_path) on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create function public.can_view_avatar(p_path text) returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare v_owner uuid;
begin
  begin
    v_owner := ((string_to_array(p_path, '/'))[1])::uuid;
  exception when others then
    return false;
  end;
  if v_owner = (select auth.uid()) or public.is_platform_admin() then
    return true;
  end if;
  return
    -- administrators see the photos of the people in their university
    exists (select 1 from public.university_memberships m where m.profile_id = v_owner and public.is_university_admin(m.university_id))
    -- approved members see the photos of approved drivers at their university (to recognise their driver)
    or exists (
      select 1 from public.university_memberships d
        join public.university_memberships me on me.university_id = d.university_id
       where d.profile_id = v_owner and d.role = 'DRIVER' and d.verification_status = 'APPROVED'
         and me.profile_id = (select auth.uid()) and me.verification_status = 'APPROVED'
    )
    -- a driver sees the photo of a student who made a claim against them
    or exists (
      select 1 from public.change_claims c join public.drivers dr on dr.id = c.driver_id
       where c.student_id = v_owner and dr.profile_id = (select auth.uid())
    );
end;
$$;
revoke all on function public.can_view_avatar(text) from public, anon;
grant execute on function public.can_view_avatar(text) to authenticated;

create policy "avatars readable by those allowed" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and public.can_view_avatar(name));
create policy "avatars insert own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (string_to_array(name, '/'))[1] = (select auth.uid())::text);
create policy "avatars update own folder" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (string_to_array(name, '/'))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (string_to_array(name, '/'))[1] = (select auth.uid())::text);
create policy "avatars delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (string_to_array(name, '/'))[1] = (select auth.uid())::text);

-- Driver QR codes: one active personal code per driver, issued by the university administrator.
create table public.driver_qr_codes (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null,
  driver_id uuid not null,
  token text not null unique check (char_length(token) = 32),
  short_code text not null unique check (short_code ~ '^[A-Z0-9]{8}$'),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'REVOKED')),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles (id) on delete set null,
  check ((status = 'REVOKED') = (revoked_at is not null)),
  foreign key (driver_id, university_id) references public.drivers (id, university_id) on delete restrict
);
create unique index one_active_qr_per_driver on public.driver_qr_codes (driver_id) where status = 'ACTIVE';
create trigger driver_qr_codes_audit after insert or update on public.driver_qr_codes for each row execute function public.audit_change();

alter table public.driver_qr_codes enable row level security;
revoke all on public.driver_qr_codes from anon, authenticated;
grant select, insert, update on public.driver_qr_codes to authenticated;
create policy "read driver qr codes" on public.driver_qr_codes for select to authenticated
  using (
    public.is_platform_admin() or public.is_university_admin(university_id)
    or exists (select 1 from public.drivers d where d.id = driver_qr_codes.driver_id and d.profile_id = (select auth.uid()))
  );
create policy "admins insert driver qr codes" on public.driver_qr_codes for insert to authenticated with check (public.is_university_admin(university_id));
create policy "admins update driver qr codes" on public.driver_qr_codes for update to authenticated
  using (public.is_university_admin(university_id)) with check (public.is_university_admin(university_id));

create function public.replace_driver_qr(p_driver_id uuid) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare v_uni uuid; v_new uuid; v_code text;
begin
  select d.university_id into v_uni
    from public.drivers d join public.university_memberships m on m.id = d.membership_id
   where d.id = p_driver_id and m.verification_status = 'APPROVED';
  if not found then
    raise exception 'Only approved drivers can have a QR code' using errcode = 'P0002';
  end if;
  update public.driver_qr_codes set status = 'REVOKED', revoked_at = now(), revoked_by = (select auth.uid())
   where driver_id = p_driver_id and status = 'ACTIVE';
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.qr_codes where short_code = v_code)
          and not exists (select 1 from public.driver_qr_codes where short_code = v_code);
  end loop;
  insert into public.driver_qr_codes (university_id, driver_id, token, short_code)
  values (v_uni, p_driver_id, replace(gen_random_uuid()::text, '-', ''), v_code)
  returning id into v_new;
  return v_new;
end;
$$;

create function public.revoke_driver_qr(p_driver_id uuid) returns void
language sql security invoker set search_path = ''
as $$ update public.driver_qr_codes set status = 'REVOKED', revoked_at = now(), revoked_by = (select auth.uid())
       where driver_id = p_driver_id and status = 'ACTIVE' $$;

create function public.generate_missing_driver_qrs(p_university_id uuid) returns integer
language plpgsql security invoker set search_path = ''
as $$
declare r record; v_count integer := 0;
begin
  for r in
    select d.id from public.drivers d join public.university_memberships m on m.id = d.membership_id
     where d.university_id = p_university_id and m.verification_status = 'APPROVED'
       and not exists (select 1 from public.driver_qr_codes q where q.driver_id = d.id and q.status = 'ACTIVE')
  loop
    perform public.replace_driver_qr(r.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- A driver who stops being approved loses their personal QR code at once.
create function public.revoke_qr_for_unapproved() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.driver_qr_codes set status = 'REVOKED', revoked_at = now()
   where status = 'ACTIVE' and driver_id in (select id from public.drivers where membership_id = new.id);
  return null;
end;
$$;
create trigger memberships_revoke_driver_qr after update of verification_status on public.university_memberships
  for each row when (old.verification_status = 'APPROVED' and new.verification_status <> 'APPROVED' and new.role = 'DRIVER')
  execute function public.revoke_qr_for_unapproved();

revoke all on function public.revoke_qr_for_unapproved() from public, anon, authenticated;
revoke all on function public.replace_driver_qr(uuid) from public, anon;
revoke all on function public.revoke_driver_qr(uuid) from public, anon;
revoke all on function public.generate_missing_driver_qrs(uuid) from public, anon;
grant execute on function public.replace_driver_qr(uuid) to authenticated;
grant execute on function public.revoke_driver_qr(uuid) to authenticated;
grant execute on function public.generate_missing_driver_qrs(uuid) to authenticated;

-- One lookup for both kinds of code. A driver code points at the driver's current shuttle.
create type public.qr_target as (university_id uuid, shuttle_id uuid, driver_id uuid, kind text);

create function public.find_qr_target(p_input text) returns public.qr_target
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_in text := regexp_replace(trim(coalesce(p_input, '')), '^.*[/=]', '');
  q public.qr_codes; dq public.driver_qr_codes; v_ship uuid; t public.qr_target;
begin
  if char_length(v_in) not between 6 and 64 then
    return t;
  end if;
  select * into q from public.qr_codes where status = 'ACTIVE' and (token = lower(v_in) or short_code = upper(v_in));
  if found then
    t := row(q.university_id, q.shuttle_id, null::uuid, 'SHUTTLE'::text);
    return t;
  end if;
  select * into dq from public.driver_qr_codes where status = 'ACTIVE' and (token = lower(v_in) or short_code = upper(v_in));
  if found then
    select a.shuttle_id into v_ship from public.shuttle_assignments a where a.driver_id = dq.driver_id and a.ended_at is null limit 1;
    t := row(dq.university_id, v_ship, dq.driver_id, 'DRIVER'::text);
    return t;
  end if;
  return t;
end;
$$;
revoke all on function public.find_qr_target(text) from public, anon, authenticated;

create or replace function public.resolve_qr(p_input text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  t public.qr_target; v_s public.shuttles; v_v public.vehicles; v_r public.routes; v_fare public.fares;
  v_driver text; v_avatar text; v_uni text; v_driver_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  t := public.find_qr_target(p_input);
  if t.university_id is null or not (public.is_approved_member(t.university_id) or public.is_university_admin(t.university_id)) then
    raise exception 'Invalid code' using errcode = 'P0002';
  end if;
  select name into v_uni from public.universities where id = t.university_id;
  if t.shuttle_id is not null then
    select * into v_s from public.shuttles where id = t.shuttle_id;
    select * into v_v from public.vehicles where id = v_s.vehicle_id;
    select * into v_r from public.routes where id = v_s.route_id;
    select * into v_fare from public.applicable_fare(t.university_id, v_s.route_id, now());
    select d.id into v_driver_id
      from public.shuttle_assignments a
      join public.drivers d on d.id = a.driver_id
      join public.university_memberships m on m.id = d.membership_id and m.verification_status = 'APPROVED'
     where a.shuttle_id = v_s.id and a.ended_at is null limit 1;
  else
    v_driver_id := t.driver_id;
  end if;
  if v_driver_id is not null then
    select p.full_name, p.avatar_path into v_driver, v_avatar
      from public.drivers d join public.profiles p on p.id = d.profile_id where d.id = v_driver_id;
  end if;
  return jsonb_build_object(
    'via', t.kind, 'shuttle_id', v_s.id, 'shuttle_code', v_s.code,
    'in_service', coalesce(v_s.status = 'ACTIVE' and v_v.status = 'ACTIVE', false),
    'plate', v_v.plate_number, 'route_code', v_r.code, 'route_name', v_r.name,
    'origin', v_r.origin, 'destination', v_r.destination,
    'driver_name', v_driver, 'driver_avatar_path', v_avatar,
    'university_id', t.university_id, 'university_name', v_uni,
    'fare_id', v_fare.id, 'fare_kobo', v_fare.amount_kobo
  );
end;
$$;

create or replace function public.create_payment_intent(p_input text, p_idempotency_key uuid) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  t public.qr_target; v_s public.shuttles; v_v public.vehicles; v_fare public.fares;
  v_driver uuid; v_existing uuid; v_new uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  select id into v_existing from public.payment_intents where student_id = v_uid and idempotency_key = p_idempotency_key;
  if found then
    return v_existing;
  end if;
  t := public.find_qr_target(p_input);
  if t.university_id is null or not exists (
    select 1 from public.university_memberships m
     where m.profile_id = v_uid and m.university_id = t.university_id and m.role = 'STUDENT' and m.verification_status = 'APPROVED'
  ) then
    raise exception 'Invalid code' using errcode = 'P0002';
  end if;
  if t.shuttle_id is null then
    raise exception 'No shuttle is assigned to this driver';
  end if;
  select * into v_s from public.shuttles where id = t.shuttle_id;
  select * into v_v from public.vehicles where id = v_s.vehicle_id;
  if v_s.status <> 'ACTIVE' or v_v.status <> 'ACTIVE' then
    raise exception 'This shuttle is not in service';
  end if;
  select d.id into v_driver
    from public.shuttle_assignments a
    join public.drivers d on d.id = a.driver_id
    join public.university_memberships m on m.id = d.membership_id and m.verification_status = 'APPROVED'
   where a.shuttle_id = v_s.id and a.ended_at is null limit 1;
  if v_driver is null then
    raise exception 'No driver is assigned to this shuttle';
  end if;
  select * into v_fare from public.applicable_fare(t.university_id, v_s.route_id, now());
  if v_fare.id is null then
    raise exception 'No fare has been set for this route';
  end if;
  select id into v_existing from public.payment_intents
   where student_id = v_uid and shuttle_id = v_s.id and status in ('INITIATED', 'PENDING') and expires_at > now()
   order by created_at desc limit 1;
  if found then
    return v_existing;
  end if;
  insert into public.payment_intents (university_id, student_id, shuttle_id, route_id, driver_id, fare_id, amount_kobo, idempotency_key)
  values (t.university_id, v_uid, v_s.id, v_s.route_id, v_driver, v_fare.id, v_fare.amount_kobo, p_idempotency_key)
  returning id into v_new;
  return v_new;
end;
$$;

create or replace function public.create_change_claim(p_input text, p_cash_kobo integer, p_idempotency_key uuid) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  t public.qr_target; v_s public.shuttles; v_v public.vehicles; v_fare public.fares;
  v_driver uuid; v_existing uuid; v_new uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  select id into v_existing from public.change_claims where student_id = v_uid and idempotency_key = p_idempotency_key;
  if found then
    return v_existing;
  end if;
  t := public.find_qr_target(p_input);
  if t.university_id is null or not exists (
    select 1 from public.university_memberships m
     where m.profile_id = v_uid and m.university_id = t.university_id and m.role = 'STUDENT' and m.verification_status = 'APPROVED'
  ) then
    raise exception 'Invalid code' using errcode = 'P0002';
  end if;
  if t.shuttle_id is null then
    raise exception 'No shuttle is assigned to this driver';
  end if;
  select * into v_s from public.shuttles where id = t.shuttle_id;
  select * into v_v from public.vehicles where id = v_s.vehicle_id;
  if v_s.status <> 'ACTIVE' or v_v.status <> 'ACTIVE' then
    raise exception 'This shuttle is not in service';
  end if;
  select d.id into v_driver
    from public.shuttle_assignments a
    join public.drivers d on d.id = a.driver_id
    join public.university_memberships m on m.id = d.membership_id and m.verification_status = 'APPROVED'
   where a.shuttle_id = v_s.id and a.ended_at is null limit 1;
  if v_driver is null then
    raise exception 'No driver is assigned to this shuttle';
  end if;
  select * into v_fare from public.applicable_fare(t.university_id, v_s.route_id, now());
  if v_fare.id is null then
    raise exception 'No fare has been set for this route';
  end if;
  if p_cash_kobo is null or p_cash_kobo <= v_fare.amount_kobo then
    raise exception 'The cash given must be more than the fare';
  end if;
  if p_cash_kobo > 10000000 then
    raise exception 'That amount is too large';
  end if;
  if (select count(*) from public.change_claims where student_id = v_uid and status = 'DRIVER_PENDING') >= 3 then
    raise exception 'You already have claims waiting for a driver';
  end if;
  insert into public.change_claims (university_id, student_id, shuttle_id, route_id, driver_id, fare_id, fare_kobo, cash_kobo, change_kobo, idempotency_key)
  values (t.university_id, v_uid, v_s.id, v_s.route_id, v_driver, v_fare.id, v_fare.amount_kobo, p_cash_kobo, p_cash_kobo - v_fare.amount_kobo, p_idempotency_key)
  returning id into v_new;
  return v_new;
end;
$$;
