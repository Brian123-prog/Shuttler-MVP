-- Self-contained fare engine checks. Creates temporary data and ALWAYS rolls back.
-- Success looks like: "ALL n CHECKS PASSED (rolled back)". Requires the seed university (slug futa). Last run: 26 of 26 passed.
-- Note: inside one transaction now() does not advance, so ending a fare is checked 5 seconds ahead.
do $test$
declare
  futa uuid; ub uuid := gen_random_uuid();
  aA uuid := gen_random_uuid(); aB uuid := gen_random_uuid(); stuA uuid := gen_random_uuid(); stuB uuid := gen_random_uuid(); stuP uuid := gen_random_uuid();
  routeA uuid; routeA2 uuid; routeB uuid; shA uuid; f1 uuid; n int := 0; c int; f public.fares; res jsonb; tok text; ended timestamptz; amt int;
begin
  select id into futa from public.universities where slug='futa';
  insert into public.universities (id,name,slug,status) values (ub,'Isolation Test University','isolation-test','ACTIVE');
  insert into auth.users (id,email,raw_user_meta_data,email_confirmed_at) values
    (aA,'aa@t.test','{"full_name":"Admin A"}',now()),(aB,'ab@t.test','{"full_name":"Admin B"}',now()),
    (stuA,'sa@t.test',jsonb_build_object('full_name','Student A','registration_role','STUDENT','university_id',futa,'student_number','A-1'),now()),
    (stuB,'sb@t.test',jsonb_build_object('full_name','Student B','registration_role','STUDENT','university_id',ub,'student_number','B-1'),now()),
    (stuP,'sp@t.test',jsonb_build_object('full_name','Student P','registration_role','STUDENT','university_id',futa,'student_number','P-1'),now());
  insert into public.university_admins (profile_id,university_id) values (aA,futa),(aB,ub);
  update public.university_memberships set verification_status='APPROVED' where profile_id in (stuA,stuB);
  insert into public.routes (university_id,code,name,origin,destination) values (futa,'R1','Route One','Gate','Library') returning id into routeA;
  insert into public.routes (university_id,code,name,origin,destination) values (futa,'R2','Route Two','Gate','Hostel') returning id into routeA2;
  insert into public.routes (university_id,code,name,origin,destination) values (ub,'B1','Route B','x','y') returning id into routeB;

  perform set_config('request.jwt.claims', json_build_object('sub',aA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  f1 := public.set_fare(futa, null, 15000);
  perform public.set_fare(futa, routeA, 20000);
  select * into f from public.applicable_fare(futa, routeA2, now()); if f.amount_kobo<>15000 then raise exception 'FAIL 1 default fare'; end if; n:=n+1;
  select * into f from public.applicable_fare(futa, routeA, now()); if f.amount_kobo<>20000 then raise exception 'FAIL 2 route fare overrides'; end if; n:=n+1;
  select * into f from public.applicable_fare(futa, null, now()); if f.amount_kobo<>15000 then raise exception 'FAIL 2b null route uses default'; end if; n:=n+1;
  perform public.set_fare(futa, null, 25000, now() + interval '1 day');
  select * into f from public.applicable_fare(futa, routeA2, now()); if f.amount_kobo<>15000 then raise exception 'FAIL 3 old fare still current'; end if; n:=n+1;
  select * into f from public.applicable_fare(futa, routeA2, now() + interval '2 days'); if f.amount_kobo<>25000 then raise exception 'FAIL 4 new fare from its date'; end if; n:=n+1;
  select effective_to into ended from public.fares where id=f1;
  if ended is null then raise exception 'FAIL 5 old fare not ended'; end if; n:=n+1;
  select amount_kobo into amt from public.fares where id=f1; if amt<>15000 then raise exception 'FAIL 6 old amount changed'; end if; n:=n+1;
  begin perform public.set_fare(futa, null, 30000, now() + interval '12 hours'); raise exception 'FAIL 7 earlier than scheduled fare';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  begin perform public.set_fare(futa, null, 30000, now() - interval '2 days'); raise exception 'FAIL 8 retroactive fare';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  begin perform public.set_fare(futa, null, 0); raise exception 'FAIL 9 zero fare';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  begin perform public.set_fare(futa, routeB, 10000); raise exception 'FAIL 10 foreign route';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  begin update public.fares set amount_kobo=1 where id=f1; raise exception 'FAIL 11 direct update';
  exception when insufficient_privilege then null; end; n:=n+1;
  begin delete from public.fares where id=f1; raise exception 'FAIL 12 direct delete';
  exception when insufficient_privilege then null; end; n:=n+1;
  perform public.end_fare(futa, routeA);
  select * into f from public.applicable_fare(futa, routeA, now() + interval '5 seconds'); if f.amount_kobo<>15000 then raise exception 'FAIL 13 falls back to default after ending route fare'; end if; n:=n+1;
  perform public.set_fare(futa, routeA, 22000, now() + interval '1 hour');
  shA := public.create_shuttle(futa,'SH-1','FAR 111',null,10,routeA2);
  perform public.replace_shuttle_qr(shA);
  execute 'reset role';
  select token into tok from public.qr_codes where shuttle_id=shA and status='ACTIVE';
  begin update public.fares set amount_kobo=1 where id=f1; raise exception 'FAIL 14 owner update allowed';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  begin delete from public.fares where id=f1; raise exception 'FAIL 15 owner delete allowed';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;

  perform set_config('request.jwt.claims', json_build_object('sub',stuA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  res := public.resolve_qr(tok);
  if (res->>'fare_kobo')::int <> 15000 then raise exception 'FAIL 16 scan shows default fare (%)', res; end if; n:=n+1;
  select count(*) into c from public.fares where university_id=futa; if c<4 then raise exception 'FAIL 17 student reads fares (%)', c; end if; n:=n+1;
  select count(*) into c from public.fares where university_id=ub; if c<>0 then raise exception 'FAIL 18 student reads other fares'; end if; n:=n+1;
  begin perform public.set_fare(futa, null, 1000, now() + interval '30 days'); raise exception 'FAIL 19 student set fare';
  exception when insufficient_privilege then null; end; n:=n+1;
  begin perform public.end_fare(futa, null); raise exception 'FAIL 20 student ended fare';
  exception when insufficient_privilege then null; end; n:=n+1;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub',stuP,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into c from public.fares; if c<>0 then raise exception 'FAIL 21 pending reads fares'; end if; n:=n+1;
  select count(*) into c from (select * from public.applicable_fare(futa, null, now())) x where x.id is not null; if c<>0 then raise exception 'FAIL 22 pending resolves fare'; end if; n:=n+1;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub',aB,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.set_fare(futa, null, 1000); raise exception 'FAIL 23 admin B set A fare';
  exception when insufficient_privilege then null; end; n:=n+1;
  select count(*) into c from public.fares where university_id=futa; if c<>0 then raise exception 'FAIL 24 admin B reads A fares'; end if; n:=n+1;
  execute 'reset role';
  execute 'set local role anon';
  begin perform public.set_fare(futa, null, 1000); raise exception 'FAIL 25 anon set fare'; exception when insufficient_privilege then null; end; n:=n+1;
  execute 'reset role';

  raise exception 'ALL % CHECKS PASSED (rolled back)', n;
end $test$;
