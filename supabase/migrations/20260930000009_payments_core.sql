-- Milestone 06: direct digital payment. Intents, state machine, rides, payments, receipts, provider events.
create type public.payment_status as enum ('INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REVERSED', 'REFUNDED');

create table public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities (id) on delete restrict,
  student_id uuid not null references public.profiles (id) on delete restrict,
  shuttle_id uuid not null,
  route_id uuid,
  driver_id uuid,
  fare_id uuid not null,
  amount_kobo integer not null check (amount_kobo > 0),
  currency char(3) not null default 'NGN' check (currency = 'NGN'),
  status public.payment_status not null default 'INITIATED',
  provider text,
  provider_environment text check (provider_environment in ('MOCK', 'SANDBOX', 'PRODUCTION')),
  provider_reference text unique,
  idempotency_key uuid not null,
  failure_reason text,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, idempotency_key),
  unique (id, university_id),
  foreign key (shuttle_id, university_id) references public.shuttles (id, university_id),
  foreign key (route_id, university_id) references public.routes (id, university_id),
  foreign key (driver_id, university_id) references public.drivers (id, university_id),
  foreign key (fare_id, university_id) references public.fares (id, university_id)
);
create index payment_intents_student_idx on public.payment_intents (student_id, created_at desc);
create index payment_intents_university_idx on public.payment_intents (university_id, created_at desc);

create table public.rides (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities (id) on delete restrict,
  student_id uuid not null references public.profiles (id) on delete restrict,
  shuttle_id uuid not null,
  route_id uuid,
  driver_id uuid,
  fare_id uuid not null,
  fare_kobo integer not null check (fare_kobo > 0),
  payment_method text not null default 'DIGITAL',
  status text not null default 'COMPLETED' check (status in ('COMPLETED', 'REVERSED')),
  ridden_at timestamptz not null default now(),
  foreign key (shuttle_id, university_id) references public.shuttles (id, university_id),
  foreign key (route_id, university_id) references public.routes (id, university_id),
  foreign key (driver_id, university_id) references public.drivers (id, university_id),
  foreign key (fare_id, university_id) references public.fares (id, university_id)
);
create index rides_student_idx on public.rides (student_id, ridden_at desc);
create index rides_driver_idx on public.rides (driver_id, ridden_at desc);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null unique references public.payment_intents (id) on delete restrict,
  ride_id uuid not null unique references public.rides (id) on delete restrict,
  university_id uuid not null references public.universities (id) on delete restrict,
  student_id uuid not null references public.profiles (id) on delete restrict,
  amount_kobo integer not null check (amount_kobo > 0),
  method text not null default 'DIGITAL',
  provider text not null,
  provider_environment text not null,
  provider_reference text not null,
  paid_at timestamptz not null default now()
);

create table public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique references public.payments (id) on delete restrict,
  university_id uuid not null references public.universities (id) on delete restrict,
  student_id uuid not null references public.profiles (id) on delete restrict,
  receipt_number text not null unique,
  issued_at timestamptz not null default now()
);

create table public.provider_events (
  id bigint generated always as identity primary key,
  provider text not null,
  event_id text not null,
  payload jsonb not null,
  signature_valid boolean not null,
  outcome text,
  received_at timestamptz not null default now(),
  unique (provider, event_id)
);

-- The stand-in provider's own ledger. It exists only so the test provider can answer verification requests the way a real provider would.
create table public.mock_provider_transactions (
  reference text primary key,
  amount_kobo integer not null,
  currency char(3) not null default 'NGN',
  status text not null default 'PENDING' check (status in ('PENDING', 'SUCCESS', 'FAILED')),
  return_path text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create trigger payment_intents_updated_at before update on public.payment_intents for each row execute function public.set_updated_at();

create function public.guard_payment_transition() returns trigger
language plpgsql set search_path = ''
as $$
declare allowed boolean;
begin
  if (new.university_id, new.student_id, new.shuttle_id, new.route_id, new.driver_id, new.fare_id, new.amount_kobo, new.currency, new.idempotency_key, new.created_at)
     is distinct from (old.university_id, old.student_id, old.shuttle_id, old.route_id, old.driver_id, old.fare_id, old.amount_kobo, old.currency, old.idempotency_key, old.created_at) then
    raise exception 'Payment details cannot be changed';
  end if;
  if old.provider is not null and (new.provider is distinct from old.provider or new.provider_environment is distinct from old.provider_environment) then
    raise exception 'The payment provider cannot be changed';
  end if;
  if old.provider_reference is not null and new.provider_reference is distinct from old.provider_reference then
    raise exception 'The provider reference cannot be changed';
  end if;
  if new.status <> old.status then
    allowed := case old.status
      when 'INITIATED' then new.status in ('PENDING', 'FAILED', 'CANCELLED')
      when 'PENDING' then new.status in ('SUCCESS', 'FAILED', 'CANCELLED')
      when 'SUCCESS' then new.status in ('REVERSED', 'REFUNDED')
      else false end;
    if not allowed then
      raise exception 'Invalid payment status change from % to %', old.status, new.status;
    end if;
  end if;
  return new;
end;
$$;
create trigger payment_intents_guard before update on public.payment_intents for each row execute function public.guard_payment_transition();

create trigger payment_intents_audit after insert or update on public.payment_intents for each row execute function public.audit_change();
create trigger payments_audit after insert on public.payments for each row execute function public.audit_change();
create trigger rides_audit after insert on public.rides for each row execute function public.audit_change();

alter table public.payment_intents enable row level security;
alter table public.rides enable row level security;
alter table public.payments enable row level security;
alter table public.payment_receipts enable row level security;
alter table public.provider_events enable row level security;
alter table public.mock_provider_transactions enable row level security;
revoke all on public.payment_intents, public.rides, public.payments, public.payment_receipts, public.provider_events, public.mock_provider_transactions from anon, authenticated;
grant select on public.payment_intents, public.rides, public.payments, public.payment_receipts to authenticated;

create policy "read own or university payment intents" on public.payment_intents for select to authenticated
  using (student_id = (select auth.uid()) or public.is_university_admin(university_id) or public.is_platform_admin());
create policy "read own or university payments" on public.payments for select to authenticated
  using (student_id = (select auth.uid()) or public.is_university_admin(university_id) or public.is_platform_admin());
create policy "read own or university receipts" on public.payment_receipts for select to authenticated
  using (student_id = (select auth.uid()) or public.is_university_admin(university_id) or public.is_platform_admin());
create policy "read rides" on public.rides for select to authenticated
  using (
    student_id = (select auth.uid()) or public.is_university_admin(university_id) or public.is_platform_admin()
    or exists (select 1 from public.drivers d where d.id = rides.driver_id and d.profile_id = (select auth.uid()))
  );

-- Student starts a payment. University, shuttle, driver, fare and amount are all decided here, never by the client.
create function public.create_payment_intent(p_input text, p_idempotency_key uuid) returns uuid
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
  select id into v_existing from public.payment_intents where student_id = v_uid and idempotency_key = p_idempotency_key;
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
  select id into v_existing from public.payment_intents
   where student_id = v_uid and shuttle_id = v_s.id and status in ('INITIATED', 'PENDING') and expires_at > now()
   order by created_at desc limit 1;
  if found then
    return v_existing;
  end if;
  insert into public.payment_intents (university_id, student_id, shuttle_id, route_id, driver_id, fare_id, amount_kobo, idempotency_key)
  values (v_qr.university_id, v_uid, v_s.id, v_s.route_id, v_driver, v_fare.id, v_fare.amount_kobo, p_idempotency_key)
  returning id into v_new;
  return v_new;
end;
$$;

create function public.cancel_payment_intent(p_intent_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare v_i public.payment_intents;
begin
  select * into v_i from public.payment_intents where id = p_intent_id and student_id = (select auth.uid()) for update;
  if not found then
    raise exception 'Payment not found' using errcode = 'P0002';
  end if;
  if v_i.status not in ('INITIATED', 'PENDING') then
    raise exception 'This payment can no longer be cancelled';
  end if;
  update public.payment_intents set status = 'CANCELLED', failure_reason = 'Cancelled by the student' where id = p_intent_id;
end;
$$;

-- Server-only functions (called with the service role by the provider integration).
create function public.mark_payment_pending(p_intent_id uuid, p_provider text, p_environment text, p_reference text) returns void
language plpgsql security definer set search_path = ''
as $$
declare v_i public.payment_intents;
begin
  select * into v_i from public.payment_intents where id = p_intent_id for update;
  if not found then
    raise exception 'Payment not found' using errcode = 'P0002';
  end if;
  if v_i.status = 'PENDING' and v_i.provider_reference = p_reference then
    return;
  end if;
  if v_i.status <> 'INITIATED' then
    raise exception 'Payment is not awaiting a provider';
  end if;
  update public.payment_intents
     set status = 'PENDING', provider = p_provider, provider_environment = p_environment, provider_reference = p_reference
   where id = p_intent_id;
end;
$$;

create function public.apply_payment_result(p_intent_id uuid, p_outcome text, p_amount_kobo integer, p_provider_reference text, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_i public.payment_intents; v_ride uuid; v_payment uuid; v_receipt text;
begin
  select * into v_i from public.payment_intents where id = p_intent_id for update;
  if not found then
    raise exception 'Payment not found' using errcode = 'P0002';
  end if;
  if p_provider_reference is distinct from v_i.provider_reference then
    raise exception 'Provider reference does not match this payment';
  end if;

  if p_outcome = 'SUCCESS' then
    if p_amount_kobo is distinct from v_i.amount_kobo then
      raise exception 'Provider amount does not match this payment';
    end if;
    if v_i.status in ('SUCCESS', 'REVERSED', 'REFUNDED') then
      return jsonb_build_object('status', v_i.status, 'duplicate', true);
    end if;
    if v_i.status not in ('INITIATED', 'PENDING') then
      return jsonb_build_object('status', v_i.status, 'ignored', true, 'needs_review', true);
    end if;
    if v_i.status = 'INITIATED' then
      update public.payment_intents set status = 'PENDING' where id = v_i.id;
    end if;
    update public.payment_intents set status = 'SUCCESS' where id = v_i.id;
    insert into public.rides (university_id, student_id, shuttle_id, route_id, driver_id, fare_id, fare_kobo)
    values (v_i.university_id, v_i.student_id, v_i.shuttle_id, v_i.route_id, v_i.driver_id, v_i.fare_id, v_i.amount_kobo)
    returning id into v_ride;
    insert into public.payments (intent_id, ride_id, university_id, student_id, amount_kobo, provider, provider_environment, provider_reference)
    values (v_i.id, v_ride, v_i.university_id, v_i.student_id, v_i.amount_kobo, v_i.provider, v_i.provider_environment, v_i.provider_reference)
    returning id into v_payment;
    v_receipt := 'SHT-' || to_char(now() at time zone 'Africa/Lagos', 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    insert into public.payment_receipts (payment_id, university_id, student_id, receipt_number)
    values (v_payment, v_i.university_id, v_i.student_id, v_receipt);
    return jsonb_build_object('status', 'SUCCESS', 'payment_id', v_payment, 'receipt_number', v_receipt);
  elsif p_outcome = 'FAILED' then
    if v_i.status in ('INITIATED', 'PENDING') then
      update public.payment_intents set status = 'FAILED', failure_reason = left(coalesce(p_reason, 'The payment was not completed'), 300) where id = v_i.id;
      return jsonb_build_object('status', 'FAILED');
    end if;
    return jsonb_build_object('status', v_i.status, 'ignored', true);
  end if;
  raise exception 'Unknown outcome';
end;
$$;

create function public.record_provider_event(p_provider text, p_event_id text, p_payload jsonb, p_valid boolean) returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.provider_events (provider, event_id, payload, signature_valid) values (p_provider, p_event_id, p_payload, p_valid)
  on conflict (provider, event_id) do nothing;
  return found;
end;
$$;

create function public.set_provider_event_outcome(p_provider text, p_event_id text, p_outcome text) returns void
language sql security definer set search_path = ''
as $$ update public.provider_events set outcome = p_outcome where provider = p_provider and event_id = p_event_id $$;

revoke all on function public.guard_payment_transition() from public, anon, authenticated;
revoke all on function public.create_payment_intent(text, uuid) from public, anon;
revoke all on function public.cancel_payment_intent(uuid) from public, anon;
grant execute on function public.create_payment_intent(text, uuid) to authenticated;
grant execute on function public.cancel_payment_intent(uuid) to authenticated;
revoke all on function public.mark_payment_pending(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.apply_payment_result(uuid, text, integer, text, text) from public, anon, authenticated;
revoke all on function public.record_provider_event(text, text, jsonb, boolean) from public, anon, authenticated;
revoke all on function public.set_provider_event_outcome(text, text, text) from public, anon, authenticated;
grant execute on function public.mark_payment_pending(uuid, text, text, text) to service_role;
grant execute on function public.apply_payment_result(uuid, text, integer, text, text) to service_role;
grant execute on function public.record_provider_event(text, text, jsonb, boolean) to service_role;
grant execute on function public.set_provider_event_outcome(text, text, text) to service_role;
