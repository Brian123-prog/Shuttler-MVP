import type { ReactNode } from "react";
import { AppShell } from "@/components/app/AppShell";
import { requireUniversityAdmin } from "@/lib/auth/guards";

export default async function UniversityAdminLayout({ children }: { children: ReactNode }) {
  const { ctx } = await requireUniversityAdmin();
  return (
    <AppShell
      ctx={ctx}
      current="university-admin"
      nav={[
        { href: "/university-admin/dashboard", label: "Dashboard" },
        { href: "/university-admin/students", label: "Students", match: ["/university-admin/review"] },
        { href: "/university-admin/drivers", label: "Drivers" },
        { href: "/university-admin/routes", label: "Routes" },
        { href: "/university-admin/stops", label: "Stops" },
        { href: "/university-admin/shuttles", label: "Shuttles" },
        { href: "/university-admin/driver-qr", label: "Driver QR" },
        { href: "/university-admin/fares", label: "Fares" },
        { href: "/university-admin/payments", label: "Payments" },
        { href: "/university-admin/claims", label: "Claims" },
        { href: "/university-admin/settings", label: "Settings" },
      ]}
    >
      {children}
    </AppShell>
  );
}
