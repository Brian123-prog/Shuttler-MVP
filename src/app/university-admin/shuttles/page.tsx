import type { Metadata } from "next";
import { Badge, ButtonLink, DataTable, EmptyState } from "@/components/ui";
import { requireUniversityAdmin } from "@/lib/auth/guards";
import { listShuttles } from "@/lib/shuttles/queries";

export const metadata: Metadata = { title: "Shuttles" };

export default async function ShuttlesPage() {
  const { university } = await requireUniversityAdmin();
  const shuttles = await listShuttles(university.id);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-900">Shuttles</h1>
        <ButtonLink href="/university-admin/shuttles/new">Add shuttle</ButtonLink>
      </div>
      <DataTable
        caption="Shuttles"
        rows={shuttles}
        rowKey={(s) => s.id}
        empty={<EmptyState title="No shuttles yet" action={<ButtonLink href="/university-admin/shuttles/new">Add shuttle</ButtonLink>} />}
        columns={[
          { key: "c", header: "Shuttle", render: (s) => (<><span className="font-semibold">{s.code}</span><br /><span className="text-slate-600">{s.plate}</span></>) },
          { key: "r", header: "Route", render: (s) => s.routeLabel ?? "None" },
          { key: "d", header: "Driver", render: (s) => s.driver?.name ?? "Unassigned" },
          { key: "q", header: "QR code", render: (s) => <Badge tone={s.qr ? "success" : "neutral"}>{s.qr ? "Active" : "None"}</Badge> },
          { key: "t", header: "Status", render: (s) => <Badge tone={s.status === "ACTIVE" ? "success" : "neutral"}>{s.status === "ACTIVE" ? "In service" : "Out of service"}</Badge> },
          { key: "a", header: "Action", render: (s) => <ButtonLink href={`/university-admin/shuttles/${s.id}`} variant="secondary">Manage</ButtonLink> },
        ]}
      />
    </>
  );
}
