-- Milestone 03: university transport core (settings, routes, stops, route_stops, schedules).
-- Tenant isolation is enforced twice: RLS policies and composite foreign keys that force every child row
-- to share its parent's university_id.

create type public.transport_status as enum ('ACTIVE', 'INACTIVE');

create function public.is_approved_member(target_university uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (
  select 1 from public.university_memberships
  where profile_id = (select auth.uid()) and university_id = target_university and verification_status = 'APPROVED'
) $$;
revoke all on function public.is_approved_member(uuid) from public, anon;
grant execute on function public.is_approved_member(uuid) to authenticated;

-- Generic audit trigger for transport tables.
create function public.audit_change() returns trigger
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
    jsonb_build_object('label', coalesce(j ->> 'name', j ->> 'code', left(j ->> 'departure_time', 5)))
  );
  return null;
end;
$$;
revoke all on function public.audit_change() from public, anon, authenticated;

create table public.university_settings (
  university_id uuid primary key references public.universities (id) on delete cascade,
  support_email text check (support_email is null or (char_length(support_email) <= 254 and support_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$')),
  support_phone text check (support_phone is null or char_length(support_phone) between 7 and 20),
  updated_at timestamptz not null default now()
);

create table public.routes (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities (id) on delete restrict,
  code text not null check (code ~ '^[A-Z0-9-]{1,12}$'),
  name text not null check (char_length(name) between 2 and 100),
  origin text not null check (char_length(origin) between 1 and 100),
  destination text not null check (char_length(destination) between 1 and 100),
  status public.transport_status not null default 'ACTIVE',
  operating_days smallint[] not null default '{1,2,3,4,5}'
    check (operating_days <@ array[1,2,3,4,5,6,7]::smallint[] and cardinality(operating_days) > 0),
  operating_start time not null default '06:00',
  operating_end time not null default '20:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (operating_end > operating_start),
  unique (university_id, code),
  unique (id, university_id)
);
create index routes_university_status_idx on public.routes (university_id, status);

create table public.stops (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities (id) on delete restrict,
  name text not null check (char_length(name) between 2 and 100),
  description text check (description is null or char_length(description) <= 300),
  latitude numeric(9,6) check (latitude between -90 and 90),
  longitude numeric(9,6) check (longitude between -180 and 180),
  status public.transport_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null)),
  unique (university_id, name),
  unique (id, university_id)
);

create table public.route_stops (
  route_id uuid not null,
  stop_id uuid not null,
  university_id uuid not null,
  stop_order integer not null check (stop_order > 0),
  primary key (route_id, stop_id),
  foreign key (route_id, university_id) references public.routes (id, university_id) on delete cascade,
  foreign key (stop_id, university_id) references public.stops (id, university_id) on delete restrict,
  constraint route_stops_order_key unique (route_id, stop_order) deferrable initially deferred
);
create index route_stops_stop_idx on public.route_stops (stop_id);

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null,
  route_id uuid not null,
  departure_time time not null,
  days_of_week smallint[] not null default '{1,2,3,4,5}'
    check (days_of_week <@ array[1,2,3,4,5,6,7]::smallint[] and cardinality(days_of_week) > 0),
  status public.transport_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (route_id, university_id) references public.routes (id, university_id) on delete cascade,
  unique (route_id, departure_time)
);

create trigger settings_updated_at before update on public.university_settings for each row execute function public.set_updated_at();
create trigger routes_updated_at before update on public.routes for each row execute function public.set_updated_at();
create trigger stops_updated_at before update on public.stops for each row execute function public.set_updated_at();
create trigger schedules_updated_at before update on public.schedules for each row execute function public.set_updated_at();

create trigger settings_audit after insert or update or delete on public.university_settings for each row execute function public.audit_change();
create trigger routes_audit after insert or update or delete on public.routes for each row execute function public.audit_change();
create trigger stops_audit after insert or update or delete on public.stops for each row execute function public.audit_change();
create trigger route_stops_audit after insert or update or delete on public.route_stops for each row execute function public.audit_change();
create trigger schedules_audit after insert or update or delete on public.schedules for each row execute function public.audit_change();

alter table public.university_settings enable row level security;
alter table public.routes enable row level security;
alter table public.stops enable row level security;
alter table public.route_stops enable row level security;
alter table public.schedules enable row level security;

revoke all on public.university_settings, public.routes, public.stops, public.route_stops, public.schedules from anon;
revoke delete on public.university_settings, public.routes, public.stops from authenticated;

-- Settings: readable by any member of the university (including pending), writable by its administrators.
create policy "members and admins read settings" on public.university_settings for select to authenticated
  using (
    public.is_platform_admin() or public.is_university_admin(university_id)
    or exists (select 1 from public.university_memberships m where m.university_id = university_settings.university_id and m.profile_id = (select auth.uid()))
  );
create policy "university admins insert settings" on public.university_settings for insert to authenticated
  with check (public.is_university_admin(university_id));
create policy "university admins update settings" on public.university_settings for update to authenticated
  using (public.is_university_admin(university_id)) with check (public.is_university_admin(university_id));

-- Transport tables: readable by approved members, administrators and platform admins; writable by university administrators.
create policy "read routes" on public.routes for select to authenticated
  using (public.is_platform_admin() or public.is_university_admin(university_id) or public.is_approved_member(university_id));
create policy "admins insert routes" on public.routes for insert to authenticated with check (public.is_university_admin(university_id));
create policy "admins update routes" on public.routes for update to authenticated
  using (public.is_university_admin(university_id)) with check (public.is_university_admin(university_id));

create policy "read stops" on public.stops for select to authenticated
  using (public.is_platform_admin() or public.is_university_admin(university_id) or public.is_approved_member(university_id));
create policy "admins insert stops" on public.stops for insert to authenticated with check (public.is_university_admin(university_id));
create policy "admins update stops" on public.stops for update to authenticated
  using (public.is_university_admin(university_id)) with check (public.is_university_admin(university_id));

create policy "read route stops" on public.route_stops for select to authenticated
  using (public.is_platform_admin() or public.is_university_admin(university_id) or public.is_approved_member(university_id));
create policy "admins insert route stops" on public.route_stops for insert to authenticated with check (public.is_university_admin(university_id));
create policy "admins update route stops" on public.route_stops for update to authenticated
  using (public.is_university_admin(university_id)) with check (public.is_university_admin(university_id));
create policy "admins delete route stops" on public.route_stops for delete to authenticated using (public.is_university_admin(university_id));

create policy "read schedules" on public.schedules for select to authenticated
  using (public.is_platform_admin() or public.is_university_admin(university_id) or public.is_approved_member(university_id));
create policy "admins insert schedules" on public.schedules for insert to authenticated with check (public.is_university_admin(university_id));
create policy "admins update schedules" on public.schedules for update to authenticated
  using (public.is_university_admin(university_id)) with check (public.is_university_admin(university_id));
create policy "admins delete schedules" on public.schedules for delete to authenticated using (public.is_university_admin(university_id));

-- Append a stop to the end of a route. The join forces the stop to belong to the route's university.
create function public.append_route_stop(p_route_id uuid, p_stop_id uuid) returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  insert into public.route_stops (route_id, stop_id, university_id, stop_order)
  select r.id, s.id, r.university_id,
         coalesce((select max(rs.stop_order) from public.route_stops rs where rs.route_id = r.id), 0) + 1
    from public.routes r
    join public.stops s on s.id = p_stop_id and s.university_id = r.university_id
   where r.id = p_route_id;
  if not found then
    raise exception 'Route or stop not found' using errcode = 'P0002';
  end if;
end;
$$;

-- Swap a stop with its neighbour. Runs as the caller, so RLS decides who may do this.
create function public.move_route_stop(p_route_id uuid, p_stop_id uuid, p_direction text) returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  cur integer; nb_stop uuid; nb_order integer; changed integer;
begin
  if p_direction not in ('up', 'down') then
    raise exception 'Invalid direction';
  end if;
  select stop_order into cur from public.route_stops where route_id = p_route_id and stop_id = p_stop_id;
  if not found then
    raise exception 'Stop is not on this route' using errcode = 'P0002';
  end if;
  if p_direction = 'up' then
    select stop_id, stop_order into nb_stop, nb_order from public.route_stops
     where route_id = p_route_id and stop_order < cur order by stop_order desc limit 1;
  else
    select stop_id, stop_order into nb_stop, nb_order from public.route_stops
     where route_id = p_route_id and stop_order > cur order by stop_order asc limit 1;
  end if;
  if nb_stop is null then
    return;
  end if;
  update public.route_stops
     set stop_order = case when stop_id = p_stop_id then nb_order else cur end
   where route_id = p_route_id and stop_id in (p_stop_id, nb_stop);
  get diagnostics changed = row_count;
  if changed <> 2 then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.append_route_stop(uuid, uuid) from public, anon;
revoke all on function public.move_route_stop(uuid, uuid, text) from public, anon;
grant execute on function public.append_route_stop(uuid, uuid) to authenticated;
grant execute on function public.move_route_stop(uuid, uuid, text) to authenticated;
