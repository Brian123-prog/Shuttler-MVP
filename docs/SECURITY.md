# Security

Secrets are server-only. RLS is enabled on every table. No client-side business authority. audit_logs has RLS with no policies until admin policies exist. profiles has no update policy so users cannot change account_status. Hardening review is Milestone 14.

## Milestone 01 additions
RLS on all identity tables. Clients cannot write role tables. review_membership blocks self-review and cross-university review.
Redirect targets are validated (no open redirects). Login errors are generic. Password reset does not reveal account existence.
Known gaps: no rate limiting beyond Supabase defaults (Milestone 14); email confirmation setting must be chosen in Supabase.

## Milestone 02 additions
Admin grants apply only to verified emails. Platform and university admin functions authorize inside the database.
apply_admin_grants and handle_new_user are not callable via the API. Supabase advisors: remaining warnings are the intentionally callable
security-definer functions listed in DATABASE.md. Action needed in the Supabase dashboard: enable leaked password protection (Auth, Passwords).
