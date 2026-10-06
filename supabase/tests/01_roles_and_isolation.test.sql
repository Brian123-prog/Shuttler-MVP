-- pgTAP tests (run with: npx supabase test db). Not yet executed in the authoring sandbox.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into public.universities (id, name, slug, status) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Test Uni A', 'test-a', 'ACTIVE'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Test Uni B', 'test-b', 'ACTIVE'),
  ('cccccccc-0000-0000-0000-000000000003', 'Test Uni C', 'test-c', 'SUSPENDED');

insert into auth.users (id, email, raw_user_meta_data) values
  ('10000000-0000-0000-0000-000000000001', 'student.a@test.dev',
   '{"full_name":"Student A","registration_role":"STUDENT","university_id":"aaaaaaaa-0000-0000-0000-000000000001","student_number":"S-001"}'),
  ('10000000-0000-0000-0000-000000000002', 'driver.a@test.dev',
   '{"full_name":"Driver A","registration_role":"DRIVER","university_id":"aaaaaaaa-0000-0000-0000-000000000001","license_number":"L-001"}'),
  ('10000000-0000-0000-0000-000000000003', 'student.b@test.dev',
   '{"full_name":"Student B","registration_role":"STUDENT","university_id":"bbbbbbbb-0000-0000-0000-000000000002","student_number":"S-001"}'),
  ('10000000-0000-0000-0000-000000000004', 'admin.a@test.dev', '{"full_name":"Admin A"}'),
  ('10000000-0000-0000-0000-000000000005', 'admin.b@test.dev', '{"full_name":"Admin B"}');

insert into public.university_admins (profile_id, university_id) values
  ('10000000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000002');

-- Registration trigger
select is((select verification_status::text from public.university_memberships
            where profile_id = '10000000-0000-0000-0000-000000000001'), 'PENDING', 'student registers as PENDING');
select is((select count(*)::int from public.driver_verifications), 1, 'driver registration writes a verification history row');
select throws_ok(
  $$insert into auth.users (id, email, raw_user_meta_data) values ('10000000-0000-0000-0000-000000000009','x@test.dev',
    '{"registration_role":"DRIVER","university_id":"cccccccc-0000-0000-0000-000000000003","license_number":"L-9"}')$$,
  'P0001', 'University is not available for registration', 'cannot register at a suspended university');
select throws_ok(
  $$insert into auth.users (id, email, raw_user_meta_data) values ('10000000-0000-0000-0000-000000000008','y@test.dev',
    '{"registration_role":"ADMIN","university_id":"aaaaaaaa-0000-0000-0000-000000000001"}')$$,
  'P0001', 'Invalid registration role', 'cannot register as an admin role');

-- Student A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select throws_ok($$update public.university_memberships set verification_status = 'APPROVED'$$, '42501', null, 'student cannot self-approve by direct update');
select throws_ok($$update public.profiles set account_status = 'DISABLED' where id = auth.uid()$$, '42501', null, 'student cannot change account_status');
select is_empty($$select 1 from public.profiles where id = '10000000-0000-0000-0000-000000000003'$$, 'student cannot read another profile');
select is_empty($$select 1 from public.university_memberships where university_id = 'bbbbbbbb-0000-0000-0000-000000000002'$$, 'student cannot read another university memberships');
reset role;

-- Driver A cannot approve self
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select public.review_membership((select id from public.university_memberships where profile_id = '10000000-0000-0000-0000-000000000002'), 'APPROVED')$$,
  '42501', null, 'driver cannot approve themselves');
reset role;

-- Admin B cannot manage University A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
select throws_ok(
  $$select public.review_membership((select id from public.university_memberships where profile_id = '10000000-0000-0000-0000-000000000001'), 'APPROVED')$$,
  '42501', null, 'admin of B cannot approve a student of A');
select is_empty($$select 1 from public.students where university_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, 'admin of B cannot read students of A');
reset role;

-- Admin A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
select throws_ok(
  $$select public.review_membership((select id from public.university_memberships where profile_id = '10000000-0000-0000-0000-000000000001'), 'REJECTED')$$,
  'P0001', 'A note is required for this decision', 'rejection requires a note');
select lives_ok(
  $$select public.review_membership((select id from public.university_memberships where profile_id = '10000000-0000-0000-0000-000000000001'), 'APPROVED')$$,
  'admin of A approves a student of A');
select lives_ok(
  $$select public.review_membership((select id from public.university_memberships where profile_id = '10000000-0000-0000-0000-000000000002'), 'APPROVED')$$,
  'admin of A approves a driver of A');
reset role;

select is((select verification_status::text from public.university_memberships where profile_id = '10000000-0000-0000-0000-000000000001'), 'APPROVED', 'student is now APPROVED');
select is((select count(*)::int from public.audit_logs where action = 'MEMBERSHIP_REVIEWED'), 2, 'reviews are audited');
select is((select count(*)::int from public.driver_verifications where to_status = 'APPROVED'), 1, 'driver approval recorded in history');

select * from finish();
rollback;
