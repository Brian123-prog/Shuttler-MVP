-- Milestone 04: vehicles, shuttles, driver assignments, QR codes.
alter table public.drivers add constraint drivers_id_university_key unique (id, university_id);

create or replace function public.audit_change() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  j jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
begin
  insert into public.audit_logs (actor_id, university_id, action, entity_type, entity_id, metadata)
  values (
    (select auth.uid()),
    (j ->> 'university_id')::uuid,
    upper(tg_table_name) || '_' || case tg_op when 'INSERT' then 'CREATED' when 'UPDATE' then 'UPDATED' else 'DELETED' end,
    tg_table_name,
    coalesce(j ->> 'id', nullif(concat_ws(':', j ->> 'route_id', j ->> 'stop_id'), ''), j ->> 'university_id'),
    jsonb_build_object('label', coalesce(j ->> 'name', j ->> 'code', j ->> 'plate_number', left(j ->> 'departure_time', 5)))
  );
  return null;
end;
$$;

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities (id) on delete restrict,
  plate_number text not null check (plate_number ~ '^[A-Z0-9 -]{3,15}$'),
  model text check (model is null or char_length(model) <= 100),
  capacity integer not null check (capacity between 1 and 100),
  status public.transport_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (university_id, plate_number),
  unique (id, university_id)
);

create table public.shuttles (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null,
  code text not null check (code ~ '^[A-Z0-9-]{1,12}$'),
  vehicle_id uuid not null,
  route_id uuid,
  status public.transport_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (vehicle_id, university_id) references public.vehicles (id, university_id) on delete restrict,
  foreign key (route_id, university_id) references public.routes (id, university_id),
  unique (university_id, code),
  unique (vehicle_id),
  unique (id, university_id)
);

create table public.shuttle_assignments (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null,
  shuttle_id uuid not null,
  driver_id uuid not null,
  assigned_by uuid default auth.uid() references public.profiles (id) on delete set null,
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  check (ended_at is null or ended_at >= assigned_at),
  foreign key (shuttle_id, university_id) references public.shuttles (id, university_id) on delete restrict,
  foreign key (driver_id, university_id) references public.drivers (id, university_id) on delete restrict
);
create unique index one_current_driver_per_shuttle on public.shuttle_assignments (shuttle_id) where ended_at is null;
create unique index one_current_shuttle_per_driver on public.shuttle_assignments (driver_id) where ended_at is null;

create table public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null,
  shuttle_id uuid not null,
  token text not null unique check (char_length(token) = 32),
  short_code text not null unique check (short_code ~ '^[A-Z0-9]{8}$'),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'REVOKED')),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles (id) on delete set null,
  check ((status = 'REVOKED') = (revoked_at is not null)),
  foreign key (shuttle_id, university_id) references public.shuttles (id, university_id) on delete restrict
);
create unique index one_active_qr_per_shuttle on public.qr_codes (shuttle_id) where status = 'ACTIVE';

create trigger vehicles_updated_at before update on public.vehicles for each row execute function public.set_updated_at();
create trigger shuttles_updated_at before update on public.shuttles for each row execute function public.set_updated_at();
create trigger vehicles_audit after insert or update or delete on public.vehicles for each row execute function public.audit_change();
create trigger shuttles_audit after insert or update or delete on public.shuttles for each row execute function public.audit_change();
create trigger shuttle_assignments_audit after insert or update or delete on public.shuttle_assignments for each row execute function public.audit_change();
create trigger qr_codes_audit after insert or update or delete on public.qr_codes for each row execute function public.audit_change();

-- Only approved drivers may be assigned.
create function public.guard_assignment_driver() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.drivers d join public.university_memberships m on m.id = d.membership_id
     where d.id = new.driver_id and m.verification_status = 'APPROVED'
  ) then
    raise exception 'Only approved drivers can be assigned to a shuttle';
  end if;
  return new;
end;
$$;
create trigger assignments_guard before insert on public.shuttle_assignments for each row execute function public.guard_assignment_driver();

-- A driver who stops being approved is taken off their shuttle immediately.
create function public.end_assignments_for_unapproved() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.shuttle_assignments set ended_at = now()
   where ended_at is null and driver_id in (select id from public.drivers where membership_id = new.id);
  return null;
end;
$$;
create trigger memberships_end_assignments after update of verification_status on public.university_memberships
  for each row when (old.verification_status = 'APPROVED' and new.verification_status <> 'APPROVED' and new.role = 'DRIVER')
  execute function public.end_assignments_for_unapproved();

revoke all on function public.guard_assignment_driver() from public, anon, authenticated;
revoke all on function public.end_assignments_for_unapproved() from public, anon, authenticated;

create function public.is_assigned_driver(target_shuttle uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (
  select 1 from public.shuttle_assignments a join public.drivers d on d.id = a.driver_id
   where a.shuttle_id = target_shuttle and a.ended_at is null and d.profile_id = (select auth.uid())
) $$;
create function public.driver_has_vehicle(target_vehicle uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (
  select 1 from public.shuttle_assignments a
    join public.drivers d on d.id = a.driver_id
    join public.shuttles s on s.id = a.shuttle_id
   where s.vehicle_id = target_vehicle and a.ended_at is null and d.profile_id = (select auth.uid())
) $$;
revoke all on function public.is_assigned_driver(uuid) from public, anon;
revoke all on function public.driver_has_vehicle(uuid) from public, anon;
grant execute on function public.is_assigned_driver(uuid) to authenticated;
grant execute on function public.driver_has_vehicle(uuid) to authenticated;

alter table public.vehicles enable row level security;
alter table public.shuttles enable row level security;
alter table public.shuttle_assignments enable row level security;
alter table public.qr_codes enable row level security;
revoke all on public.vehicles, public.shuttles, public.shuttle_assignments, public.qr_codes from anon;
revoke delete on public.vehicles, public.shuttles, public.shuttle_assignments, public.qr_codes from authenticated;

create policy "read vehicles" on public.vehicles for select to authenticated
  using (public.is_platform_admin() or public.is_university_admin(university_id) or public.driver_has_vehicle(id));
create policy "admins insert vehicles" on public.vehicles for insert to authenticated with check (public.is_university_admin(university_id));
create policy "admins update vehicles" on public.vehicles for update to authenticated
  using (public.is_university_admin(university_id)) with check (public.is_university_admin(university_id));

create policy "read shuttles" on public.shuttles for select to authenticated
  using (public.is_platform_admin() or public.is_university_admin(university_id) or public.is_assigned_driver(id));
create policy "admins insert shuttles" on public.shuttles for insert to authenticated with check (public.is_university_admin(university_id));
create policy "admins update shuttles" on public.shuttles for update to authenticated
  using (public.is_university_admin(university_id)) with check (public.is_university_admin(university_id));

create policy "read assignments" on public.shuttle_assignments for select to authenticated
  using (
    public.is_platform_admin() or public.is_university_admin(university_id)
    or exists (select 1 from public.drivers d where d.id = driver_id and d.profile_id = (select auth.uid()))
  );
create policy "admins insert assignments" on public.shuttle_assignments for insert to authenticated with check (public.is_university_admin(university_id));
create policy "admins update assignments" on public.shuttle_assignments for update to authenticated
  using (public.is_university_admin(university_id)) with check (public.is_university_admin(university_id));

create policy "admins read qr codes" on public.qr_codes for select to authenticated
  using (public.is_platform_admin() or public.is_university_admin(university_id));
create policy "admins insert qr codes" on public.qr_codes for insert to authenticated with check (public.is_university_admin(university_id));
create policy "admins update qr codes" on public.qr_codes for update to authenticated
  using (public.is_university_admin(university_id)) with check (public.is_university_admin(university_id));

-- Shuttle and vehicle in one transaction.
create function public.create_shuttle(
  p_university_id uuid, p_code text, p_plate text, p_model text, p_capacity integer, p_route_id uuid
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare v_vehicle uuid; v_shuttle uuid;
begin
  insert into public.vehicles (university_id, plate_number, model, capacity)
  values (p_university_id, upper(trim(p_plate)), nullif(trim(coalesce(p_model, '')), ''), p_capacity)
  returning id into v_vehicle;
  insert into public.shuttles (university_id, code, vehicle_id, route_id)
  values (p_university_id, upper(trim(p_code)), v_vehicle, p_route_id)
  returning id into v_shuttle;
  return v_shuttle;
end;
$$;

create function public.update_shuttle(
  p_shuttle_id uuid, p_code text, p_plate text, p_model text, p_capacity integer, p_route_id uuid, p_status public.transport_status
) returns void
language plpgsql security invoker set search_path = ''
as $$
declare v_vehicle uuid;
begin
  update public.shuttles set code = upper(trim(p_code)), route_id = p_route_id, status = p_status
   where id = p_shuttle_id returning vehicle_id into v_vehicle;
  if not found then
    raise exception 'Shuttle not found' using errcode = 'P0002';
  end if;
  update public.vehicles
     set plate_number = upper(trim(p_plate)), model = nullif(trim(coalesce(p_model, '')), ''), capacity = p_capacity
   where id = v_vehicle;
end;
$$;

-- Moves a driver onto a shuttle: ends the shuttle's current driver and the driver's current shuttle first.
create function public.assign_driver(p_shuttle_id uuid, p_driver_id uuid) returns void
language plpgsql security invoker set search_path = ''
as $$
declare v_uni uuid;
begin
  select university_id into v_uni from public.shuttles where id = p_shuttle_id;
  if not found then
    raise exception 'Shuttle not found' using errcode = 'P0002';
  end if;
  update public.shuttle_assignments set ended_at = now()
   where ended_at is null and (shuttle_id = p_shuttle_id or driver_id = p_driver_id);
  insert into public.shuttle_assignments (university_id, shuttle_id, driver_id) values (v_uni, p_shuttle_id, p_driver_id);
end;
$$;

create function public.end_assignment(p_shuttle_id uuid) returns void
language sql security invoker set search_path = ''
as $$ update public.shuttle_assignments set ended_at = now() where shuttle_id = p_shuttle_id and ended_at is null $$;

-- Revokes the current QR code (if any) and issues a new one. The old code stops working at once.
create function public.replace_shuttle_qr(p_shuttle_id uuid) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare v_uni uuid; v_new uuid;
begin
  select university_id into v_uni from public.shuttles where id = p_shuttle_id;
  if not found then
    raise exception 'Shuttle not found' using errcode = 'P0002';
  end if;
  update public.qr_codes set status = 'REVOKED', revoked_at = now(), revoked_by = (select auth.uid())
   where shuttle_id = p_shuttle_id and status = 'ACTIVE';
  insert into public.qr_codes (university_id, shuttle_id, token, short_code)
  values (v_uni, p_shuttle_id, replace(gen_random_uuid()::text, '-', ''), upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)))
  returning id into v_new;
  return v_new;
end;
$$;

create function public.revoke_shuttle_qr(p_shuttle_id uuid) returns void
language sql security invoker set search_path = ''
as $$ update public.qr_codes set status = 'REVOKED', revoked_at = now(), revoked_by = (select auth.uid())
       where shuttle_id = p_shuttle_id and status = 'ACTIVE' $$;

-- Resolves a scanned code or typed short code. Works only for approved members (and administrators) of the shuttle's university.
-- Every failure looks the same so codes cannot be probed.
create function public.resolve_qr(p_input text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_in text := regexp_replace(trim(coalesce(p_input, '')), '^.*[/=]', '');
  v_qr public.qr_codes; v_s public.shuttles; v_v public.vehicles; v_r public.routes;
  v_driver text; v_uni text;
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if char_length(v_in) not between 6 and 64 then
    raise exception 'Invalid code' using errcode = 'P0002';
  end if;
  select * into v_qr from public.qr_codes where status = 'ACTIVE' and (token = lower(v_in) or short_code = upper(v_in));
  if not found or not (public.is_approved_member(v_qr.university_id) or public.is_university_admin(v_qr.university_id)) then
    raise exception 'Invalid code' using errcode = 'P0002';
  end if;
  select * into v_s from public.shuttles where id = v_qr.shuttle_id;
  select * into v_v from public.vehicles where id = v_s.vehicle_id;
  select * into v_r from public.routes where id = v_s.route_id;
  select p.full_name into v_driver
    from public.shuttle_assignments a
    join public.drivers d on d.id = a.driver_id
    join public.university_memberships m on m.id = d.membership_id and m.verification_status = 'APPROVED'
    join public.profiles p on p.id = d.profile_id
   where a.shuttle_id = v_s.id and a.ended_at is null limit 1;
  select name into v_uni from public.universities where id = v_qr.university_id;
  return jsonb_build_object(
    'shuttle_id', v_s.id, 'shuttle_code', v_s.code,
    'in_service', (v_s.status = 'ACTIVE' and v_v.status = 'ACTIVE'),
    'plate', v_v.plate_number, 'route_code', v_r.code, 'route_name', v_r.name,
    'origin', v_r.origin, 'destination', v_r.destination,
    'driver_name', v_driver, 'university_id', v_qr.university_id, 'university_name', v_uni
  );
end;
$$;

revoke all on function public.create_shuttle(uuid, text, text, text, integer, uuid) from public, anon;
revoke all on function public.update_shuttle(uuid, text, text, text, integer, uuid, public.transport_status) from public, anon;
revoke all on function public.assign_driver(uuid, uuid) from public, anon;
revoke all on function public.end_assignment(uuid) from public, anon;
revoke all on function public.replace_shuttle_qr(uuid) from public, anon;
revoke all on function public.revoke_shuttle_qr(uuid) from public, anon;
revoke all on function public.resolve_qr(text) from public, anon;
grant execute on function public.create_shuttle(uuid, text, text, text, integer, uuid) to authenticated;
grant execute on function public.update_shuttle(uuid, text, text, text, integer, uuid, public.transport_status) to authenticated;
grant execute on function public.assign_driver(uuid, uuid) to authenticated;
grant execute on function public.end_assignment(uuid) to authenticated;
grant execute on function public.replace_shuttle_qr(uuid) to authenticated;
grant execute on function public.revoke_shuttle_qr(uuid) to authenticated;
grant execute on function public.resolve_qr(text) to authenticated;
