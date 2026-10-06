import { Alert, Badge, type StatusTone } from "@/components/ui";
import type { PaymentStatus } from "@/lib/payments/queries";

const MAP: Record<PaymentStatus, [StatusTone, string]> = {
  INITIATED: ["info", "Started"],
  PENDING: ["warning", "Awaiting payment"],
  SUCCESS: ["success", "Paid"],
  FAILED: ["danger", "Failed"],
  CANCELLED: ["neutral", "Cancelled"],
  REVERSED: ["neutral", "Reversed"],
  REFUNDED: ["neutral", "Refunded"],
};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const [tone, label] = MAP[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function TestPaymentNotice() {
  return <Alert tone="info" title="Test payment">This payment was made through the test provider. No real money was moved.</Alert>;
}
