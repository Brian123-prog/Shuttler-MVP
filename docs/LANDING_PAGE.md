# Public landing page

Route: `/` (src/app/page.tsx). Presentation only. It links to existing routes and uses no database, authentication or server data, so it is a static page.

## Story, in order
1. Hero: "Campus rides. Clear payments. No lost change." University transportation platform; Get started (/register) and Sign in (/login).
2. Problem: "Paid with a bigger note. Where does your change go?" with an illustrative example (NGN 200 fare, NGN 500 paid, NGN 300 change owed).
3. The Shuttler way: Scan, Pay, Confirm, Carry your credit.
4. One platform, three sides: students, drivers, universities (anchors #students, #drivers, #universities).
5. Accountability: Student, Shuttler, Driver, University diagram, and the dispute path for rejected claims.
6. How Shuttler works: Register, Get verified, Ride and record, Track and dispute (anchor #how-it-works).
7. Final call to action (/register, /login, /register/student, /register/driver) and footer.

## Components (src/components/landing/)
LandingNav, Hero, HeroIllustration (pure SVG; decorative QR, example amounts), ProblemSection, WorkflowSection, PlatformCards, AccountabilitySection, HowItWorks, FinalCta, Icons. One design token was added in src/app/globals.css: `--color-brand-300` (light bright blue for accents on navy). Colours otherwise come from the existing brand tokens; green is used only for confirmation.

## Honesty rules applied
- Only implemented features are described. Step 4 "Carry your credit" carries a visible "Coming soon" tag: confirmed claims are recorded today, but the credit ledger (Milestone 08) is not built, so using credit on later rides is described as planned.
- Digital payments are not mentioned: the only provider is a test provider.
- Issue reporting: the only implemented channel is disputing a rejected change claim (student raises it, the university administrator decides). The page describes exactly that. A general "report an issue" feature for students and drivers (driver or rider conduct, shuttle problems, safety, other complaints, reaching the university administrator) is a PRODUCT REQUIREMENT THAT IS NOT BUILT YET and is deliberately not shown as available.
- No statistics, testimonials, partnerships or user numbers. No university is named.
- The QR drawing is decorative and not scannable. The amounts are labelled "Example".

## Not changed
Authentication, Supabase, proxy, database migrations, role routing, dashboards, registration, QR, payments, claims, fares and every other page.
