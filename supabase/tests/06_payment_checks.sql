-- Self-contained payment checks. Creates temporary data and ALWAYS rolls back.
-- Success looks like: "ALL n CHECKS PASSED (rolled back)". Requires the seed university (slug futa). Last run: 34 of 34 passed.
-- The service-role functions (mark_payment_pending, apply_payment_result, record_provider_event) are called as the owner here;
-- the checks also prove that signed-in users cannot call them.
do $test$
declare
  futa uuid; ub uuid := gen_random_uuid();
  aA uuid := gen_random_uuid(); aB uuid := gen_random_uuid(); stuA uuid := gen_random_uuid(); stuA2 uuid := gen_random_uuid(); stuB uuid := gen_random_uuid(); stuP uuid := gen_random_uuid();
  dA uuid := gen_random_uuid(); dX uuid := gen_random_uuid();
  routeA uuid; sh1 uuid; sh2 uuid; sh3 uuid; drA uuid; drX uuid; tok1 text; tok2 text; tok3 text;
  i1 uuid; i1b uuid; i2 uuid; k1 uuid := gen_random_uuid(); r jsonb; n int := 0; c int; st text; amt int;
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
  select id into drA from public.drivers where profile_id=dA; select id into drX from public.drivers where profile_id=dX;
  insert into public.routes (university_id,code,name,origin,destination) values (futa,'R1','Route One','Gate','Library') returning id into routeA;

  perform set_config('request.jwt.claims', json_build_object('sub',aA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.set_fare(futa, null, 15000);
  sh1 := public.create_shuttle(futa,'SH-1','PAY 111',null,10,routeA);
  sh2 := public.create_shuttle(futa,'SH-2','PAY 222',null,10,routeA);
  sh3 := public.create_shuttle(futa,'SH-3','PAY 333',null,10,routeA);
  perform public.assign_driver(sh1, drA);
  perform public.update_shuttle(sh3,'SH-3','PAY 333',null,10,routeA,'INACTIVE');
  perform public.replace_shuttle_qr(sh1); perform public.replace_shuttle_qr(sh2); perform public.replace_shuttle_qr(sh3);
  execute 'reset role';
  select token into tok1 from public.qr_codes where shuttle_id=sh1 and status='ACTIVE';
  select token into tok2 from public.qr_codes where shuttle_id=sh2 and status='ACTIVE';
  select token into tok3 from public.qr_codes where shuttle_id=sh3 and status='ACTIVE';

  perform set_config('request.jwt.claims', json_build_object('sub',stuA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  i1 := public.create_payment_intent(tok1, k1);
  i1b := public.create_payment_intent(tok1, k1);
  if i1 <> i1b then raise exception 'FAIL 1 idempotency key'; end if; n:=n+1;
  i1b := public.create_payment_intent(tok1, gen_random_uuid());
  if i1 <> i1b then raise exception 'FAIL 2 open duplicate not reused'; end if; n:=n+1;
  select amount_kobo, status::text into amt, st from public.payment_intents where id=i1;
  if amt<>15000 or st<>'INITIATED' then raise exception 'FAIL 3 snapshot'; end if; n:=n+1;
  begin perform public.create_payment_intent(tok2, gen_random_uuid()); raise exception 'FAIL 4 no driver';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  begin perform public.create_payment_intent(tok3, gen_random_uuid()); raise exception 'FAIL 5 inactive shuttle';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  begin perform public.apply_payment_result(i1,'SUCCESS',15000,'x'); raise exception 'FAIL 6 client applied result';
  exception when insufficient_privilege then null; end; n:=n+1;
  begin perform public.mark_payment_pending(i1,'mock','MOCK','x'); raise exception 'FAIL 7 client marked pending';
  exception when insufficient_privilege then null; end; n:=n+1;
  begin perform public.record_provider_event('mock','e1','{}'::jsonb,true); raise exception 'FAIL 8 client recorded event';
  exception when insufficient_privilege then null; end; n:=n+1;
  begin update public.payment_intents set status='SUCCESS' where id=i1; raise exception 'FAIL 9 client updated status';
  exception when insufficient_privilege then null; end; n:=n+1;
  begin insert into public.payment_intents (university_id,student_id,shuttle_id,fare_id,amount_kobo,idempotency_key) values (futa,stuA,sh1,gen_random_uuid(),1,gen_random_uuid()); raise exception 'FAIL 10 client inserted intent';
  exception when insufficient_privilege then null; end; n:=n+1;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub',stuB,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.create_payment_intent(tok1, gen_random_uuid()); raise exception 'FAIL 11 other university paid';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub',stuP,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.create_payment_intent(tok1, gen_random_uuid()); raise exception 'FAIL 12 pending student paid';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub',dA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.create_payment_intent(tok1, gen_random_uuid()); raise exception 'FAIL 13 driver paid';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  execute 'reset role';

  perform public.mark_payment_pending(i1,'mock','MOCK','ref-1');
  select status::text into st from public.payment_intents where id=i1; if st<>'PENDING' then raise exception 'FAIL 14 pending'; end if; n:=n+1;
  begin perform public.apply_payment_result(i1,'SUCCESS',14999,'ref-1'); raise exception 'FAIL 15 wrong amount accepted';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  begin perform public.apply_payment_result(i1,'SUCCESS',15000,'other-ref'); raise exception 'FAIL 16 wrong reference accepted';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  r := public.apply_payment_result(i1,'SUCCESS',15000,'ref-1');
  if r->>'status'<>'SUCCESS' or r->>'receipt_number' is null then raise exception 'FAIL 17 success'; end if; n:=n+1;
  r := public.apply_payment_result(i1,'SUCCESS',15000,'ref-1');
  if (r->>'duplicate')::boolean is not true then raise exception 'FAIL 18 duplicate not detected'; end if; n:=n+1;
  select count(*) into c from public.rides where student_id=stuA; if c<>1 then raise exception 'FAIL 19 one ride'; end if; n:=n+1;
  select count(*) into c from public.payments where intent_id=i1; if c<>1 then raise exception 'FAIL 20 one payment'; end if; n:=n+1;
  select count(*) into c from public.payment_receipts where student_id=stuA; if c<>1 then raise exception 'FAIL 21 one receipt'; end if; n:=n+1;
  r := public.apply_payment_result(i1,'FAILED',null,'ref-1','late failure');
  select status::text into st from public.payment_intents where id=i1; if st<>'SUCCESS' then raise exception 'FAIL 22 failure overwrote success'; end if; n:=n+1;
  begin update public.payment_intents set status='PENDING' where id=i1; raise exception 'FAIL 23 backwards transition';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  begin update public.payment_intents set amount_kobo=1 where id=i1; raise exception 'FAIL 24 amount edited';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  if public.record_provider_event('mock','evt-1','{"a":1}'::jsonb,true) is not true then raise exception 'FAIL 25 first event'; end if; n:=n+1;
  if public.record_provider_event('mock','evt-1','{"a":1}'::jsonb,true) is not false then raise exception 'FAIL 26 duplicate event'; end if; n:=n+1;

  perform set_config('request.jwt.claims', json_build_object('sub',stuA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into c from public.payment_intents; if c<>1 then raise exception 'FAIL 27 own intents (%)', c; end if;
  select count(*) into c from public.payment_receipts; if c<>1 then raise exception 'FAIL 28 own receipt'; end if; n:=n+1;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub',stuA2,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into c from public.payment_intents; if c<>0 then raise exception 'FAIL 29 other student sees intents'; end if;
  select count(*) into c from public.rides; if c<>0 then raise exception 'FAIL 30 other student sees rides'; end if; n:=n+1;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub',aA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into c from public.payments; if c<>1 then raise exception 'FAIL 31 admin sees payments'; end if; n:=n+1;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub',aB,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into c from public.payments; if c<>0 then raise exception 'FAIL 32 admin B sees payments'; end if; n:=n+1;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub',dA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into c from public.rides; if c<>1 then raise exception 'FAIL 33 driver sees own ride'; end if; n:=n+1;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub',dX,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into c from public.rides; if c<>0 then raise exception 'FAIL 34 other driver sees ride'; end if; n:=n+1;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub',stuA2,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  i2 := public.create_payment_intent(tok1, gen_random_uuid());
  execute 'reset role';
  perform public.mark_payment_pending(i2,'mock','MOCK','ref-2');
  perform set_config('request.jwt.claims', json_build_object('sub',stuA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.cancel_payment_intent(i2); raise exception 'FAIL 35 cancelled someone elses payment';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub',stuA2,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.cancel_payment_intent(i2);
  execute 'reset role';
  r := public.apply_payment_result(i2,'SUCCESS',15000,'ref-2');
  if (r->>'ignored')::boolean is not true then raise exception 'FAIL 36 late success not ignored'; end if;
  select count(*) into c from public.rides where student_id=stuA2; if c<>0 then raise exception 'FAIL 37 ride from cancelled payment'; end if; n:=n+1;

  raise exception 'ALL % CHECKS PASSED (rolled back)', n;
end $test$;
