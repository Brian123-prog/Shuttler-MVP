# Milestone 01 - Authentication and registration

Delivered: see CHANGELOG 0.2.0.
Real: auth flows, registration, database tables, RLS, RPC, account status page.
Mocked: none. Incomplete: admin review UI, role dashboards, admin-created onboarding (Milestone 02).

NOT executed (no network in authoring sandbox): npm install, typecheck, lint, vitest, next build, migrations, pgTAP.
Owner checklist: `npm install && npm run verify`; `npx supabase db push`; `npx supabase test db`; set Auth redirect URLs; manual test per docs/TESTING.md.
