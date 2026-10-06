-- Milestone 05: fare engine. Fares are versioned history; amounts never change.
create table public.fares (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities (id) on delete restrict,
  route_id uuid,
  amount_kobo integer not null check (amount_kobo between 1 and 100000000),
  effective_from timestamptz not null,
  effective_to timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to > effective_from),
  foreign key (route_id, university_id) references public.routes (id, university_id),
  unique (id, university_id)
);
create unique index one_open_fare_per_scope on public.fares (university_id, coalesce(route_id, '00000000-0000-0000-0000-000000000000'::uuid)) where effective_to is null;
create index fares_lookup_idx on public.fares (university_id, route_id, effective_from desc);

-- A fare is a historical record: amount, scope and start never change, and rows are never deleted.
-- The only permitted change is ending a fare earlier.
create function public.guard_fare_history() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Fares cannot be deleted';
  end if;
  if (new.university_id, new.route_id, new.amount_kobo, new.effective_from, new.created_by, new.created_at)
     is distinct from (old.university_id, old.route_id, old.amount_kobo, old.effective_from, old.created_by, old.created_at) then
    raise exception 'Fares cannot be changed; set a new fare instead';
  end if;
  if old.effective_to is not null and (new.effective_to is null or new.effective_to > old.effective_to) then
    raise exception 'An ended fare cannot be extended';
  end if;
  return new;
end;
$$;
create trigger fares_guard before update or delete on public.fares for each row execute function public.guard_fare_history();
create trigger fares_audit after insert or update on public.fares for each row execute function public.audit_change();

alter table public.fares enable row level security;
revoke all on public.fares from anon;
revoke insert, update, delete on public.fares from authenticated;
create policy "read fares" on public.fares for select to authenticated
  using (public.is_platform_admin() or public.is_university_admin(university_id) or public.is_approved_member(university_id));

create function public.applicable_fare(p_university_id uuid, p_route_id uuid, p_at timestamptz default now()) returns public.fares
language sql stable security definer set search_path = ''
as $$
  select f.* from public.fares f
   where f.university_id = p_university_id
     and (f.route_id = p_route_id or f.route_id is null)
     and f.effective_from <= p_at and (f.effective_to is null or f.effective_to > p_at)
     and (public.is_approved_member(p_university_id) or public.is_university_admin(p_university_id))
   order by (f.route_id is not null) desc, f.effective_from desc
   limit 1
$$;

create function public.set_fare(p_university_id uuid, p_route_id uuid, p_amount_kobo integer, p_effective_from timestamptz default null) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_from timestamptz := coalesce(p_effective_from, now());
  v_last public.fares;
  v_new uuid;
begin
  if (select auth.uid()) is null or not public.is_university_admin(p_university_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_route_id is not null and not exists (select 1 from public.routes where id = p_route_id and university_id = p_university_id) then
    raise exception 'Route not found' using errcode = 'P0002';
  end if;
  if v_from < now() - interval '5 minutes' then
    raise exception 'The effective date cannot be in the past';
  end if;
  if v_from < now() then
    v_from := now();
  end if;

  perform pg_advisory_xact_lock(hashtext(p_university_id::text || coalesce(p_route_id::text, '')));

  select * into v_last from public.fares
   where university_id = p_university_id and route_id is not distinct from p_route_id
   order by effective_from desc limit 1;
  if found then
    if v_last.effective_from >= v_from then
      raise exception 'A fare already starts on or after this date';
    end if;
    if v_last.effective_to is null then
      update public.fares set effective_to = v_from where id = v_last.id;
    elsif v_last.effective_to > v_from then
      raise exception 'This date overlaps an existing fare';
    end if;
  end if;

  insert into public.fares (university_id, route_id, amount_kobo, effective_from)
  values (p_university_id, p_route_id, p_amount_kobo, v_from)
  returning id into v_new;
  return v_new;
end;
$$;

-- Ends the fare currently in force for a scope (a route, or the default when the route is null).
create function public.end_fare(p_university_id uuid, p_route_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if (select auth.uid()) is null or not public.is_university_admin(p_university_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  select id into v_id from public.fares
   where university_id = p_university_id and route_id is not distinct from p_route_id
     and effective_to is null and effective_from <= now();
  if not found then
    raise exception 'There is no current fare to end' using errcode = 'P0002';
  end if;
  update public.fares set effective_to = greatest(now(), effective_from + interval '1 second') where id = v_id;
end;
$$;

revoke all on function public.guard_fare_history() from public, anon, authenticated;
revoke all on function public.applicable_fare(uuid, uuid, timestamptz) from public, anon;
revoke all on function public.set_fare(uuid, uuid, integer, timestamptz) from public, anon;
revoke all on function public.end_fare(uuid, uuid) from public, anon;
grant execute on function public.applicable_fare(uuid, uuid, timestamptz) to authenticated;
grant execute on function public.set_fare(uuid, uuid, integer, timestamptz) to authenticated;
grant execute on function public.end_fare(uuid, uuid) to authenticated;

-- The scan result now carries the fare in force for the shuttle's route.
create or replace function public.resolve_qr(p_input text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_in text := regexp_replace(trim(coalesce(p_input, '')), '^.*[/=]', '');
  v_qr public.qr_codes; v_s public.shuttles; v_v public.vehicles; v_r public.routes; v_fare public.fares;
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
  select * into v_fare from public.applicable_fare(v_qr.university_id, v_s.route_id, now());
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
    'driver_name', v_driver, 'university_id', v_qr.university_id, 'university_name', v_uni,
    'fare_id', v_fare.id, 'fare_kobo', v_fare.amount_kobo
  );
end;
$$;
