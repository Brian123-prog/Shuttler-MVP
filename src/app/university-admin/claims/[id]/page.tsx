import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert, Button, ButtonLink, Card, TextAreaField } from "@/components/ui";
import { Detail, DetailGrid, Panel } from "@/components/app/bits";
import { ClaimBadge } from "@/components/app/ClaimBits";
import { requireUniversityAdmin } from "@/lib/auth/guards";
import { getClaim } from "@/lib/claims/queries";
import { formatDateTime } from "@/lib/format";
import { formatKobo } from "@/lib/money";
import { isUuid } from "@/lib/validation";
import { resolveDisputeAction } from "../actions";

export const metadata: Metadata = { title: "Claim" };

export default async function AdminClaimPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ e?: string }> }) {
  const { id } = await params;
  const { e } = await searchParams;
  await requireUniversityAdmin();
  if (!isUuid(id)) notFound();
  const claim = await getClaim(id);
  if (!claim) notFound();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-900">Claim by {claim.student_name}</h1>
        <ClaimBadge status={claim.status} />
      </div>
      {e === "note" ? <Alert tone="danger" title="Note needed">Add a note explaining your decision (at least 3 characters).</Alert> : null}
      {e === "failed" ? <Alert tone="danger" title="Could not save">The dispute may already be decided.</Alert> : null}

      <Card>
        <DetailGrid>
          <Detail label="Student" value={claim.student_name} />
          <Detail label="Driver" value={claim.driver_name} />
          <Detail label="Shuttle" value={`${claim.shuttle_code} (${claim.plate})`} />
          <Detail label="Route" value={claim.route_name ? `${claim.route_code} - ${claim.route_name}` : "No route"} />
          <Detail label="Cash given" value={formatKobo(claim.cash_kobo)} />
          <Detail label="Fare" value={formatKobo(claim.fare_kobo)} />
          <Detail label="Change owed" value={formatKobo(claim.change_kobo)} />
          <Detail label="Recorded" value={formatDateTime(claim.created_at)} />
          {claim.decided_at ? <Detail label="Decided" value={formatDateTime(claim.decided_at)} /> : null}
          {claim.driver_note ? <Detail label="Driver note" value={claim.driver_note} /> : null}
        </DetailGrid>
      </Card>

      {claim.dispute_reason ? (
        <Panel title="Dispute">
          <DetailGrid>
            <Detail label="Student's reason" value={claim.dispute_reason} />
            {claim.dispute_status === "RESOLVED" ? <Detail label="Decision" value={claim.dispute_outcome === "CLAIM_CONFIRMED" ? "Claim confirmed" : "Rejection upheld"} /> : null}
            {claim.dispute_note ? <Detail label="Decision note" value={claim.dispute_note} /> : null}
          </DetailGrid>
        </Panel>
      ) : null}

      {claim.status === "DISPUTED" ? (
        <Panel title="Decide this dispute" description="A confirmed claim is recorded as a cash ride. The decision and your note are kept in the audit log.">
          <form action={resolveDisputeAction} className="max-w-lg space-y-3">
            <input type="hidden" name="claimId" value={claim.id} />
            <TextAreaField id="note" name="note" label="Note" required minLength={3} maxLength={1000} />
            <div className="flex flex-wrap gap-3">
              <Button type="submit" name="outcome" value="CLAIM_CONFIRMED">Confirm the claim</Button>
              <Button type="submit" name="outcome" value="REJECTION_UPHELD" variant="danger">Uphold the rejection</Button>
            </div>
          </form>
        </Panel>
      ) : null}
      <ButtonLink href="/university-admin/claims" variant="ghost">Back to claims</ButtonLink>
    </>
  );
}
