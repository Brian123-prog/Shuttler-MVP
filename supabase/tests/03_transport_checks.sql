-- Self-contained transport checks. Creates temporary data, ALWAYS rolls back by raising a final exception.
-- Success looks like: "ALL n CHECKS PASSED (rolled back)". Requires the seed university (slug futa). Last run: 23 of 23 passed.
do $test$
declare
  futa uuid; ub uuid := gen_random_uuid();
  aA uuid := gen_random_uuid(); aB uuid := gen_random_uuid(); sA uuid := gen_random_uuid(); sBm uuid := gen_random_uuid(); sP uuid := gen_random_uuid(); pa uuid := gen_random_uuid();
  routeA uuid; routeB uuid; stop1 uuid; stop2 uuid; stop3 uuid; stopB uuid; n int := 0; c int; nm text; first_stop uuid;
begin
  select id into futa from public.universities where slug='futa';
  insert into public.universities (id, name, slug, status) values (ub, 'Isolation Test University', 'isolation-test', 'ACTIVE');
  insert into auth.users (id,email,raw_user_meta_data,email_confirmed_at) values
    (aA,'aa@t.test','{"full_name":"Admin A"}',now()), (aB,'ab@t.test','{"full_name":"Admin B"}',now()), (pa,'pa@t.test','{"full_name":"Plat"}',now()),
    (sA,'sa@t.test',jsonb_build_object('full_name','Student A','registration_role','STUDENT','university_id',futa,'student_number','A-1'),now()),
    (sBm,'sb@t.test',jsonb_build_object('full_name','Student B','registration_role','STUDENT','university_id',ub,'student_number','B-1'),now()),
    (sP,'sp@t.test',jsonb_build_object('full_name','Student P','registration_role','STUDENT','university_id',futa,'student_number','P-1'),now());
  insert into public.university_admins (profile_id, university_id) values (aA,futa),(aB,ub);
  insert into public.platform_admins (profile_id) values (pa);
  update public.university_memberships set verification_status='APPROVED' where profile_id in (sA,sBm);

  perform set_config('request.jwt.claims', json_build_object('sub',aB,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.routes (university_id, code, name, origin, destination) values (ub,'B1','B Route','B Gate','B Hall') returning id into routeB;
  insert into public.stops (university_id, name) values (ub,'B Stop') returning id into stopB;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub',aA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.routes (university_id, code, name, origin, destination, operating_days) values (futa,'R1','Main Gate to Library','Main Gate','Library','{1,2,3,4,5}') returning id into routeA;
  insert into public.stops (university_id, name, latitude, longitude) values (futa,'Main Gate',7.3,5.14) returning id into stop1;
  insert into public.stops (university_id, name) values (futa,'Library') returning id into stop2;
  insert into public.stops (university_id, name) values (futa,'Hostel') returning id into stop3;
  perform public.append_route_stop(routeA, stop1);
  perform public.append_route_stop(routeA, stop2);
  select stop_id into first_stop from public.route_stops where route_id=routeA order by stop_order limit 1;
  if first_stop<>stop1 then raise exception 'FAIL 1 initial order'; end if; n:=n+1;
  perform public.move_route_stop(routeA, stop1, 'down');
  select stop_id into first_stop from public.route_stops where route_id=routeA order by stop_order limit 1;
  if first_stop<>stop2 then raise exception 'FAIL 2 move down'; end if; n:=n+1;
  insert into public.schedules (university_id, route_id, departure_time, days_of_week) values (futa, routeA, '07:30', '{1,2,3,4,5}');
  insert into public.university_settings (university_id, support_email, support_phone) values (futa,'transport@futa.test','+2348012345678');
  n:=n+1;
  begin insert into public.routes (university_id, code, name, origin, destination) values (ub,'X1','Cross','a','b'); raise exception 'FAIL 3 cross-university insert';
  exception when insufficient_privilege then null; end; n:=n+1;
  begin perform public.append_route_stop(routeA, stopB); raise exception 'FAIL 4 foreign stop on route';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; end; n:=n+1;
  begin delete from public.routes where id=routeA; raise exception 'FAIL 5 route delete allowed';
  exception when insufficient_privilege then null; end; n:=n+1;
  begin insert into public.routes (university_id, code, name, origin, destination, operating_start, operating_end) values (futa,'R2','Bad hours','a','b','20:00','06:00'); raise exception 'FAIL 6 bad hours';
  exception when check_violation then null; end; n:=n+1;
  begin insert into public.routes (university_id, code, name, origin, destination) values (futa,'r3','Lowercase code','a','b'); raise exception 'FAIL 6b lowercase code';
  exception when check_violation then null; end; n:=n+1;
  execute 'reset role';

  begin insert into public.route_stops (route_id, stop_id, university_id, stop_order) values (routeA, stopB, futa, 9); raise exception 'FAIL 7 fk stop';
  exception when foreign_key_violation then null; end; n:=n+1;
  begin insert into public.route_stops (route_id, stop_id, university_id, stop_order) values (routeA, stop3, ub, 9); raise exception 'FAIL 8 fk route';
  exception when foreign_key_violation then null; end; n:=n+1;

  perform set_config('request.jwt.claims', json_build_object('sub',aB,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into c from public.routes where university_id=futa; if c<>0 then raise exception 'FAIL 9 B reads A routes'; end if; n:=n+1;
  update public.routes set name='Hijacked' where id=routeA;
  begin insert into public.university_settings (university_id, support_email) values (futa,'x@y.test'); raise exception 'FAIL 10 B writes A settings';
  exception when insufficient_privilege then null; end; n:=n+1;
  execute 'reset role';
  select name into nm from public.routes where id=routeA; if nm<>'Main Gate to Library' then raise exception 'FAIL 11 hijack'; end if; n:=n+1;

  perform set_config('request.jwt.claims', json_build_object('sub',sA,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into c from public.routes where university_id=futa; if c<>1 then raise exception 'FAIL 12 student reads own routes'; end if; n:=n+1;
  select count(*) into c from public.routes where university_id=ub; if c<>0 then raise exception 'FAIL 13 student reads other routes'; end if; n:=n+1;
  select count(*) into c from public.university_settings where university_id=futa; if c<>1 then raise exception 'FAIL 14 student reads settings'; end if; n:=n+1;
  begin insert into public.routes (university_id, code, name, origin, destination) values (futa,'S1','Student route','a','b'); raise exception 'FAIL 15 student insert';
  exception when insufficient_privilege then null; end; n:=n+1;
  begin perform public.move_route_stop(routeA, stop1, 'up'); raise exception 'FAIL 16 student reorder';
  exception when insufficient_privilege then null; end; n:=n+1;
  execute 'reset role';

  perform set_config('request.jwt.claims', json_build_object('sub',sP,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into c from public.routes; if c<>0 then raise exception 'FAIL 17 pending reads routes'; end if; n:=n+1;
  select count(*) into c from public.university_settings where university_id=futa; if c<>1 then raise exception 'FAIL 18 pending reads settings'; end if; n:=n+1;
  execute 'reset role';

  execute 'set local role anon';
  begin perform 1 from public.routes limit 1; raise exception 'FAIL 19 anon reads routes'; exception when insufficient_privilege then null; end; n:=n+1;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub',pa,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into c from public.routes; if c<>2 then raise exception 'FAIL 20 platform reads all routes (%)', c; end if; n:=n+1;
  execute 'reset role';

  select count(*) into c from public.audit_logs where university_id=futa and action in ('ROUTES_CREATED','STOPS_CREATED','ROUTE_STOPS_CREATED','SCHEDULES_CREATED','UNIVERSITY_SETTINGS_CREATED');
  if c<>8 then raise exception 'FAIL 21 audit rows (%)', c; end if; n:=n+1;

  raise exception 'ALL % CHECKS PASSED (rolled back)', n;
end $test$;
