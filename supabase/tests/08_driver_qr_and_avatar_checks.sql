-- Self-contained checks for driver QR codes, scanning through them, and profile picture access.
-- Creates temporary data and ALWAYS rolls back. Success: "ALL n CHECKS PASSED (rolled back)". Requires the seed university (slug futa).
-- Last run: 34 checks passed. Written to be independent of real data in the live project (test rows use TST- prefixes).
do $test$
declare
  futa uuid; ub uuid := gen_random_uuid();
  aA uuid := gen_random_uuid(); aB uuid := gen_random_uuid(); stuA uuid := gen_random_uuid(); stuB uuid := gen_random_uuid(); stuP uuid := gen_random_uuid(); stuC uuid := gen_random_uuid();
  dA uuid := gen_random_uuid(); dX uuid := gen_random_uuid(); dP uuid := gen_random_uuid();
  routeA uuid; sh1 uuid; drA uuid; drX uuid; drP uuid; tokS text; tokDA text; tokDX text; scDA text; mem uuid;
  i1 uuid; cl uuid; n int := 0; c int; j jsonb; st text; ok boolean;
begin
  select id into futa from public.universities where slug='futa';
  insert into public.universities (id,name,slug,status) values (ub,'Isolation Test University','isolation-test','ACTIVE');
  insert into auth.users (id,email,raw_user_meta_data,email_confirmed_at) values
    (aA,'aa@t.test','{"full_name":"Admin A"}',now()),(aB,'ab@t.test','{"full_name":"Admin B"}',now()),
    (stuA,'sa@t.test',jsonb_build_object('full_name','Student A','registration_role','STUDENT','university_id',futa,'student_number','TST-A1'),now()),
    (stuC,'sc@t.test',jsonb_build_object('full_name','Student C','registration_role','STUDENT','university_id',futa,'student_number','TST-C1'),now()),
    (stuB,'sb@t.test',jsonb_build_object('full_name','Student B','registration_role','STUDENT','university_id',ub,'student_number','TST-B1'),now()),
    (stuP,'sp@t.test',jsonb_build_object('full_name','Student P','registration_role','STUDENT','university_id',futa,'student_number','TST-P1'),now()),
    (dA,'da@t.test',jsonb_build_object('full_name','Driver A','registration_role','DRIVER','university_id',futa,'license_number','TST-LA'),now()),
    (dX,'dx@t.test',jsonb_build_object('full_name','Driver X','registration_role','DRIVER','university_id',futa,'license_number','TST-LX'),now()),
    (dP,'dp@t.test',jsonb_build_object('full_name','Driver Pending','registration_role','DRIVER','university_id',futa,'license_number','TST-LP'),now());
  insert into public.university_admins (profile_id,university_id) values (aA,futa),(aB,ub);
  update public.university_memberships set verification_status='APPROVED' where profile_id in (stuA,stuC,stuB,dA,dX);
  select id into drA from public.drivers where profile_id=dA; select id into drX from public.drivers where profile_id=dX; select id into drP from public.drivers where profile_id=dP;
  insert into public.routes (university_id,code,name,origin,destination) values (futa,'TR1','Test Route One','Gate','Library') returning id into routeA;

  perform set_config('request.jwt.claims', json_build_object('sub',aA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.set_fare(futa, routeA, 15000);
  sh1 := public.create_shuttle(futa,'TSH-1','TDQ 111',null,10,routeA);
  perform public.assign_driver(sh1, drA);
  perform public.replace_shuttle_qr(sh1);
  perform public.replace_driver_qr(drA);
  perform public.replace_driver_qr(drA);
  begin perform public.replace_driver_qr(drP); raise exception 'FAIL 1 pending driver got a QR';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  select count(*) into c from public.driver_qr_codes where driver_id=drA and status='ACTIVE'; if c<>1 then raise exception 'FAIL 2 one active code per driver'; end if; n:=n+1;
  select count(*) into c from public.driver_qr_codes where driver_id=drA and status='REVOKED'; if c<>1 then raise exception 'FAIL 3 replaced code revoked'; end if; n:=n+1;
  c := public.generate_missing_driver_qrs(futa); if c<1 then raise exception 'FAIL 4 bulk generate (%)', c; end if; n:=n+1;
  select count(*) into c from public.driver_qr_codes where driver_id=drX and status='ACTIVE'; if c<>1 then raise exception 'FAIL 4b driver X has code'; end if; n:=n+1;
  c := public.generate_missing_driver_qrs(futa); if c<>0 then raise exception 'FAIL 5 bulk generate repeats'; end if; n:=n+1;
  execute 'reset role';
  select token into tokS from public.qr_codes where shuttle_id=sh1 and status='ACTIVE';
  select token, short_code into tokDA, scDA from public.driver_qr_codes where driver_id=drA and status='ACTIVE';
  select token into tokDX from public.driver_qr_codes where driver_id=drX and status='ACTIVE';

  perform set_config('request.jwt.claims', json_build_object('sub',aB,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.replace_driver_qr(drA); raise exception 'FAIL 6 other admin issued a code';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  select count(*) into c from public.driver_qr_codes; if c<>0 then raise exception 'FAIL 7 admin B reads codes'; end if; n:=n+1;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub',dA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into c from public.driver_qr_codes; if c<>2 then raise exception 'FAIL 8 driver sees own codes (%)', c; end if; n:=n+1;
  begin perform public.replace_driver_qr(drA); raise exception 'FAIL 9 driver issued own code';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub',dX,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into c from public.driver_qr_codes where driver_id=drA; if c<>0 then raise exception 'FAIL 10 other driver sees codes'; end if; n:=n+1;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub',stuA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into c from public.driver_qr_codes; if c<>0 then raise exception 'FAIL 11 student reads codes'; end if; n:=n+1;
  j := public.resolve_qr(tokDA);
  if j->>'shuttle_code'<>'TSH-1' or j->>'driver_name'<>'Driver A' or j->>'via'<>'DRIVER' then raise exception 'FAIL 12 resolve driver code %', j; end if; n:=n+1;
  j := public.resolve_qr(lower(scDA));
  if j->>'route_code'<>'TR1' or (j->>'fare_kobo')::int<>15000 then raise exception 'FAIL 13 resolve driver short code'; end if; n:=n+1;
  j := public.resolve_qr(tokDX);
  if j->>'shuttle_code' is not null or (j->>'in_service')::boolean is not false or j->>'driver_name'<>'Driver X' then raise exception 'FAIL 14 driver with no shuttle %', j; end if; n:=n+1;
  j := public.resolve_qr(tokS);
  if j->>'via'<>'SHUTTLE' or j->>'shuttle_code'<>'TSH-1' then raise exception 'FAIL 15 shuttle code regression'; end if; n:=n+1;
  i1 := public.create_payment_intent(tokDA, gen_random_uuid());
  select amount_kobo, status::text into c, st from public.payment_intents where id=i1;
  if c<>15000 or st<>'INITIATED' then raise exception 'FAIL 16 payment via driver code'; end if; n:=n+1;
  begin perform public.create_payment_intent(tokDX, gen_random_uuid()); raise exception 'FAIL 17 payment for driver without shuttle';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  cl := public.create_change_claim(tokDA, 50000, gen_random_uuid());
  if (public.claim_details(cl)->>'change_kobo')::int<>35000 then raise exception 'FAIL 18 claim via driver code'; end if; n:=n+1;
  i1 := public.create_payment_intent(tokS, gen_random_uuid());
  n:=n+1;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub',stuB,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.resolve_qr(tokDA); raise exception 'FAIL 19 other university resolved driver code';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub',stuP,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.resolve_qr(tokDA); raise exception 'FAIL 20 pending student resolved';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub',stuA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  update public.profiles set avatar_path = stuA::text || '/photo.jpg' where id=stuA;
  begin update public.profiles set avatar_path = dA::text || '/photo.jpg' where id=stuA; raise exception 'FAIL 21 avatar path in another folder';
  exception when check_violation then null; end; n:=n+1;
  update public.profiles set avatar_path = stuA::text || '/p.jpg' where id=dA;
  execute 'reset role';
  if (select avatar_path from public.profiles where id=dA) is not null then raise exception 'FAIL 22 edited another profile'; end if; n:=n+1;
  perform set_config('request.jwt.claims', json_build_object('sub',stuA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  ok := public.can_view_avatar(stuA::text || '/photo.jpg'); if not ok then raise exception 'FAIL 23 owner views own photo'; end if; n:=n+1;
  ok := public.can_view_avatar(dA::text || '/photo.jpg'); if not ok then raise exception 'FAIL 24 member views approved driver photo'; end if; n:=n+1;
  ok := public.can_view_avatar(stuC::text || '/photo.jpg'); if ok then raise exception 'FAIL 25 student views another student photo'; end if; n:=n+1;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub',stuB,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  ok := public.can_view_avatar(dA::text || '/photo.jpg'); if ok then raise exception 'FAIL 26 other university views driver photo'; end if; n:=n+1;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub',stuP,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  ok := public.can_view_avatar(dA::text || '/photo.jpg'); if ok then raise exception 'FAIL 27 pending student views driver photo'; end if; n:=n+1;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub',aA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  ok := public.can_view_avatar(stuA::text || '/photo.jpg'); if not ok then raise exception 'FAIL 28 admin views member photo'; end if; n:=n+1;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub',aB,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  ok := public.can_view_avatar(stuA::text || '/photo.jpg'); if ok then raise exception 'FAIL 29 other admin views photo'; end if; n:=n+1;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub',dA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  ok := public.can_view_avatar(stuA::text || '/photo.jpg'); if not ok then raise exception 'FAIL 30 driver views claimant photo'; end if;
  ok := public.can_view_avatar(stuC::text || '/photo.jpg'); if ok then raise exception 'FAIL 31 driver views unrelated student photo'; end if; n:=n+1;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub',aA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  select id into mem from public.university_memberships where profile_id=dA;
  perform public.review_membership(mem,'SUSPENDED','Licence expired');
  execute 'reset role';
  select count(*) into c from public.driver_qr_codes where driver_id=drA and status='ACTIVE'; if c<>0 then raise exception 'FAIL 32 suspended driver keeps code'; end if; n:=n+1;
  perform set_config('request.jwt.claims', json_build_object('sub',stuA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.resolve_qr(tokDA); raise exception 'FAIL 33 revoked driver code resolved';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  execute 'reset role';

  raise exception 'ALL % CHECKS PASSED (rolled back)', n;
end $test$;
