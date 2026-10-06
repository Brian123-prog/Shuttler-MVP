-- Milestone 00: foundation. Shared enums, universities, profiles, audit_logs.
-- Remaining role/membership tables arrive in Milestone 01.

create type public.account_status as enum ('ACTIVE', 'DISABLED');
create type public.verification_status as enum ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');
create type public.university_status as enum ('ONBOARDING', 'ACTIVE', 'SUSPENDED');

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 200),
  short_name text,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  country_code char(2) not null default 'NG',
  status public.university_status not null default 'ONBOARDING',
  verification_method text not null default 'ADMIN_APPROVAL'
    check (verification_method in ('ADMIN_APPROVAL', 'UNIVERSITY_CODE', 'EMAIL_DOMAIN', 'STUDENT_ID', 'INVITATION')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger universities_updated_at before update on public.universities
  for each row execute function public.set_updated_at();

alter table public.universities enable row level security;

-- Registration needs to list active universities before sign-in.
create policy "active universities are publicly listable"
  on public.universities for select
  to anon, authenticated
  using (status = 'ACTIVE');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 200),
  phone text,
  account_status public.account_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "users can read their own profile"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));
-- No update policy yet: account_status must not be user-writable. Column-safe updates arrive in Milestone 01.

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  university_id uuid references public.universities (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_university_created_idx on public.audit_logs (university_id, created_at desc);

-- RLS on with no policies: only the server (service role) writes and reads audit logs until admin policies exist.
alter table public.audit_logs enable row level security;
