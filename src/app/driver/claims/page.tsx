import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Alert, Button, Card, DataTable, EmptyState } from "@/components/ui";
import { Detail, DetailGrid, Panel } from "@/components/app/bits";
import { ClaimBadge } from "@/components/app/ClaimBits";
import { requireMembership } from "@/lib/auth/guards";
import { listMyClaims } from "@/lib/claims/queries";
import { formatDateTime } from "@/lib/format";
import { formatKobo } from "@/lib/money";
import { decideClaimAction } from "./actions";

export const metadata: Metadata = { title: "Change claims" };

export default async function DriverClaimsPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  const { membership } = await requireMembership("DRIVER");
  if (membership.verification_status !== "APPROVED") redirect("/driver/dashboard");
  const claims = await listMyClaims("DRIVER");
  const pending = claims.filter((c) => c.status === "DRIVER_PENDING");
  const history = claims.filter((c) => c.status !== "DRIVER_PENDING");

  return (
    <>
      <h1 className="text-2xl font-bold text-brand-900">Change claims</h1>
      {e === "failed" ? <Alert tone="danger" title="Could not save your decision">The claim may already have been decided. Refresh and try again.</Alert> : null}

      {pending.length === 0 ? (
        <EmptyState title="No claims waiting for you" />
      ) : (
        <div className="space-y-4">
          {pending.map((c) => (
            <Card key={c.id} className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{c.student_name}</p>
                  <p className="text-sm text-slate-600">{formatDateTime(c.created_at)} on shuttle {c.shuttle_code}</p>
                </div>
                <ClaimBadge status={c.status} />
              </div>
              <DetailGrid>
                <Detail label="Cash the student says they gave" value={formatKobo(c.cash_kobo)} />
                <Detail label="Fare" value={formatKobo(c.fare_kobo)} />
                <Detail label="Change you would owe" value={<span className="text-base font-bold text-brand-900">{formatKobo(c.change_kobo)}</span>} />
              </DetailGrid>
              <form action={decideClaimAction} className="space-y-3">
                <input type="hidden" name="claimId" value={c.id} />
                <div>
                  <label htmlFor={`note-${c.id}`} className="mb-1.5 block text-sm font-medium text-slate-800">Note (optional)</label>
                  <textarea id={`note-${c.id}`} name="note" rows={2} maxLength={500} className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base" />
                </div>
                <p className="text-xs text-slate-600">Confirm only if you received this cash and still owe the change. A confirmed claim cannot be undone.</p>
                <div className="flex flex-wrap gap-3">
                  <Button type="submit" name="decision" value="CONFIRM">Confirm</Button>
                  <Button type="submit" name="decision" value="REJECT" variant="danger">Reject</Button>
                </div>
              </form>
            </Card>
          ))}
        </div>
      )}

      {history.length > 0 ? (
        <Panel title="Earlier claims">
          <DataTable
            caption="Earlier claims"
            rows={history}
            rowKey={(c) => c.id}
            columns={[
              { key: "d", header: "Date", render: (c) => formatDateTime(c.created_at) },
              { key: "s", header: "Student", render: (c) => c.student_name },
              { key: "c", header: "Change", render: (c) => formatKobo(c.change_kobo) },
              { key: "t", header: "Status", render: (c) => <ClaimBadge status={c.status} /> },
            ]}
          />
        </Panel>
      ) : null}
    </>
  );
}
