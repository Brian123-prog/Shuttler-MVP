# Authentication

Supabase Auth handles identity only. Roles come from database tables (never client fields).

## Registration
Server actions (`src/app/(auth)/actions.ts`) validate input, then call `auth.signUp` with metadata. The `handle_new_user` trigger
on `auth.users` atomically creates the profile, a PENDING `university_memberships` row, and the `students` or `drivers` row
(plus a `driver_verifications` history row). Only STUDENT and DRIVER can be requested, and only for ACTIVE universities.

## Where users land
`/account` is a dispatcher: it activates any admin grants for the signed-in user, then redirects to the first available role:
platform admin, university admin, student, driver. Users with several roles get a "Switch view" bar.
Each role area (`/student`, `/driver`, `/university-admin`, `/platform-admin`) has a server-side guard in its layout (`src/lib/auth/guards.ts`);
the proxy only handles the logged-out redirect.

## Pending users
Students and drivers who are not APPROVED see the verification screen (status, university, submitted information, next steps)
inside their dashboard route, with Profile and Log out still available. Approval unlocks the full dashboard on next load.

## Admin accounts
Admins are never created by registration. A platform admin (or a one-time SQL bootstrap) writes a row in `admin_grants` for an email.
When a person signs in with that exact email and the email is verified, `claim_admin_grants()` creates the admin rows.
Unverified emails never receive a grant. See `supabase/dev_bootstrap_admins.sql.example`.

## Status model
Account status (ACTIVE, DISABLED) is separate from verification status (PENDING, UNDER_REVIEW, APPROVED, REJECTED, SUSPENDED),
which is stored on `university_memberships`.

## Verification decisions
`review_membership()` is the only write path: university admin of that university only, never your own account, allowed transitions only,
note required for reject/suspend, audit and driver history written.

## Profile pictures at registration
Drivers can choose a picture while registering. The browser shrinks it to 512 pixels and re-saves it as JPEG; the server checks size (2 MB) and the real file type from its first bytes. Because a new driver may not be signed in yet (email confirmation), the server stores the picture in the new account's own folder using the service role key (SUPABASE_SERVICE_ROLE_KEY). If that key is not configured, registration still succeeds and the driver can add the picture from their profile after signing in. Students add their picture from Profile.
