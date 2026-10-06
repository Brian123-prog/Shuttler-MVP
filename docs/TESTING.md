# Testing
- Unit (Vitest): money, emoji guard, validation. Run `npm test`.
- Database (pgTAP): `supabase/tests/01_roles_and_isolation.test.sql`, run `npx supabase test db`. Covers registration trigger, no self-approval,
  cross-university isolation, account_status protection, note-required rejection, audit and history rows.
- Planned: Playwright end-to-end (Milestone 02 onward).
Status: none of these have been executed in the authoring sandbox. Run `npm run verify` and `npx supabase test db` locally.

## Milestone 02
supabase/tests/02_live_checks.sql: 28 checks run against the live Supabase project (registration, isolation, self-approval blocks, grants, platform functions); all passed and rolled back.
Application code (Next.js) has still NOT been built or type-checked in the authoring sandbox. Run npm run verify.

## Milestone 03
supabase/tests/03_transport_checks.sql: 23 checks against the live Supabase project (tenant isolation on routes/stops/settings, composite foreign keys, route ordering, role permissions, audit rows). All passed and rolled back.

## Manual verification workflow
1. Create the administrator login in Supabase (Authentication, Users, Add user, Auto Confirm) with an email that has a row in admin_grants, then sign in.
2. Register a student and a driver through the site. Each sees the verification screen.
3. As university administrator: Students and Drivers, review, approve (reject and suspend need a note).
4. As university administrator: Stops, add stops. Routes, add a route, add its stops, reorder, add departures. Settings, add transport office contact.
5. Sign in as the approved student and driver: the dashboard lists active routes with ordered stops and departures, and the transport office contact.
6. As platform administrator: Universities, add and edit a university, add a university administrator by email.

## Milestone 04
supabase/tests/04_shuttles_qr_checks.sql: 26 checks against the live project (approved-driver rule, one driver per shuttle, cross-university protection, QR replace and revoke, resolution rules for approved, pending and other-university users, driver visibility, automatic removal on suspension). All passed and rolled back.
Manual: add a shuttle, assign an approved driver, generate and print its QR, then sign in as an approved student of that university and scan (or type the code).

## Milestone 05
supabase/tests/05_fare_checks.sql: 26 checks against the live project (default and route fares, scheduled changes with history, immutability, no retroactive fares, cross-university protection, students and pending users, scan result carries the fare). All passed and rolled back.
Unit tests: src/lib/fares/resolve.test.ts. Manual: set a default fare and a route fare under Fares, schedule a change for tomorrow, then scan a shuttle as an approved student and check the fare shown.

## Milestone 06
supabase/tests/06_payment_checks.sql: 34 checks against the live project (idempotency, open-payment reuse, no driver, inactive shuttle, other university, pending student, driver cannot pay, clients cannot call provider functions or write payments, amount and reference mismatch refused, duplicate success, late failure ignored, immutable amounts, duplicate webhook events, visibility for students, admins and drivers, cancel then late success). All passed and rolled back.
Manual (needs FINANCIAL_PROVIDER=mock, PAYMENT_WEBHOOK_SECRET and SUPABASE_SERVICE_ROLE_KEY): scan a shuttle that has a driver and a fare, press Pay, complete or decline on the test checkout, and check the receipt and the administrator Payments page.

## Milestone 07
supabase/tests/07_change_claim_checks.sql: 36 checks against the live project (change calculation, idempotency, limits, who can and cannot confirm, rejection, cancellation, disputes and their resolution, cash rides, visibility for students, drivers and administrators, state machine, suspended driver). All passed and rolled back.
Manual: as an approved student scan a shuttle that has a driver and a fare and use Record cash payment; as that shuttle's driver open Claims and confirm or reject; as the student dispute a rejection; as the university administrator decide it under Claims.

## Driver QR codes and profile pictures
supabase/tests/08_driver_qr_and_avatar_checks.sql: 34 checks against the live project (issue, replace, bulk issue, revoke on suspension, who can and cannot see or issue codes, scanning through a driver code and a shuttle code, payment and cash claim through a driver code, picture folder rule and who may view which picture). All passed and rolled back. Unit test: src/lib/image.test.ts.
Manual: as university administrator open Driver QR, issue a code for an approved driver and print it; as an approved student scan it (or type the code) and check the driver's name and photo; register a driver with a picture; add a student picture under Profile; confirm the administrator sees both pictures on the review page.
