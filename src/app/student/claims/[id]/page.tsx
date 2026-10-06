import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Alert, Button, ButtonLink, Card, TextAreaField } from "@/components/ui";
import { Detail, DetailGrid } from "@/components/app/bits";
import { ClaimBadge } from "@/components/app/ClaimBits";
import { requireMembership } from "@/lib/auth/guards";
import { getClaim } from "@/lib/claims/queries";
import { formatDateTime } from "@/lib/format";
import { formatKobo } from "@/lib/money";
import { isUuid } from "@/lib/validation";
import { cancelClaimAction, disputeClaimAction } from "../actions";

export const metadata: Metadata = { title: "Cash claim" };

export default async function ClaimPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ e?: string }> }) {
  const { id } = await params;
  const { e } = await searchParams;
  const { membership } = await requireMembership("STUDENT");
  if (membership.verification_status !== "APPROVED") redirect("/student/dashboard");
  if (!isUuid(id)) notFound();
  const claim = await getClaim(id);
  if (!claim) notFound();

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-600">{claim.university_name}</p>
          <h1 className="text-2xl font-bold text-brand-900">Cash claim</h1>
        </div>
        <ClaimBadge status={claim.status} />
      </div>

      {e === "reason" ? <Alert tone="danger" title="Reason needed">Explain in at least 5 characters why you are disputing this claim.</Alert> : null}
      {e === "failed" ? <Alert tone="danger" title="Could not dispute">Please try again.</Alert> : null}
      {claim.status === "DRIVER_PENDING" ? <Alert tone="warning" title="Waiting for the driver">{claim.driver_name} must confirm that you gave cash and are owed change. Nothing is added until they confirm.</Alert> : null}
      {claim.status === "CONFIRMED" ? <Alert tone="success" title="Confirmed">{claim.driver_name} confirmed this claim.</Alert> : null}
      {claim.status === "REJECTED" ? <Alert tone="danger" title="Rejected">{claim.driver_note ? `Driver note: ${claim.driver_note}` : "The driver rejected this claim."}</Alert> : null}
      {claim.dispute_status === "OPEN" ? <Alert tone="info" title="Dispute open">Your university will review it and record a decision.</Alert> : null}
      {claim.dispute_status === "RESOLVED" ? <Alert tone="info" title="Dispute decided">{claim.dispute_outcome === "CLAIM_CONFIRMED" ? "Your university confirmed the claim." : "Your university upheld the rejection."} {claim.dispute_note ? `Note: ${claim.dispute_note}` : ""}</Alert> : null}

      <Card className="space-y-4">
        <div>
          <p className="text-sm text-slate-600">Change owed to you</p>
          <p className="text-3xl font-bold text-brand-900">{formatKobo(claim.change_kobo)}</p>
        </div>
        <DetailGrid>
          <Detail label="Cash you gave" value={formatKobo(claim.cash_kobo)} />
          <Detail label="Fare" value={formatKobo(claim.fare_kobo)} />
          <Detail label="Driver" value={claim.driver_name} />
          <Detail label="Shuttle" value={`${claim.shuttle_code} (${claim.plate})`} />
          <Detail label="Route" value={claim.route_name ? `${claim.route_code} - ${claim.route_name}` : "No route"} />
          <Detail label="Recorded" value={formatDateTime(claim.created_at)} />
          {claim.decided_at ? <Detail label="Decided" value={formatDateTime(claim.decided_at)} /> : null}
        </DetailGrid>
      </Card>

      {claim.status === "DRIVER_PENDING" ? (
        <form action={cancelClaimAction}><input type="hidden" name="claimId" value={claim.id} /><Button type="submit" variant="secondary">Cancel claim</Button></form>
      ) : null}

      {claim.status === "REJECTED" && !claim.dispute_status ? (
        <Card>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Disagree with the rejection?</h2>
          <form action={disputeClaimAction} className="max-w-md space-y-3">
            <input type="hidden" name="claimId" value={claim.id} />
            <TextAreaField id="reason" name="reason" label="What happened?" required minLength={5} maxLength={1000} />
            <Button type="submit">Raise a dispute</Button>
          </form>
        </Card>
      ) : null}

      <ButtonLink href="/student/claims" variant="ghost">All claims</ButtonLink>
    </>
  );
}
