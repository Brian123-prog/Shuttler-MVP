# Milestone 07b - Driver QR codes and profile pictures

Real: personal QR codes per approved driver (issue, replace, bulk issue, revoke, automatic revoke, print badge), scanning through them for payment and cash claims, private profile pictures with database-enforced visibility, driver picture at registration, student and driver picture management.
Needs external configuration: SUPABASE_SERVICE_ROLE_KEY in the server environment for the registration picture and for payments.
Verified live: 34 database checks. NOT verified: Next.js build, browser behaviour, the camera or the image shrinking in a real browser (no network in the authoring sandbox). Run npm run preflight.
