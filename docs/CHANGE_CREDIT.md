# Cash, change claims and transportation credit

## Cash and change claims (Milestone 07, built)
A student who pays cash and is owed change records it: scan the shuttle, enter the cash given. The database works out the change from the fare in force and records a claim waiting for the driver. Nothing becomes real until the responsible driver confirms.

States: DRIVER_PENDING, CONFIRMED, REJECTED, DISPUTED, CANCELLED (SETTLED is reserved for settlement; DRAFT and SUBMITTED exist in the enum for later use). Allowed moves are enforced by a database trigger: DRIVER_PENDING to CONFIRMED, REJECTED or CANCELLED; REJECTED to DISPUTED; DISPUTED to CONFIRMED or REJECTED; CONFIRMED to SETTLED. Amounts, fare, driver and student of a claim never change.

Anti-fraud rules (all in the database):
- Only the responsible driver, who must still be approved, can confirm or reject. A student cannot confirm their own claim; an administrator cannot confirm as the driver; another driver cannot.
- The cash given must be more than the fare and at most NGN 100,000. A student can have at most 3 claims waiting for a driver. The same request repeated returns the same claim.
- The shuttle must be in service with an approved driver and a fare. The student must be approved at that university.
- A confirmed claim creates one cash ride (payment method CASH) exactly once.

Disputes: a student can dispute a rejected claim once. The university administrator confirms the claim (creating the cash ride) or upholds the rejection, with a note. Everything is audit logged.

## Transportation credit ledger (Milestone 08, not built)
Confirmed claims are the source of credit. Milestone 08 adds the immutable ledger and will create a credit entry for every CONFIRMED claim, including those confirmed before the ledger exists. No balance is stored or shown until then.
