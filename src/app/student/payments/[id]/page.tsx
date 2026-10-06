import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Alert, Button, ButtonLink, Card } from "@/components/ui";
import { Detail, DetailGrid } from "@/components/app/bits";
import { PaymentBadge, TestPaymentNotice } from "@/components/app/PaymentBits";
import { requireMembership } from "@/lib/auth/guards";
import { formatDateTime } from "@/lib/format";
import { formatKobo } from "@/lib/money";
import { getProvider } from "@/lib/payments";
import { getPayment } from "@/lib/payments/queries";
import { reconcilePayment } from "@/lib/payments/process";
import { isUuid } from "@/lib/validation";
import { cancelPaymentAction } from "../actions";

export const metadata: Metadata = { title: "Payment" };

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { membership } = await requireMembership("STUDENT");
  if (membership.verification_status !== "APPROVED") redirect("/student/dashboard");
  if (!isUuid(id)) notFound();

  let payment = await getPayment(id);
  if (!payment) notFound();

  // A pending payment is checked with the provider every time it is opened, so the status never depends on the browser.
  if (payment.status === "PENDING" || payment.status === "INITIATED") {
    const setup = getProvider();
    if ("provider" in setup) {
      await reconcilePayment(setup.provider, id).catch(() => null);
      payment = (await getPayment(id)) ?? payment;
    }
  }
  const open = payment.status === "PENDING" || payment.status === "INITIATED";
  const isMock = payment.provider_environment === "MOCK";

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-600">{payment.university_name}</p>
          <h1 className="text-2xl font-bold text-brand-900">{payment.status === "SUCCESS" ? "Receipt" : "Payment"}</h1>
        </div>
        <PaymentBadge status={payment.status} />
      </div>

      {isMock ? <TestPaymentNotice /> : null}
      {payment.status === "FAILED" ? <Alert tone="danger" title="Payment failed">{payment.failure_reason ?? "The payment was not completed."} You have not been charged for a ride.</Alert> : null}
      {payment.status === "CANCELLED" ? <Alert tone="info" title="Payment cancelled">This payment was cancelled.</Alert> : null}
      {open ? <Alert tone="warning" title="Awaiting payment">Complete the payment with the provider. This page updates when the provider confirms it.</Alert> : null}

      <Card className="space-y-4">
        <p className="text-3xl font-bold text-brand-900">{formatKobo(payment.amount_kobo)}</p>
        <DetailGrid>
          {payment.receipt_number ? <Detail label="Receipt number" value={payment.receipt_number} /> : null}
          <Detail label={payment.paid_at ? "Paid" : "Started"} value={formatDateTime(payment.paid_at ?? payment.created_at)} />
          <Detail label="Payment method" value="Digital payment" />
          <Detail label="Shuttle" value={`${payment.shuttle_code} (${payment.plate})`} />
          <Detail label="Route" value={payment.route_name ? `${payment.route_code} - ${payment.route_name}` : "No route"} />
          {payment.provider_reference ? <Detail label="Provider reference" value={payment.provider_reference} /> : null}
        </DetailGrid>
      </Card>

      <div className="flex flex-wrap gap-3 print:hidden">
        {open && payment.provider_reference?.startsWith("MOCK-") ? <ButtonLink href={`/mock-checkout/${payment.provider_reference}`}>Continue to payment</ButtonLink> : null}
        {open ? (
          <form action={cancelPaymentAction}>
            <input type="hidden" name="paymentId" value={payment.id} />
            <Button type="submit" variant="secondary">Cancel payment</Button>
          </form>
        ) : null}
        <ButtonLink href="/student/payments" variant="ghost">All payments</ButtonLink>
      </div>
    </>
  );
}
