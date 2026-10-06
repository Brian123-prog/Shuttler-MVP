# Database

Migrations (apply in order):
1. foundation: enums, universities, profiles, audit_logs
2. auth_roles_registration: memberships, students, drivers, driver_verifications, university_admins, platform_admins, helpers, registration trigger, review_membership, RLS
3. admin_grants_platform_functions: admin_grants, apply/claim_admin_grants, platform_save_university, platform_assign_university_admin
4. harden_function_privileges: trigger functions not callable via API; new functions private by default
5. transport_core: university_settings, routes, stops, route_stops (ordered, composite FKs), schedules, is_approved_member, audit_change trigger, append_route_stop, move_route_stop, RLS

Rules: clients cannot insert/update/delete role tables; profiles allow updating only full_name and phone; students/drivers are tied to their
membership by a composite foreign key; student ID and licence number are unique per university; verification status lives only on memberships.
Security-definer functions that clients may call (and why): review_membership, claim_admin_grants, platform_save_university,
platform_assign_university_admin (each checks authorization itself); is_platform_admin and is_university_admin (used by RLS policies).

Seed (development only): supabase/seed.sql. Live checks: supabase/tests/02_live_checks.sql (rolls back).
6. shuttles_assignments_qr: vehicles, shuttles, shuttle_assignments, qr_codes; create_shuttle, update_shuttle, assign_driver, end_assignment, replace_shuttle_qr, revoke_shuttle_qr, resolve_qr; triggers that allow only approved drivers and end a driver's assignment when they stop being approved.

Shuttle rules: one current driver per shuttle and one current shuttle per driver (partial unique indexes); assignment history is kept (ended_at). Shuttle, vehicle, route and driver are tied to the same university by composite foreign keys.
QR rules: the QR holds an opaque 32 character token (no personal data). One active code per shuttle; replace or revoke takes effect at once. Students resolve codes only through resolve_qr, which works for approved members and administrators of that university and gives the same error for every failure. The qr_codes table is readable only by that university's administrators.
7. fare_engine: fares (versioned history), applicable_fare, set_fare, end_fare; resolve_qr now returns the fare in force. (Migration 8 is a no-op marker; the end_fare fix is inside migration 7 for fresh installs.)

Fare rules: a fare is never edited or deleted (trigger plus no write privileges); setting a new fare ends the previous one at the new start date; no fares in the past; one open fare per scope (university default or route); a route fare overrides the default. Amounts are integer kobo between 1 and 100,000,000.
8. payments_core: payment_intents, rides, payments, payment_receipts, provider_events, mock_provider_transactions; payment state-machine trigger; create_payment_intent, cancel_payment_intent (signed-in student); mark_payment_pending, apply_payment_result, record_provider_event, set_provider_event_outcome (service role only).
9. (file 10) payment_views: payment_view and my_payments give a student their own payment details with shuttle and route names.
(The repository numbers migrations by file; the live project applied them in the same order.)
10. (file 11) change_claims: change_claims, disputes, rides.claim_id; create_change_claim, decide_change_claim, cancel_change_claim, dispute_change_claim, resolve_dispute, claim_details, my_claims; claim state-machine trigger.
11. (file 12) driver_qr_and_avatars: profiles.avatar_path; private storage bucket `avatars` (2 MB, JPEG/PNG/WebP) with storage policies; can_view_avatar; driver_qr_codes; replace_driver_qr, revoke_driver_qr, generate_missing_driver_qrs; find_qr_target; resolve_qr, create_payment_intent and create_change_claim now accept shuttle codes and driver codes.

Driver QR rules: only the university's administrators issue, replace or revoke; one active code per driver; only approved drivers can hold one; a driver who is suspended, rejected or otherwise not approved loses the code immediately. A driver code resolves to the driver's current shuttle, so fare, payment and cash claims work the same as with a shuttle code. If the driver has no shuttle, scanning shows the driver but payments are refused.
Profile pictures: stored privately at avatars/<user id>/<random>.<ext>. Visible to the owner, to administrators of the person's university, to approved members of a university for its approved drivers (so riders can recognise their driver), and to a driver for students who made a claim against them. People can only write inside their own folder.
