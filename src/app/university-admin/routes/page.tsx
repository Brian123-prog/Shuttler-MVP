import type { Metadata } from "next";
import { Badge, ButtonLink, DataTable, EmptyState } from "@/components/ui";
import { requireUniversityAdmin } from "@/lib/auth/guards";
import { formatDays, formatTime } from "@/lib/transport/format";
import { listRouteStops, listRoutes } from "@/lib/transport/queries";

export const metadata: Metadata = { title: "Routes" };

export default async function RoutesPage() {
  const { university } = await requireUniversityAdmin();
  const [routes, routeStops] = await Promise.all([listRoutes(university.id), listRouteStops(university.id)]);
  const counts = new Map<string, number>();
  routeStops.forEach((rs) => counts.set(rs.route_id, (counts.get(rs.route_id) ?? 0) + 1));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-900">Routes</h1>
        <ButtonLink href="/university-admin/routes/new">Add route</ButtonLink>
      </div>
      <DataTable
        caption="Routes"
        rows={routes}
        rowKey={(r) => r.id}
        empty={<EmptyState title="No routes yet" action={<ButtonLink href="/university-admin/routes/new">Add route</ButtonLink>} />}
        columns={[
          { key: "c", header: "Code", render: (r) => <span className="font-semibold">{r.code}</span> },
          { key: "n", header: "Route", render: (r) => (<><span className="font-medium">{r.name}</span><br /><span className="text-slate-600">{r.origin} to {r.destination}</span></>) },
          { key: "h", header: "Service", render: (r) => `${formatDays(r.operating_days)}, ${formatTime(r.operating_start)} to ${formatTime(r.operating_end)}` },
          { key: "s", header: "Stops", render: (r) => String(counts.get(r.id) ?? 0) },
          { key: "t", header: "Status", render: (r) => <Badge tone={r.status === "ACTIVE" ? "success" : "neutral"}>{r.status === "ACTIVE" ? "Active" : "Inactive"}</Badge> },
          { key: "a", header: "Action", render: (r) => <ButtonLink href={`/university-admin/routes/${r.id}`} variant="secondary">Manage</ButtonLink> },
        ]}
      />
    </>
  );
}
