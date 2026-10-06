import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ButtonLink, DataTable, EmptyState } from "@/components/ui";
import { PaymentBadge } from "@/components/app/PaymentBits";
import { requireMembership } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/format";
import { formatKobo } from "@/lib/money";
import { listMyPayments } from "@/lib/payments/queries";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const { membership } = await requireMembership("STUDENT");
  if (membership.verification_status !== "APPROVED") redirect("/student/dashboard");
  const payments = await listMyPayments();
  return (
    <>
      <h1 className="text-2xl font-bold text-brand-900">Payments</h1>
      <DataTable
        caption="Your payments"
        rows={payments}
        rowKey={(p) => p.id}
        empty={<EmptyState title="No payments yet" action={<ButtonLink href="/student/scan">Scan shuttle QR</ButtonLink>} />}
        columns={[
          { key: "d", header: "Date", render: (p) => formatDateTime(p.created_at) },
          { key: "s", header: "Shuttle", render: (p) => p.shuttle_code },
          { key: "a", header: "Amount", render: (p) => formatKobo(p.amount_kobo) },
          { key: "t", header: "Status", render: (p) => <PaymentBadge status={p.status} /> },
          { key: "v", header: "Details", render: (p) => <ButtonLink href={`/student/payments/${p.id}`} variant="secondary">{p.status === "SUCCESS" ? "Receipt" : "View"}</ButtonLink> },
        ]}
      />
    </>
  );
}
