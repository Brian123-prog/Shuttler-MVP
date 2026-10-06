# Milestone 06 - Direct digital payment

Real: payment intents, state machine, verification against the provider, idempotency, duplicate webhook protection, rides, payments, receipts, visibility rules, admin and driver views.
Test only: the provider. `FINANCIAL_PROVIDER=mock` uses a stand-in with its own ledger. No real money moves; every such payment is labelled MOCK and shown as a test payment.
Requires external activation for real money: a real provider implementation (Ecobank, Milestone 10) with credentials and approvals.
Verified live: 34 database checks. NOT verified: Next.js build, ESLint, browser behaviour, the webhook route and mock checkout running end to end (no network in the authoring sandbox). Run npm run verify, set the three payment variables, and test the flow in docs/TESTING.md.
