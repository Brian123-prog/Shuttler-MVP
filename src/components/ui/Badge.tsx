import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

const tones: Record<StatusTone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  info: "bg-brand-50 text-brand-800",
  success: "bg-success-50 text-success-700",
  warning: "bg-warning-50 text-warning-700",
  danger: "bg-danger-50 text-danger-700",
};

// Status is never conveyed by colour alone: a text label and a shape marker are always shown.
const markers: Record<StatusTone, string> = {
  neutral: "\u25CB", info: "\u25C6", success: "\u25CF", warning: "\u25B2", danger: "\u25A0",
};

export function Badge({ tone = "neutral", children }: { tone?: StatusTone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone])}>
      <span aria-hidden="true">{markers[tone]}</span>
      {children}
    </span>
  );
}

/** Maps a verification status to a badge. Statuses match the database enum. */
export function VerificationBadge({ status }: { status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED" }) {
  const map = {
    PENDING: ["warning", "Pending verification"],
    UNDER_REVIEW: ["info", "Under review"],
    APPROVED: ["success", "Approved"],
    REJECTED: ["danger", "Rejected"],
    SUSPENDED: ["danger", "Suspended"],
  } as const;
  const [tone, label] = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}
