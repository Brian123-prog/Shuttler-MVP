# Payments

Status: direct digital payment is built end to end against a TEST provider. Nothing here moves real money. Ecobank is NOT integrated (see ECOBANK_INTEGRATION.md).

## Flow
1. A student scans a shuttle code. The page shows the fare and a Pay button when the shuttle is in service, has an approved driver and has a fare.
2. `create_payment_intent` (database) decides university, shuttle, driver, fare and amount from the code. The browser sends only the code and a one-time key. Repeating the request returns the same payment; an open payment for the same shuttle is reused.
3. The server asks the provider to start the payment and marks it PENDING with the provider's reference. (Service-role functions only.)
4. The student pays at the provider's checkout. The provider notifies us by signed webhook; the return page also checks.
5. On every notification and every page visit the server asks the PROVIDER what happened (`verifyPayment`) and applies that answer with `apply_payment_result`. A webhook body or browser request alone never marks anything paid.
6. On SUCCESS, one transaction creates the ride, the payment and the receipt. Repeats return the existing result.

## State machine (enforced by a database trigger)
INITIATED to PENDING, FAILED, CANCELLED. PENDING to SUCCESS, FAILED, CANCELLED. SUCCESS to REVERSED, REFUNDED. Everything else is terminal. Amounts, university, shuttle, driver and fare of a payment can never change.

## Safety rules
- Amounts are integer kobo. The provider's reported amount must equal the stored amount or the result is refused.
- The provider reference must match. Duplicate webhooks are recorded once (unique provider and event id) and ignored.
- A provider success that arrives after the student cancelled is not turned into a ride; it is flagged for review in the result.
- Clients cannot insert or update payments, rides or receipts. Only students see their own; university administrators see their university; drivers see rides on their shuttle.

## Provider abstraction
`src/lib/payments/provider.ts` defines `FinancialProvider` (initiatePayment, verifyPayment, verifyWebhook). `mock.ts` is the test implementation (HMAC-signed webhooks, its own ledger table `mock_provider_transactions`). Ecobank sandbox and production providers will implement the same interface. `getProvider()` refuses the mock provider on a Vercel production deployment unless `ALLOW_MOCK_PAYMENTS=true`.

## Labelling
Every payment records its provider environment (MOCK, SANDBOX or PRODUCTION). Test payments show a "Test payment" notice to the student and a "Test" badge to administrators, and are excluded from the Collected total.

## Environment variables
FINANCIAL_PROVIDER=mock, PAYMENT_WEBHOOK_SECRET (24+ random characters), SUPABASE_SERVICE_ROLE_KEY (server only). Leave FINANCIAL_PROVIDER empty to switch payments off; the Pay button then does not appear.

## Not built yet
Refunds and reversals (states exist), idempotent retries of provider calls beyond the intent key, cash payments (Milestone 07), settlement (Milestone 09), real providers (Milestone 10), payment notifications (Milestone 12).
