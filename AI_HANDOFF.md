# Shuttler - AI Handoff

- Project: Shuttler, university transportation and payment platform
- Version: 0.8.0
- Current milestone: MILESTONE 07 complete in source (cash and change claims). Deployment checkpoint still pending.
- Last updated: 2026-09-30
- Updated by: Claude

## Owner rules
1. NO EMOJIS anywhere in the app (enforced by `npm run check:emoji`).
2. Stop after each milestone; wait for CONTINUE.
3. Provide a ZIP at the end of every milestone.
4. No fake payments, balances, approvals or Ecobank APIs.

## Status
- Written in a sandbox with no network. `npm install`, `tsc`, `eslint`, `vitest` and `next build` have NOT been run.
  Package versions in package.json are ranges chosen from memory and are UNVERIFIED. First action for the owner or next AI:
  `npm install && npm run verify`, fix any failures, commit package-lock.json.
- Verified in sandbox: emoji CLI check passes; emoji and money logic exercised with plain Node.

## Real vs not built
- Real: design system, Logo, UI components, Supabase client helpers, migration 0001, money utils, emoji guard.
- Not built: dashboards, admin review UI, platform admin university management, everything transport/payment/Ecobank.
- Mocked: nothing. Payments: none. Ecobank: NOT INTEGRATED.
- Landing page shows disabled Login/Register buttons that say registration opens in Milestone 01.

## Environment variables
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY (server only), FINANCIAL_PROVIDER.

## Database (migration 20260930000001_foundation.sql)
Enums account_status, verification_status, university_status. Tables: universities (public read of ACTIVE only), profiles (self read), audit_logs (RLS, no policies). Seed: FUTA and Test University B (dev only).

## Known risks
- Tailwind v4 syntax and Next 15 / @supabase/ssr APIs written from memory; may need small fixes on first build.
- Profiles have no update policy yet on purpose (prevents self-editing account_status).

## Live database (Supabase project "Shuttler", ref cfhojjwlojilkshvrylr, eu-central-1)
2026-09-30: an earlier schema (14 tables, 7 auth users) was wiped at the owner's explicit request. Migrations 0001 (foundation) and 0002
(auth_roles_registration) were applied via the Supabase connector. 19 behavioural checks (registration trigger, no self-approval,
cross-university isolation, account_status protection, note-required rejection, audit/history) PASSED against the live DB and were rolled back.
Dev seed loaded: FUTA and TUB (ACTIVE). 9 public tables, all with RLS. No auth users exist yet; create admins per supabase/dev_bootstrap_admins.sql.example.
Note: applied migration versions in the DB use connector timestamps and differ from the repo filenames; the SQL is identical.
Still unverified: the Next.js app (never installed or built).

## Milestone 01 summary
Auth actions in src/app/(auth)/actions.ts; registration trigger and review_membership() in migration 0002; pgTAP tests in supabase/tests; /account page; middleware protects /account. Post-login destination is /account.
Unverified: everything (never installed, built, or run). Fix build errors first.
Admin users: create in Supabase dashboard, then run supabase/dev_bootstrap_admins.sql.example.
A Supabase connector was offered to the owner so migrations/tests can be applied directly.

## Next: MILESTONE 02 (was 01 text below; ignore completed items)
Login/logout/recovery; Register as Student and as Driver; university selection; tables university_memberships, students, drivers, driver_verifications, university_admins, platform_admins; registration trigger/server action creating profile + membership + role row with PENDING; RLS for those tables; middleware route protection; tests (driver cannot self-approve, cross-university isolation).


## Milestone 02 summary (read this first)
- Supabase project cfhojjwlojilkshvrylr ("Shuttler", eu-central-1) was WIPED at the owner's request and rebuilt from migrations 1-4. Migrations are applied there and match supabase/migrations.
- Dev seed loaded: FUTA and Test University B. admin_grants rows exist for martians7469@gmail.com (PLATFORM_ADMIN, and UNIVERSITY_ADMIN for FUTA). The owner must create that login in the Supabase dashboard (Auto Confirm); roles attach at first sign-in via /account.
- Another account exists (jm028933@gmail.com) with no role. Untouched.
- Live DB checks: supabase/tests/02_live_checks.sql, 28/28 passed. Next.js app code never built here: run npm install && npm run verify first and fix errors.
- UI rule: no developer/milestone text or styleguide shown to users. No emojis.
- Known gaps: remove university admin, multi-university admin switcher, notifications, Playwright, leaked-password protection toggle (dashboard), custom SMTP.
- Next: user-run deployment checkpoint 01 (docs/DEPLOYMENT.md, docs/TESTING.md), then Milestone 03 transportation core (routes, stops, schedules) on CONTINUE.


## Milestone 03 summary (latest)
- Live Supabase project has migrations 1-5 applied. Only real data: FUTA university; admin_grants for martians7469@gmail.com. Test university removed.
- Live checks: supabase/tests/03_transport_checks.sql (23/23). The Next.js code has never been built: run npm install && npm run verify first.
- Owner rules: no emojis, no demo content, no placeholder or filler text in the UI, zip at the end of every milestone.
- Next: Milestone 04 shuttles, vehicles, driver assignments (approved drivers only), QR generation/revocation/scanning.


## Milestone 04 summary (latest)
- Live Supabase project has migrations 1-6. Live checks: supabase/tests/04_shuttles_qr_checks.sql (26/26). Next.js code never built here: run npm install (new deps: qrcode, html5-qrcode, @types/qrcode) then npm run verify.
- Owner reported the register page showing "environment variables missing": most likely a lost .env.local after unzipping. The loader now distinguishes missing config from a failed query.
- Set NEXT_PUBLIC_SITE_URL to the real public URL before printing QR codes.
- Next: Milestone 05 fare engine (versioned fares, per route, effective dates, shown on the scan result).


## Milestone 05 summary (latest)
- Live Supabase project has migrations 1-7 (and a no-op 8). Live checks 02 to 05 all pass.
- Static review done with tsc 6 against stub declarations (see /tmp approach in docs/milestones/MILESTONE_05.md): fixed unused import, React namespace, dynamic rendering, headers. A real build is still the first thing to run.
- Next: Milestone 06 direct digital payment: payment intents, FinancialProvider abstraction with a clearly labelled sandbox/mock, idempotency, state machine, receipts, webhooks. Never mark success from the client.


## Milestone 06 summary (latest)
- Live Supabase has migrations through payments_core and payment_views (repo files 9 and 10). Live checks 02 to 06 pass.
- New env: SUPABASE_SERVICE_ROLE_KEY, FINANCIAL_PROVIDER (mock), PAYMENT_WEBHOOK_SECRET, ALLOW_MOCK_PAYMENTS (production test only). Without them the Pay button is hidden.
- Never mark a payment paid from client input; always reconcilePayment (src/lib/payments/process.ts).
- Next: Milestone 07 cash and change claims (student claim, driver confirm or reject, disputes, notifications later).


## Deployment hardening note (latest)
Owner's first Vercel deploy failed in the build (npm run build exited) around src/lib/supabase/middleware.ts; the exact log was not seen. The helper was rewritten, build lint/type blocking relaxed, and docs/DEPLOYMENT.md rewritten. If it fails again: get the first red lines of the Vercel build log and fix that specific error; run npm run build locally first.
Milestone 07 status: migration 11 (change_claims, disputes, claim functions) is applied to the live project and saved in the repo; screens for students, drivers and admins are NOT built yet. Live checks for it have not been run yet.


## Milestone 07 summary (latest)
- Live Supabase has migrations through change_claims (repo file 11). Live checks 02 to 07 pass. App screens for claims written; not built or browser-tested.
- Next: Milestone 08 transportation credit ledger: immutable ledger_entries and credit accounts per student and university; create entries for every CONFIRMED claim (backfill), consume credit with partial use and credit plus payment, concurrency-safe, reversals, audit trail.


## Technology audit note (latest)
Project stays on Next 15 / React 19 / TS 5.9 / ESLint 9 / Tailwind 4 / supabase-js 2 and ssr 0.6 (see docs/TECH_STACK.md and D-042 to D-045). No lockfile exists in the ZIP: the owner must run npm install and commit package-lock.json. The authoring sandbox cannot reach npm, so npm install, lint, tests and build were NOT run here. Owner reported local Node 26.1.0, npm 11.13.0 and Next 16.3.8, which differ from the project's declared Next ^15.5.0: run npm run versions after npm install.


## Next 16 migration note (latest; supersedes the earlier stay-on-15 note)
Owner's environment: Node 26.1.0, npm 11.13.0, Next 16.3.8. Project now declares next 16.3.8, React 19.2, proxy.ts instead of middleware.ts. NOT built or linted here (no registry access in the authoring sandbox). First actions for the owner: delete node_modules and any old lockfile, npm install, npm run versions, npm run lint, npm run typecheck, npm test, npm run build; then commit package-lock.json. Likely first-run findings: new React-hooks lint rules from eslint-config-next 16, and Turbopack build messages.


## Driver QR and profile pictures (latest)
Live Supabase has migration 12 (repo file 20260930000012). Live checks 02 to 08 pass. Scan target resolution is centralised in find_qr_target; any new feature that takes a QR input must use it. Pictures: private bucket avatars, signed URLs via src/lib/avatars.ts, visibility in can_view_avatar. Driver registration stores the picture server-side with the service role (src/lib/avatars-admin.ts). Not browser-tested.
Next: Milestone 08 transportation credit ledger (backfill an entry for every CONFIRMED claim).


## Landing page redesign (latest)
Done: new public page at / (see docs/LANDING_PAGE.md). Files changed: src/app/page.tsx, src/app/globals.css (one token: --color-brand-300). New: src/components/landing/* (10 files). Everything else is byte-for-byte unchanged (verified by comparing file fingerprints before and after; protected areas unchanged: supabase, proxy, auth, dashboards, payments, claims).
Status: no git repository existed in the ZIP, so the scope check used checksums. Type check against stand-in types: no errors in our code. The hero artwork was rendered in a headless browser and inspected; the full page could not be rendered (Tailwind and Next are not installed in the sandbox), so the owner must view / on desktop and phone. npm run build NOT run here.
Issue reporting: NOT implemented beyond disputes of rejected change claims. The product requirement (students and drivers report transportation issues to their university administrator: driver conduct, rider conduct, payment or change disputes, shuttle problems, safety, operations) is documented here as a roadmap item. Do not describe it as available until built.
Credit: the ledger (Milestone 08) is not built; the landing page marks "Carry your credit" as Coming soon. Remove that tag when Milestone 08 ships.
Next: owner reviews the page; then Milestone 08 (credit ledger), then a general issue-reporting feature, then notifications.
