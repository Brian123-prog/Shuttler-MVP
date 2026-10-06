# Shuttler

University transportation platform with integrated fare payments and driver-confirmed cash/change accountability.
Multi-university, production-oriented. See `AI_HANDOFF.md` for current state.

## Requirements
Node 22 or newer (no version manager is required), npm, a Supabase project, Supabase CLI.

## Setup
```bash
npm install                      # generates package-lock.json; commit it
cp .env.example .env.local       # fill in Supabase values
npx supabase init                # once, creates supabase/config.toml (keep existing migrations)
npx supabase link --project-ref <ref>
npx supabase db push             # applies supabase/migrations
# optional, development only:
psql "$DATABASE_URL" -f supabase/seed.sql
npm run dev
```

## Deploying
See `docs/DEPLOYMENT.md` for the Vercel and Supabase steps and a list of common deployment problems.

## Quality gates
`npm run verify` runs lint (ESLint + no-emoji check), typecheck, unit tests and a production build.

## Rules
- No emoji anywhere in the app or its content (enforced by `npm run check:emoji`).
- Money is integer kobo only (`src/lib/money.ts`).
- The browser is never the authority for fare, amount, university, driver, or credit.
- Never commit secrets. `SUPABASE_SERVICE_ROLE_KEY` is server-only.

## Landing page
The public page at `/` is documented in `docs/LANDING_PAGE.md`.

## Docs
See `docs/`. Milestone reports are in `docs/milestones/`.
