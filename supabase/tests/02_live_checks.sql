-- Self-contained database checks (no pgTAP). Runs in one transaction and ALWAYS rolls back by raising
-- a final exception. Success looks like: "ALL n CHECKS PASSED (rolled back)". Any failure raises "FAIL ...".
-- Requires the seed university (slug futa); creates its own second university inside the transaction. Last run: 28 of 28 passed.
do $test$
declare
  futa uuid; tub uuid; susp uuid := gen_random_uuid(); newu uuid;
  s1 uuid := gen_random_uuid(); d1 uuid := gen_random_uuid(); sb uuid := gen_random_uuid();
  aF uuid := gen_random_uuid(); aB uuid := gen_random_uuid(); pa uuid := gen_random_uuid(); unc uuid := gen_random_uuid(); ex uuid := gen_random_uuid();
  m_s1 uuid; m_d1 uuid; n int := 0; c int; st text; r text;
begin
  select id into futa from public.universities where slug='futa';
  tub := gen_random_uuid();
  insert into public.universities (id, name, slug, status) values (tub, 'Isolation Test University', 'isolation-test', 'ACTIVE');
  insert into public.universities (id, name, slug, status) values (susp, 'Suspended Uni', 'suspended-uni', 'SUSPENDED');

  insert into auth.users (id, email, raw_user_meta_data) values
   (s1, 's1@t.test', jsonb_build_object('full_name','Student One','registration_role','STUDENT','university_id',futa,'student_number','S-1')),
   (d1, 'd1@t.test', jsonb_build_object('full_name','Driver One','registration_role','DRIVER','university_id',futa,'license_number','L-1')),
   (sb, 'sb@t.test', jsonb_build_object('full_name','Student B','registration_role','STUDENT','university_id',tub,'student_number','S-1')),
   (aF, 'af@t.test', '{"full_name":"Admin F"}'), (aB, 'ab@t.test', '{"full_name":"Admin B"}');
  insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at) values
   (pa, 'pa@t.test', '{"full_name":"Plat Admin"}', now()), (ex, 'ex@t.test', '{"full_name":"Existing"}', now());
  insert into auth.users (id, email, raw_user_meta_data) values (unc, 'unc@t.test', '{"full_name":"Unconfirmed"}');
  insert into public.university_admins (profile_id, university_id) values (aF, futa), (aB, tub);
  select id into m_s1 from public.university_memberships where profile_id=s1;
  select id into m_d1 from public.university_memberships where profile_id=d1;

  select verification_status::text into st from public.university_memberships where id=m_s1;
  if st <> 'PENDING' then raise exception 'FAIL 1 student not pending'; end if; n:=n+1;
  select count(*) into c from public.driver_verifications where driver_id=(select id from public.drivers where profile_id=d1);
  if c <> 1 then raise exception 'FAIL 2 driver history'; end if; n:=n+1;
  begin insert into auth.users (id,email,raw_user_meta_data) values (gen_random_uuid(),'x1@t.test',jsonb_build_object('registration_role','DRIVER','university_id',susp,'license_number','L-9')); raise exception 'FAIL 3 suspended uni allowed';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  begin insert into auth.users (id,email,raw_user_meta_data) values (gen_random_uuid(),'x2@t.test',jsonb_build_object('registration_role','ADMIN','university_id',futa)); raise exception 'FAIL 4 admin role allowed';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;

  perform set_config('request.jwt.claims', json_build_object('sub',s1,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin update public.university_memberships set verification_status='APPROVED'; raise exception 'FAIL 5 self approve update';
  exception when insufficient_privilege then null; end; n:=n+1;
  begin update public.profiles set account_status='DISABLED' where id=s1; raise exception 'FAIL 6 account_status';
  exception when insufficient_privilege then null; end; n:=n+1;
  select count(*) into c from public.university_memberships where university_id=tub;
  if c<>0 then raise exception 'FAIL 7 cross-university read'; end if; n:=n+1;
  select count(*) into c from public.profiles where id=sb;
  if c<>0 then raise exception 'FAIL 7b other profile read'; end if; n:=n+1;
  begin perform public.platform_save_university(null,'Evil','EV','evil','ACTIVE'); raise exception 'FAIL 8 student created university';
  exception when insufficient_privilege then null; end; n:=n+1;
  begin perform public.apply_admin_grants(s1); raise exception 'FAIL 9 apply_admin_grants callable';
  exception when insufficient_privilege then null; end; n:=n+1;
  begin perform public.handle_new_user(); raise exception 'FAIL 9b handle_new_user callable';
  exception when insufficient_privilege then null; end; n:=n+1;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub',d1,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.review_membership(m_d1,'APPROVED'); raise exception 'FAIL 10 driver self approve';
  exception when insufficient_privilege then null; end; n:=n+1;
  execute 'reset role';

  execute 'set local role anon';
  begin perform 1 from public.university_memberships limit 1; raise exception 'FAIL 11 anon read';
  exception when insufficient_privilege then null; end; n:=n+1;
  select count(*) into c from public.universities where status='ACTIVE';
  if c<2 then raise exception 'FAIL 11b anon cannot list universities'; end if; n:=n+1;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub',aB,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.review_membership(m_s1,'APPROVED'); raise exception 'FAIL 12 cross-uni review';
  exception when insufficient_privilege then null; end; n:=n+1;
  select count(*) into c from public.students where university_id=futa;
  if c<>0 then raise exception 'FAIL 13 admin B reads FUTA students'; end if; n:=n+1;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub',aF,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.review_membership(m_s1,'REJECTED'); raise exception 'FAIL 14 reject without note';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  select count(*) into c from public.students where university_id=futa;
  if c<>1 then raise exception 'FAIL 15 admin F cannot read own students'; end if; n:=n+1;
  perform public.review_membership(m_s1,'APPROVED');
  perform public.review_membership(m_d1,'APPROVED');
  execute 'reset role';
  select verification_status::text into st from public.university_memberships where id=m_s1;
  if st<>'APPROVED' then raise exception 'FAIL 16 not approved'; end if; n:=n+1;
  select count(*) into c from public.audit_logs where action='MEMBERSHIP_REVIEWED';
  if c<>2 then raise exception 'FAIL 17 audit'; end if; n:=n+1;
  select count(*) into c from public.driver_verifications where to_status='APPROVED';
  if c<>1 then raise exception 'FAIL 18 history'; end if; n:=n+1;

  insert into public.admin_grants (email, role) values ('pa@t.test','PLATFORM_ADMIN'), ('unc@t.test','PLATFORM_ADMIN');
  perform set_config('request.jwt.claims', json_build_object('sub',unc,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  select public.claim_admin_grants() into c; execute 'reset role';
  if c<>0 or exists (select 1 from public.platform_admins where profile_id=unc) then raise exception 'FAIL 19 unconfirmed email granted'; end if; n:=n+1;
  perform set_config('request.jwt.claims', json_build_object('sub',pa,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  select public.claim_admin_grants() into c;
  if c<1 or not public.is_platform_admin() then raise exception 'FAIL 20 grant not applied'; end if; n:=n+1;

  newu := (public.platform_save_university(null,'New Uni','NU','new-uni','ONBOARDING')).id;
  select status::text into st from public.universities where id=newu;
  if st<>'ONBOARDING' then raise exception 'FAIL 21 create university'; end if; n:=n+1;
  perform public.platform_save_university(newu,'New Uni Renamed','NU','new-uni','ACTIVE');
  select public.platform_assign_university_admin(newu,'ex@t.test') into r;
  if r<>'ASSIGNED' then raise exception 'FAIL 22 assign existing: %', r; end if; n:=n+1;
  select public.platform_assign_university_admin(newu,'nobody@t.test') into r;
  if r<>'INVITED' then raise exception 'FAIL 23 invite: %', r; end if; n:=n+1;
  select count(*) into c from public.profiles; if c<8 then raise exception 'FAIL 24 platform reads profiles'; end if; n:=n+1;
  begin perform public.platform_save_university(null,'Dup','D','new-uni','ACTIVE'); raise exception 'FAIL 25 dup slug';
  exception when unique_violation then null; end; n:=n+1;
  execute 'reset role';
  if not exists (select 1 from public.university_admins where profile_id=ex and university_id=newu) then raise exception 'FAIL 26 admin row'; end if; n:=n+1;

  raise exception 'ALL % CHECKS PASSED (rolled back)', n;
end
$test$;
