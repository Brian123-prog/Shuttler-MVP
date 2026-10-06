# Architecture

Next.js App Router (TypeScript, Tailwind v4) on Vercel; Supabase (Postgres, Auth, RLS).
Role areas: /student, /driver, /university-admin, /platform-admin, each guarded server-side in its layout. /account routes a signed-in user to their area.
Business rules live in the database (constraints, RLS, security-definer functions) and in server actions; the browser never supplies a university id that is trusted.

## Tenant isolation
Every tenant table carries university_id. Child rows use composite foreign keys (for example route_stops to routes and stops on (id, university_id)),
so a row can never link records from two universities, even if a policy were wrong. RLS then limits who can read or write.
Transport tables are readable by approved members, university administrators and platform administrators; writable only by that university's administrators.
Changes to transport tables are written to audit_logs by a database trigger.

## Not built yet
Fares, payments, change claims, credit ledger, settlement, notifications.

## Shuttles and QR
The printed QR encodes `<site>/student/scan?c=<token>`, so a phone camera opens Shuttler directly. NEXT_PUBLIC_SITE_URL must be set to the public address before codes are printed; otherwise codes point at the address the admin was using.
The scan page resolves the token on the server; the in-app scanner (html5-qrcode) only extracts text. A typed 8 character code is the fallback when the camera is unavailable.
