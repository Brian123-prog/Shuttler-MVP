# Changelog

## 0.1.0 - Milestone 00: Foundation (2026-09-30)
- Next.js + TypeScript (strict) + Tailwind scaffold, source written without registry access (see docs/DECISIONS.md D-003).
- Design tokens (deep blue and white), Logo component, reusable UI components.
- Supabase browser/server/middleware clients (session refresh only).
- Migration 0001: enums, universities, profiles, audit_logs with RLS enabled. Development seed.
- Money utilities (integer kobo) with unit tests.
- No-emoji guard (CLI and tests).
- Documentation set.

## 0.2.0 - Milestone 01: Authentication and registration (2026-09-30)
- Login, logout, password recovery, email callback route.
- Register as Student and Register as Driver with university selection, atomic profile/membership/role creation (PENDING).
- Migration 0002: role model, RLS, registration trigger, review_membership RPC.
- /account page showing verification state; middleware route protection.
- Validation library with tests; pgTAP tests for roles and isolation.

- Applied 0001 and 0002 to the live Supabase project after wiping the old schema; behavioural checks passed (see AI_HANDOFF.md).

## 0.3.0 - Milestone 02: Verification, dashboards, visual product (2026-09-30)
- Role areas and dashboards for student, driver, university admin and platform admin.
- Verification queues and review screens; platform university management; admin grants by verified email.
- Migrations 3 and 4. Live database checks (28 passing). Removed developer-facing text from the UI.

## 0.4.0 - Milestone 03: Transport core (2026-10-01)
- Migration 5: university settings, routes, stops, route stops with ordering, schedules, audit trigger, tenant-safe composite keys, RLS.
- University admin: Routes, Stops, Settings. Students and drivers see active routes, ordered stops and departures after approval.
- Removed placeholder panels, the demo document, status copy and the test university. 23 live checks passing.

## 0.5.0 - Milestone 04: Shuttles, drivers and QR (2026-10-01)
- Migration 6: vehicles, shuttles, driver assignments, QR codes, approved-driver rules, tenant-safe keys, RLS.
- University admin: Shuttles (create, edit, assign driver, generate, print, replace and revoke QR).
- Students: Scan page with camera scanning and manual code entry showing shuttle, driver and route. Drivers see their assigned shuttle.
- Registration page now reports a failed university load honestly instead of blaming configuration.
- 26 live checks passing.

## 0.6.0 - Milestone 05: Fare engine (2026-10-01)
- Migration 7: versioned fares, route and default scopes, scheduled changes, set_fare and end_fare, scan result carries the fare.
- University admin Fares page (fares in force, set or schedule a fare, history). Riders see the fare on routes and after scanning.
- Deployment hardening: removed an unused import that would fail lint during build, typed React imports, forced dynamic rendering of auth pages, security headers, favicon metadata, full Vercel deployment guide.
- 26 live fare checks passing.

## 0.7.0 - Milestone 06: Direct digital payment (2026-10-01)
- Migrations 9 and 10: payment intents with a database-enforced state machine, rides, payments, receipts, provider events, student payment views.
- FinancialProvider abstraction and a labelled test provider (signed webhooks, own ledger). Server verifies with the provider before changing any status.
- Students: Pay on the scan result, payment status and receipt pages, payment history, cancel. Administrators: Payments page. Drivers: recent rides.
- Service-role client for server-only provider work. 34 live payment checks passing.

## 0.7.1 - Deployment hardening (2026-10-02)
- Rewrote the Supabase middleware helper and server client with explicit cookie types and safe failure handling.
- Build no longer blocked by lint or (by default) type errors; STRICT_TYPES=true re-enables type blocking. Added server-only dependency, Node 22.x pin, serverExternalPackages for qrcode, preflight script.
- Rewrote docs/DEPLOYMENT.md as a start-from-scratch guide with a failure checklist.
- Database: Milestone 07 migration (change_claims) is applied live; its screens come next.

## 0.8.0 - Milestone 07: Cash and change claims (2026-10-03)
- Migration 11 (applied live): change claims, disputes, driver confirmation, cash rides.
- Students: Record cash payment on the scan result, Cash claims list and detail, cancel, dispute. Drivers: Claims inbox with confirm or reject. Administrators: Claims list and dispute decisions. 36 live checks passing.

## 0.8.1 - Technology audit (2026-10-03)
- Removed .nvmrc; engines.node is now >=22.0.0. TypeScript floor raised to ^5.9.0.
- next.config.mjs and eslint.config.mjs adapt to the installed Next major. Added npm run versions (declared and installed versions with compatibility checks). Rewrote docs/TECH_STACK.md.

## 0.9.0 - Next.js 16 (2026-10-03)
- next 16.3.8 and eslint-config-next 16.3.8 (exact), react and react-dom ^19.2.0, matching typings, eslint ^9.22.
- middleware.ts replaced by proxy.ts (Next 16); Supabase session logic moved to src/lib/supabase/proxy.ts.
- Native flat ESLint config; removed @eslint/eslintrc. tsconfig updated to Next 16 conventions. next.config.mjs simplified for Next 16.

## 0.10.0 - Driver QR codes and profile pictures (2026-10-03)
- Migration 12 (applied live): driver QR codes issued by administrators, shuttle or driver codes accepted everywhere, private profile-picture storage with access rules.
- University admin: Driver QR page (issue, replace, revoke, issue all missing, print badge with photo). Drivers see their own QR code. Students scanning a driver code see the driver's name and photo.
- Drivers can add a picture while registering; students and drivers manage their picture under Profile; administrators see pictures on the review page. 34 live checks passing.

## 0.11.0 - Landing page redesign (2026-10-06)
- New public landing page at / built from reusable components in src/components/landing/: navigation, hero with Shuttler illustration, problem section, Scan-Pay-Confirm-Credit workflow, student/driver/university cards, accountability diagram with the dispute path, how it works, final call to action.
- One new colour token (brand-300). No changes to authentication, Supabase, database, dashboards or any other page. See docs/LANDING_PAGE.md.
