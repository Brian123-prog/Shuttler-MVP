import type { ReactNode } from "react";
import { AppShell } from "@/components/app/AppShell";
import { requirePlatformAdmin } from "@/lib/auth/guards";

export default async function PlatformAdminLayout({ children }: { children: ReactNode }) {
  const ctx = await requirePlatformAdmin();
  return (
    <AppShell ctx={ctx} current="platform-admin" nav={[{ href: "/platform-admin/dashboard", label: "Dashboard" }, { href: "/platform-admin/universities", label: "Universities" }]}>
      {children}
    </AppShell>
  );
}
