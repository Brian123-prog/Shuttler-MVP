# Tech stack

Source of truth: package.json (declared versions) and package-lock.json (exact versions; created by `npm install`, then commit it). Run `npm run versions` for declared versus installed versions and a compatibility check.

| Area | Declared | Notes |
|---|---|---|
| Node.js | engines `>=22.0.0` | Developed on Node 26.1.0 with npm 11.13.0. No version manager is used. On Vercel, set Node 22.x or 24.x in project settings. |
| Next.js | `16.3.8` (exact) | Matches the version in the developer environment. |
| eslint-config-next | `16.3.8` (exact) | Always the same version as next. |
| React, React DOM | `^19.2.0` | Next 16 targets React 19.2. Both must resolve to the same version. |
| TypeScript | `^5.9.0` | 6.x not adopted. |
| ESLint | `^9.22.0` | Needed for eslint/config. Native flat config from eslint-config-next 16. |
| Tailwind CSS | `^4.1.0`, `@tailwindcss/postcss ^4.1.0` | CSS-first configuration in src/app/globals.css. |
| Supabase | `@supabase/supabase-js ^2.50.0`, `@supabase/ssr ^0.6.1` | Cookie session pattern (getAll and setAll). |
| QR | `qrcode ^1.5.4` (server), `html5-qrcode ^2.3.8` (camera) | |
| Tests | `vitest ^3.2.0` | |

## Next.js 16 specifics in this project
- `src/proxy.ts` (formerly middleware.ts) refreshes the Supabase session and redirects signed-out visitors. It runs on the Node.js runtime. The Supabase logic is in `src/lib/supabase/proxy.ts`.
- Next 16 does not run lint during `next build`. Lint is `npm run lint`.
- Turbopack is the default bundler for dev and build. There is no custom webpack configuration.
- All request APIs (cookies, headers, params, searchParams) are already used asynchronously.
- eslint-config-next 16 includes newer React rules (React Compiler checks). `npm run lint` may report findings that the older config did not; they do not block builds.
