# Deployment (GitHub, Vercel, Supabase)

## Rule one: never push what has not built locally
Vercel runs the same command you run on your computer. If `npm run build` passes locally, it passes on Vercel. Locally any Node 22 or newer works; on Vercel the Node version is the project setting below. So before every push:

```
npm install
npm run lint
npm run typecheck
npm run build
```
(`npm run preflight` runs the type check and the build.) Fix anything red before pushing. Commit `package-lock.json` after the first `npm install` so Vercel installs exactly the versions you tested.

## Starting a Vercel project from scratch
1. Vercel, Add New, Project, import the GitHub repository. Framework preset: Next.js (detected automatically). Leave Build Command (`npm run build`), Output Directory and Install Command at their defaults.
2. Project Settings, General, Node.js Version: 22.x or 24.x (choose a version Vercel lists; do not pick a newer one that is not offered). `engines.node` in package.json is `>=22.0.0` so your local Node (including 26) is accepted.
3. Before the first deploy, Settings, Environment Variables. Add these for Production, Preview and Development:
   | Name | Value |
   |---|---|
   | NEXT_PUBLIC_SUPABASE_URL | https://<project-ref>.supabase.co |
   | NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | publishable key (or legacy anon key). Never the secret or service role key here. |
   | NEXT_PUBLIC_SITE_URL | the address Vercel gives you, for example https://your-app.vercel.app (no trailing slash) |
   Optional. SUPABASE_SERVICE_ROLE_KEY is needed for digital payments and for saving a driver's picture at registration; the others only for digital payments (test provider):
   | SUPABASE_SERVICE_ROLE_KEY | the secret key. Server only. Mark it Sensitive. |
   | FINANCIAL_PROVIDER | mock |
   | PAYMENT_WEBHOOK_SECRET | a random string of 24 or more characters |
   | ALLOW_MOCK_PAYMENTS | true (needed for the test provider on a production deployment) |
4. Deploy. If you add or change a NEXT_PUBLIC_ variable afterwards, redeploy, because those values are fixed at build time.
5. Supabase, Authentication, URL Configuration: Site URL = your Vercel address. Redirect URLs: `https://<your-address>/auth/callback` and `http://localhost:3000/auth/callback`.
6. Supabase, Authentication: configure custom SMTP before real use (the built-in sender is limited to a few emails per hour). Enable leaked password protection.
7. Database: `npx supabase link --project-ref <ref>` then `npx supabase db push` (all files in supabase/migrations, in order). Run `supabase/seed.sql` once. Create administrator logins in Supabase (Authentication, Users, Add user, Auto Confirm) for emails in `admin_grants`.

## How the build is configured, and why
Next.js 16 does not run lint during the build (lint is `npm run lint`). `next.config.mjs` reports type errors without blocking the build by default. This exists so a single unverified type or style complaint cannot stop a deployment. To make type errors block the build, set `STRICT_TYPES=true` in Vercel once `npm run typecheck` passes locally. Syntax errors, missing modules and runtime errors always fail the build.

## If a deployment fails
Open the failed deployment, Build Logs, and copy the first red lines. Common causes:
- `Module not found`: a dependency is missing from package.json or the lockfile is stale. Run `npm install`, commit package.json and package-lock.json.
- `Type error` (only with STRICT_TYPES=true): run `npm run typecheck` locally and fix the file named.
- Supabase message on pages ("unavailable", "could not load"): the NEXT_PUBLIC_ variables are missing or were added after the build. Add them and redeploy.
- Login emails or password resets not arriving: SMTP is not configured (step 6) or the redirect URLs (step 5) are wrong.
- Camera does not open: needs https and the user's permission.
- QR codes open the wrong address: NEXT_PUBLIC_SITE_URL was wrong when the code was made. Fix it, redeploy, then use Replace code on each shuttle and reprint.
- Node version errors: set Node.js to 22.x or 24.x in Vercel project settings.

## After deploying
Open the site, register a student and a driver, sign in as the university administrator, approve both, then follow the workflow in docs/TESTING.md.

## Profile pictures and storage
Migration 12 creates the private `avatars` storage bucket and its access rules. Nothing else to configure. Photo uploads go through server actions, so next.config.mjs allows request bodies up to 4 MB (Vercel's hard limit is 4.5 MB).
