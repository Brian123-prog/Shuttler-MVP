-- Self-contained cash and change-claim checks. Creates temporary data and ALWAYS rolls back.
-- Success looks like: "ALL n CHECKS PASSED (rolled back)". Requires the seed university (slug futa). Last run: 36 checks passed.
do $test$
declare
  futa uuid; ub uuid := gen_random_uuid();
  aA uuid := gen_random_uuid(); aB uuid := gen_random_uuid(); stuA uuid := gen_random_uuid(); stuA2 uuid := gen_random_uuid(); stuB uuid := gen_random_uuid(); stuP uuid := gen_random_uuid();
  dA uuid := gen_random_uuid(); dX uuid := gen_random_uuid();
  routeA uuid; sh1 uuid; sh2 uuid; drA uuid; tok1 text; tok2 text; mem uuid;
  c1 uuid; c1b uuid; c2 uuid; c3 uuid; c4 uuid; k1 uuid := gen_random_uuid();
  n int := 0; c int; st text; r text; j jsonb;
begin
  select id into futa from public.universities where slug='futa';
  insert into public.universities (id,name,slug,status) values (ub,'Isolation Test University','isolation-test','ACTIVE');
  insert into auth.users (id,email,raw_user_meta_data,email_confirmed_at) values
    (aA,'aa@t.test','{"full_name":"Admin A"}',now()),(aB,'ab@t.test','{"full_name":"Admin B"}',now()),
    (stuA,'sa@t.test',jsonb_build_object('full_name','Student A','registration_role','STUDENT','university_id',futa,'student_number','A-1'),now()),
    (stuA2,'sa2@t.test',jsonb_build_object('full_name','Student A2','registration_role','STUDENT','university_id',futa,'student_number','A-2'),now()),
    (stuB,'sb@t.test',jsonb_build_object('full_name','Student B','registration_role','STUDENT','university_id',ub,'student_number','B-1'),now()),
    (stuP,'sp@t.test',jsonb_build_object('full_name','Student P','registration_role','STUDENT','university_id',futa,'student_number','P-1'),now()),
    (dA,'da@t.test',jsonb_build_object('full_name','Driver A','registration_role','DRIVER','university_id',futa,'license_number','LIC-A'),now()),
    (dX,'dx@t.test',jsonb_build_object('full_name','Driver X','registration_role','DRIVER','university_id',futa,'license_number','LIC-X'),now());
  insert into public.university_admins (profile_id,university_id) values (aA,futa),(aB,ub);
  update public.university_memberships set verification_status='APPROVED' where profile_id in (stuA,stuA2,stuB,dA,dX);
  select id into drA from public.drivers where profile_id=dA;
  insert into public.routes (university_id,code,name,origin,destination) values (futa,'R1','Route One','Gate','Library') returning id into routeA;

  perform set_config('request.jwt.claims', json_build_object('sub',aA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.set_fare(futa, null, 15000);
  sh1 := public.create_shuttle(futa,'SH-1','CLM 111',null,10,routeA);
  sh2 := public.create_shuttle(futa,'SH-2','CLM 222',null,10,routeA);
  perform public.assign_driver(sh1, drA);
  perform public.replace_shuttle_qr(sh1); perform public.replace_shuttle_qr(sh2);
  execute 'reset role';
  select token into tok1 from public.qr_codes where shuttle_id=sh1 and status='ACTIVE';
  select token into tok2 from public.qr_codes where shuttle_id=sh2 and status='ACTIVE';

  perform set_config('request.jwt.claims', json_build_object('sub',stuA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  c1 := public.create_change_claim(tok1, 50000, k1);
  c1b := public.create_change_claim(tok1, 50000, k1);
  if c1<>c1b then raise exception 'FAIL 1 idempotency'; end if; n:=n+1;
  j := public.claim_details(c1);
  if (j->>'change_kobo')::int<>35000 or j->>'status'<>'DRIVER_PENDING' or (j->>'fare_kobo')::int<>15000 then raise exception 'FAIL 2 amounts %', j; end if; n:=n+1;
  begin perform public.create_change_claim(tok1, 15000, gen_random_uuid()); raise exception 'FAIL 3 cash equal fare';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  begin perform public.create_change_claim(tok1, 10000001, gen_random_uuid()); raise exception 'FAIL 4 huge cash';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  begin perform public.create_change_claim(tok2, 50000, gen_random_uuid()); raise exception 'FAIL 5 no driver';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  c2 := public.create_change_claim(tok1, 20000, gen_random_uuid());
  c3 := public.create_change_claim(tok1, 30000, gen_random_uuid());
  begin perform public.create_change_claim(tok1, 40000, gen_random_uuid()); raise exception 'FAIL 6 more than 3 open claims';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  begin update public.change_claims set status='CONFIRMED' where id=c1; raise exception 'FAIL 7 student direct update';
  exception when insufficient_privilege then null; end; n:=n+1;
  begin perform public.decide_change_claim(c1,'CONFIRM'); raise exception 'FAIL 8 student confirmed own claim';
  exception when insufficient_privilege then null; end; n:=n+1;
  perform public.cancel_change_claim(c3);
  select status::text into st from public.change_claims where id=c3; if st<>'CANCELLED' then raise exception 'FAIL 9 cancel'; end if; n:=n+1;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub',stuB,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.create_change_claim(tok1, 50000, gen_random_uuid()); raise exception 'FAIL 10 other university';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub',stuP,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.create_change_claim(tok1, 50000, gen_random_uuid()); raise exception 'FAIL 11 pending student';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub',dA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.create_change_claim(tok1, 50000, gen_random_uuid()); raise exception 'FAIL 12 driver created claim';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  begin perform public.decide_change_claim(c3,'CONFIRM'); raise exception 'FAIL 13 cancelled claim confirmed';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  select count(*) into c from public.change_claims; if c<>3 then raise exception 'FAIL 14 driver sees own claims (%)', c; end if; n:=n+1;
  r := public.decide_change_claim(c1,'CONFIRM','Handed over');
  if r<>'CONFIRMED' then raise exception 'FAIL 15 confirm'; end if; n:=n+1;
  begin perform public.decide_change_claim(c1,'CONFIRM'); raise exception 'FAIL 16 double confirm';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  r := public.decide_change_claim(c2,'REJECT','I did not receive that cash');
  if r<>'REJECTED' then raise exception 'FAIL 17 reject'; end if; n:=n+1;
  execute 'reset role';
  select count(*) into c from public.rides where payment_method='CASH' and claim_id=c1; if c<>1 then raise exception 'FAIL 18 cash ride for confirmed claim'; end if; n:=n+1;
  select count(*) into c from public.rides where claim_id=c2; if c<>0 then raise exception 'FAIL 19 ride for rejected claim'; end if; n:=n+1;

  perform set_config('request.jwt.claims', json_build_object('sub',dX,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into c from public.change_claims; if c<>0 then raise exception 'FAIL 20 other driver sees claims'; end if;
  begin perform public.decide_change_claim(c2,'CONFIRM'); raise exception 'FAIL 21 other driver decided';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub',aA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.decide_change_claim(c2,'CONFIRM'); raise exception 'FAIL 22 admin decided as driver';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  select count(*) into c from public.change_claims; if c<>3 then raise exception 'FAIL 23 admin sees claims'; end if; n:=n+1;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub',stuA2,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into c from public.change_claims; if c<>0 then raise exception 'FAIL 24 other student sees claims'; end if;
  if public.claim_details(c1) is not null then raise exception 'FAIL 25 claim_details leaks'; end if; n:=n+1;
  begin perform public.dispute_change_claim(c2,'not my claim at all'); raise exception 'FAIL 26 other student disputed';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub',aB,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into c from public.change_claims; if c<>0 then raise exception 'FAIL 27 admin B sees claims'; end if; n:=n+1;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub',stuA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.dispute_change_claim(c1,'confirmed claims cannot be disputed'); raise exception 'FAIL 28 disputed a confirmed claim';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  begin perform public.dispute_change_claim(c2,'no'); raise exception 'FAIL 29 empty reason';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  perform public.dispute_change_claim(c2,'The driver did receive my 200 naira note');
  select status::text into st from public.change_claims where id=c2; if st<>'DISPUTED' then raise exception 'FAIL 30 disputed status'; end if; n:=n+1;
  begin perform public.resolve_dispute(c2,'CLAIM_CONFIRMED','student resolving own dispute'); raise exception 'FAIL 31 student resolved dispute';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub',aB,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.resolve_dispute(c2,'CLAIM_CONFIRMED','wrong university admin'); raise exception 'FAIL 32 other admin resolved';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub',aA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.resolve_dispute(c2,'CLAIM_CONFIRMED',''); raise exception 'FAIL 33 resolved without note';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  r := public.resolve_dispute(c2,'CLAIM_CONFIRMED','Checked with both parties');
  if r<>'CONFIRMED' then raise exception 'FAIL 34 resolve confirm'; end if; n:=n+1;
  execute 'reset role';
  select count(*) into c from public.rides where claim_id=c2; if c<>1 then raise exception 'FAIL 35 ride after dispute'; end if; n:=n+1;
  begin update public.change_claims set status='DRIVER_PENDING' where id=c1; raise exception 'FAIL 36 backwards transition';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  begin update public.change_claims set cash_kobo=1000000, change_kobo=985000 where id=c1; raise exception 'FAIL 37 amounts edited';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;

  perform set_config('request.jwt.claims', json_build_object('sub',stuA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  c4 := public.create_change_claim(tok1, 60000, gen_random_uuid());
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub',aA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  select id into mem from public.university_memberships where profile_id=dA;
  perform public.review_membership(mem,'SUSPENDED','Licence expired');
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub',dA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.decide_change_claim(c4,'CONFIRM'); raise exception 'FAIL 38 suspended driver confirmed';
  exception when insufficient_privilege then null; end; n:=n+1;
  execute 'reset role';

  raise exception 'ALL % CHECKS PASSED (rolled back)', n;
end $test$;
