-- Display data for a student's own payments (students cannot read shuttles or vehicles directly).
create function public.payment_view(p_intent_id uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', i.id, 'status', i.status, 'amount_kobo', i.amount_kobo, 'currency', i.currency,
    'provider_environment', i.provider_environment, 'provider_reference', i.provider_reference,
    'failure_reason', i.failure_reason, 'created_at', i.created_at, 'expires_at', i.expires_at,
    'shuttle_code', s.code, 'plate', v.plate_number, 'route_code', r.code, 'route_name', r.name,
    'university_name', u.name, 'receipt_number', rc.receipt_number, 'paid_at', p.paid_at
  )
  from public.payment_intents i
  join public.shuttles s on s.id = i.shuttle_id
  join public.vehicles v on v.id = s.vehicle_id
  left join public.routes r on r.id = i.route_id
  join public.universities u on u.id = i.university_id
  left join public.payments p on p.intent_id = i.id
  left join public.payment_receipts rc on rc.payment_id = p.id
  where i.id = p_intent_id and i.student_id = (select auth.uid())
$$;

create function public.my_payments(p_limit integer default 20) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(public.payment_view(x.id) order by x.created_at desc), '[]'::jsonb)
  from (
    select id, created_at from public.payment_intents
     where student_id = (select auth.uid())
     order by created_at desc limit least(greatest(p_limit, 1), 50)
  ) x
$$;

revoke all on function public.payment_view(uuid) from public, anon;
revoke all on function public.my_payments(integer) from public, anon;
grant execute on function public.payment_view(uuid) to authenticated;
grant execute on function public.my_payments(integer) to authenticated;
