-- Initial university. Safe to run more than once.
insert into public.universities (name, short_name, slug, status, verification_method) values
  ('Federal University of Technology, Akure', 'FUTA', 'futa', 'ACTIVE', 'ADMIN_APPROVAL')
on conflict (slug) do nothing;
