import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "info" | "success" | "warning" | "danger";
const styles: Record<Tone, string> = {
  info: "border-brand-200 bg-brand-50 text-brand-900",
  success: "border-success-700/30 bg-success-50 text-success-700",
  warning: "border-warning-700/30 bg-warning-50 text-warning-700",
  danger: "border-danger-700/30 bg-danger-50 text-danger-700",
};
const labels: Record<Tone, string> = { info: "Information", success: "Success", warning: "Warning", danger: "Error" };

export function Alert({ tone = "info", title, children }: { tone?: Tone; title?: string; children: ReactNode }) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-xl border p-4 text-sm", styles[tone])}>
      <p className="font-semibold">{title ?? labels[tone]}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
