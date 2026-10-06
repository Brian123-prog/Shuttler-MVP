-- Self-contained shuttle, assignment and QR checks. Creates temporary data and ALWAYS rolls back.
-- Success looks like: "ALL n CHECKS PASSED (rolled back)". Requires the seed university (slug futa). Last run: 26 of 26 passed.
do $test$
declare
  futa uuid; ub uuid := gen_random_uuid();
  aA uuid := gen_random_uuid(); aB uuid := gen_random_uuid();
  dA uuid := gen_random_uuid(); dA2 uuid := gen_random_uuid(); dP uuid := gen_random_uuid(); dB uuid := gen_random_uuid();
  stuA uuid := gen_random_uuid(); stuB uuid := gen_random_uuid(); stuP uuid := gen_random_uuid();
  routeA uuid; routeB uuid; sh1 uuid; sh2 uuid; drA uuid; drA2 uuid; drP uuid; drB uuid;
  tok text; sc text; res jsonb; n int := 0; c int; mem uuid;
begin
  select id into futa from public.universities where slug='futa';
  insert into public.universities (id, name, slug, status) values (ub,'Isolation Test University','isolation-test','ACTIVE');
  insert into auth.users (id,email,raw_user_meta_data,email_confirmed_at) values
    (aA,'aa@t.test','{"full_name":"Admin A"}',now()), (aB,'ab@t.test','{"full_name":"Admin B"}',now()),
    (dA,'da@t.test',jsonb_build_object('full_name','Driver A','registration_role','DRIVER','university_id',futa,'license_number','LIC-A'),now()),
    (dA2,'da2@t.test',jsonb_build_object('full_name','Driver A2','registration_role','DRIVER','university_id',futa,'license_number','LIC-A2'),now()),
    (dP,'dp@t.test',jsonb_build_object('full_name','Driver Pending','registration_role','DRIVER','university_id',futa,'license_number','LIC-P'),now()),
    (dB,'db@t.test',jsonb_build_object('full_name','Driver B','registration_role','DRIVER','university_id',ub,'license_number','LIC-B'),now()),
    (stuA,'sa@t.test',jsonb_build_object('full_name','Student A','registration_role','STUDENT','university_id',futa,'student_number','A-1'),now()),
    (stuB,'sb@t.test',jsonb_build_object('full_name','Student B','registration_role','STUDENT','university_id',ub,'student_number','B-1'),now()),
    (stuP,'sp@t.test',jsonb_build_object('full_name','Student P','registration_role','STUDENT','university_id',futa,'student_number','P-1'),now());
  insert into public.university_admins (profile_id, university_id) values (aA,futa),(aB,ub);
  update public.university_memberships set verification_status='APPROVED' where profile_id in (dA,dA2,dB,stuA,stuB);
  select id into drA from public.drivers where profile_id=dA; select id into drA2 from public.drivers where profile_id=dA2;
  select id into drP from public.drivers where profile_id=dP; select id into drB from public.drivers where profile_id=dB;
  insert into public.routes (university_id, code, name, origin, destination) values (futa,'R1','Main','Gate','Library') returning id into routeA;
  insert into public.routes (university_id, code, name, origin, destination) values (ub,'B1','Route B','x','y') returning id into routeB;

  perform set_config('request.jwt.claims', json_build_object('sub',aA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  sh1 := public.create_shuttle(futa,'sh-1','abc 123','Toyota Hiace',14,routeA);
  sh2 := public.create_shuttle(futa,'SH-2','XYZ 789',null,18,null);
  if (select code from public.shuttles where id=sh1) <> 'SH-1' then raise exception 'FAIL 1 code normalised'; end if; n:=n+1;
  begin perform public.create_shuttle(futa,'SH-3','ABC 123','dup',10,null); raise exception 'FAIL 2 duplicate plate';
  exception when unique_violation then null; end; n:=n+1;
  begin perform public.assign_driver(sh1, drP); raise exception 'FAIL 3 pending driver assigned';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  perform public.assign_driver(sh1, drA);
  perform public.assign_driver(sh2, drA);
  select count(*) into c from public.shuttle_assignments where driver_id=drA and ended_at is null; if c<>1 then raise exception 'FAIL 4 one shuttle per driver'; end if; n:=n+1;
  select count(*) into c from public.shuttle_assignments where shuttle_id=sh1 and ended_at is null; if c<>0 then raise exception 'FAIL 5 old shuttle freed'; end if; n:=n+1;
  perform public.assign_driver(sh2, drA2);
  select count(*) into c from public.shuttle_assignments where driver_id=drA and ended_at is null; if c<>0 then raise exception 'FAIL 6 replaced driver ended'; end if; n:=n+1;
  begin perform public.assign_driver(sh1, drB); raise exception 'FAIL 7 foreign driver assigned';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  perform public.replace_shuttle_qr(sh1); perform public.replace_shuttle_qr(sh1);
  execute 'reset role';
  select count(*) into c from public.qr_codes where shuttle_id=sh1 and status='ACTIVE'; if c<>1 then raise exception 'FAIL 8 one active qr'; end if; n:=n+1;
  select count(*) into c from public.qr_codes where shuttle_id=sh1 and status='REVOKED'; if c<>1 then raise exception 'FAIL 9 old qr revoked'; end if; n:=n+1;
  select token, short_code into tok, sc from public.qr_codes where shuttle_id=sh1 and status='ACTIVE';

  perform set_config('request.jwt.claims', json_build_object('sub',aB,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.create_shuttle(ub,'B-1','BBB 111',null,10,routeA); raise exception 'FAIL 10 foreign route';
  exception when foreign_key_violation then null; end; n:=n+1;
  begin perform public.update_shuttle(sh1,'HJ','HJK 111',null,10,null,'ACTIVE'); raise exception 'FAIL 11 hijack shuttle';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  select count(*) into c from public.qr_codes; if c<>0 then raise exception 'FAIL 12 admin B reads A qr'; end if; n:=n+1;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub',stuA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  res := public.resolve_qr(tok);
  if res->>'shuttle_code' <> 'SH-1' or (res->>'in_service')::boolean is not true then raise exception 'FAIL 13 resolve token'; end if; n:=n+1;
  res := public.resolve_qr('https://x.test/student/scan?c=' || tok);
  if res->>'plate' <> 'ABC 123' then raise exception 'FAIL 14 resolve url'; end if; n:=n+1;
  res := public.resolve_qr(lower(sc));
  if res->>'route_code' <> 'R1' then raise exception 'FAIL 15 resolve short code'; end if; n:=n+1;
  begin perform public.resolve_qr('not-a-real-code-12345'); raise exception 'FAIL 16 garbage';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  select count(*) into c from public.qr_codes; if c<>0 then raise exception 'FAIL 17 student reads qr table'; end if; n:=n+1;
  begin perform public.create_shuttle(futa,'S-9','SSS 999',null,5,null); raise exception 'FAIL 18 student created shuttle';
  exception when insufficient_privilege then null; end; n:=n+1;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub',stuB,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.resolve_qr(tok); raise exception 'FAIL 19 other university resolved';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub',stuP,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.resolve_qr(tok); raise exception 'FAIL 20 pending student resolved';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  execute 'reset role';
  execute 'set local role anon';
  begin perform public.resolve_qr(tok); raise exception 'FAIL 21 anon resolved'; exception when insufficient_privilege then null; end; n:=n+1;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub',dA2,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into c from public.shuttles; if c<>1 then raise exception 'FAIL 22 driver sees only own shuttle (%)', c; end if; n:=n+1;
  select count(*) into c from public.vehicles; if c<>1 then raise exception 'FAIL 23 driver sees only own vehicle'; end if; n:=n+1;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub',aA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  perform public.revoke_shuttle_qr(sh1);
  select id into mem from public.university_memberships where profile_id=dA2;
  perform public.review_membership(mem,'SUSPENDED','Licence expired');
  execute 'reset role';
  select count(*) into c from public.shuttle_assignments where driver_id=drA2 and ended_at is null; if c<>0 then raise exception 'FAIL 24 suspension ends assignment'; end if; n:=n+1;
  perform set_config('request.jwt.claims', json_build_object('sub',stuA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.resolve_qr(tok); raise exception 'FAIL 25 revoked qr resolved';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub',aA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.assign_driver(sh2, drA2); raise exception 'FAIL 26 suspended driver reassigned';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  execute 'reset role';

  raise exception 'ALL % CHECKS PASSED (rolled back)', n;
end $test$;
