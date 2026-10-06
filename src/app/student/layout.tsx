import type { ReactNode } from "react";
import { AppShell } from "@/components/app/AppShell";
import { requireMembership } from "@/lib/auth/guards";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const { ctx, membership } = await requireMembership("STUDENT");
  const nav = [{ href: "/student/dashboard", label: "Dashboard" }];
  if (membership.verification_status === "APPROVED") nav.push({ href: "/student/scan", label: "Scan" }, { href: "/student/payments", label: "Payments" }, { href: "/student/claims", label: "Cash claims" });
  nav.push({ href: "/student/profile", label: "Profile" });
  return (
    <AppShell ctx={ctx} current="student" nav={nav}>
      {children}
    </AppShell>
  );
}
