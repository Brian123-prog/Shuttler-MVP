-- Milestone 07: cash payments and change claims. A claim only becomes real when the responsible driver confirms it.
create type public.claim_status as enum ('DRAFT', 'SUBMITTED', 'DRIVER_PENDING', 'CONFIRMED', 'REJECTED', 'DISPUTED', 'SETTLED', 'CANCELLED');

create table public.change_claims (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities (id) on delete restrict,
  student_id uuid not null references public.profiles (id) on delete restrict,
  shuttle_id uuid not null,
  route_id uuid,
  driver_id uuid not null,
  fare_id uuid not null,
  fare_kobo integer not null check (fare_kobo > 0),
  cash_kobo integer not null check (cash_kobo between 1 and 10000000),
  change_kobo integer not null check (change_kobo > 0),
  status public.claim_status not null default 'DRIVER_PENDING',
  driver_note text check (driver_note is null or char_length(driver_note) <= 500),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (change_kobo = cash_kobo - fare_kobo),
  unique (student_id, idempotency_key),
  unique (id, university_id),
  foreign key (shuttle_id, university_id) references public.shuttles (id, university_id),
  foreign key (route_id, university_id) references public.routes (id, university_id),
  foreign key (driver_id, university_id) references public.drivers (id, university_id),
  foreign key (fare_id, university_id) references public.fares (id, university_id)
);
create index change_claims_student_idx on public.change_claims (student_id, created_at desc);
create index change_claims_driver_idx on public.change_claims (driver_id, status, created_at desc);
create index change_claims_university_idx on public.change_claims (university_id, status, created_at desc);

alter table public.rides add column claim_id uuid unique references public.change_claims (id) on delete restrict;

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities (id) on delete restrict,
  claim_id uuid not null unique references public.change_claims (id) on delete restrict,
  raised_by uuid not null references public.profiles (id) on delete restrict,
  reason text not null check (char_length(reason) between 5 and 1000),
  status text not null default 'OPEN' check (status in ('OPEN', 'RESOLVED')),
  outcome text check (outcome in ('CLAIM_CONFIRMED', 'REJECTION_UPHELD')),
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 1000),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index disputes_university_idx on public.disputes (university_id, status, created_at desc);

create trigger change_claims_updated_at before update on public.change_claims for each row execute function public.set_updated_at();

create function public.guard_claim_transition() returns trigger
language plpgsql set search_path = ''
as $$
declare allowed boolean;
begin
  if (new.university_id, new.student_id, new.shuttle_id, new.route_id, new.driver_id, new.fare_id, new.fare_kobo, new.cash_kobo, new.change_kobo, new.idempotency_key, new.created_at)
     is distinct from (old.university_id, old.student_id, old.shuttle_id, old.route_id, old.driver_id, old.fare_id, old.fare_kobo, old.cash_kobo, old.change_kobo, old.idempotency_key, old.created_at) then
    raise exception 'Claim details cannot be changed';
  end if;
  if new.status <> old.status then
    allowed := case old.status
      when 'DRIVER_PENDING' then new.status in ('CONFIRMED', 'REJECTED', 'CANCELLED')
      when 'REJECTED' then new.status = 'DISPUTED'
      when 'DISPUTED' then new.status in ('CONFIRMED', 'REJECTED')
      when 'CONFIRMED' then new.status = 'SETTLED'
      else false end;
    if not allowed then
      raise exception 'Invalid claim status change from % to %', old.status, new.status;
    end if;
  end if;
  return new;
end;
$$;
create trigger change_claims_guard before update on public.change_claims for each row execute function public.guard_claim_transition();
create trigger change_claims_audit after insert or update on public.change_claims for each row execute function public.audit_change();
create trigger disputes_audit after insert or update on public.disputes for each row execute function public.audit_change();

alter table public.change_claims enable row level security;
alter table public.disputes enable row level security;
revoke all on public.change_claims, public.disputes from anon, authenticated;
grant select on public.change_claims, public.disputes to authenticated;

create policy "read claims" on public.change_claims for select to authenticated
  using (
    student_id = (select auth.uid()) or public.is_university_admin(university_id) or public.is_platform_admin()
    or exists (select 1 from public.drivers d where d.id = change_claims.driver_id and d.profile_id = (select auth.uid()))
  );
create policy "read disputes" on public.disputes for select to authenticated
  using (raised_by = (select auth.uid()) or public.is_university_admin(university_id) or public.is_platform_admin());

-- A confirmed claim is recorded as a cash ride. Internal helper; not callable by clients.
create function public.finalize_claim(p_claim_id uuid) returns void
language sql security definer set search_path = ''
as $$
  insert into public.rides (university_id, student_id, shuttle_id, route_id, driver_id, fare_id, fare_kobo, payment_method, claim_id)
  select university_id, student_id, shuttle_id, route_id, driver_id, fare_id, fare_kobo, 'CASH', id
    from public.change_claims where id = p_claim_id
  on conflict (claim_id) do nothing
$$;
revoke all on function public.finalize_claim(uuid) from public, anon, authenticated;

-- The student records the cash handed over. Fare, driver, university and the change owed are computed here, never by the client.
create function public.create_change_claim(p_input text, p_cash_kobo integer, p_idempotency_key uuid) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_in text := regexp_replace(trim(coalesce(p_input, '')), '^.*[/=]', '');
  v_qr public.qr_codes; v_s public.shuttles; v_v public.vehicles; v_fare public.fares;
  v_driver uuid; v_existing uuid; v_new uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  select id into v_existing from public.change_claims where student_id = v_uid and idempotency_key = p_idempotency_key;
  if found then
    return v_existing;
  end if;
  if char_length(v_in) not between 6 and 64 then
    raise exception 'Invalid code' using errcode = 'P0002';
  end if;
  select * into v_qr from public.qr_codes where status = 'ACTIVE' and (token = lower(v_in) or short_code = upper(v_in));
  if not found or not exists (
    select 1 from public.university_memberships m
     where m.profile_id = v_uid and m.university_id = v_qr.university_id and m.role = 'STUDENT' and m.verification_status = 'APPROVED'
  ) then
    raise exception 'Invalid code' using errcode = 'P0002';
  end if;
  select * into v_s from public.shuttles where id = v_qr.shuttle_id;
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
  select * into v_fare from public.applicable_fare(v_qr.university_id, v_s.route_id, now());
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
  values (v_qr.university_id, v_uid, v_s.id, v_s.route_id, v_driver, v_fare.id, v_fare.amount_kobo, p_cash_kobo, p_cash_kobo - v_fare.amount_kobo, p_idempotency_key)
  returning id into v_new;
  return v_new;
end;
$$;

-- Only the responsible, still-approved driver can confirm or reject.
create function public.decide_change_claim(p_claim_id uuid, p_decision text, p_note text default null) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  c public.change_claims;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  select * into c from public.change_claims where id = p_claim_id for update;
  if not found then
    raise exception 'Claim not found' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.drivers d join public.university_memberships m on m.id = d.membership_id
     where d.id = c.driver_id and d.profile_id = v_uid and m.verification_status = 'APPROVED'
  ) then
    raise exception 'Only the responsible driver can decide this claim' using errcode = '42501';
  end if;
  if c.status <> 'DRIVER_PENDING' then
    raise exception 'This claim has already been decided';
  end if;
  if p_decision = 'CONFIRM' then
    update public.change_claims set status = 'CONFIRMED', decided_by = v_uid, decided_at = now(), driver_note = v_note where id = c.id;
    perform public.finalize_claim(c.id);
    return 'CONFIRMED';
  elsif p_decision = 'REJECT' then
    update public.change_claims set status = 'REJECTED', decided_by = v_uid, decided_at = now(), driver_note = v_note where id = c.id;
    return 'REJECTED';
  end if;
  raise exception 'Unknown decision';
end;
$$;

create function public.cancel_change_claim(p_claim_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare c public.change_claims;
begin
  select * into c from public.change_claims where id = p_claim_id and student_id = (select auth.uid()) for update;
  if not found then
    raise exception 'Claim not found' using errcode = 'P0002';
  end if;
  if c.status <> 'DRIVER_PENDING' then
    raise exception 'This claim can no longer be cancelled';
  end if;
  update public.change_claims set status = 'CANCELLED' where id = c.id;
end;
$$;

-- A student who disagrees with a rejection raises a dispute for the university to decide.
create function public.dispute_change_claim(p_claim_id uuid, p_reason text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare c public.change_claims; v_id uuid; v_reason text := trim(coalesce(p_reason, ''));
begin
  select * into c from public.change_claims where id = p_claim_id and student_id = (select auth.uid()) for update;
  if not found then
    raise exception 'Claim not found' using errcode = 'P0002';
  end if;
  if c.status <> 'REJECTED' then
    raise exception 'Only a rejected claim can be disputed';
  end if;
  if char_length(v_reason) < 5 then
    raise exception 'Please explain why you are disputing this claim';
  end if;
  update public.change_claims set status = 'DISPUTED' where id = c.id;
  insert into public.disputes (university_id, claim_id, raised_by, reason) values (c.university_id, c.id, c.student_id, left(v_reason, 1000)) returning id into v_id;
  return v_id;
end;
$$;

create function public.resolve_dispute(p_claim_id uuid, p_outcome text, p_note text) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  c public.change_claims; v_note text := trim(coalesce(p_note, ''));
begin
  select * into c from public.change_claims where id = p_claim_id for update;
  if not found then
    raise exception 'Claim not found' using errcode = 'P0002';
  end if;
  if v_uid is null or not public.is_university_admin(c.university_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if c.status <> 'DISPUTED' then
    raise exception 'This claim is not under dispute';
  end if;
  if char_length(v_note) < 3 then
    raise exception 'Add a note explaining the decision';
  end if;
  if p_outcome = 'CLAIM_CONFIRMED' then
    update public.change_claims set status = 'CONFIRMED', decided_by = v_uid, decided_at = now() where id = c.id;
    perform public.finalize_claim(c.id);
  elsif p_outcome = 'REJECTION_UPHELD' then
    update public.change_claims set status = 'REJECTED' where id = c.id;
  else
    raise exception 'Unknown outcome';
  end if;
  update public.disputes set status = 'RESOLVED', outcome = p_outcome, resolution_note = left(v_note, 1000), resolved_by = v_uid, resolved_at = now() where claim_id = c.id;
  return case when p_outcome = 'CLAIM_CONFIRMED' then 'CONFIRMED' else 'REJECTED' end;
end;
$$;

-- Display data. Visible to the student, the responsible driver and the university's administrators.
create function public.claim_details(p_claim_id uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id, 'status', c.status, 'fare_kobo', c.fare_kobo, 'cash_kobo', c.cash_kobo, 'change_kobo', c.change_kobo,
    'driver_note', c.driver_note, 'created_at', c.created_at, 'decided_at', c.decided_at,
    'shuttle_code', s.code, 'plate', v.plate_number, 'route_code', r.code, 'route_name', r.name,
    'driver_name', dp.full_name, 'student_name', sp.full_name, 'university_name', u.name,
    'dispute_reason', ds.reason, 'dispute_status', ds.status, 'dispute_outcome', ds.outcome, 'dispute_note', ds.resolution_note
  )
  from public.change_claims c
  join public.shuttles s on s.id = c.shuttle_id
  join public.vehicles v on v.id = s.vehicle_id
  left join public.routes r on r.id = c.route_id
  join public.drivers d on d.id = c.driver_id
  join public.profiles dp on dp.id = d.profile_id
  join public.profiles sp on sp.id = c.student_id
  join public.universities u on u.id = c.university_id
  left join public.disputes ds on ds.claim_id = c.id
  where c.id = p_claim_id
    and (c.student_id = (select auth.uid()) or d.profile_id = (select auth.uid()) or public.is_university_admin(c.university_id))
$$;

create function public.my_claims(p_role text, p_limit integer default 30) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(public.claim_details(x.id) order by x.created_at desc), '[]'::jsonb)
  from (
    select c.id, c.created_at from public.change_claims c
     where (p_role = 'STUDENT' and c.student_id = (select auth.uid()))
        or (p_role = 'DRIVER' and exists (select 1 from public.drivers d where d.id = c.driver_id and d.profile_id = (select auth.uid())))
     order by c.created_at desc limit least(greatest(p_limit, 1), 100)
  ) x
$$;

revoke all on function public.guard_claim_transition() from public, anon, authenticated;
revoke all on function public.create_change_claim(text, integer, uuid) from public, anon;
revoke all on function public.decide_change_claim(uuid, text, text) from public, anon;
revoke all on function public.cancel_change_claim(uuid) from public, anon;
revoke all on function public.dispute_change_claim(uuid, text) from public, anon;
revoke all on function public.resolve_dispute(uuid, text, text) from public, anon;
revoke all on function public.claim_details(uuid) from public, anon;
revoke all on function public.my_claims(text, integer) from public, anon;
grant execute on function public.create_change_claim(text, integer, uuid) to authenticated;
grant execute on function public.decide_change_claim(uuid, text, text) to authenticated;
grant execute on function public.cancel_change_claim(uuid) to authenticated;
grant execute on function public.dispute_change_claim(uuid, text) to authenticated;
grant execute on function public.resolve_dispute(uuid, text, text) to authenticated;
grant execute on function public.claim_details(uuid) to authenticated;
grant execute on function public.my_claims(text, integer) to authenticated;
