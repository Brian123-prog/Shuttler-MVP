import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ButtonLink, DataTable, EmptyState } from "@/components/ui";
import { ClaimBadge } from "@/components/app/ClaimBits";
import { requireMembership } from "@/lib/auth/guards";
import { listMyClaims } from "@/lib/claims/queries";
import { formatDateTime } from "@/lib/format";
import { formatKobo } from "@/lib/money";

export const metadata: Metadata = { title: "Cash claims" };

export default async function ClaimsPage() {
  const { membership } = await requireMembership("STUDENT");
  if (membership.verification_status !== "APPROVED") redirect("/student/dashboard");
  const claims = await listMyClaims("STUDENT");
  return (
    <>
      <h1 className="text-2xl font-bold text-brand-900">Cash claims</h1>
      <DataTable
        caption="Your cash claims"
        rows={claims}
        rowKey={(c) => c.id}
        empty={<EmptyState title="No cash claims" description="Scan a shuttle and use Record cash payment when the driver owes you change." action={<ButtonLink href="/student/scan">Scan shuttle QR</ButtonLink>} />}
        columns={[
          { key: "d", header: "Date", render: (c) => formatDateTime(c.created_at) },
          { key: "s", header: "Shuttle", render: (c) => c.shuttle_code },
          { key: "g", header: "Cash given", render: (c) => formatKobo(c.cash_kobo) },
          { key: "c", header: "Change owed", render: (c) => formatKobo(c.change_kobo) },
          { key: "t", header: "Status", render: (c) => <ClaimBadge status={c.status} /> },
          { key: "v", header: "Details", render: (c) => <ButtonLink href={`/student/claims/${c.id}`} variant="secondary">View</ButtonLink> },
        ]}
      />
    </>
  );
}
