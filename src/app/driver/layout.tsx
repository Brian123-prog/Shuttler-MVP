import type { ReactNode } from "react";
import { AppShell } from "@/components/app/AppShell";
import { requireMembership } from "@/lib/auth/guards";

export default async function DriverLayout({ children }: { children: ReactNode }) {
  const { ctx, membership } = await requireMembership("DRIVER");
  const nav = [{ href: "/driver/dashboard", label: "Dashboard" }];
  if (membership.verification_status === "APPROVED") nav.push({ href: "/driver/claims", label: "Claims" });
  nav.push({ href: "/driver/profile", label: "Profile" });
  return (
    <AppShell ctx={ctx} current="driver" nav={nav}>
      {children}
    </AppShell>
  );
}
