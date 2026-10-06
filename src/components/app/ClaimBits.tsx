import { Badge, type StatusTone } from "@/components/ui";
import type { ClaimStatus } from "@/lib/claims/queries";

const MAP: Record<ClaimStatus, [StatusTone, string]> = {
  DRAFT: ["neutral", "Draft"],
  SUBMITTED: ["info", "Submitted"],
  DRIVER_PENDING: ["warning", "Waiting for driver"],
  CONFIRMED: ["success", "Confirmed"],
  REJECTED: ["danger", "Rejected"],
  DISPUTED: ["info", "Under dispute"],
  SETTLED: ["neutral", "Settled"],
  CANCELLED: ["neutral", "Cancelled"],
};

export function ClaimBadge({ status }: { status: ClaimStatus }) {
  const [tone, label] = MAP[status];
  return <Badge tone={tone}>{label}</Badge>;
}
